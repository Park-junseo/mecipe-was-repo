#!/bin/bash

# 로컬에서 GitHub Actions와 동일한 방식으로 Helm 배포 테스트
# 사용법: ./scripts/dev/local-deploy-test.sh [infra|apps|all]
# 
# 예시:
#   ./scripts/dev/local-deploy-test.sh infra    # 인프라만 배포
#   ./scripts/dev/local-deploy-test.sh apps     # 앱만 배포 (인프라가 이미 배포된 경우)
#   ./scripts/dev/local-deploy-test.sh all      # 전체 배포

set -e

DEPLOY_TYPE="${1:-all}"

echo "======================================"
echo "로컬 배포 테스트 시작"
echo "배포 타입: ${DEPLOY_TYPE}"
echo "======================================"

# 색상 출력
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 환경 변수 확인
check_env_vars() {
    echo -e "${YELLOW}📋 환경 변수 확인...${NC}"
    
    # 필수 환경 변수
    REQUIRED_VARS=(
        "POSTGRES_PASSWORD"
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
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo -e "${RED}❌ 필수 환경 변수가 설정되지 않았습니다:${NC}"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "환경 변수 또는 .env 파일에서 설정하세요."
        exit 1
    fi
    
    # 기본값 설정
    export POSTGRES_DEPLOY="${POSTGRES_DEPLOY:-true}"
    export POSTGRES_USER="${POSTGRES_USER:-postgres}"
    export POSTGRES_DB="${POSTGRES_DB:-virtualcafe}"
    export POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
    export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
    export ELASTICSEARCH_PRODUCER_USER_NAME="${ELASTICSEARCH_PRODUCER_USER_NAME:-producer}"
    export ELASTICSEARCH_APP_USER_NAME="${ELASTICSEARCH_APP_USER_NAME:-app}"
    export DOCKER_USERNAME="${DOCKER_USERNAME:-local}"
    export IMAGE_TAG="${IMAGE_TAG:-local}"
    export DOMAIN_NAME="${DOMAIN_NAME:-localhost}"
    export PORT="${PORT:-4000}"
    export SOCKET_PORT="${SOCKET_PORT:-4100}"
    
    echo -e "${GREEN}✅ 환경 변수 확인 완료${NC}"
    echo "  PostgreSQL: ${POSTGRES_DEPLOY} (${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB})"
    echo "  Docker Registry: ${DOCKER_USERNAME}"
    echo "  Image Tag: ${IMAGE_TAG}"
    echo ""
    echo -e "${BLUE}ℹ️  로컬 배포 설정:${NC}"
    echo "  - 이미지 태그: ${IMAGE_TAG} (GitHub Actions는 커밋 SHA 사용)"
    echo "  - Docker Registry: ${DOCKER_USERNAME} (GitHub Actions는 secrets.DOCKER_USERNAME 사용)"
    echo "  - 같은 클러스터에서 실행 시 마지막 배포가 이전 배포를 덮어씁니다"
    echo ""
}

# Helm 설치 확인
check_helm() {
    echo -e "${YELLOW}📋 Helm 설치 확인...${NC}"
    
    if ! command -v helm &> /dev/null; then
        echo -e "${RED}❌ Helm이 설치되지 않았습니다.${NC}"
        echo "설치 방법: https://helm.sh/docs/intro/install/"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Helm 설치 확인: $(helm version --short)${NC}"
}

# kubectl 설치 확인
check_kubectl() {
    echo -e "${YELLOW}📋 kubectl 설치 확인...${NC}"
    
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}❌ kubectl이 설치되지 않았습니다.${NC}"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Kubernetes 클러스터에 연결할 수 없습니다.${NC}"
        echo "kubectl config를 확인하세요."
        exit 1
    fi
    
    echo -e "${GREEN}✅ kubectl 연결 확인${NC}"
    kubectl cluster-info | head -1
}

# Docker 설치 확인
check_docker() {
    echo -e "${YELLOW}📋 Docker 설치 확인...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker가 설치되지 않았습니다.${NC}"
        exit 1
    fi
    
    if ! docker ps &> /dev/null; then
        echo -e "${RED}❌ Docker 서비스가 실행 중이지 않습니다.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker 확인 완료${NC}"
}

