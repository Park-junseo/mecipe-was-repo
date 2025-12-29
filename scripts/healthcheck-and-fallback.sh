#!/bin/bash

# PostgreSQL 및 Elasticsearch 헬스체크 및 폴백 스크립트
# 30초 이상 반응이 없으면 Docker로 띄움

set -e

# 외부 인스턴스에 직접 설치된 PostgreSQL/Elasticsearch를 체크
# Kubernetes 서비스 이름이 아닌 실제 호스트/IP 사용
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"  # 외부 인스턴스의 실제 호스트/IP
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-mydb}"
ELASTICSEARCH_HOST="${ELASTICSEARCH_HOST:-localhost}"  # 외부 인스턴스의 실제 호스트/IP
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
    # 기존 컨테이너 제거
    docker rm -f postgresql-fallback 2>/dev/null || true
    
    # 포트 값 확인 및 기본값 설정 (숫자만 허용)
    POSTGRES_PORT_VAL="${POSTGRES_PORT:-5432}"
    # 숫자가 아닌 문자 제거
    POSTGRES_PORT_VAL="${POSTGRES_PORT_VAL//[^0-9]/}"
    # 비어있으면 기본값 사용
    if [ -z "${POSTGRES_PORT_VAL}" ]; then
        POSTGRES_PORT_VAL="5432"
    fi
    INTERNAL_IP=$(get_internal_ip)
    
    # Windows/Git Bash 환경에서는 localhost 바인딩이 더 안전
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || -n "$WSL_DISTRO_NAME" ]]; then
        echo "Windows/Git Bash/WSL: 모든 인터페이스에 바인딩 포트 ${POSTGRES_PORT_VAL}"
        # Windows/Git Bash/WSL: 모든 인터페이스에 바인딩
        docker run -d \
            --name postgresql-fallback \
            -e POSTGRES_USER=${POSTGRES_USER:-postgres} \
            -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres} \
            -e POSTGRES_DB=${POSTGRES_DB:-mydb} \
            -p "${POSTGRES_PORT_VAL}:5432" \
            debezium/postgres:16-alpine
    else
        echo "Linux: 특정 IP에 바인딩 ${INTERNAL_IP}:${POSTGRES_PORT_VAL}:5432"
        # Linux: 특정 IP에 바인딩
        docker run -d \
            --name postgresql-fallback \
            -e POSTGRES_USER=${POSTGRES_USER:-postgres} \
            -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres} \
            -e POSTGRES_DB=${POSTGRES_DB:-mydb} \
            -p "${INTERNAL_IP}:${POSTGRES_PORT_VAL}:5432" \
            debezium/postgres:16-alpine || echo "PostgreSQL container may already exist"
    fi
    echo "✅ PostgreSQL Docker container started"
}

# Elasticsearch Docker로 띄우기
start_elasticsearch_docker() {
    echo "🚀 Starting Elasticsearch with Docker..."
    # 기존 컨테이너 제거
    docker rm -f elasticsearch-fallback 2>/dev/null || true
    
    # 포트 값 확인 및 기본값 설정 (숫자만 허용)
    ELASTICSEARCH_PORT_VAL="${ELASTICSEARCH_PORT:-9200}"
    # 숫자가 아닌 문자 제거
    ELASTICSEARCH_PORT_VAL="${ELASTICSEARCH_PORT_VAL//[^0-9]/}"
    # 비어있으면 기본값 사용
    if [ -z "${ELASTICSEARCH_PORT_VAL}" ]; then
        ELASTICSEARCH_PORT_VAL="9200"
    fi
    INTERNAL_IP=$(get_internal_ip)
    
    # Windows/Git Bash 환경에서는 localhost 바인딩이 더 안전
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || -n "$WSL_DISTRO_NAME" ]]; then
        echo "Windows/Git Bash/WSL: 모든 인터페이스에 바인딩 포트 ${ELASTICSEARCH_PORT_VAL}"
        # Windows/Git Bash/WSL: 모든 인터페이스에 바인딩
        docker run -d \
            --name elasticsearch-fallback \
            -e discovery.type=single-node \
            -e xpack.security.enabled=true \
            -e xpack.security.http.ssl.enabled=false \
            -e ELASTIC_PASSWORD=${ELASTICSEARCH_PASSWORD:-elasticpassword} \
            -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
            -p "${ELASTICSEARCH_PORT_VAL}:9200" \
            docker.elastic.co/elasticsearch/elasticsearch:8.14.0
    else
        echo "Linux: 특정 IP에 바인딩 ${INTERNAL_IP}:${ELASTICSEARCH_PORT_VAL}:9200"
        # Linux: 특정 IP에 바인딩
        docker run -d \
            --name elasticsearch-fallback \
            -e discovery.type=single-node \
            -e xpack.security.enabled=true \
            -e xpack.security.http.ssl.enabled=false \
            -e ELASTIC_PASSWORD=${ELASTICSEARCH_PASSWORD:-elasticpassword} \
            -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
            -p "${INTERNAL_IP}:${ELASTICSEARCH_PORT_VAL}:9200" \
            docker.elastic.co/elasticsearch/elasticsearch:8.14.0 || echo "Elasticsearch container may already exist"
    fi
    echo "✅ Elasticsearch Docker container started"
}

