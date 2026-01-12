#!/bin/bash

# 로컬 Docker Compose 배포 스크립트
# 실제 환경 배포 전 로컬에서 테스트하기 위한 스크립트
# SSL 설치를 생략하고 localhost로 설정

set -e

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 변수 파일 확인
ENV_FILE=".env.local.compose"
if [ ! -f "$ENV_FILE" ]; then
    log_error ".env.local.compose 파일이 없습니다!"
    log_info "$ENV_FILE 파일을 생성하고 필요한 환경 변수를 설정하세요."
    exit 1
fi

log_info "환경 변수 파일 로드: $ENV_FILE"
# 환경 변수 파일을 안전하게 로드 (set -a로 자동 export)
set -a
source "$ENV_FILE" 2>/dev/null || {
    log_error "환경 변수 파일을 로드할 수 없습니다: $ENV_FILE"
    exit 1
}
set +a

# 필수 환경 변수 확인
REQUIRED_VARS=(
    "POSTGRES_HOST"
    "POSTGRES_PORT"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "JWT_SECRET"
    "SECRET_LOGIN_CRYPTO"
    "ELASTICSEARCH_SUPERUSER_PASSWORD"
    "ELASTICSEARCH_KIBANA_PASSWORD"
    "ELASTICSEARCH_PRODUCER_USER_PASS"
    "ELASTICSEARCH_APP_USER_PASS"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    log_error "필수 환경 변수가 설정되지 않았습니다:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

# KAFKA_BROKERS 값 계산 (스크립트에서 먼저 계산한 후 .env 파일에 기록)
log_info "KAFKA_BROKERS 계산 중..."
if [ -z "$KAFKA_BROKERS" ] && [ -z "$INSTANCE_A_IP" ]; then
    # Kafka가 호스트 포트 9092로 노출되어 있으므로, host.docker.internal을 우선 사용
    # Debezium 컨테이너에 extra_hosts로 host.docker.internal이 설정되어 있음
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]] || [[ "$OSTYPE" == "mingw"* ]]; then
        # Windows/Mac: Docker Desktop에서 host.docker.internal 자동 지원
        log_info "Windows/Mac 환경: host.docker.internal 사용 (Kafka가 호스트 포트 9092에 노출됨)"
        KAFKA_BROKERS="host.docker.internal:9092"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux: extra_hosts로 host.docker.internal 지원됨 (docker-compose.instance-b.yml에 설정됨)
        log_info "Linux 환경: host.docker.internal 사용 (extra_hosts로 지원, Kafka가 호스트 포트 9092에 노출됨)"
        KAFKA_BROKERS="host.docker.internal:9092"
    else
        # 기타: host.docker.internal 사용
        log_info "기타 OS: host.docker.internal 사용"
        KAFKA_BROKERS="host.docker.internal:9092"
    fi
else
    KAFKA_BROKERS=${KAFKA_BROKERS:-${INSTANCE_A_IP:-host.docker.internal}:9092}
fi

# KAFKA_BROKERS 값 로그 출력
log_info "KAFKA_BROKERS 설정됨: $KAFKA_BROKERS"

# .env 파일 생성 (docker-compose에서 사용)
log_info ".env 파일 생성..."
cat > .env <<EOF
# Docker
DOCKER_USERNAME=${DOCKER_USERNAME:-local}
IMAGE_TAG=${IMAGE_TAG:-local}

# Application
NODE_ENV=${NODE_ENV:-development}
PORT=${PORT:-4000}
SOCKET_PORT=${SOCKET_PORT:-4100}

# Domain (로컬 테스트용)
DOMAIN_NAME=localhost
SSL_EMAIL=${SSL_EMAIL:-test@localhost}

# Database
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public
POSTGRES_HOST=${POSTGRES_HOST}
POSTGRES_PORT=${POSTGRES_PORT}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_PUBLIC_KEY=${JWT_PUBLIC_KEY:-}

# LOGIN CRYPTO
SECRET_LOGIN_CRYPTO=${SECRET_LOGIN_CRYPTO}

# API Key (optional)
API_KEY=${API_KEY:-}
BUILD_API_KEY=${BUILD_API_KEY:-}

# SECRET Key
COUPON_SECRET=${COUPON_SECRET:-}
PRODUCT_SECRET=${PRODUCT_SECRET:-}

