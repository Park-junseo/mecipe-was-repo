#!/bin/bash

# Debezium Connector 초기화 스크립트
# Docker Compose로 배포할 때 Debezium Connector를 생성/업데이트합니다.

set -e

# 환경 변수 로드
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
else
    echo "Error: .env file not found!"
    exit 1
fi

# 필수 변수 확인
if [ -z "$KAFKA_BROKERS" ]; then
    echo "Error: KAFKA_BROKERS must be set in .env file"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL must be set in .env file"
    exit 1
fi

# DATABASE_URL 파싱
# 형식: postgresql://user:password@host:port/database
DB_URL=$(echo "$DATABASE_URL" | sed 's|postgresql://||' | sed 's|postgres://||')
DB_USER=$(echo "$DB_URL" | cut -d':' -f1)
DB_PASS_AND_HOST=$(echo "$DB_URL" | cut -d':' -f2-)
DB_PASS=$(echo "$DB_PASS_AND_HOST" | cut -d'@' -f1)
DB_HOST_AND_REST=$(echo "$DB_PASS_AND_HOST" | cut -d'@' -f2-)
DB_HOST=$(echo "$DB_HOST_AND_REST" | cut -d':' -f1)
DB_PORT_AND_DB=$(echo "$DB_HOST_AND_REST" | cut -d':' -f2-)
DB_PORT=$(echo "$DB_PORT_AND_DB" | cut -d'/' -f1)
DB_NAME=$(echo "$DB_PORT_AND_DB" | cut -d'/' -f2 | cut -d'?' -f1)

# 기본값 설정
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-postgres}"

# Debezium Connect URL
# 로컬: 호스트 포트 8084 사용 (docker-compose.instance-b.yml에서 "8084:8083" 매핑)
# 프로덕션: 호스트 포트 8083 사용 (또는 환경 변수로 명시적으로 설정)
DEBEZIUM_URL="${DEBEZIUM_URL:-http://localhost:8084}"

CONNECTOR_NAME="${DEBEZIUM_CONNECTOR_NAME:-cafe-infos-debezium-connector}"

echo "Initializing Debezium Connector..."
echo "Debezium URL: $DEBEZIUM_URL"
echo "Database Host: $DB_HOST"
echo "Database Port: $DB_PORT"
echo "Database Name: $DB_NAME"
echo "Database User: $DB_USER"

# Debezium Connect가 준비될 때까지 대기
echo "⏳ Waiting for Debezium Connect to be ready..."
until curl -s -f "$DEBEZIUM_URL/connectors" > /dev/null 2>&1; do
    echo "  Debezium Connect not ready yet... Retrying in 5s."
    sleep 5
done
echo "✅ Debezium Connect is ready."

# Connector 설정 JSON 생성
CONNECTOR_CONFIG=$(cat <<EOF
{
  "name": "$CONNECTOR_NAME",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "plugin.name": "pgoutput",
    "tasks.max": "1",
    "database.hostname": "$DB_HOST",
    "database.port": "$DB_PORT",
    "database.user": "$DB_USER",
    "database.password": "$DB_PASS",
    "database.dbname": "$DB_NAME",
    "database.server.name": "dbserver",
    "topic.prefix": "dbserver",
    "table.include.list": "${DEBEZIUM_TABLE_INCLUDE_LIST:-public.CafeInfo,public.RegionCategory}",
    "publication.autocreate.mode": "all_tables",
    "slot.name": "${DEBEZIUM_SLOT_NAME:-debezium_slot}",
    "heartbeat.interval.ms": "5000",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter.schemas.enable": "false",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "key.converter.schemas.enable": "false"
  }
}
EOF
)

# Connector 존재 여부 확인
echo "🔍 Checking if connector exists..."
EXISTING_CONNECTOR=$(curl -s -f "$DEBEZIUM_URL/connectors/$CONNECTOR_NAME" 2>/dev/null || echo "")

if [ -n "$EXISTING_CONNECTOR" ]; then
    echo "📝 Connector already exists, updating..."
    # Connector 업데이트
    response=$(curl -s -w "\n%{http_code}" -X PUT \
        "$DEBEZIUM_URL/connectors/$CONNECTOR_NAME/config" \
        -H "Content-Type: application/json" \
        -d "$(echo "$CONNECTOR_CONFIG" | jq -c '.config')")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
        echo "Failed to update connector (HTTP $http_code): $body"
        exit 1
    fi
    echo "✅ Connector updated successfully"
else
    echo "📝 Creating new connector..."
    # Connector 생성
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "$DEBEZIUM_URL/connectors" \
        -H "Content-Type: application/json" \
        -d "$CONNECTOR_CONFIG")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
        echo "Failed to create connector (HTTP $http_code): $body"
        exit 1
    fi
    echo "✅ Connector created successfully"
fi

# Connector 상태 확인
echo "🔍 Checking connector status..."
sleep 5
STATUS=$(curl -s "$DEBEZIUM_URL/connectors/$CONNECTOR_NAME/status" | jq -r '.connector.state // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")
echo "Connector status: $STATUS"

if [ "$STATUS" != "RUNNING" ] && [ "$STATUS" != "UNASSIGNED" ]; then
    echo "⚠️  Connector is not in RUNNING state: $STATUS"
    echo "Check logs for details:"
    curl -s "$DEBEZIUM_URL/connectors/$CONNECTOR_NAME/status" | jq '.connector' || true
fi

echo "✅ Debezium connector initialized."

