#!/bin/bash

# KSQLDB 쿼리 초기화 스크립트
# Docker Compose로 배포할 때 KSQLDB 쿼리를 실행합니다.

set -e

# 환경 변수 로드
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
else
    echo "Error: .env file not found!"
    exit 1
fi

# KSQLDB URL
KSQLDB_URL="${KSQLDB_URL:-http://localhost:8088}"
QUERIES_FILE="${KSQLDB_QUERIES_FILE:-./infra/helm/ksqldb/files/queries.sql}"

echo "Initializing KSQLDB queries..."
echo "KSQLDB URL: $KSQLDB_URL"
echo "Queries file: $QUERIES_FILE"

# KSQLDB가 준비될 때까지 대기 (타임아웃 및 오류 출력 개선)
echo "⏳ Waiting for KSQLDB to be ready..."
MAX_RETRIES=60
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # curl로 헬스체크 (오류도 확인)
    RESPONSE=$(curl -s -w "\n%{http_code}" "$KSQLDB_URL/info" 2>&1)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    # HTTP 코드가 200이면 준비된 것
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ KSQLDB is ready"
        break
    fi
    
    # 타임아웃 전 마지막 시도에서 오류 출력
    if [ $RETRY_COUNT -eq $((MAX_RETRIES - 1)) ]; then
        echo "⚠️ KSQLDB health check timeout or failed"
        echo "  HTTP Code: $HTTP_CODE"
        echo "  Response: $BODY"
        echo "  Tried connecting to: $KSQLDB_URL"
        echo "  KSQLDB container logs:"
        docker logs ksqldb --tail=20 2>/dev/null || echo "  (Could not get logs)"
        exit 1
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  KSQLDB not ready yet... Retrying in 5s. (Attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

# 쿼리 파일 확인
if [ ! -f "$QUERIES_FILE" ]; then
    echo "⚠️  Queries file not found: $QUERIES_FILE"
    echo "Skipping KSQLDB query initialization."
    exit 0
fi

echo "📝 Executing queries from: $QUERIES_FILE"

# ksql-cli를 사용하여 쿼리 실행
# ksql-cli가 없으면 curl로 직접 실행
if command -v ksql > /dev/null 2>&1; then
    echo "Using ksql-cli..."
    ksql "$KSQLDB_URL" < "$QUERIES_FILE" || {
        echo "⚠️  Some queries may have failed, but continuing..."
    }
else
    echo "ksql-cli not found, using curl..."
    # curl로 쿼리 실행 (각 쿼리를 개별적으로 실행)
    # 주석 제거 및 빈 줄 제거 후 실행
    while IFS= read -r line; do
        # 주석 제거 (# 또는 -- 로 시작하는 줄)
        if [[ "$line" =~ ^[[:space:]]*# ]] || [[ "$line" =~ ^[[:space:]]*-- ]]; then
            continue
        fi
        # 빈 줄 건너뛰기
        if [[ -z "${line// }" ]]; then
            continue
        fi
        # 세미콜론으로 끝나는 쿼리만 실행
        if [[ "$line" =~ \;$ ]]; then
            query="${line%;}"
            echo "Executing: $query"
            response=$(curl -s -w "\n%{http_code}" -X POST \
                "$KSQLDB_URL/ksql" \
                -H "Content-Type: application/vnd.ksql.v1+json" \
                -d "{\"ksql\":\"$query\",\"streamsProperties\":{}}")
            http_code=$(echo "$response" | tail -n1)
            body=$(echo "$response" | sed '$d')
            if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
                echo "⚠️  Query failed (HTTP $http_code): $body"
                # 계속 진행 (IF NOT EXISTS가 있으면 괜찮을 수 있음)
            fi
        fi
    done < "$QUERIES_FILE"
fi

echo "✅ KSQLDB queries initialized."