# 노드 라벨링 (로컬 환경용 - 선택적)
label_nodes() {
    echo -e "${YELLOW}📋 노드 라벨링 확인...${NC}"
    
    NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    if [ -z "$NODES" ]; then
        echo -e "${RED}❌ 노드를 찾을 수 없습니다.${NC}"
        exit 1
    fi
    
    # 첫 번째 노드에 app과 data 라벨 모두 추가 (로컬 단일 노드 환경)
    FIRST_NODE=$(echo $NODES | awk '{print $1}')
    echo -e "${BLUE}ℹ️  로컬 환경: 첫 번째 노드에 app과 data 라벨 추가${NC}"
    kubectl label node "$FIRST_NODE" role-app=true --overwrite
    kubectl label node "$FIRST_NODE" role-data=true --overwrite 
    
    echo -e "${GREEN}✅ 노드 라벨링 완료${NC}"
    kubectl get nodes --show-labels | grep -E "NAME|node-role"
}

# 네임스페이스 생성
create_namespaces() {
    echo -e "${YELLOW}📋 네임스페이스 생성...${NC}"
    
    kubectl create namespace app --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true
    kubectl create namespace data --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true
    kubectl create namespace ingress-nginx --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true
    
    echo -e "${GREEN}✅ 네임스페이스 생성 완료${NC}"
}