# Elasticsearch (로컬에서는 같은 호스트에서 실행되므로 localhost 사용)
# 프로덕션에서는 INSTANCE_B_IP 환경 변수를 사용하여 인스턴스 B의 Elasticsearch에 접근
ELASTICSEARCH_HOSTS=${ELASTICSEARCH_HOSTS:-http://${INSTANCE_B_IP:-host.docker.internal}:9200}
ELASTICSEARCH_SUPERUSER_PASSWORD=${ELASTICSEARCH_SUPERUSER_PASSWORD}
ELASTICSEARCH_KIBANA_PASSWORD=${ELASTICSEARCH_KIBANA_PASSWORD}
ELASTICSEARCH_PRODUCER_USER_NAME=${ELASTICSEARCH_PRODUCER_USER_NAME:-producer_user}
ELASTICSEARCH_PRODUCER_USER_PASS=${ELASTICSEARCH_PRODUCER_USER_PASS}
ELASTICSEARCH_APP_USER_NAME=${ELASTICSEARCH_APP_USER_NAME:-app_user}
ELASTICSEARCH_APP_USER_PASS=${ELASTICSEARCH_APP_USER_PASS}

# Place API Service
PLACE_API_SERVICE_URL=http://place-api-service:4000

# Meta Viewer Service
# 로컬: 같은 호스트에서 실행되지만 다른 네트워크이므로 localhost:4100 사용 (호스트 포트로 접근)
# 프로덕션: INSTANCE_B_IP:4100 환경 변수를 사용하여 인스턴스 B의 Meta Viewer Service에 접근
META_VIEWER_SERVICE_URL=${META_VIEWER_SERVICE_URL:-${INSTANCE_B_IP:-host.docker.internal}:${SOCKET_PORT:-4100}}

# Kafka (로컬에서는 호스트를 통해 접근)
# 인스턴스 B의 서비스(Debezium, place-indexer-service)는 다른 네트워크이므로 
# 호스트를 통해 Kafka에 접근해야 함
# 로컬: 위에서 계산된 KAFKA_BROKERS 사용
# 프로덕션: INSTANCE_A_IP:9092 환경 변수를 사용하여 인스턴스 A의 Kafka에 접근
KAFKA_BROKERS=${KAFKA_BROKERS}

# KAFKA_ADVERTISED_HOST: 로컬에서는 host.docker.internal 사용 (Debezium 등 다른 네트워크에서 접근)
# Debezium이 host.docker.internal:9092로 접근하므로, Kafka도 동일한 주소로 advertise해야 함
# 인스턴스 A의 컨테이너들은 PLAINTEXT_INTERNAL://kafka:9093로 접근
KAFKA_ADVERTISED_HOST=${KAFKA_ADVERTISED_HOST:-host.docker.internal}

# Redis
REDIS_URL=${REDIS_URL:-redis://redis:6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-}

# Kibana
KIBANA_ENCRYPTION_KEY=${KIBANA_ENCRYPTION_KEY:-a_minimum_32_character_long_secret_key}

# Confluent Platform Version
CP_VERSION=${CP_VERSION:-7.6.0}

# Elasticsearch Version
ELASTICSEARCH_VERSION=${ELASTICSEARCH_VERSION:-8.11.0}

# Kafka UI Port
KAFKA_UI_PORT=${KAFKA_UI_PORT:-9090}
EOF

log_info "✅ .env 파일 생성 완료"

# Docker 이미지 빌드 (스킵 옵션 확인)
SKIP_BUILD=false
if [ "${SKIP_BUILD:-false}" = "true" ] || [ "$1" = "--skip-build" ]; then
    SKIP_BUILD=true
    log_info "⏭️  이미지 빌드 건너뛰기 (--skip-build 옵션 사용)"
elif [ "$1" = "--force-build" ]; then
    SKIP_BUILD=false
    log_info "🔨 강제 빌드 모드 (--force-build 옵션 사용)"
fi

if [ "$SKIP_BUILD" = "false" ]; then
    log_info "📦 Docker 이미지 빌드 시작..."
    
    # 이미지 존재 여부 확인 함수
    check_image_exists() {
        local image_name=$1
        if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${image_name}$"; then
            return 0
        else
            return 1
        fi
    }
    
    # 이미지 빌드 함수 (캐시 활용)
    build_image() {
        local service_name=$1
        local dockerfile=$2
        local context=$3
        local image_name="${DOCKER_USERNAME:-local}/${service_name}:${IMAGE_TAG:-local}"
        
        log_info "Building ${service_name}..."
        
        # 이미지가 존재하면 캐시 사용, 없으면 새로 빌드
        if check_image_exists "$image_name"; then
            log_info "  이미지 존재: $image_name (캐시 사용하여 증분 빌드)"
        else
            log_info "  새 이미지 빌드: $image_name"
        fi
        
        docker build -f "$dockerfile" -t "$image_name" "$context" || {
            log_error "${service_name} 빌드 실패"
            exit 1
        }
    }
    
    # 각 서비스 이미지 빌드
    build_image "place-api-service" "apps/place-api-service/Dockerfile" "."
    build_image "api-gateway" "apps/api-gateway/Dockerfile" "."
    build_image "meta-viewer-service" "apps/meta-viewer-service/Dockerfile" "."
    build_image "place-indexer-service" "apps/place-indexer-service/Dockerfile" "."
    build_image "mecipe-nginx" "nginx/Dockerfile" "./nginx"
    
    log_info "✅ 모든 Docker 이미지 빌드 완료"
else
    log_info "⏭️  이미지 빌드 단계 건너뛰기"
    
    # 필수 이미지 존재 확인
    REQUIRED_IMAGES=(
        "${DOCKER_USERNAME:-local}/place-api-service:${IMAGE_TAG:-local}"
        "${DOCKER_USERNAME:-local}/api-gateway:${IMAGE_TAG:-local}"
        "${DOCKER_USERNAME:-local}/meta-viewer-service:${IMAGE_TAG:-local}"
        "${DOCKER_USERNAME:-local}/place-indexer-service:${IMAGE_TAG:-local}"
        "${DOCKER_USERNAME:-local}/mecipe-nginx:${IMAGE_TAG:-local}"
    )
    
    MISSING_IMAGES=()
    for image in "${REQUIRED_IMAGES[@]}"; do
        if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${image}$"; then
            MISSING_IMAGES+=("$image")
        fi
    done
    
    if [ ${#MISSING_IMAGES[@]} -ne 0 ]; then
        log_error "필수 Docker 이미지가 없습니다:"
        for image in "${MISSING_IMAGES[@]}"; do
            echo "  - $image"
        done
        log_info "이미지를 빌드하려면 --skip-build 옵션 없이 실행하세요."
        exit 1
    fi
    
    log_info "✅ 필수 이미지 모두 존재함"
fi

# ============================================
# 인스턴스 B - Elasticsearch 먼저 배포
# ============================================
log_info "🚀 인스턴스 B - Elasticsearch 배포 시작..."

docker compose -f docker-compose.instance-b.yml up -d elasticsearch || {
    log_error "Elasticsearch 배포 실패"
    exit 1
}

log_info "⏳ Elasticsearch가 준비될 때까지 대기..."
# healthcheck 대신 직접 API 호출로 확인 (더 안정적)
for i in {1..36}; do
    if docker compose -f docker-compose.instance-b.yml exec -T elasticsearch curl -s -u elastic:${ELASTICSEARCH_SUPERUSER_PASSWORD} http://localhost:9200/_cluster/health > /dev/null 2>&1; then
        log_info "✅ Elasticsearch가 준비되었습니다"
        break
    fi
    if [ $i -eq 36 ]; then
        log_warn "Elasticsearch 준비 대기 타임아웃, 계속 진행..."
    else
        sleep 5
    fi
done
sleep 15

# Elasticsearch 사용자 초기화
log_info "🔧 Elasticsearch 사용자 초기화..."
chmod +x scripts/prod/init-elasticsearch-users.sh || true
# 환경 변수를 명시적으로 인라인으로 전달 (하위 스크립트에서 .env 파일이 덮어쓰지 않도록)
ELASTICSEARCH_HOSTS="http://localhost:9200" ./scripts/prod/init-elasticsearch-users.sh || {
    log_warn "Elasticsearch 사용자 초기화 실패, 계속 진행..."
}

log_info "✅ Elasticsearch 배포 완료"

# ============================================
# 인스턴스 A 배포
# ============================================
log_info "🚀 인스턴스 A 배포 시작..."

# Kafka 인프라 배포
log_info "📦 Kafka 인프라 배포..."
docker compose -f docker-compose.instance-a.yml up -d zookeeper || {
    log_error "Zookeeper 배포 실패"
    exit 1
}

log_info "⏳ Zookeeper가 준비될 때까지 대기..."
timeout 120 bash -c 'until docker compose -f docker-compose.instance-a.yml ps zookeeper | grep -q "healthy"; do sleep 2; done' || {
    log_warn "Zookeeper health check 타임아웃, 계속 진행..."
}
sleep 10

docker compose -f docker-compose.instance-a.yml up -d kafka || {
    log_error "Kafka 배포 실패"
    exit 1
}

log_info "⏳ Kafka가 준비될 때까지 대기..."
timeout 180 bash -c 'until docker compose -f docker-compose.instance-a.yml ps kafka | grep -q "healthy"; do sleep 3; done' || {
    log_warn "Kafka health check 타임아웃, 계속 진행..."
}
sleep 15

docker compose -f docker-compose.instance-a.yml up -d schema-registry connect ksqldb || {
    log_error "Kafka ecosystem 서비스 배포 실패"
    exit 1
}
sleep 30

# KSQLDB 상태 확인 (Kafka 연결 확인 포함)
log_info "🔍 KSQLDB 상태 및 Kafka 연결 확인..."
for i in {1..30}; do
    # KSQLDB HTTP 엔드포인트 확인
    if docker compose -f docker-compose.instance-a.yml exec -T ksqldb curl -s -f http://localhost:8088/info > /dev/null 2>&1; then
        log_info "✅ KSQLDB HTTP 엔드포인트 준비됨"
        # Kafka 연결 확인 (KSQLDB 로그에서 확인)
        KSQLDB_LOGS=$(docker compose -f docker-compose.instance-a.yml logs ksqldb --tail=5 2>&1 | grep -i "error\|exception" || echo "")
        if [ -z "$KSQLDB_LOGS" ] || echo "$KSQLDB_LOGS" | grep -vq "Connection.*could not be established"; then
            log_info "✅ KSQLDB가 정상 상태로 보입니다"
            break
        fi
    fi
    if [ $i -eq 10 ] || [ $i -eq 20 ]; then
        log_info "  KSQLDB 상태 확인 중... (시도 $i/30)"
        log_info "  KSQLDB 로그:"
        docker compose -f docker-compose.instance-a.yml logs --tail=15 ksqldb || true
        log_info "  Kafka 상태:"
        docker compose -f docker-compose.instance-a.yml ps kafka || true
    fi
    sleep 2
done

# KSQLDB 쿼리 초기화
log_info "🔧 KSQLDB 쿼리 초기화..."
chmod +x scripts/prod/init-ksqldb-queries.sh || true
export KSQLDB_URL="http://localhost:8088"
./scripts/prod/init-ksqldb-queries.sh || {
    log_warn "KSQLDB 쿼리 초기화 실패, 계속 진행..."
    log_info "KSQLDB 로그 확인 (최근 30줄):"
    docker compose -f docker-compose.instance-a.yml logs --tail=30 ksqldb || true
}

# 애플리케이션 배포
log_info "📦 애플리케이션 배포..."
docker compose -f docker-compose.instance-a.yml up -d place-api-service api-gateway || {
    log_error "애플리케이션 배포 실패"
    exit 1
}
sleep 30

# 지원 서비스 배포
log_info "📦 지원 서비스 배포..."
docker compose -f docker-compose.instance-a.yml up -d kafka-ui || {
    log_warn "kafka-ui 배포 실패, 계속 진행..."
}
sleep 10

# Nginx 배포 (SSL 없이)
log_info "📦 Nginx 배포 (HTTP only, SSL 없음)..."
docker compose -f docker-compose.instance-a.yml up -d nginx || {
    log_error "Nginx 배포 실패"
    exit 1
}

# 데이터베이스 마이그레이션
log_info "🔧 데이터베이스 마이그레이션 실행..."
docker compose -f docker-compose.instance-a.yml exec -T place-api-service sh -c "cd /app/apps/place-api-service && prisma migrate deploy --schema=./prisma/schema.prisma" || {
    log_warn "데이터베이스 마이그레이션 실패 또는 적용할 마이그레이션이 없음"
}

log_info "✅ 인스턴스 A 배포 완료"

# ============================================
# 인스턴스 B - 나머지 서비스 배포
# ============================================
log_info "🚀 인스턴스 B - 나머지 서비스 배포 시작..."

# Redis 배포
log_info "📦 Redis 배포..."
docker compose -f docker-compose.instance-b.yml up -d redis || {
    log_error "Redis 배포 실패"
    exit 1
}

log_info "⏳ Redis가 준비될 때까지 대기..."
timeout 60 bash -c 'until docker compose -f docker-compose.instance-b.yml ps redis | grep -q "healthy"; do sleep 2; done' || {
    log_warn "Redis health check 타임아웃, 계속 진행..."
}
sleep 5

# Kibana 배포
log_info "📦 Kibana 배포..."
docker compose -f docker-compose.instance-b.yml up -d kibana || {
    log_error "Kibana 배포 실패"
    exit 1
}
sleep 30

# Debezium 배포
log_info "📦 Debezium 배포..."
docker compose -f docker-compose.instance-b.yml up -d debezium || {
    log_error "Debezium 배포 실패"
    exit 1
}

log_info "⏳ Debezium이 준비될 때까지 대기..."
# Debezium은 start_period(60s) + health check 성공까지 시간이 필요
# health: starting 상태도 허용 (start_period 동안은 정상)
# 최대 180초 대기 (start_period 60s + health check 간격 30s * 4회)
MAX_WAIT=180
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    STATUS=$(docker compose -f docker-compose.instance-b.yml ps debezium --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "")
    if [ "$STATUS" = "healthy" ]; then
        log_info "✅ Debezium이 healthy 상태입니다"
        break
    elif [ "$STATUS" = "starting" ]; then
        # health: starting은 정상 (start_period 동안)
        if [ $((WAIT_COUNT % 15)) -eq 0 ]; then
            log_info "  Debezium이 시작 중입니다... (health: starting, ${WAIT_COUNT}s/${MAX_WAIT}s)"
        fi
    elif [ -z "$STATUS" ]; then
        # 상태 정보가 없으면 컨테이너가 아직 시작 중
        if [ $((WAIT_COUNT % 15)) -eq 0 ]; then
            log_info "  Debezium 컨테이너 시작 중... (${WAIT_COUNT}s/${MAX_WAIT}s)"
        fi
    fi
    
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        log_warn "Debezium health check 타임아웃 (${MAX_WAIT}s), 현재 상태: ${STATUS:-unknown}"
        log_warn "Debezium 로그 확인:"
        docker compose -f docker-compose.instance-b.yml logs --tail=20 debezium || true
        break
    fi
    
    WAIT_COUNT=$((WAIT_COUNT + 3))
    sleep 3
done
sleep 5

# Debezium connector 초기화
log_info "🔧 Debezium connector 초기화..."
chmod +x scripts/prod/init-debezium-connector.sh || true
export DEBEZIUM_URL="http://localhost:8084"  # 로컬에서는 호스트 포트 8084 사용
./scripts/prod/init-debezium-connector.sh || {
    log_warn "Debezium connector 초기화 실패, 계속 진행..."
}

# 애플리케이션 배포
log_info "📦 애플리케이션 배포..."
docker compose -f docker-compose.instance-b.yml up -d meta-viewer-service place-indexer-service || {
    log_error "애플리케이션 배포 실패"
    exit 1
}
sleep 30

log_info "✅ 인스턴스 B 배포 완료"

# ============================================
# 헬스 체크
# ============================================
log_info "🏥 헬스 체크 시작..."
sleep 20

# 인스턴스 A 헬스 체크
if docker compose -f docker-compose.instance-a.yml ps | grep -q "Up"; then
    log_info "✅ 인스턴스 A 서비스 실행 중"
    if curl -f http://localhost/health 2>/dev/null; then
        log_info "✅ 인스턴스 A 헬스 체크 통과"
    else
        log_warn "⚠️ 인스턴스 A 헬스 엔드포인트 응답 없음"
    fi
else
    log_error "❌ 인스턴스 A 일부 서비스 시작 실패"
    docker compose -f docker-compose.instance-a.yml logs --tail=50
fi

# 인스턴스 B 헬스 체크
if docker compose -f docker-compose.instance-b.yml ps | grep -q "Up"; then
    log_info "✅ 인스턴스 B 서비스 실행 중"
    
    if curl -s -u elastic:${ELASTICSEARCH_SUPERUSER_PASSWORD} http://localhost:9200/_cluster/health 2>/dev/null; then
        log_info "✅ Elasticsearch 헬스 체크 통과"
    else
        log_warn "⚠️ Elasticsearch 응답 없음"
    fi
    
    if docker compose -f docker-compose.instance-b.yml exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_info "✅ Redis 헬스 체크 통과"
    else
        log_warn "⚠️ Redis 응답 없음"
    fi
else
    log_error "❌ 인스턴스 B 일부 서비스 시작 실패"
    docker compose -f docker-compose.instance-b.yml logs --tail=50
fi

# ============================================
# 완료 메시지
# ============================================
log_info ""
log_info "🎉 로컬 배포 완료!"
log_info ""
log_info "접속 정보:"
log_info "  - API Gateway: http://localhost"
log_info "  - Kafka UI: http://localhost:${KAFKA_UI_PORT:-9090}"
log_info "  - KSQLDB: http://localhost:8088"
log_info "  - Kibana: http://localhost:5601"
log_info "  - Elasticsearch: http://localhost:9200"
log_info ""
log_info "서비스 상태 확인:"
log_info "  docker compose -f docker-compose.instance-a.yml ps"
log_info "  docker compose -f docker-compose.instance-b.yml ps"
log_info ""
log_info "로그 확인:"
log_info "  docker compose -f docker-compose.instance-a.yml logs -f"
log_info "  docker compose -f docker-compose.instance-b.yml logs -f"
log_info ""
