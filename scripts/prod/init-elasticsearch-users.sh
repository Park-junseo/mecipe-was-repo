#!/bin/bash

# Elasticsearch 사용자 초기화 스크립트
# Docker Compose로 배포할 때 Elasticsearch 사용자를 생성/업데이트합니다.

set -e

# 환경 변수 로드 (.env 파일은 선택사항, 이미 설정된 환경 변수가 우선)
# ELASTICSEARCH_HOSTS는 export된 환경 변수를 우선 사용
PRESERVED_ELASTICSEARCH_HOSTS="$ELASTICSEARCH_HOSTS"

if [ -f .env ]; then
    # 이미 설정된 환경 변수는 유지하고 .env에서 나머지만 로드
    set -a
    source .env 2>/dev/null || {
        # source 실패 시 대체 방법 (bash가 아닌 sh 환경 대응)
        export $(cat .env | grep -v '^#' | grep -v '^$' | xargs -0 2>/dev/null || cat .env | grep -v '^#' | grep -v '^$' | sed 's/=/="/' | sed 's/$/"/' | xargs) 2>/dev/null || true
    }
    set +a
    
    # export된 ELASTICSEARCH_HOSTS가 있으면 우선 사용 (로컬 실행 시 localhost를 위해)
    if [ -n "$PRESERVED_ELASTICSEARCH_HOSTS" ]; then
        ELASTICSEARCH_HOSTS="$PRESERVED_ELASTICSEARCH_HOSTS"
    fi
fi

# 필수 변수 확인
if [ -z "$ELASTICSEARCH_SUPERUSER_PASSWORD" ]; then
    echo "Error: ELASTICSEARCH_SUPERUSER_PASSWORD must be set"
    exit 1
fi

# ELASTICSEARCH_HOSTS가 이미 설정되어 있으면 사용
# 설정되지 않은 경우, 호스트에서 실행 중인지 확인하여 적절한 호스트 사용
if [ -z "$ELASTICSEARCH_HOSTS" ]; then
    # Docker 컨테이너 내부인지 확인
    if [ -f /.dockerenv ] || [ -f /proc/self/cgroup ] && grep -q docker /proc/self/cgroup 2>/dev/null; then
        # Docker 컨테이너 내부: 서비스 이름 사용
        ELASTICSEARCH_HOSTS="http://elasticsearch:9200"
    else
        # 호스트에서 실행: localhost 사용
        ELASTICSEARCH_HOSTS="http://localhost:9200"
    fi
fi

# ELASTICSEARCH_HOSTS 파싱
ES_URL="$ELASTICSEARCH_HOSTS"
ES_URL=$(echo "$ES_URL" | sed 's|http://||' | sed 's|https://||' | cut -d'/' -f1)
ES_HOST=$(echo "$ES_URL" | cut -d':' -f1)
ES_PORT=$(echo "$ES_URL" | cut -d':' -f2)
ES_PORT="${ES_PORT:-9200}"
ES="http://${ES_HOST}:${ES_PORT}"

echo "Initializing Elasticsearch users..."
echo "Elasticsearch host: $ES"

