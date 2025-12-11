#!/bin/bash

# PostgreSQL 및 Elasticsearch 헬스체크 및 폴백 스크립트
# 30초 이상 반응이 없으면 Docker로 띄움

set -e

POSTGRES_HOST="${POSTGRES_HOST:-postgresql.instance-b.svc.cluster.local}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-mydb}"
ELASTICSEARCH_HOST="${ELASTICSEARCH_HOST:-elasticsearch.instance-b.svc.cluster.local}"
ELASTICSEARCH_PORT="${ELASTICSEARCH_PORT:-9200}"
ELASTICSEARCH_USERNAME="${ELASTICSEARCH_USERNAME:-elastic}"
ELASTICSEARCH_PASSWORD="${ELASTICSEARCH_PASSWORD:-elasticpassword}"
TIMEOUT="${TIMEOUT:-30}"

# PostgreSQL 헬스체크
check_postgres() {
    echo "Checking PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
    
    # pg_isready가 설치되어 있는지 확인
    if ! command -v pg_isready &> /dev/null; then
        echo "⚠️  pg_isready not found, trying alternative method..."
        # curl이나 nc를 사용한 대체 방법
        if command -v nc &> /dev/null; then
            if timeout ${TIMEOUT} bash -c "until nc -z ${POSTGRES_HOST} ${POSTGRES_PORT}; do sleep 1; done" 2>/dev/null; then
                echo "✅ PostgreSQL port is open"
                return 0
            else
                echo "❌ PostgreSQL is not responding within ${TIMEOUT} seconds"
                return 1
            fi
        else
            echo "❌ Neither pg_isready nor nc is available"
            return 1
        fi
    fi
    
    if timeout ${TIMEOUT} bash -c "until pg_isready -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER}; do sleep 1; done" 2>/dev/null; then
        echo "✅ PostgreSQL is healthy"
        return 0
    else
        echo "❌ PostgreSQL is not responding within ${TIMEOUT} seconds"
        return 1
    fi
}

# Elasticsearch 헬스체크
check_elasticsearch() {
    echo "Checking Elasticsearch at ${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}..."
    if timeout ${TIMEOUT} bash -c "until curl -f -u ${ELASTICSEARCH_USERNAME:-elastic}:${ELASTICSEARCH_PASSWORD} http://${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}/_cluster/health; do sleep 1; done" 2>/dev/null; then
        echo "✅ Elasticsearch is healthy"
        return 0
    else
        echo "❌ Elasticsearch is not responding within ${TIMEOUT} seconds"
        return 1
    fi
}

# PostgreSQL Docker로 띄우기
start_postgres_docker() {
    echo "🚀 Starting PostgreSQL with Docker..."
    docker run -d \
        --name postgresql-fallback \
        -e POSTGRES_USER=${POSTGRES_USER:-postgres} \
        -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres} \
        -e POSTGRES_DB=${POSTGRES_DB:-mydb} \
        -p ${POSTGRES_PORT}:5432 \
        debezium/postgres:16-alpine || echo "PostgreSQL container may already exist"
    echo "✅ PostgreSQL Docker container started"
}

# Elasticsearch Docker로 띄우기
start_elasticsearch_docker() {
    echo "🚀 Starting Elasticsearch with Docker..."
    docker run -d \
        --name elasticsearch-fallback \
        -e discovery.type=single-node \
        -e xpack.security.enabled=true \
        -e xpack.security.http.ssl.enabled=false \
        -e ELASTIC_PASSWORD=${ELASTICSEARCH_PASSWORD:-elasticpassword} \
        -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
        -p ${ELASTICSEARCH_PORT}:9200 \
        docker.elastic.co/elasticsearch/elasticsearch:8.14.0 || echo "Elasticsearch container may already exist"
    echo "✅ Elasticsearch Docker container started"
}

# 메인 실행
main() {
    # PostgreSQL 체크 및 폴백
    if ! check_postgres; then
        start_postgres_docker
        echo "⏳ Waiting for PostgreSQL to be ready..."
        sleep 10
        if check_postgres; then
            echo "✅ PostgreSQL fallback successful"
        else
            echo "❌ PostgreSQL fallback failed"
            exit 1
        fi
    fi

    # Elasticsearch 체크 및 폴백
    if ! check_elasticsearch; then
        start_elasticsearch_docker
        echo "⏳ Waiting for Elasticsearch to be ready..."
        sleep 15
        if check_elasticsearch; then
            echo "✅ Elasticsearch fallback successful"
        else
            echo "❌ Elasticsearch fallback failed"
            exit 1
        fi
    fi

    echo "✅ All services are healthy"
}

main "$@"