# 인스턴스의 내부 IP 주소 얻기
get_internal_ip() {
    # 환경 변수로 지정된 내부 IP 사용
    if [ -n "${INSTANCE_INTERNAL_IP}" ]; then
        echo "${INSTANCE_INTERNAL_IP}"
        return
    fi
    
    # 자동으로 내부 IP 감지 (여러 방법 시도)
    if command -v hostname &> /dev/null; then
        # hostname -I는 공백으로 구분된 IP 목록 반환
        INTERNAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
        if [ -n "${INTERNAL_IP}" ]; then
            echo "${INTERNAL_IP}"
            return
        fi
    fi
    
    # ip 명령어 사용
    if command -v ip &> /dev/null; then
        INTERNAL_IP=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K\S+' || ip addr show | grep -oP 'inet \K[\d.]+' | grep -v '127.0.0.1' | head -1)
        if [ -n "${INTERNAL_IP}" ]; then
            echo "${INTERNAL_IP}"
            return
        fi
    fi
    
    # 기본값: localhost (자동 감지 실패 시)
    echo "localhost"
}

# 메인 실행
main() {
    # 폴백 상태를 저장할 파일
    FALLBACK_STATUS_FILE="/tmp/fallback-status.env"
    rm -f "$FALLBACK_STATUS_FILE"
    
    # 인스턴스의 내부 IP 얻기 (다른 인스턴스에서 접근 가능한 IP)
    INSTANCE_IP=$(get_internal_ip)
    echo "📍 Instance internal IP: ${INSTANCE_IP}"
    
    # PostgreSQL 체크 및 폴백
    if ! check_postgres; then
        echo "🔄 PostgreSQL not available, starting Docker fallback..."
        start_postgres_docker
        echo "⏳ Waiting for PostgreSQL to be ready..."
        sleep 10
        if check_postgres; then
            echo "✅ PostgreSQL fallback successful"
            echo "POSTGRES_USE_FALLBACK=true" >> "$FALLBACK_STATUS_FILE"
            echo "POSTGRES_FALLBACK_HOST=${INSTANCE_IP}" >> "$FALLBACK_STATUS_FILE"
            echo "POSTGRES_FALLBACK_PORT=${POSTGRES_PORT}" >> "$FALLBACK_STATUS_FILE"
        else
            echo "❌ PostgreSQL fallback failed"
            exit 1
        fi
    else
        echo "✅ PostgreSQL is healthy (using external instance)"
        echo "POSTGRES_USE_FALLBACK=false" >> "$FALLBACK_STATUS_FILE"
        echo "POSTGRES_FALLBACK_HOST=${POSTGRES_HOST}" >> "$FALLBACK_STATUS_FILE"
        echo "POSTGRES_FALLBACK_PORT=${POSTGRES_PORT}" >> "$FALLBACK_STATUS_FILE"
    fi

    # Elasticsearch 체크 및 폴백
    if ! check_elasticsearch; then
        echo "🔄 Elasticsearch not available, starting Docker fallback..."
        start_elasticsearch_docker
        echo "⏳ Waiting for Elasticsearch to be ready..."
        sleep 30
        if check_elasticsearch; then
            echo "✅ Elasticsearch fallback successful"
            echo "ELASTICSEARCH_USE_FALLBACK=true" >> "$FALLBACK_STATUS_FILE"
            echo "ELASTICSEARCH_FALLBACK_HOST=${INSTANCE_IP}" >> "$FALLBACK_STATUS_FILE"
            echo "ELASTICSEARCH_FALLBACK_PORT=${ELASTICSEARCH_PORT}" >> "$FALLBACK_STATUS_FILE"
        else
            echo "❌ Elasticsearch fallback failed"
            exit 1
        fi
    else
        echo "✅ Elasticsearch is healthy (using external instance)"
        echo "ELASTICSEARCH_USE_FALLBACK=false" >> "$FALLBACK_STATUS_FILE"
        echo "ELASTICSEARCH_FALLBACK_HOST=${ELASTICSEARCH_HOST}" >> "$FALLBACK_STATUS_FILE"
        echo "ELASTICSEARCH_FALLBACK_PORT=${ELASTICSEARCH_PORT}" >> "$FALLBACK_STATUS_FILE"
    fi

    echo "✅ All services are healthy"
    echo ""
    echo "📋 Fallback status saved to $FALLBACK_STATUS_FILE:"
    cat "$FALLBACK_STATUS_FILE"
}

main "$@"