# Elasticsearch가 준비될 때까지 대기 (타임아웃 추가 및 오류 출력 개선)
echo "⏳ Waiting for Elasticsearch to be ready..."
MAX_RETRIES=60
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # curl 명령어로 헬스체크 (오류도 확인)
    # -f 옵션 제거 (HTTP 에러 코드도 받기 위해)
    RESPONSE=$(curl -s -w "\n%{http_code}" -u "elastic:${ELASTICSEARCH_SUPERUSER_PASSWORD}" \
        "$ES/_cluster/health" 2>&1)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    # 디버깅: 처음 몇 번은 응답 확인 (너무 많이 출력하지 않도록)
    if [ $RETRY_COUNT -lt 3 ] || [ $RETRY_COUNT -eq $((MAX_RETRIES - 1)) ]; then
        echo "  Debug: HTTP Code=$HTTP_CODE, ES=$ES"
        if [ -n "$BODY" ]; then
            echo "  Response preview: $(echo "$BODY" | head -c 100)..."
        fi
    fi
    
    # HTTP 코드가 200이고 status가 green 또는 yellow인지 확인
    if [ "$HTTP_CODE" = "200" ]; then
        STATUS=$(echo "$BODY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "")
        if [ "$STATUS" = "green" ] || [ "$STATUS" = "yellow" ]; then
            echo "✅ Elasticsearch is ready (status: $STATUS)"
            break
        else
            echo "  Elasticsearch status is '$STATUS', waiting for green/yellow..."
        fi
    else
        # HTTP 코드가 200이 아닌 경우
        if [ $RETRY_COUNT -lt 3 ]; then
            echo "  HTTP Code is $HTTP_CODE, not 200"
        fi
    fi
    
    # 타임아웃 전 마지막 시도에서 오류 출력
    if [ $RETRY_COUNT -eq $((MAX_RETRIES - 1)) ]; then
        echo "⚠️ Elasticsearch health check timeout or failed"
        echo "  HTTP Code: $HTTP_CODE"
        echo "  Response: $BODY"
        echo "  Tried connecting to: $ES"
        echo "  Password set: $([ -n "$ELASTICSEARCH_SUPERUSER_PASSWORD" ] && echo "yes" || echo "no")"
        exit 1
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Elasticsearch not ready yet... Retrying in 5s. (Attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

# 역할 생성 함수
create_or_update_role() {
    local ROLE_NAME=$1
    shift
    
    echo "🔐 Ensuring role exists: $ROLE_NAME"
    
    # 내장 역할은 건너뛰기
    if [ "$ROLE_NAME" = "kibana_admin" ] || [ "$ROLE_NAME" = "monitoring_user" ]; then
        echo "Role $ROLE_NAME is a built-in role, skipping creation/update."
        return 0
    fi
    
    # JSON 빌드
    local cluster_privs=""
    local index_privs=""
    
    for priv in "$@"; do
        if echo "$priv" | grep -q "^cluster:"; then
            local CLUSTER_PRIV=$(echo "$priv" | cut -d':' -f2)
            if [ -z "$cluster_privs" ]; then
                cluster_privs="\"$CLUSTER_PRIV\""
            else
                cluster_privs="$cluster_privs,\"$CLUSTER_PRIV\""
            fi
        elif echo "$priv" | grep -q "^index:"; then
            local INDEX_PRIV=$(echo "$priv" | cut -d':' -f2)
            if [ -z "$index_privs" ]; then
                index_privs="\"$INDEX_PRIV\""
            else
                index_privs="$index_privs,\"$INDEX_PRIV\""
            fi
        elif [ "$priv" = "indices_all_privileges" ]; then
            index_privs="\"all\""
        elif [ "$priv" = "cluster_all_privileges" ]; then
            cluster_privs="\"all\""
        fi
    done
    
    local json_parts=""
    if [ -n "$cluster_privs" ]; then
        json_parts="\"cluster\":[$cluster_privs]"
    fi
    if [ -n "$index_privs" ]; then
        if [ -n "$json_parts" ]; then
            json_parts="$json_parts,\"indices\":[{\"names\":[\"*\"],\"privileges\":[$index_privs]}]"
        else
            json_parts="\"indices\":[{\"names\":[\"*\"],\"privileges\":[$index_privs]}]"
        fi
    fi
    
    local final_json_data="{$json_parts}"
    
    curl -s -f -u "elastic:${ELASTICSEARCH_SUPERUSER_PASSWORD}" \
        -X PUT "$ES/_security/role/$ROLE_NAME" \
        -H "Content-Type: application/json" \
        -d "$final_json_data" || { echo "Failed to create/update role $ROLE_NAME"; exit 1; }
    
    echo "Role $ROLE_NAME created/updated successfully"
}

# 사용자 생성/업데이트 함수
create_or_update_user() {
    local USER_NAME=$1
    local USER_PASS=$2
    shift 2
    
    echo "👤 Creating/updating user: $USER_NAME (roles: $*)"
    
    # Reserved users (kibana_system)는 비밀번호만 업데이트
    if [ "$USER_NAME" = "kibana_system" ]; then
        echo "User $USER_NAME is reserved, updating password only..."
        response=$(curl -s -w "\n%{http_code}" -u "elastic:${ELASTICSEARCH_SUPERUSER_PASSWORD}" \
            -X POST "$ES/_security/user/$USER_NAME/_password" \
            -H "Content-Type: application/json" \
            -d "{\"password\":\"$USER_PASS\"}")
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
            echo "Failed to update password for user $USER_NAME (HTTP $http_code): $body"
            exit 1
        fi
        echo "Password for reserved user $USER_NAME updated successfully"
        return 0
    fi
    
    # 역할 JSON 배열 빌드
    local roles_json=""
    for role in "$@"; do
        if [ -z "$roles_json" ]; then
            roles_json="\"$role\""
        else
            roles_json="$roles_json,\"$role\""
        fi
    done
    if [ -z "$roles_json" ]; then
        roles_json="[]"
    else
        roles_json="[$roles_json]"
    fi
    
    response=$(curl -s -w "\n%{http_code}" -u "elastic:${ELASTICSEARCH_SUPERUSER_PASSWORD}" \
        -X PUT "$ES/_security/user/$USER_NAME" \
        -H "Content-Type: application/json" \
        -d "{\"password\":\"$USER_PASS\",\"roles\":$roles_json}")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
        echo "Failed to create/update user $USER_NAME (HTTP $http_code): $body"
        exit 1
    fi
    echo "User $USER_NAME created/updated successfully"
}

# 역할 생성
echo "🔧 Initializing custom roles..."
create_or_update_role producer_role index:create_index index:write index:read index:view_index_metadata
create_or_update_role app_read_write_role index:read index:write

# 사용자 생성/업데이트
echo "🔧 Initializing users..."

# Kibana system user
if [ -n "$ELASTICSEARCH_KIBANA_PASSWORD" ]; then
    create_or_update_user "kibana_system" "${ELASTICSEARCH_KIBANA_PASSWORD}" "kibana_admin"
fi

# Producer user
if [ -n "$ELASTICSEARCH_PRODUCER_USER_PASS" ]; then
    PRODUCER_USER_NAME="${ELASTICSEARCH_PRODUCER_USER_NAME:-producer_user}"
    create_or_update_user "$PRODUCER_USER_NAME" "${ELASTICSEARCH_PRODUCER_USER_PASS}" "producer_role"
fi

# App user
if [ -n "$ELASTICSEARCH_APP_USER_PASS" ]; then
    APP_USER_NAME="${ELASTICSEARCH_APP_USER_NAME:-app_user}"
    create_or_update_user "$APP_USER_NAME" "${ELASTICSEARCH_APP_USER_PASS}" "app_read_write_role"
fi

echo "✅ Elasticsearch security initialized."