# Docker 이미지 빌드
build_docker_images() {
    echo ""
    echo "======================================"
    echo "Docker 이미지 빌드"
    echo "======================================"
    
    read -p "로컬 Docker 이미지를 빌드하시겠습니까? (y/N): " build_images
    if [ "${build_images}" != "y" ] && [ "${build_images}" != "Y" ]; then
        echo -e "${YELLOW}⏭️  Docker 이미지 빌드를 건너뜁니다.${NC}"
        echo "레지스트리에서 이미지를 가져오거나 이미 빌드된 이미지를 사용하세요."
        return
    fi
    
    echo -e "${YELLOW}📦 mecipe-api-server 이미지 빌드...${NC}"
    # 모노레포 구조이므로 프로젝트 루트를 빌드 컨텍스트로 사용
    docker build -f mecipe-was/Dockerfile -t "${DOCKER_USERNAME}/mecipe-api-server:${IMAGE_TAG}" . || {
        echo -e "${RED}❌ mecipe-api-server 이미지 빌드 실패${NC}"
        exit 1
    }
    
    echo -e "${YELLOW}📦 place-indexer-service 이미지 빌드...${NC}"
    # 모노레포 구조이므로 프로젝트 루트를 빌드 컨텍스트로 사용
    docker build -f apps/place-indexer-service/Dockerfile -t "${DOCKER_USERNAME}/place-indexer-service:${IMAGE_TAG}" . || {
        echo -e "${RED}❌ place-indexer-service 이미지 빌드 실패${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✅ Docker 이미지 빌드 완료${NC}"
}

# 인프라 배포
deploy_infrastructure() {
    echo ""
    echo "======================================"
    echo "인프라 배포"
    echo "======================================"
    
    # 1. Kafka 배포 (app namespace)
    echo -e "${BLUE}📦 Kafka 배포 (app namespace)...${NC}"
    cd ./infra/helm/kafka
    helm dependency update
    cd ../../..
    
    helm upgrade --install kafka ./infra/helm/kafka \
        --namespace app \
        --create-namespace \
        --wait \
        --timeout 15m \
        --set nodeSelector.role-app=true \
        --set kafka.enabled=true \
        --set kafka.nodeSelector.node-role=app || {
        echo -e "${YELLOW}⚠️  Kafka 배포가 타임아웃되었습니다.${NC}"
    }
    
    echo -e "${YELLOW}⏳ Kafka가 Ready 상태가 될 때까지 대기...${NC}"
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kafka -n app --timeout=10m || {
        echo -e "${YELLOW}⚠️  Kafka가 아직 Ready 상태가 아닙니다.${NC}"
    }
    
    # 2. PostgreSQL 및 관련 서비스 배포 (data namespace)
    echo ""
    echo -e "${BLUE}📦 PostgreSQL 및 관련 서비스 배포 (data namespace)...${NC}"
    
    if [ "$POSTGRES_DEPLOY" = "false" ]; then
        echo -e "${YELLOW}⏭️  PostgreSQL 배포 건너뜀 (외부 데이터베이스 사용)${NC}"
        POSTGRES_CONNECTION_HOST="${POSTGRES_HOST}"
        POSTGRES_CONNECTION_PORT="${POSTGRES_PORT}"
    else
        echo -e "${BLUE}📦 PostgreSQL 배포...${NC}"
        helm upgrade --install postgres ./infra/helm/postgres \
            --namespace data \
            --create-namespace \
            --wait \
            --timeout 10m \
            --set nodeSelector.role-data=true \
            --set enabled=true \
            --set secrets.postgresPassword="${POSTGRES_PASSWORD}" \
            --set auth.username="${POSTGRES_USER}" \
            --set auth.database="${POSTGRES_DB}" || {
            echo -e "${YELLOW}⚠️  PostgreSQL 배포가 타임아웃되었습니다.${NC}"
        }
        POSTGRES_CONNECTION_HOST="postgres.data.svc.cluster.local"
        POSTGRES_CONNECTION_PORT="5432"
    fi
    
    # PostgreSQL 연결 정보 관리
    echo -e "${BLUE}📦 PostgreSQL 연결 정보 관리...${NC}"
    helm upgrade --install postgres-connection ./infra/helm/postgres-connection \
        --namespace data \
        --create-namespace \
        --wait \
        --timeout 5m \
        --set nodeSelector.role-data=true \
        --set connection.host="${POSTGRES_CONNECTION_HOST}" \
        --set connection.port="${POSTGRES_CONNECTION_PORT}" \
        --set connection.username="${POSTGRES_USER}" \
        --set connection.password="${POSTGRES_PASSWORD}" \
        --set connection.database="${POSTGRES_DB}" \
        --set connection.url="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_CONNECTION_HOST}:${POSTGRES_CONNECTION_PORT}/${POSTGRES_DB}?schema=public}" \
        --set service.enabled="$([ "$POSTGRES_DEPLOY" = "false" ] && echo "false" || echo "true")" || {
        echo -e "${YELLOW}⚠️  postgres-connection 배포 실패${NC}"
    }
    
    # Elasticsearch
    echo -e "${BLUE}📦 Elasticsearch 배포...${NC}"
    helm upgrade --install elasticsearch ./infra/helm/elasticsearch \
        --namespace data \
        --create-namespace \
        --wait \
        --timeout 10m \
        --set nodeSelector.role-data=true \
        --set secrets.superuser.password="${ELASTICSEARCH_SUPERUSER_PASSWORD}" \
        --set secrets.kibana.password="${ELASTICSEARCH_KIBANA_PASSWORD}" \
        --set secrets.producerUser.password="${ELASTICSEARCH_PRODUCER_USER_PASS}" \
        --set secrets.producerUser.username="${ELASTICSEARCH_PRODUCER_USER_NAME}" \
        --set secrets.appUser.password="${ELASTICSEARCH_APP_USER_PASS}" \
        --set secrets.appUser.username="${ELASTICSEARCH_APP_USER_NAME}" || {
        echo -e "${YELLOW}⚠️  Elasticsearch 배포가 타임아웃되었습니다.${NC}"
    }
    
    # Debezium
    if [ "$POSTGRES_DEPLOY" = "false" ]; then
        DEBEZIUM_POSTGRES_HOST="${POSTGRES_CONNECTION_HOST}"
        DEBEZIUM_POSTGRES_PORT="${POSTGRES_CONNECTION_PORT}"
    else
        DEBEZIUM_POSTGRES_HOST="postgres.data.svc.cluster.local"
        DEBEZIUM_POSTGRES_PORT="5432"
    fi
    
    DEBEZIUM_KAFKA_BOOTSTRAP_SERVERS="kafka.app.svc.cluster.local:9092"
    echo -e "${BLUE}📦 Debezium 배포 (Kafka: ${DEBEZIUM_KAFKA_BOOTSTRAP_SERVERS}, PostgreSQL: ${DEBEZIUM_POSTGRES_HOST}:${DEBEZIUM_POSTGRES_PORT})...${NC}"
    helm upgrade --install debezium ./infra/helm/debezium \
        --namespace data \
        --create-namespace \
        --wait \
        --timeout 10m \
        --set nodeSelector.role-data=true \
        --set kafka.bootstrapServers="${DEBEZIUM_KAFKA_BOOTSTRAP_SERVERS}" \
        --set connector.database.hostname="${DEBEZIUM_POSTGRES_HOST}" \
        --set connector.database.port="${DEBEZIUM_POSTGRES_PORT}" \
        --set connector.database.user="${POSTGRES_USER}" \
        --set connector.database.password="${POSTGRES_PASSWORD}" \
        --set connector.database.dbname="${POSTGRES_DB}" || {
        echo -e "${YELLOW}⚠️  Debezium 배포가 타임아웃되었습니다.${NC}"
    }
    
    # Kibana
    echo -e "${BLUE}📦 Kibana 배포...${NC}"
    helm upgrade --install kibana ./infra/helm/kibana \
        --namespace data \
        --create-namespace \
        --wait \
        --timeout 10m \
        --set nodeSelector.role-data=true \
        --set secrets.kibanaPassword="${ELASTICSEARCH_KIBANA_PASSWORD}" || {
        echo -e "${YELLOW}⚠️  Kibana 배포가 타임아웃되었습니다.${NC}"
    }
    
    # 3. Kafka UI, KSQLDB 배포 (app namespace)
    echo ""
    echo -e "${BLUE}📦 Kafka UI 및 KSQLDB 배포 (app namespace)...${NC}"
    
    # Kafka UI
    echo -e "${BLUE}📦 Kafka UI 배포...${NC}"
    helm upgrade --install kafka-ui ./infra/helm/kafka-ui \
        --namespace app \
        --create-namespace \
        --wait \
        --timeout 10m \
        --set nodeSelector.role-app=true \
        || {
        echo -e "${YELLOW}⚠️  Kafka UI 배포가 타임아웃되었습니다.${NC}"
    }
    
    # KSQLDB
    echo -e "${BLUE}📦 KSQLDB 배포...${NC}"
    helm upgrade --install ksqldb ./infra/helm/ksqldb \
        --namespace app \
        --create-namespace \
        --wait \
        --timeout 10m \
        --set nodeSelector.role-app=true \
        || {
        echo -e "${YELLOW}⚠️  KSQLDB 배포가 타임아웃되었습니다.${NC}"
    }
    
    # 4. ingress-nginx 배포
    echo ""
    echo -e "${BLUE}📦 ingress-nginx 배포...${NC}"
    cd ./infra/helm/ingress-nginx
    helm dependency update
    cd ../../..
    
    helm upgrade --install ingress-nginx ./infra/helm/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --wait \
        --timeout 10m \
        --set ingress-nginx.controller.nodeSelector.role-app=true \
        -f ./infra/helm/ingress-nginx/values.yaml || {
        echo -e "${YELLOW}⚠️  ingress-nginx 배포가 타임아웃되었습니다.${NC}"
    }
    
    echo ""
    echo -e "${GREEN}✅ 인프라 배포 완료${NC}"
    
    # 배포 상태 확인
    echo ""
    echo -e "${YELLOW}📋 배포 상태 확인...${NC}"
    echo "--- app namespace ---"
    kubectl get pods -n app
    echo ""
    echo "--- data namespace ---"
    kubectl get pods -n data
    echo ""
    echo "--- ingress-nginx namespace ---"
    kubectl get pods -n ingress-nginx
}

# 인프라 준비 상태 확인
wait_for_infrastructure() {
    echo ""
    echo "======================================"
    echo "인프라 준비 상태 확인"
    echo "======================================"
    
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        KAFKA_READY=$(kubectl get pods -n app -l app.kubernetes.io/name=kafka -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")
        ES_READY=$(kubectl get pods -n data -l app.kubernetes.io/name=elasticsearch -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")
        POSTGRES_READY=$(kubectl get pods -n data -l app.kubernetes.io/name=postgres -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "Unknown")
        
        echo "📊 Infrastructure status:"
        echo "  Kafka: $KAFKA_READY"
        echo "  Elasticsearch: $ES_READY"
        echo "  PostgreSQL: $POSTGRES_READY"
        
        if [ "$KAFKA_READY" = "True" ] && [ "$ES_READY" = "True" ]; then
            echo -e "${GREEN}✅ Infrastructure is ready!${NC}"
            break
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "⏳ Waiting for infrastructure... ($RETRY_COUNT/$MAX_RETRIES) - retrying in 10s"
            sleep 10
        fi
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${YELLOW}⚠️  Infrastructure may not be fully ready, but continuing...${NC}"
    fi
}

# 앱 배포
deploy_applications() {
    echo ""
    echo "======================================"
    echo "애플리케이션 배포"
    echo "======================================"
    
    # PostgreSQL 연결 정보 결정
    if [ "$POSTGRES_DEPLOY" = "false" ]; then
        POSTGRES_CONNECTION_HOST="${POSTGRES_HOST}"
        POSTGRES_CONNECTION_PORT="${POSTGRES_PORT}"
    else
        POSTGRES_CONNECTION_HOST="postgres.data.svc.cluster.local"
        POSTGRES_CONNECTION_PORT="5432"
    fi
    
    # Mecipe WAS
    echo -e "${BLUE}📦 Mecipe WAS 배포...${NC}"
    helm upgrade --install mecipe-was ./infra/helm/apps/mecipe-was \
        --namespace app \
        --create-namespace \
        --wait \
        --timeout 10m \
        --set nodeSelector.role-app=true \
        --set global.dockerRegistry="${DOCKER_USERNAME}" \
        --set image.repository="${DOCKER_USERNAME}/mecipe-api-server" \
        --set image.tag="${IMAGE_TAG}" \
        --set env.nodeEnv="production" \
        --set postgres.username="${POSTGRES_USER}" \
        --set postgres.password="${POSTGRES_PASSWORD}" \
        --set postgres.database="${POSTGRES_DB}" \
        --set postgres.hosts="${POSTGRES_CONNECTION_HOST}:${POSTGRES_CONNECTION_PORT}" \
        --set elasticsearch.hosts="http://elasticsearch.data.svc.cluster.local:9200" \
        --set elasticsearch.username="${ELASTICSEARCH_APP_USER_NAME}" \
        --set elasticsearch.password="${ELASTICSEARCH_APP_USER_PASS}" \
        --set env.port="${PORT}" \
        --set env.socketPort="${SOCKET_PORT}" \
        --set secrets.jwtSecret="${JWT_SECRET:-local-test-secret}" \
        --set secrets.secretLoginCrypto="${SECRET_LOGIN_CRYPTO:-local-crypto}" \
        --set secrets.apiKey="${API_KEY:-}" \
        --set secrets.buildApiKey="${BUILD_API_KEY:-}" \
        --set secrets.couponSecret="${COUPON_SECRET:-local-coupon}" \
        --set secrets.productSecret="${PRODUCT_SECRET:-local-product}" \
        --set ingress.enabled=true \
        --set ingress.host="${DOMAIN_NAME}" \
        --set ingress.tlsSecret="mecipe-was-tls" || {
        echo -e "${YELLOW}⚠️  Mecipe WAS 배포가 타임아웃되었습니다.${NC}"
    }
    
    # Place Indexer Service
    echo -e "${BLUE}📦 Place Indexer Service 배포...${NC}"
    helm upgrade --install place-indexer-service ./infra/helm/apps/place-indexer-service \
        --namespace app \
        --create-namespace \
        --wait \
        --timeout 10m \
        --set nodeSelector.role-app=true \
        --set global.dockerRegistry="${DOCKER_USERNAME}" \
        --set image.repository="${DOCKER_USERNAME}/place-indexer-service" \
        --set image.tag="${IMAGE_TAG}" \
        --set env.elasticsearchHosts="http://elasticsearch.data.svc.cluster.local:9200" \
        --set secrets.elasticsearchUsername="${ELASTICSEARCH_PRODUCER_USER_NAME}" \
        --set secrets.elasticsearchPassword="${ELASTICSEARCH_PRODUCER_USER_PASS}" || {
        echo -e "${YELLOW}⚠️  Place Indexer Service 배포가 타임아웃되었습니다.${NC}"
    }
    
    # 데이터베이스 마이그레이션
    echo ""
    echo -e "${BLUE}📦 데이터베이스 마이그레이션 실행...${NC}"
    kubectl exec -n app deployment/mecipe-was -- npx prisma migrate deploy || {
        echo -e "${YELLOW}⚠️  마이그레이션 실패 또는 적용할 마이그레이션이 없습니다.${NC}"
    }
    
    echo ""
    echo -e "${GREEN}✅ 애플리케이션 배포 완료${NC}"
    
    # 배포 상태 확인
    echo ""
    echo -e "${YELLOW}📋 배포 상태 확인...${NC}"
    kubectl get pods -n app -o wide
    kubectl get svc -n app
}

# 메인 실행
main() {
    # 스크립트 위치를 기준으로 프로젝트 루트 찾기
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
    
    # 프로젝트 루트로 이동
    cd "${PROJECT_ROOT}"
    
    # 환경 변수 로드
    ENV_FILE="${PROJECT_ROOT}/.env.local"
    if [ ! -f "${ENV_FILE}" ]; then
        ENV_FILE="${PROJECT_ROOT}/.env"
    fi
    
    if [ -f "${ENV_FILE}" ]; then
        echo -e "${YELLOW}📋 환경 변수 파일 로드: ${ENV_FILE}${NC}"
        set -a
        source "${ENV_FILE}"
        set +a
        echo -e "${GREEN}✅ 환경 변수 로드 완료${NC}"
    else
        echo -e "${YELLOW}⚠️  .env 또는 .env.local 파일을 찾을 수 없습니다.${NC}"
        echo "환경 변수를 직접 설정하거나 .env 파일을 생성하세요."
    fi
    
    # 사전 체크
    check_env_vars
    check_helm
    check_kubectl
    check_docker
    
    # 노드 라벨링 (로컬 환경용)
    label_nodes
    
    # 네임스페이스 생성
    create_namespaces
    
    # 배포 타입에 따라 실행
    case "${DEPLOY_TYPE}" in
        infra)
            build_docker_images
            deploy_infrastructure
            ;;
        apps)
            wait_for_infrastructure
            build_docker_images
            deploy_applications
            ;;
        all)
            build_docker_images
            deploy_infrastructure
            wait_for_infrastructure
            deploy_applications
            ;;
        *)
            echo -e "${RED}❌ 잘못된 배포 타입: ${DEPLOY_TYPE}${NC}"
            echo "사용법: $0 [infra|apps|all]"
            exit 1
            ;;
    esac
    
    echo ""
    echo "======================================"
    echo -e "${GREEN}✅ 배포 테스트 완료!${NC}"
    echo "======================================"
    echo ""
    echo -e "${BLUE}📋 배포 정보:${NC}"
    echo "  - 이미지 태그: ${IMAGE_TAG}"
    echo "  - Docker Registry: ${DOCKER_USERNAME}"
    echo "  - 네임스페이스: app, data, ingress-nginx"
    echo ""
    echo -e "${YELLOW}⚠️  중요:${NC}"
    echo "  - 이 배포는 로컬 테스트용입니다"
    echo "  - GitHub Actions 배포와 같은 클러스터를 사용하면 마지막 배포가 이전 배포를 덮어씁니다"
    echo "  - 프로덕션 환경에서는 GitHub Actions를 통해서만 배포하세요"
    echo ""
    echo "다음 명령어로 상태 확인:"
    echo "  kubectl get pods -n app"
    echo "  kubectl get pods -n data"
    echo "  kubectl get pods -n ingress-nginx"
    echo "  kubectl logs -n app -l app.kubernetes.io/name=kafka"
    echo "  kubectl logs -n app deployment/mecipe-was"
    echo "  kubectl logs -n app deployment/place-indexer-service"
    echo ""
    echo "Helm release 확인:"
    echo "  helm list -n app"
    echo "  helm list -n data"
}

main "$@"
