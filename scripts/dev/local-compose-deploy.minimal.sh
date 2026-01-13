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

# 필수 환경 변수 확인 (minimal 버전: Elasticsearch, Kafka 관련 제외)
# PostgreSQL은 로컬에서 실행되므로 POSTGRES_HOST는 선택사항 (기본값: postgres)
REQUIRED_VARS=(
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "JWT_SECRET"
    "SECRET_LOGIN_CRYPTO"
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

# Minimal 버전: Kafka 관련 설정 제외

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

# Database (로컬 PostgreSQL 사용)
# minimal 버전에서는 로컬 PostgreSQL 컨테이너 사용
POSTGRES_HOST=${POSTGRES_HOST:-db-place}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
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

# Elasticsearch (minimal 버전에서는 제외, 외부 Elasticsearch 사용 시에만 설정)
# ELASTICSEARCH_HOSTS=${ELASTICSEARCH_HOSTS:-http://${INSTANCE_B_IP:-host.docker.internal}:9200}
# ELASTICSEARCH_APP_USER_NAME=${ELASTICSEARCH_APP_USER_NAME:-app_user}
# ELASTICSEARCH_APP_USER_PASS=${ELASTICSEARCH_APP_USER_PASS}

# Place API Service
PLACE_API_SERVICE_URL=http://place-api-service:4000

# Meta Viewer Service
# 로컬: 같은 호스트에서 실행되지만 다른 네트워크이므로 localhost:4100 사용 (호스트 포트로 접근)
# 프로덕션: INSTANCE_B_IP:4100 환경 변수를 사용하여 인스턴스 B의 Meta Viewer Service에 접근
META_VIEWER_SERVICE_URL=${META_VIEWER_SERVICE_URL:-${INSTANCE_B_IP:-host.docker.internal}:${SOCKET_PORT:-4100}}

# Kafka (minimal 버전에서는 제외)

# Redis
REDIS_URL=${REDIS_URL:-redis://redis:6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-}

# Kibana
KIBANA_ENCRYPTION_KEY=${KIBANA_ENCRYPTION_KEY:-a_minimum_32_character_long_secret_key}

# Minimal 버전: Kafka, Elasticsearch 관련 버전 정보 제외
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
    
    # 각 서비스 이미지 빌드 (minimal 버전: place-indexer-service 제외)
    build_image "place-api-service" "apps/place-api-service/Dockerfile" "."
    build_image "api-gateway" "apps/api-gateway/Dockerfile" "."
    build_image "meta-viewer-service" "apps/meta-viewer-service/Dockerfile" "."
    build_image "mecipe-nginx" "nginx/Dockerfile" "./nginx"
    
    log_info "✅ 모든 Docker 이미지 빌드 완료"
else
    log_info "⏭️  이미지 빌드 단계 건너뛰기"
    
    # 필수 이미지 존재 확인 (minimal 버전: place-indexer-service 제외)
    REQUIRED_IMAGES=(
        "${DOCKER_USERNAME:-local}/place-api-service:${IMAGE_TAG:-local}"
        "${DOCKER_USERNAME:-local}/api-gateway:${IMAGE_TAG:-local}"
        "${DOCKER_USERNAME:-local}/meta-viewer-service:${IMAGE_TAG:-local}"
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
# 인스턴스 B - Redis 먼저 배포 (minimal 버전: Elasticsearch 제외)
# ============================================
log_info "🚀 인스턴스 B - Redis 배포 시작..."

docker compose -f docker-compose.minimal.instance-b.yml up -d redis || {
    log_error "Redis 배포 실패"
    exit 1
}

log_info "⏳ Redis가 준비될 때까지 대기..."
timeout 60 bash -c 'until docker compose -f docker-compose.minimal.instance-b.yml ps redis | grep -q "healthy"; do sleep 2; done' || {
    log_warn "Redis health check 타임아웃, 계속 진행..."
}
sleep 5

log_info "✅ Redis 배포 완료"

# ============================================
# 인스턴스 A 배포 (minimal 버전: Kafka 인프라 제외)
# ============================================
log_info "🚀 인스턴스 A 배포 시작..."

# PostgreSQL 배포
log_info "📦 PostgreSQL 배포..."
docker compose -f docker-compose.minimal.instance-a.yml up -d db-place || {
    log_error "PostgreSQL 배포 실패"
    exit 1
}

log_info "⏳ PostgreSQL이 준비될 때까지 대기..."
timeout 60 bash -c 'until docker compose -f docker-compose.minimal.instance-a.yml ps db-place | grep -q "healthy"; do sleep 2; done' || {
    log_warn "PostgreSQL health check 타임아웃, 계속 진행..."
}
sleep 5

# PostgreSQL wal_level 확인 (Debezium용)
log_info "🔍 PostgreSQL 설정 확인 (wal_level=logical for Debezium)..."
docker compose -f docker-compose.minimal.instance-a.yml exec -T db-place psql -U ${POSTGRES_USER:-mecipe_user} -d ${POSTGRES_DB:-mecipe_db} -c "SHOW wal_level;" 2>/dev/null || {
    log_warn "PostgreSQL 설정 확인 실패, 계속 진행..."
}

log_info "✅ PostgreSQL 배포 완료"

# 애플리케이션 배포
log_info "📦 애플리케이션 배포..."
docker compose -f docker-compose.minimal.instance-a.yml up -d place-api-service api-gateway || {
    log_error "애플리케이션 배포 실패"
    exit 1
}
sleep 30

# Minimal 버전: kafka-ui 제외

# Nginx 배포 (SSL 없이)
log_info "📦 Nginx 배포 (HTTP only, SSL 없음)..."
docker compose -f docker-compose.minimal.instance-a.yml up -d nginx || {
    log_error "Nginx 배포 실패"
    exit 1
}

# 데이터베이스 마이그레이션
log_info "🔧 데이터베이스 마이그레이션 실행..."
docker compose -f docker-compose.minimal.instance-a.yml exec -T place-api-service sh -c "cd /app/apps/place-api-service && prisma migrate deploy --schema=./prisma/schema.prisma" || {
    log_warn "데이터베이스 마이그레이션 실패 또는 적용할 마이그레이션이 없음"
}

log_info "✅ 인스턴스 A 배포 완료"

# ============================================
# 인스턴스 B - 나머지 서비스 배포 (minimal 버전: Kibana, Debezium 제외)
# ============================================
log_info "🚀 인스턴스 B - 나머지 서비스 배포 시작..."

# Redis는 이미 위에서 배포됨

# 애플리케이션 배포 (minimal 버전: place-indexer-service 제외)
log_info "📦 애플리케이션 배포..."
docker compose -f docker-compose.minimal.instance-b.yml up -d meta-viewer-service || {
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
if docker compose -f docker-compose.minimal.instance-a.yml ps | grep -q "Up"; then
    log_info "✅ 인스턴스 A 서비스 실행 중"
    
    # PostgreSQL 헬스 체크
    if docker compose -f docker-compose.minimal.instance-a.yml exec -T db-place pg_isready -U ${POSTGRES_USER:-mecipe_user} 2>/dev/null | grep -q "accepting connections"; then
        log_info "✅ PostgreSQL 헬스 체크 통과"
    else
        log_warn "⚠️ PostgreSQL 응답 없음"
    fi
    
    if curl -f http://localhost/health 2>/dev/null; then
        log_info "✅ 인스턴스 A 헬스 체크 통과"
    else
        log_warn "⚠️ 인스턴스 A 헬스 엔드포인트 응답 없음"
    fi
else
    log_error "❌ 인스턴스 A 일부 서비스 시작 실패"
    docker compose -f docker-compose.minimal.instance-a.yml logs --tail=50
fi

# 인스턴스 B 헬스 체크 (minimal 버전: Elasticsearch 제외)
if docker compose -f docker-compose.minimal.instance-b.yml ps | grep -q "Up"; then
    log_info "✅ 인스턴스 B 서비스 실행 중"
    
    if docker compose -f docker-compose.minimal.instance-b.yml exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_info "✅ Redis 헬스 체크 통과"
    else
        log_warn "⚠️ Redis 응답 없음"
    fi
else
    log_error "❌ 인스턴스 B 일부 서비스 시작 실패"
    docker compose -f docker-compose.minimal.instance-b.yml logs --tail=50
fi

# ============================================
# 완료 메시지
# ============================================
log_info ""
log_info "🎉 로컬 배포 완료!"
log_info ""
log_info "접속 정보:"
log_info "  - API Gateway: http://localhost"
log_info "  - Meta Viewer Service: http://localhost:${SOCKET_PORT:-4100}"
log_info "  - PostgreSQL: localhost:${POSTGRES_PORT:-5432}"
log_info ""
log_info "⚠️  Minimal 버전: Kafka, Debezium, Elasticsearch, Kibana, place-indexer-service 제외됨"
log_info "📝 PostgreSQL은 wal_level=logical로 설정되어 Debezium 사용 가능"
log_info ""
log_info "서비스 상태 확인:"
log_info "  docker compose -f docker-compose.minimal.instance-a.yml ps"
log_info "  docker compose -f docker-compose.minimal.instance-b.yml ps"
log_info ""
log_info "로그 확인:"
log_info "  docker compose -f docker-compose.minimal.instance-a.yml logs -f"
log_info "  docker compose -f docker-compose.minimal.instance-b.yml logs -f"
log_info ""
