#!/bin/bash

# 로컬에서 GitHub Actions와 동일한 방식으로 Helm 배포 테스트
# 사용법: ./scripts/dev/local-deploy-test.sh [infra|apps|all] [--ex:build:service-name ...]
# 
# 예시:
#   ./scripts/dev/local-deploy-test.sh infra    # 인프라만 배포
#   ./scripts/dev/local-deploy-test.sh apps     # 앱만 배포 (인프라가 이미 배포된 경우)
#   ./scripts/dev/local-deploy-test.sh all      # 전체 배포
#   ./scripts/dev/local-deploy-test.sh all --ex:build:place-api-service  # place-api-service 빌드 제외
#   ./scripts/dev/local-deploy-test.sh all --ex:build:place-api-service --ex:build:meta-viewer-service  # 여러 서비스 제외

set -e
set -o pipefail

# ============================================================================
# 상수 정의
# ============================================================================

# 네임스페이스
readonly LOCAL_APP_NS="app"
readonly LOCAL_DATA_STORAGE_NS="data-storage"  # postgres, elasticsearch
readonly LOCAL_DATA_STREAMING_NS="data-streaming"  # kafka, ksqldb, debezium, confluent-operator
readonly LOCAL_INGRESS_NS="infra"  # ingress-nginx
readonly LOCAL_CERT_MANAGER_NS="cert-manager"  # cert-manager

# Helm 타임아웃
readonly HELM_TIMEOUT_SHORT="5m"
readonly HELM_TIMEOUT_MEDIUM="10m"
readonly HELM_TIMEOUT_LONG="15m"

# 대기 시간 (초)
readonly WAIT_SLEEP_SHORT=2
readonly WAIT_SLEEP_MEDIUM=5
readonly WAIT_SLEEP_LONG=10

# 최대 재시도 횟수
readonly MAX_WAIT_OPERATOR=60
readonly MAX_WAIT_KAFKA_POD=120
readonly MAX_WAIT_KAFKA_READY=60
readonly MAX_RETRIES_INFRA=30

# 중단 플래그 (Ctrl+C 시 설정됨)
INTERRUPTED=false

# 빌드에서 제외할 서비스 목록
EXCLUDE_BUILD_SERVICES=()

# 매개변수 파싱
DEPLOY_TYPE="all"
while [[ $# -gt 0 ]]; do
    case $1 in
        infra|apps|all)
            DEPLOY_TYPE="$1"
            shift
            ;;
        --ex:build:*)
            # --ex:build:service-name 형식 파싱
            service_name="${1#--ex:build:}"
            EXCLUDE_BUILD_SERVICES+=("$service_name")
            log_info "ℹ️  빌드에서 제외: $service_name"
            shift
            ;;
        *)
            log_error "알 수 없는 매개변수: $1"
            echo "사용법: $0 [infra|apps|all] [--ex:build:service-name ...]"
            echo "예시: $0 all --ex:build:place-api-service --ex:build:meta-viewer-service"
            exit 1
            ;;
    esac
done

# ============================================================================
# 색상 및 로깅 함수
# ============================================================================

readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}$1${NC}"
}

log_success() {
    echo -e "${GREEN}$1${NC}"
}

log_warning() {
    echo -e "${YELLOW}$1${NC}"
}

log_error() {
    echo -e "${RED}$1${NC}"
}

log_header() {
    echo ""
echo "======================================"
    echo "$1"
echo "======================================"
}

# ============================================================================
# 유틸리티 함수
# ============================================================================

# Pod가 Ready 상태가 될 때까지 대기
wait_for_pod_ready() {
    local namespace=$1
    local selector=$2
    local timeout=${3:-60}
    local count=0
    
    while [ $count -lt $timeout ]; do
        local ready=$(kubectl get pods -n "$namespace" -l "$selector" \
            -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")
        if [ "$ready" = "True" ]; then
            return 0
        fi
        count=$((count + 1))
        sleep $WAIT_SLEEP_SHORT
    done
    return 1
}

# 리소스 존재 확인
check_resource_exists() {
    local namespace=$1
    local resource_type=$2
    local name=$3
    kubectl get "$resource_type" "$name" -n "$namespace" &>/dev/null
}

# Kafka Pod Ready 상태 확인 (여러 방법 시도)
check_kafka_ready() {
    local namespace=$1
    local ready="False"
    
    # 방법 1: platform.confluent.io/type=kafka 라벨
    ready=$(kubectl get pods -n "$namespace" -l platform.confluent.io/type=kafka \
        -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")
    
    # 방법 2: app=kafka 라벨
    if [ "$ready" != "True" ]; then
        ready=$(kubectl get pods -n "$namespace" -l app=kafka \
            -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")
    fi
    
    # 방법 3: Pod 이름 패턴 (kafka-0, kafka-1 등)
    if [ "$ready" != "True" ]; then
        local pod_name=$(kubectl get pods -n "$namespace" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null | \
            tr ' ' '\n' | grep '^kafka-[0-9]' | head -1 || echo "")
        if [ -n "$pod_name" ]; then
            ready=$(kubectl get pod "$pod_name" -n "$namespace" \
                -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")
        fi
    fi
    
    [ "$ready" = "True" ]
}

# Pod 디버그 정보 출력
print_pod_debug_info() {
    local namespace=$1
    local selector=$2
    local resource_name=$3
    
    log_warning "📋 ${resource_name} Pod 상태 확인:"
    kubectl get pods -n "$namespace" -l "$selector" || true
    echo ""
    
    log_warning "📋 ${resource_name} Pod 이벤트 확인:"
    kubectl get events -n "$namespace" --sort-by='.lastTimestamp' | grep -i "${resource_name,,}" | tail -10 || true
    echo ""
    
    local pod=$(kubectl get pods -n "$namespace" -l "$selector" \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$pod" ]; then
        log_warning "📋 ${resource_name} Pod 로그 (마지막 50줄):"
        kubectl logs -n "$namespace" "$pod" --tail=50 || true
        echo ""
        
        log_warning "📋 ${resource_name} Pod 상세 정보:"
        kubectl describe pod -n "$namespace" "$pod" | tail -30 || true
        echo ""
    fi
}

# Helm 배포 (에러 처리 포함)
helm_deploy() {
    local release=$1
    local chart=$2
    local namespace=$3
    local timeout=$4
    
    # timeout이 지정되지 않으면 기본값 사용
    if [ -z "$timeout" ]; then
        timeout=$HELM_TIMEOUT_MEDIUM
        shift 3
    else
        shift 4
    fi
    
    log_info "📦 ${release} 배포..."
    if helm upgrade --install "$release" "$chart" \
        --namespace "$namespace" \
        --create-namespace \
        --wait \
        --timeout "$timeout" \
        "$@"; then
        log_success "✅ ${release} 배포 완료"
        return 0
    else
        local exit_code=$?
        log_warning "⚠️  ${release} 배포가 실패했습니다."
        return $exit_code
    fi
}

# Helm 배포 (에러 시 상세 정보 출력)
helm_deploy_with_debug() {
    local release=$1
    local chart=$2
    local namespace=$3
    local timeout=$4
    local debug_selector=$5
    local debug_name=${6:-$release}
    
    # timeout이 지정되지 않으면 기본값 사용
    if [ -z "$timeout" ]; then
        timeout=$HELM_TIMEOUT_MEDIUM
        shift 3
        # debug_selector, debug_name 제거 (이제 $1, $2가 됨)
        shift 2
    else
        shift 4
        # debug_selector, debug_name 제거 (이제 $1, $2가 됨)
        shift 2
    fi
    
    if ! helm_deploy "$release" "$chart" "$namespace" "$timeout" "$@"; then
        if [ -n "$debug_selector" ]; then
            print_pod_debug_info "$namespace" "$debug_selector" "$debug_name"
        fi
        return 1
    fi
    return 0
}

# ============================================================================
# 정리 함수
# ============================================================================

# Kafka 리소스 정리
cleanup_kafka_resources() {
    log_info "   Kafka CRD 리소스 삭제 중..."
    kubectl delete kafka kafka -n "${LOCAL_DATA_STREAMING_NS}" --wait=false 2>/dev/null || true
    kubectl delete zookeeper kafka-zookeeper -n "${LOCAL_DATA_STREAMING_NS}" --wait=false 2>/dev/null || true
    
    log_info "   Kafka 관련 Pod 강제 삭제 중..."
    kubectl delete pods -n "${LOCAL_DATA_STREAMING_NS}" -l app=kafka --force --grace-period=0 2>/dev/null || true
    kubectl delete pods -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=kafka --force --grace-period=0 2>/dev/null || true
    kubectl delete pods -n "${LOCAL_DATA_STREAMING_NS}" -l app=kafka-zookeeper --force --grace-period=0 2>/dev/null || true
    kubectl delete pods -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=zookeeper --force --grace-period=0 2>/dev/null || true
    
    # 이름 패턴으로 찾아서 삭제
    for pod in $(kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null); do
        case "$pod" in
            kafka-*|*-zookeeper-*)
                kubectl delete pod "$pod" -n "${LOCAL_DATA_STREAMING_NS}" --force --grace-period=0 2>/dev/null || true
                ;;
        esac
    done
    
    sleep $WAIT_SLEEP_SHORT
}

# PVC 리소스 정리
cleanup_pvc_resources() {
    log_info "   PVC 삭제 중..."
    
    # Kafka 관련 PVC 삭제 (data-streaming)
    kubectl delete pvc -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=kafka 2>/dev/null || true
    kubectl delete pvc -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=zookeeper 2>/dev/null || true
    kubectl delete pvc -n "${LOCAL_DATA_STREAMING_NS}" -l app=kafka 2>/dev/null || true
    kubectl delete pvc -n "${LOCAL_DATA_STREAMING_NS}" -l app=kafka-zookeeper 2>/dev/null || true
    
    # 이름 패턴으로 찾아서 삭제 (data-streaming)
    for pvc in $(kubectl get pvc -n "${LOCAL_DATA_STREAMING_NS}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null); do
        case "$pvc" in
            *kafka*|*zookeeper*|*ksqldb*)
                kubectl patch pvc "$pvc" -n "${LOCAL_DATA_STREAMING_NS}" -p '{"metadata":{"finalizers":[]}}' --type=merge 2>/dev/null || true
                kubectl delete pvc "$pvc" -n "${LOCAL_DATA_STREAMING_NS}" --wait=false 2>/dev/null || true
                ;;
        esac
    done
    
    # Elasticsearch PVC 삭제 (data-storage)
    kubectl delete pvc -n "${LOCAL_DATA_STORAGE_NS}" -l app.kubernetes.io/name=elasticsearch 2>/dev/null || true
    
    # KSQLDB PVC 삭제 (data-streaming)
    kubectl delete pvc -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=ksqldb 2>/dev/null || true
}

# Helm Release 정리
cleanup_helm_releases() {
    log_info "📦 Helm release 삭제 중..."
    
    # app namespace
    helm uninstall place-api-service -n "${LOCAL_APP_NS}" 2>/dev/null || true
    helm uninstall meta-viewer-service -n "${LOCAL_APP_NS}" 2>/dev/null || true
    helm uninstall api-gateway -n "${LOCAL_APP_NS}" 2>/dev/null || true
    helm uninstall place-indexer-service -n "${LOCAL_APP_NS}" 2>/dev/null || true
    
    # data-storage namespace
    helm uninstall postgres -n "${LOCAL_DATA_STORAGE_NS}" 2>/dev/null || true
    helm uninstall postgres-connection -n "${LOCAL_DATA_STORAGE_NS}" 2>/dev/null || true
    helm uninstall elasticsearch -n "${LOCAL_DATA_STORAGE_NS}" 2>/dev/null || true
    helm uninstall kibana -n "${LOCAL_DATA_STORAGE_NS}" 2>/dev/null || true
    
    # data-streaming namespace
    helm uninstall confluent-operator -n "${LOCAL_DATA_STREAMING_NS}" 2>/dev/null || true
    helm uninstall kafka-zookeeper -n "${LOCAL_DATA_STREAMING_NS}" 2>/dev/null || true
    helm uninstall kafka -n "${LOCAL_DATA_STREAMING_NS}" 2>/dev/null || true
    helm uninstall kafka-ui -n "${LOCAL_DATA_STREAMING_NS}" 2>/dev/null || true
    helm uninstall ksqldb -n "${LOCAL_DATA_STREAMING_NS}" 2>/dev/null || true
    helm uninstall redis -n "${LOCAL_DATA_STREAMING_NS}" 2>/dev/null || true
    helm uninstall debezium -n "${LOCAL_DATA_STORAGE_NS}" 2>/dev/null || true
    
    # infra namespace
    helm uninstall ingress-nginx -n "${LOCAL_INGRESS_NS}" 2>/dev/null || true
    helm uninstall cert-manager-bootstrap -n "${LOCAL_INGRESS_NS}" 2>/dev/null || true
    
    # cert-manager namespace
    helm uninstall cert-manager -n "${LOCAL_CERT_MANAGER_NS}" 2>/dev/null || true

    sleep $WAIT_SLEEP_SHORT
}

# 배포된 리소스 정리 함수
cleanup_resources() {
    echo ""
    log_warning "🧹 배포된 리소스 정리 중..."

    read -p "Kafka, PVC, Helm release를 삭제하시겠습니까? (y/N): " delete_resources
    if [ "${delete_resources}" != "y" ] && [ "${delete_resources}" != "Y" ]; then
        log_warning "⏭️  Kafka, PVC, Helm release 삭제를 건너뜁니다."
        return
    fi
    
    cleanup_kafka_resources
    cleanup_helm_releases
    cleanup_pvc_resources
    
    log_success "✅ 리소스 정리 완료"
}

# ============================================================================
# 사전 체크 함수
# ============================================================================

update_helm_repo() {
    helm repo add confluentinc https://packages.confluent.io/helm 2>/dev/null || true
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
    helm repo add jetstack https://charts.jetstack.io 2>/dev/null || true
    helm repo update
}

# Ctrl+C (SIGINT) 신호 처리
cleanup_on_interrupt() {
    INTERRUPTED=true
    
    echo ""
    log_error "⚠️  배포가 중단되었습니다 (Ctrl+C)"
    
    if [ "${AUTO_CLEANUP_ON_INTERRUPT:-false}" = "true" ]; then
        cleanup_resources
    else
        log_warning "배포된 쿠버네티스 리소스는 그대로 유지됩니다."
        log_info "리소스를 정리하려면 다음 명령어를 실행하세요:"
        echo "  helm list -n ${LOCAL_APP_NS}"
        echo "  helm list -n ${LOCAL_DATA_STORAGE_NS}"
        echo "  helm list -n ${LOCAL_DATA_STREAMING_NS}"
        echo "  helm list -n ${LOCAL_INGRESS_NS}"
        echo ""
        echo "또는 AUTO_CLEANUP_ON_INTERRUPT=true 환경 변수를 설정하면 자동으로 정리됩니다."
    fi
    
    log_warning "스크립트를 종료합니다..."
    trap - INT TERM
    kill 0 2>/dev/null || true
    exit 130
}

trap cleanup_on_interrupt INT TERM

# 명령어 실행 헬퍼 함수 (중단 시 즉시 종료)
run_command() {
    if [ "$INTERRUPTED" = "true" ]; then
        exit 130
    fi
    
    "$@"
    local exit_code=$?
    
    if [ $exit_code -eq 130 ] || [ $exit_code -eq 143 ]; then
        INTERRUPTED=true
        exit 130
    fi
    
    return $exit_code
}

# 환경 변수 확인
check_env_vars() {
    log_warning "📋 환경 변수 확인..."
    
    local REQUIRED_VARS=(
        "POSTGRES_PASSWORD"
        "ELASTICSEARCH_SUPERUSER_PASSWORD"
        "ELASTICSEARCH_KIBANA_PASSWORD"
        "ELASTICSEARCH_PRODUCER_USER_PASS"
        "ELASTICSEARCH_APP_USER_PASS"
    )
    
    local MISSING_VARS=()
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        log_error "❌ 필수 환경 변수가 설정되지 않았습니다:"
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
    export POSTGRES_HOST="${POSTGRES_HOST:-host.docker.internal}"
    export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
    export ELASTICSEARCH_PRODUCER_USER_NAME="${ELASTICSEARCH_PRODUCER_USER_NAME:-producer_user}"
    export ELASTICSEARCH_APP_USER_NAME="${ELASTICSEARCH_APP_USER_NAME:-app_user}"
    export DOCKER_USERNAME="${DOCKER_USERNAME:-local}"
    export IMAGE_TAG="${IMAGE_TAG:-local}"
    export DOMAIN_NAME="${DOMAIN_NAME:-test-dev.ingress.com}"
    export PORT="${PORT:-4000}"
    export SOCKET_PORT="${SOCKET_PORT:-4100}"
    export CP_VERSION="${CP_VERSION:-8.1.0}"
    
    log_success "✅ 환경 변수 확인 완료"
    echo "  PostgreSQL: ${POSTGRES_DEPLOY} (${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB})"
    echo "  Docker Registry: ${DOCKER_USERNAME}"
    echo "  Image Tag: ${IMAGE_TAG}"
    echo ""
    log_info "ℹ️  로컬 배포 설정:"
    echo "  - 네임스페이스: ${LOCAL_APP_NS}, ${LOCAL_DATA_STORAGE_NS}, ${LOCAL_DATA_STREAMING_NS}, ${LOCAL_INGRESS_NS}, ${LOCAL_CERT_MANAGER_NS} (실제 배포와 동일)"
    echo "  - nodeSelector: node-role=local (로컬 전용 노드 라벨 사용)"
    echo "  - 이미지 태그: ${IMAGE_TAG} (GitHub Actions는 커밋 SHA 사용)"
    echo "  - Docker Registry: ${DOCKER_USERNAME} (GitHub Actions는 secrets.DOCKER_USERNAME 사용)"
    echo "  - Cert-manager Email: ${SSL_EMAIL:-${CERT_EMAIL:-admin@mecipe.com}} (환경 변수 SSL_EMAIL 또는 CERT_EMAIL 설정 가능)"
    echo ""
}

# Helm 설치 확인
check_helm() {
    log_warning "📋 Helm 설치 확인..."
    
    if ! command -v helm &> /dev/null; then
        log_error "❌ Helm이 설치되지 않았습니다."
        echo "설치 방법: https://helm.sh/docs/intro/install/"
        exit 1
    fi
    
    log_success "✅ Helm 설치 확인: $(helm version --short)"
}

# kubectl 설치 확인
check_kubectl() {
    log_warning "📋 kubectl 설치 확인..."
    
    if ! command -v kubectl &> /dev/null; then
        log_error "❌ kubectl이 설치되지 않았습니다."
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null 2>&1; then
        log_warning "⚠️  Kubernetes 클러스터에 연결할 수 없습니다."
        echo "kubectl config를 확인하세요."
        exit 1
    fi
    
    log_success "✅ kubectl 연결 확인"
    kubectl cluster-info | head -1
}

# Docker 설치 확인
check_docker() {
    log_warning "📋 Docker 설치 확인..."
    
    if ! command -v docker &> /dev/null; then
        log_error "❌ Docker가 설치되지 않았습니다."
        exit 1
    fi
    
    if ! docker ps &> /dev/null; then
        log_error "❌ Docker 서비스가 실행 중이지 않습니다."
        exit 1
    fi
    
    log_success "✅ Docker 확인 완료"
}

# 노드 라벨링 (로컬 환경용 - 선택적)
label_nodes() {
    log_warning "📋 노드 라벨링 확인..."
    
    local NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    if [ -z "$NODES" ]; then
        log_error "❌ 노드를 찾을 수 없습니다."
        exit 1
    fi
    
    local FIRST_NODE=$(echo $NODES | awk '{print $1}')
    log_info "ℹ️  로컬 환경: 첫 번째 노드에 local 라벨 추가"
    kubectl label node "$FIRST_NODE" node-role=local --overwrite 
    
    log_success "✅ 노드 라벨링 완료"
    kubectl get nodes --show-labels | grep -E "NAME|node-role"
}

# 네임스페이스 생성
create_namespaces() {
    log_warning "📋 네임스페이스 생성..."
    
    kubectl create namespace "${LOCAL_APP_NS}" --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true
    kubectl create namespace "${LOCAL_DATA_STORAGE_NS}" --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true
    kubectl create namespace "${LOCAL_DATA_STREAMING_NS}" --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true
    kubectl create namespace "${LOCAL_INGRESS_NS}" --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true
    kubectl create namespace "${LOCAL_CERT_MANAGER_NS}" --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true
    
    log_success "✅ 네임스페이스 생성 완료"
}

# ============================================================================
# Docker 이미지 빌드
# ============================================================================

build_docker_images() {
    if [ "$INTERRUPTED" = "true" ]; then
        exit 130
    fi
    
    log_header "Docker 이미지 빌드"
    
    read -p "로컬 Docker 이미지를 빌드하시겠습니까? (y/N): " build_images
    if [ "${build_images}" != "y" ] && [ "${build_images}" != "Y" ]; then
        log_warning "⏭️  Docker 이미지 빌드를 건너뜁니다."
        echo "레지스트리에서 이미지를 가져오거나 이미 빌드된 이미지를 사용하세요."
        return
    fi

    log_info "📦 minikube Docker 환경 설정 중..."
    if command -v minikube &> /dev/null; then
        eval $(minikube docker-env)
        log_success "✅ minikube Docker 환경 설정 완료"
        trap 'eval $(minikube docker-env -u)' EXIT
    else
        log_warning "⚠️  minikube 명령어를 찾을 수 없습니다. 로컬 Docker를 사용합니다."
        log_warning "⚠️  이미지를 수동으로 minikube에 로드하거나 imagePullPolicy: Never를 사용하세요."
    fi
    
    # 특정 서비스가 제외 목록에 있는지 확인하는 함수
    should_skip_build() {
        local service=$1
        for excluded in "${EXCLUDE_BUILD_SERVICES[@]}"; do
            if [ "$excluded" = "$service" ]; then
                return 0  # 제외됨
            fi
        done
        return 1  # 빌드 필요
    }
    
    SUCCESS_PLACE_API_SERVICE=true
    if should_skip_build "place-api-service"; then
        log_warning "⏭️  place-api-service 이미지 빌드를 건너뜁니다 (--ex:build:place-api-service)"
    else
        log_info "📦 place-api-service 이미지 빌드..."
        docker build -f apps/place-api-service/Dockerfile -t "${DOCKER_USERNAME}/place-api-service:${IMAGE_TAG}" . || {
            log_error "❌ place-api-service 이미지 빌드 실패"
            SUCCESS_PLACE_API_SERVICE=false
        }
    fi

    SUCCESS_META_VIEWER_SERVICE=true
    if should_skip_build "meta-viewer-service"; then
        log_warning "⏭️  meta-viewer-service 이미지 빌드를 건너뜁니다 (--ex:build:meta-viewer-service)"
    else
        log_info "📦 meta-viewer-service 이미지 빌드..."
        docker build -f apps/meta-viewer-service/Dockerfile -t "${DOCKER_USERNAME}/meta-viewer-service:${IMAGE_TAG}" . || {
            log_error "❌ meta-viewer-service 이미지 빌드 실패"
            SUCCESS_META_VIEWER_SERVICE=false
        }
    fi

    SUCCESS_API_GATEWAY=true
    if should_skip_build "api-gateway"; then
        log_warning "⏭️  api-gateway 이미지 빌드를 건너뜁니다 (--ex:build:api-gateway)"
    else
        log_info "📦 api-gateway 이미지 빌드..."
        docker build -f apps/api-gateway/Dockerfile -t "${DOCKER_USERNAME}/api-gateway:${IMAGE_TAG}" . || {
            log_error "❌ api-gateway 이미지 빌드 실패"
            SUCCESS_API_GATEWAY=false
        }
    fi
    
    SUCCESS_PLACE_INDEXER_SERVICE=true
    if should_skip_build "place-indexer-service"; then
        log_warning "⏭️  place-indexer-service 이미지 빌드를 건너뜁니다 (--ex:build:place-indexer-service)"
    else
        log_info "📦 place-indexer-service 이미지 빌드..."
        docker build -f apps/place-indexer-service/Dockerfile -t "${DOCKER_USERNAME}/place-indexer-service:${IMAGE_TAG}" . || {
            log_error "❌ place-indexer-service 이미지 빌드 실패"
            SUCCESS_PLACE_INDEXER_SERVICE=false
        }
    fi
    
    if command -v minikube &> /dev/null; then
        log_success "✅ 이미지가 minikube Docker 데몬에 빌드되었습니다"
        log_info "📋 빌드된 이미지 확인:"
        docker images | grep -E "${DOCKER_USERNAME}/(place-api-service|meta-viewer-service|api-gateway|place-indexer-service)" || true
    fi

    if [ "$SUCCESS_PLACE_API_SERVICE" = "false" ] || [ "$SUCCESS_META_VIEWER_SERVICE" = "false" ] || [ "$SUCCESS_API_GATEWAY" = "false" ] || [ "$SUCCESS_PLACE_INDEXER_SERVICE" = "false" ]; then
        log_error "❌ 일부 이미지 빌드에 실패했습니다."
        exit 1
    fi
    
    log_success "✅ Docker 이미지 빌드 완료"
}

# ============================================================================
# 인프라 배포 함수 (서비스별 분리)
# ============================================================================

# Confluent Operator 배포
deploy_confluent_operator() {
    log_info "📦 Confluent Operator 배포..."
    
    helm_deploy "confluent-operator" "confluentinc/confluent-for-kubernetes" "${LOCAL_DATA_STREAMING_NS}" "$HELM_TIMEOUT_MEDIUM" \
        --set 'nodeSelector.node-role=local' || {
        log_warning "⚠️  confluent-operator 배포가 실패했습니다."
        exit 1
    }
    
    log_info "⏳ Confluent Operator 준비 상태 확인 중..."
    local count=0
    local operator_ready="False"
    
    while [ $count -lt $MAX_WAIT_OPERATOR ]; do
        operator_ready=$(kubectl get deployment -n "${LOCAL_DATA_STREAMING_NS}" -l app=confluent-operator \
            -o jsonpath='{.items[0].status.conditions[?(@.type=="Available")].status}' 2>/dev/null || echo "False")
        
        if [ "$operator_ready" = "False" ] || [ -z "$operator_ready" ]; then
            operator_ready=$(kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -l app=confluent-operator \
                -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")
        fi
        
        if [ "$operator_ready" = "True" ]; then
            log_success "✅ Confluent Operator가 준비되었습니다."
            return 0
        fi
        
        count=$((count + 1))
        if [ $count -lt $MAX_WAIT_OPERATOR ]; then
            echo "   Confluent Operator 준비 대기 중... ($count/$MAX_WAIT_OPERATOR)"
            sleep $WAIT_SLEEP_SHORT
        fi
    done
    
    if [ "$operator_ready" != "True" ]; then
        log_warning "⚠️  Confluent Operator가 아직 준비되지 않았지만 계속 진행합니다."
        log_warning "💡 Operator 상태 확인:"
        kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -l app=confluent-operator || true
        kubectl get deployment -n "${LOCAL_DATA_STREAMING_NS}" -l app=confluent-operator || true
    fi
}

# Zookeeper 배포
deploy_zookeeper() {
    log_info "⏳ Zookeeper 배포 중... (최대 10분 소요될 수 있습니다)"
    log_warning "💡 진행 상황을 확인하려면 다른 터미널에서 다음 명령어를 실행하세요:"
    echo "   kubectl get pods -n ${LOCAL_DATA_STREAMING_NS} -l platform.confluent.io/type=zookeeper -w"
    echo ""

    log_info "📦 Installing Zookeeper..."
    if ! helm_deploy_with_debug "kafka-zookeeper" "./infra/helm/kafka-zookeeper" "${LOCAL_DATA_STREAMING_NS}" "$HELM_TIMEOUT_LONG" \
        "platform.confluent.io/type=zookeeper" "Zookeeper" \
        --set 'nodeSelector.node-role=local' \
        -f ./infra/helm/kafka-zookeeper/values-local.yaml; then
        log_warning "💡 Zookeeper 상태 확인:"
        kubectl get zookeeper -n "${LOCAL_DATA_STREAMING_NS}" || true
        kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=zookeeper || true
        echo ""
        log_warning "💡 Zookeeper CRD 상세 정보:"
        kubectl describe zookeeper kafka-zookeeper -n "${LOCAL_DATA_STREAMING_NS}" || true
        exit 1
    fi
    
    log_info "📋 Zookeeper CRD 리소스 확인 (설치 후)..."
    if check_resource_exists "${LOCAL_DATA_STREAMING_NS}" "zookeeper" "kafka-zookeeper"; then
        log_success "✅ Zookeeper CRD 리소스가 생성되었습니다."
    else
        log_warning "⚠️  Zookeeper CRD 리소스를 찾을 수 없습니다."
        log_warning "💡 디버깅 정보:"
        kubectl get zookeeper -n "${LOCAL_DATA_STREAMING_NS}" || true
        kubectl get crd | grep zookeeper || true
    fi
    echo ""
    
    log_info "⏳ Zookeeper Pod 생성 및 준비 대기 중... (Operator가 CRD를 처리하는 중)"
    local count=0
    local zookeeper_pod_ready=false
    
    while [ $count -lt $MAX_WAIT_KAFKA_POD ]; do
        local pod_status=$(kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=zookeeper \
            -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "Unknown")
        
        if [ "$pod_status" = "True" ]; then
            log_success "✅ Zookeeper Pod가 준비되었습니다."
            zookeeper_pod_ready=true
            kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=zookeeper
            break
        fi
        
        count=$((count + 1))
        if [ $count -lt $MAX_WAIT_KAFKA_POD ]; then
            if [ $((count % 10)) -eq 0 ]; then
                echo "   Zookeeper Pod 준비 대기 중... ($count/$MAX_WAIT_KAFKA_POD)"
                log_info "   Zookeeper CRD 상태:"
                kubectl get zookeeper kafka-zookeeper -n "${LOCAL_DATA_STREAMING_NS}" -o jsonpath='{.status.conditions[*].type}{"\n"}' 2>/dev/null || echo "   CRD 상태 확인 불가"
            fi
            sleep $WAIT_SLEEP_SHORT
        fi
    done
    
    if [ "$zookeeper_pod_ready" = "false" ]; then
        log_warning "⚠️  Zookeeper Pod가 아직 준비되지 않았습니다."
        log_warning "💡 디버깅 정보:"
        echo ""
        log_info "Zookeeper CRD 상태:"
        kubectl get zookeeper kafka-zookeeper -n "${LOCAL_DATA_STREAMING_NS}" -o yaml | grep -A 20 "status:" || true
        echo ""
        log_info "Zookeeper Pod 상태:"
        kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=zookeeper || true
        exit 1
    fi
    
    log_success "✅ Zookeeper 배포 완료"
}

# Kafka 배포 (Zookeeper가 먼저 배포되어 있어야 함)
deploy_kafka() {
    log_info "⏳ Kafka 배포 중... (최대 15분 소요될 수 있습니다)"
    log_warning "💡 진행 상황을 확인하려면 다른 터미널에서 다음 명령어를 실행하세요:"
    echo "   kubectl get pods -n ${LOCAL_DATA_STREAMING_NS} -l platform.confluent.io/type=kafka -w"
    echo ""

    # Zookeeper가 배포되어 있는지 확인
    if ! check_resource_exists "${LOCAL_DATA_STREAMING_NS}" "zookeeper" "kafka-zookeeper"; then
        log_error "❌ Zookeeper가 배포되지 않았습니다. 먼저 Zookeeper를 배포해주세요."
        exit 1
    fi
    
    log_info "✅ Zookeeper가 배포되어 있음을 확인했습니다."

    log_info "📦 Installing Kafka..."
    if ! helm_deploy_with_debug "kafka" "./infra/helm/kafka" "${LOCAL_DATA_STREAMING_NS}" "$HELM_TIMEOUT_LONG" \
        "platform.confluent.io/type=kafka" "Kafka" \
    --set 'nodeSelector.node-role=local' \
        -f ./infra/helm/kafka/values-local.yaml; then
        log_warning "💡 Kafka CRD 상태 확인:"
        kubectl get kafka -n "${LOCAL_DATA_STREAMING_NS}" || true
        echo ""
        log_warning "💡 Kafka CRD 상세 정보:"
        kubectl describe kafka kafka -n "${LOCAL_DATA_STREAMING_NS}" || true
        exit 1
    fi
    
    log_info "📋 Kafka CRD 리소스 확인 (설치 후)..."
    if check_resource_exists "${LOCAL_DATA_STREAMING_NS}" "kafka" "kafka"; then
        log_success "✅ Kafka CRD 리소스가 생성되었습니다."
        log_info "📋 Kafka CRD 상세 정보:"
        kubectl describe kafka kafka -n "${LOCAL_DATA_STREAMING_NS}" | tail -30 || true
    else
        log_warning "⚠️  Kafka CRD 리소스를 찾을 수 없습니다."
        log_warning "💡 디버깅 정보:"
        kubectl get kafka -n "${LOCAL_DATA_STREAMING_NS}" || true
        kubectl get crd | grep kafka || true
    fi
        echo ""
    
    log_info "⏳ Kafka Pod 생성 대기 중... (Operator가 CRD를 처리하는 중)"
    local count=0
    local kafka_pod_exists=false
    
    while [ $count -lt $MAX_WAIT_KAFKA_POD ]; do
        local pod_count=$(kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=kafka \
            --no-headers 2>/dev/null | wc -l || echo "0")
        if [ "$pod_count" -gt 0 ]; then
            log_success "✅ Kafka Pod가 생성되었습니다."
            kafka_pod_exists=true
            kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=kafka
            break
        fi
        
        count=$((count + 1))
        if [ $count -lt $MAX_WAIT_KAFKA_POD ]; then
            if [ $((count % 10)) -eq 0 ]; then
                echo "   Kafka Pod 생성 대기 중... ($count/$MAX_WAIT_KAFKA_POD)"
                log_info "   Kafka CRD 상태:"
                kubectl get kafka kafka -n "${LOCAL_DATA_STREAMING_NS}" -o jsonpath='{.status.conditions[*].type}{"\n"}' 2>/dev/null || echo "   CRD 상태 확인 불가"
            fi
            sleep $WAIT_SLEEP_SHORT
        fi
    done
    
    if [ "$kafka_pod_exists" = "false" ]; then
        log_warning "⚠️  Kafka Pod가 생성되지 않았습니다."
        log_warning "💡 디버깅 정보:"
        echo ""
        log_info "Kafka CRD 상태:"
        kubectl get kafka kafka -n "${LOCAL_DATA_STREAMING_NS}" -o yaml | grep -A 20 "status:" || true
        echo ""
        log_info "Kafka CRD 이벤트:"
        kubectl get events -n "${LOCAL_DATA_STREAMING_NS}" --field-selector involvedObject.name=kafka --sort-by='.lastTimestamp' | tail -20 || true
            echo ""
        log_info "Operator Pod 로그 (마지막 50줄):"
        local operator_pod=$(kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -l app=confluent-operator -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
        if [ -n "$operator_pod" ]; then
            kubectl logs -n "${LOCAL_DATA_STREAMING_NS}" "$operator_pod" --tail=50 || true
        fi
        echo ""
        log_warning "계속 진행하지만 Kafka가 작동하지 않을 수 있습니다."
    fi
}

# PostgreSQL 배포
deploy_postgresql() {
    if [ "$POSTGRES_DEPLOY" = "false" ]; then
        log_warning "⏭️  PostgreSQL 배포 건너뜀 (외부 데이터베이스 사용)"
        POSTGRES_CONNECTION_HOST="${POSTGRES_HOST}"
        POSTGRES_CONNECTION_PORT="${POSTGRES_PORT}"
        return
    fi
    
    log_info "📦 PostgreSQL 배포..."
    helm_deploy "postgres" "./infra/helm/postgres" "${LOCAL_DATA_STORAGE_NS}" "$HELM_TIMEOUT_MEDIUM" \
            --set 'nodeSelector.node-role=local' \
            --set enabled=true \
            --set secrets.postgresPassword="${POSTGRES_PASSWORD}" \
            --set auth.username="${POSTGRES_USER}" \
            --set auth.database="${POSTGRES_DB}" \
            --set 'resources.requests.cpu=250m' \
            --set 'resources.requests.memory=256Mi' \
            --set 'resources.limits.cpu=500m' \
            --set 'resources.limits.memory=512Mi' || {
        log_warning "⚠️  PostgreSQL 배포가 타임아웃되었습니다."
        }
    
    POSTGRES_CONNECTION_HOST="postgres.${LOCAL_DATA_STORAGE_NS}.svc.cluster.local"
        POSTGRES_CONNECTION_PORT="5432"
    
    log_info "📦 PostgreSQL 연결 정보 관리..."
    # POSTGRES_DEPLOY=true일 때는 postgres Service가 이미 존재하므로 postgres-connection의 Service는 비활성화
    # POSTGRES_DEPLOY=false일 때는 외부 DB를 위한 ExternalName Service 필요
    POSTGRES_CONNECTION_SERVICE_ENABLED="$([ "$POSTGRES_DEPLOY" = "false" ] && echo "true" || echo "false")"
    helm_deploy "postgres-connection" "./infra/helm/postgres-connection" "${LOCAL_DATA_STORAGE_NS}" "$HELM_TIMEOUT_SHORT" \
        --set 'nodeSelector.node-role=local' \
        --set connection.host="${POSTGRES_CONNECTION_HOST}" \
        --set connection.port="${POSTGRES_CONNECTION_PORT}" \
        --set connection.username="${POSTGRES_USER}" \
        --set connection.password="${POSTGRES_PASSWORD}" \
        --set connection.database="${POSTGRES_DB}" \
        --set connection.url="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_CONNECTION_HOST}:${POSTGRES_CONNECTION_PORT}/${POSTGRES_DB}?schema=public}" \
        --set service.enabled="${POSTGRES_CONNECTION_SERVICE_ENABLED}" || {
        log_warning "⚠️  postgres-connection 배포 실패"
    }
}

# Elasticsearch 배포
deploy_elasticsearch() {
    log_info "📦 Elasticsearch 배포..."
    helm_deploy_with_debug "elasticsearch" "./infra/helm/elasticsearch" "${LOCAL_DATA_STORAGE_NS}" "$HELM_TIMEOUT_MEDIUM" \
        "app.kubernetes.io/name=elasticsearch" "Elasticsearch" \
        --set 'nodeSelector.node-role=local' \
        --set secrets.password="${ELASTICSEARCH_SUPERUSER_PASSWORD}" \
        --set users.kibana.password="${ELASTICSEARCH_KIBANA_PASSWORD}" \
        --set users.producer.password="${ELASTICSEARCH_PRODUCER_USER_PASS}" \
        --set users.app.password="${ELASTICSEARCH_APP_USER_PASS}" || {
        log_warning "⚠️  Elasticsearch 배포가 타임아웃되었습니다. 위의 로그를 확인하세요."
    }
}

# Redis 배포
deploy_redis() {
    log_info "📦 Redis 배포..."
    
    local redis_deploy_args=(
        --set 'nodeSelector.node-role=local'
        --set namespace="${LOCAL_DATA_STREAMING_NS}"
        --set enabled=true
        --set 'resources.requests.cpu=250m'
        --set 'resources.requests.memory=256Mi'
        --set 'resources.limits.cpu=500m'
        --set 'resources.limits.memory=512Mi'
    )
    
    # Redis 비밀번호가 설정된 경우 추가
    if [ -n "${REDIS_PASSWORD:-}" ]; then
        redis_deploy_args+=(
            --set "secrets.password=${REDIS_PASSWORD}"
            --set "auth.password=${REDIS_PASSWORD}"
            --set 'auth.requirePass=true'
        )
    fi
    
    helm_deploy_with_debug "redis" "./infra/helm/redis" "${LOCAL_DATA_STREAMING_NS}" "$HELM_TIMEOUT_MEDIUM" \
        "app.kubernetes.io/name=redis" "Redis" \
        "${redis_deploy_args[@]}" || {
        log_warning "⚠️  Redis 배포가 타임아웃되었습니다. 위의 로그를 확인하세요."
    }
    
    log_info "📋 Redis 연결 정보:"
    log_info "   Service: redis.${LOCAL_DATA_STREAMING_NS}.svc.cluster.local:6379"
    if [ -n "${REDIS_PASSWORD:-}" ]; then
        log_info "   URL: redis://:${REDIS_PASSWORD}@redis.${LOCAL_DATA_STREAMING_NS}.svc.cluster.local:6379"
        log_info "   Password: 설정됨"
    else
        log_info "   URL: redis://redis.${LOCAL_DATA_STREAMING_NS}.svc.cluster.local:6379"
        log_info "   Password: 없음"
    fi
}

# Debezium 배포
deploy_debezium() {
    if [ "$POSTGRES_DEPLOY" = "false" ]; then
        DEBEZIUM_POSTGRES_HOST="${POSTGRES_CONNECTION_HOST}"
        DEBEZIUM_POSTGRES_PORT="${POSTGRES_CONNECTION_PORT}"
    else
        DEBEZIUM_POSTGRES_HOST="postgres.${LOCAL_DATA_STORAGE_NS}.svc.cluster.local"
        DEBEZIUM_POSTGRES_PORT="5432"
    fi
    
    log_warning "📋 Kafka 상태 확인 중..."
    local kafka_pod=$(kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=kafka \
        -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -z "$kafka_pod" ]; then
        kafka_pod=$(kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" | grep "^kafka-" | head -1 | awk '{print $1}' || echo "")
    fi
    if [ -z "$kafka_pod" ]; then
        log_warning "⚠️  Kafka Pod를 찾을 수 없습니다. StatefulSet이나 CRD 상태를 확인하세요."
        log_info "📋 StatefulSet 확인:"
        kubectl get statefulset -n "${LOCAL_DATA_STREAMING_NS}" | grep kafka || true
        log_info "📋 모든 Pod 확인:"
        kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" | grep kafka || true
        log_info "📋 Kafka CRD 상태 확인:"
        kubectl get kafka kafka -n "${LOCAL_DATA_STREAMING_NS}" -o jsonpath='{.status.phase}' 2>/dev/null || true
    else
        log_success "✅ Kafka Pod 발견: ${kafka_pod}"
        local kafka_pod_status=$(kubectl get pod "$kafka_pod" -n "${LOCAL_DATA_STREAMING_NS}" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
        log_info "   Pod 상태: ${kafka_pod_status}"
    fi
    
    log_info "📋 Kafka 연결 정보:"
    local kafka_external_endpoint=$(kubectl get kafka kafka -n "${LOCAL_DATA_STREAMING_NS}" \
        -o jsonpath='{.status.listeners.external.internalEndpoint}' 2>/dev/null || echo "")
    local kafka_internal_endpoint=$(kubectl get kafka kafka -n "${LOCAL_DATA_STREAMING_NS}" \
        -o jsonpath='{.status.listeners.internal.internalEndpoint}' 2>/dev/null || echo "")
    if [ -n "$kafka_external_endpoint" ]; then
        log_success "   External: ${kafka_external_endpoint} (PLAINTEXT)"
    fi
    if [ -n "$kafka_internal_endpoint" ]; then
        log_success "   Internal: ${kafka_internal_endpoint} (PLAINTEXT)"
    fi
    if [ -z "$kafka_external_endpoint" ] && [ -z "$kafka_internal_endpoint" ]; then
        log_warning "   기본 Service: kafka.${LOCAL_DATA_STREAMING_NS}.svc.cluster.local:9092"
        kafka_external_endpoint="kafka.${LOCAL_DATA_STREAMING_NS}.svc.cluster.local:9092"
    fi
    
    local debezium_kafka_bootstrap_servers
    if [ -n "$kafka_external_endpoint" ]; then
        debezium_kafka_bootstrap_servers="$kafka_external_endpoint"
    elif [ -n "$kafka_internal_endpoint" ]; then
        debezium_kafka_bootstrap_servers="$kafka_internal_endpoint"
    else
        debezium_kafka_bootstrap_servers="kafka.${LOCAL_DATA_STREAMING_NS}.svc.cluster.local:9092"
    fi
    log_info "   Debezium Kafka Bootstrap Servers: ${debezium_kafka_bootstrap_servers}"
    
    log_info "📦 Debezium 배포 (Kafka: ${debezium_kafka_bootstrap_servers}, PostgreSQL: ${DEBEZIUM_POSTGRES_HOST}:${DEBEZIUM_POSTGRES_PORT})..."
    helm_deploy_with_debug "debezium" "./infra/helm/debezium" "${LOCAL_DATA_STORAGE_NS}" "$HELM_TIMEOUT_MEDIUM" \
        "app.kubernetes.io/name=debezium" "Debezium" \
        --set 'nodeSelector.node-role=local' \
        --set kafka.bootstrapServers="${debezium_kafka_bootstrap_servers}" \
        --set connector.database.hostname="${DEBEZIUM_POSTGRES_HOST}" \
        --set connector.database.port="${DEBEZIUM_POSTGRES_PORT}" \
        --set connector.database.user="${POSTGRES_USER}" \
        --set connector.database.password="${POSTGRES_PASSWORD}" \
        --set connector.database.dbname="${POSTGRES_DB}" || {
        log_warning "📋 Debezium Deployment 상태:"
        kubectl get deployment debezium -n "${LOCAL_DATA_STORAGE_NS}" -o yaml | grep -A 10 "status:" || true
        log_warning "📋 Kafka Service 확인:"
        kubectl get svc -n "${LOCAL_DATA_STREAMING_NS}" | grep cp-kafka || true
        log_warning "📋 Kafka Pod 상태:"
        kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}" -l platform.confluent.io/type=kafka || true
        log_warning "⚠️  Debezium 배포가 타임아웃되었습니다. 위의 로그를 확인하세요."
    }
    
    log_success "✅ Debezium Connector는 Helm hook Job에서 자동으로 등록됩니다."
    log_info "📋 Connector 등록 Job 상태 확인:"
    sleep $WAIT_SLEEP_MEDIUM
    kubectl get jobs -n "${LOCAL_DATA_STORAGE_NS}" -l app.kubernetes.io/name=debezium | grep connector-register || \
        echo "Job이 아직 생성되지 않았거나 완료되었습니다."
}

# Kibana 배포
deploy_kibana() {
    log_info "📦 Kibana 배포..."
    helm_deploy_with_debug "kibana" "./infra/helm/kibana" "${LOCAL_DATA_STORAGE_NS}" "$HELM_TIMEOUT_MEDIUM" \
        "app.kubernetes.io/name=kibana" "Kibana" \
        --set 'nodeSelector.node-role=local' \
        --set elasticsearch.hosts="http://elasticsearch.${LOCAL_DATA_STORAGE_NS}.svc.cluster.local:9200" \
        --set secrets.kibanaPassword="${ELASTICSEARCH_KIBANA_PASSWORD}" \
        --set service.type=NodePort \
        --set service.nodePort=30561 || {
        log_warning "📋 Kibana Deployment 상태:"
        kubectl get deployment kibana -n "${LOCAL_DATA_STORAGE_NS}" -o yaml | grep -A 10 "status:" || true
        log_warning "⚠️  Kibana 배포가 타임아웃되었습니다. 위의 로그를 확인하세요."
    }
}

# Kafka UI 배포
deploy_kafka_ui() {
    log_info "📦 Kafka UI 배포..."
    helm_deploy "kafka-ui" "./infra/helm/kafka-ui" "${LOCAL_DATA_STREAMING_NS}" "$HELM_TIMEOUT_MEDIUM" \
        --set 'nodeSelector.node-role=local' \
        --set kafka.brokers="kafka.${LOCAL_DATA_STREAMING_NS}.svc.cluster.local:9092" \
        --set service.type=NodePort \
        --set service.nodePort=30080 || {
        log_warning "⚠️  Kafka UI 배포가 타임아웃되었습니다."
    }
}

# KSQLDB 배포
deploy_ksqldb() {
    log_info "⏳ Kafka 준비 상태 확인 중..."
    local count=0
    
    while [ $count -lt $MAX_WAIT_KAFKA_READY ]; do
        if check_kafka_ready "${LOCAL_DATA_STREAMING_NS}"; then
            log_success "✅ Kafka가 준비되었습니다."
            break
        fi
        count=$((count + 1))
        if [ $count -lt $MAX_WAIT_KAFKA_READY ]; then
            echo "   Kafka 준비 대기 중... ($count/$MAX_WAIT_KAFKA_READY)"
            sleep $WAIT_SLEEP_SHORT
        fi
    done
    
    if ! check_kafka_ready "${LOCAL_APP_NS}"; then
        log_warning "⚠️  Kafka가 아직 준비되지 않았지만 KSQLDB 배포를 계속합니다."
    fi

    log_info "📦 KSQLDB 쿼리 파일 확인..."
    local queries_file="./infra/helm/ksqldb/files/queries.sql"
    if [ ! -f "$queries_file" ]; then
        log_warning "⚠️  queries.sql 파일을 찾을 수 없습니다: ${queries_file}"
        log_warning "⚠️  KSQLDB 쿼리 ConfigMap이 비어있을 수 있습니다."
    else
        log_success "✅ queries.sql 파일 확인 완료 (Helm에서 자동으로 ConfigMap 생성)"
    fi

    cd ./infra/helm/ksqldb
    helm dependency update
    cd ../../..
    
    log_info "📦 KSQLDB 배포..."
    local kafka_bootstrap_servers="kafka.${LOCAL_DATA_STREAMING_NS}.svc.cluster.local:9092"
    echo "   Kafka Bootstrap Servers: ${kafka_bootstrap_servers}"
    helm_deploy_with_debug "ksqldb" "./infra/helm/ksqldb" "${LOCAL_DATA_STREAMING_NS}" "$HELM_TIMEOUT_MEDIUM" \
        "platform.confluent.io/type=ksqldb" "KSQLDB" \
        --set dependencies.kafka.bootstrapEndpoint="${kafka_bootstrap_servers}" \
        -f ./infra/helm/ksqldb/values-local.yaml || {
        log_warning "📋 KSQLDB Deployment 상태:"
        kubectl get deployment ksqldb -n "${LOCAL_DATA_STREAMING_NS}" -o yaml | grep -A 10 "status:" || true
        log_warning "⚠️  KSQLDB 배포가 타임아웃되었습니다. 위의 로그를 확인하세요."
    }
}

# Cert-manager 배포
deploy_cert_manager() {
    log_info "📦 cert-manager 배포..."
    
    # cert-manager 자체 설치 (jetstack Helm repo에서)
    log_info "   Installing cert-manager from jetstack..."
    helm_deploy "cert-manager" "jetstack/cert-manager" "${LOCAL_CERT_MANAGER_NS}" "$HELM_TIMEOUT_MEDIUM" \
        --set 'nodeSelector.node-role=local' \
        --set 'installCRDs=true' || {
        log_warning "⚠️  cert-manager 배포가 타임아웃되었습니다."
    }
    
    # cert-manager가 준비될 때까지 대기
    log_info "⏳ cert-manager 준비 상태 확인 중..."
    local count=0
    local cert_manager_ready="False"
    
    while [ $count -lt 60 ]; do
        cert_manager_ready=$(kubectl get pods -n "${LOCAL_CERT_MANAGER_NS}" -l app.kubernetes.io/name=cert-manager \
            -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")
        
        if [ "$cert_manager_ready" = "True" ]; then
            log_success "✅ cert-manager가 준비되었습니다."
            break
        fi
        
        count=$((count + 1))
        if [ $count -lt 60 ]; then
            if [ $((count % 10)) -eq 0 ]; then
                echo "   cert-manager 준비 대기 중... ($count/60)"
            fi
            sleep $WAIT_SLEEP_SHORT
        fi
    done
    
    if [ "$cert_manager_ready" != "True" ]; then
        log_warning "⚠️  cert-manager가 아직 준비되지 않았지만 계속 진행합니다."
    fi
    
    # ClusterIssuer 배포 (cert-manager-bootstrap)
    local cert_email="${SSL_EMAIL:-${CERT_EMAIL:-admin@mecipe.com}}"
    log_info "📦 cert-manager-bootstrap 배포 (ClusterIssuer)..."
    log_info "   Email: ${cert_email}"
    log_info "   Staging ClusterIssuer 활성화 (로컬 환경용)"
    
    helm_deploy "cert-manager-bootstrap" "./infra/helm/cert-manager" "${LOCAL_INGRESS_NS}" "$HELM_TIMEOUT_SHORT" \
        --set 'nodeSelector.node-role=local' \
        --set "email=${cert_email}" \
        --set 'letsencrypt.staging.enabled=true' || {
        log_warning "⚠️  cert-manager-bootstrap 배포가 실패했습니다."
    }
    
    log_success "✅ cert-manager 배포 완료"
}

# Ingress Nginx 배포
deploy_ingress_nginx() {
    log_info "📦 ingress-nginx 배포..."
    helm_deploy "ingress-nginx" "ingress-nginx/ingress-nginx" "${LOCAL_INGRESS_NS}" "$HELM_TIMEOUT_MEDIUM" \
        --set 'controller.nodeSelector.node-role=local' \
        --set 'controller.service.type=NodePort' \
        --set 'controller.service.nodePorts.http=30081' \
        --set 'controller.service.nodePorts.https=30444' \
        --set 'rbac.create=true' \
        --set 'controller.serviceAccount.create=true' || {
        log_warning "⚠️  ingress-nginx 배포가 타임아웃되었습니다."
    }
    
    log_info "📋 ingress-nginx 접근 정보:"
    log_info "   HTTP: http://localhost:30081 또는 http://<node-ip>:30081"
    log_info "   HTTPS: https://localhost:30444 또는 https://<node-ip>:30444"
    log_info ""
    log_info "💡 로컬에서 사용하려면 /etc/hosts에 도메인을 추가하세요:"
    log_info "   <node-ip>  ${DOMAIN_NAME}"
    log_info ""
    log_info "   또는 minikube 환경인 경우:"
    log_info "   minikube ip"
    log_info "   # 출력된 IP를 사용하여 위 명령어 실행"
}

# 인프라 배포
deploy_infrastructure() {
    if [ "$INTERRUPTED" = "true" ]; then
        exit 130
    fi
    
    log_header "인프라 배포"
    
    log_info "📦 Kafka & Zookeeper 배포 (${LOCAL_DATA_STREAMING_NS} namespace)..."
    
    # 기존 release 확인 및 삭제
    if helm list -n "${LOCAL_DATA_STREAMING_NS}" | grep -qE "(kafka|kafka-zookeeper)"; then
        log_warning "⚠️  기존 Kafka/Zookeeper release를 삭제합니다..."
        helm uninstall kafka -n "${LOCAL_DATA_STREAMING_NS}" 2>/dev/null || true
        helm uninstall kafka-zookeeper -n "${LOCAL_DATA_STREAMING_NS}" 2>/dev/null || true
        sleep $WAIT_SLEEP_SHORT
    fi
    
    deploy_confluent_operator
    deploy_zookeeper
    deploy_kafka
    
    echo ""
    log_info "📦 PostgreSQL 및 관련 서비스 배포 (${LOCAL_DATA_STORAGE_NS} namespace)..."
    deploy_postgresql
    
    deploy_elasticsearch
    deploy_debezium
    deploy_kibana
    
    echo ""
    log_info "📦 Redis 배포 (${LOCAL_DATA_STREAMING_NS} namespace)..."
    deploy_redis
    
    echo ""
    log_info "📦 Kafka UI 및 KSQLDB 배포 (${LOCAL_DATA_STREAMING_NS} namespace)..."
    deploy_kafka_ui
    deploy_ksqldb
    
    echo ""
    log_info "📦 cert-manager 배포..."
    deploy_cert_manager
    
    echo ""
    log_info "📦 ingress-nginx 배포..."
    deploy_ingress_nginx
    
    echo ""
    log_success "✅ 인프라 배포 완료"
    
    log_warning "📋 배포 상태 확인..."
    echo "--- ${LOCAL_APP_NS} namespace ---"
    kubectl get pods -n "${LOCAL_APP_NS}"
    echo ""
    echo "--- ${LOCAL_DATA_STORAGE_NS} namespace ---"
    kubectl get pods -n "${LOCAL_DATA_STORAGE_NS}"
    echo ""
    echo "--- ${LOCAL_DATA_STREAMING_NS} namespace ---"
    kubectl get pods -n "${LOCAL_DATA_STREAMING_NS}"
    echo ""
    echo "--- ${LOCAL_INGRESS_NS} namespace ---"
    kubectl get pods -n "${LOCAL_INGRESS_NS}"
    echo ""
    echo "--- ${LOCAL_CERT_MANAGER_NS} namespace ---"
    kubectl get pods -n "${LOCAL_CERT_MANAGER_NS}"
}

# 인프라 준비 상태 확인
wait_for_infrastructure() {
    if [ "$INTERRUPTED" = "true" ]; then
        exit 130
    fi
    
    log_header "인프라 준비 상태 확인"
    
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES_INFRA ]; do
        if [ "$INTERRUPTED" = "true" ]; then
            exit 130
        fi
        
        local kafka_ready="False"
        if check_kafka_ready "${LOCAL_DATA_STREAMING_NS}"; then
            kafka_ready="True"
        fi
        
        local es_ready=$(kubectl get pods -n "${LOCAL_DATA_STORAGE_NS}" -l app.kubernetes.io/name=elasticsearch \
            -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "False")
        local postgres_ready=$(kubectl get pods -n "${LOCAL_DATA_STORAGE_NS}" -l app.kubernetes.io/name=postgres \
            -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "Unknown")
        
        echo "📊 Infrastructure status:"
        echo "  Kafka: $kafka_ready"
        echo "  Elasticsearch: $es_ready"
        echo "  PostgreSQL: $postgres_ready"
        
        if [ "$kafka_ready" = "True" ] && [ "$es_ready" = "True" ]; then
            log_success "✅ Infrastructure is ready!"
            break
        fi
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES_INFRA ]; then
            echo "⏳ Waiting for infrastructure... ($retry_count/$MAX_RETRIES_INFRA) - retrying in ${WAIT_SLEEP_LONG}s"
            sleep $WAIT_SLEEP_LONG
        fi
    done
    
    if [ $retry_count -eq $MAX_RETRIES_INFRA ]; then
        log_warning "⚠️  Infrastructure may not be fully ready, but continuing..."
    fi
}

# ============================================================================
# 애플리케이션 배포
# ============================================================================

deploy_applications() {
    if [ "$INTERRUPTED" = "true" ]; then
        exit 130
    fi
    
    log_header "애플리케이션 배포"
    
    if [ "$POSTGRES_DEPLOY" = "false" ]; then
        POSTGRES_CONNECTION_HOST="${POSTGRES_HOST}"
        POSTGRES_CONNECTION_PORT="${POSTGRES_PORT}"
    else
        POSTGRES_CONNECTION_HOST="postgres.${LOCAL_DATA_STORAGE_NS}.svc.cluster.local"
        POSTGRES_CONNECTION_PORT="5432"
    fi
    
    log_info "📦 Place API Service 배포..."
    helm_deploy "place-api-service" "./infra/helm/apps/place-api-service" "${LOCAL_APP_NS}" "$HELM_TIMEOUT_MEDIUM" \
        -f ./infra/helm/apps/place-api-service/values-local.yaml \
        --set 'nodeSelector.node-role=local' \
        --set global.dockerRegistry="${DOCKER_USERNAME}" \
        --set image.repository="place-api-service" \
        --set image.tag="${IMAGE_TAG}" \
        --set image.pullPolicy="Never" \
        --set postgres.username="${POSTGRES_USER}" \
        --set postgres.password="${POSTGRES_PASSWORD}" \
        --set postgres.database="${POSTGRES_DB}" \
        --set postgres.hosts="${POSTGRES_CONNECTION_HOST}:${POSTGRES_CONNECTION_PORT}" \
        --set elasticsearch.hosts="http://elasticsearch.${LOCAL_DATA_STORAGE_NS}.svc.cluster.local:9200" \
        --set elasticsearch.username="${ELASTICSEARCH_APP_USER_NAME}" \
        --set elasticsearch.password="${ELASTICSEARCH_APP_USER_PASS}" \
        --set env.port="${PORT}" \
        --set secrets.jwtSecret="${JWT_SECRET:-local-test-secret}" \
        --set secrets.secretLoginCrypto="${SECRET_LOGIN_CRYPTO:-local-crypto}" \
        --set secrets.apiKey="${API_KEY:-}" \
        --set secrets.buildApiKey="${BUILD_API_KEY:-}" \
        --set secrets.couponSecret="${COUPON_SECRET:-local-coupon}" \
        --set secrets.productSecret="${PRODUCT_SECRET:-local-product}" \
        --set ingress.enabled=true || {
        log_warning "⚠️  Place API Service 배포가 타임아웃되었습니다."
    }

    log_info "📦 Meta Viewer Service 배포..."
    local redis_url="redis://redis.${LOCAL_DATA_STREAMING_NS}.svc.cluster.local:6379"
    if [ -n "${REDIS_PASSWORD}" ]; then
        redis_url="redis://:${REDIS_PASSWORD}@redis.${LOCAL_DATA_STREAMING_NS}.svc.cluster.local:6379"
    fi
    helm_deploy "meta-viewer-service" "./infra/helm/apps/meta-viewer-service" "${LOCAL_APP_NS}" "$HELM_TIMEOUT_MEDIUM" \
        -f ./infra/helm/apps/meta-viewer-service/values-local.yaml \
        --set 'nodeSelector.node-role=local' \
        --set global.dockerRegistry="${DOCKER_USERNAME}" \
        --set image.repository="meta-viewer-service" \
        --set image.tag="${IMAGE_TAG}" \
        --set image.pullPolicy="Never" \
        --set env.port="${SOCKET_PORT}" \
        --set env.socketPort="${SOCKET_PORT}" \
        --set env.redisUrl="${redis_url}" \
        --set secrets.jwtSecret="${JWT_SECRET:-local-test-secret}" || {
        log_warning "⚠️  Meta Viewer Service 배포가 타임아웃되었습니다."
    }

    log_info "📦 API Gateway 배포..."
    helm_deploy "api-gateway" "./infra/helm/apps/api-gateway" "${LOCAL_APP_NS}" "$HELM_TIMEOUT_MEDIUM" \
        -f ./infra/helm/apps/api-gateway/values-local.yaml \
        --set 'nodeSelector.node-role=local' \
        --set global.dockerRegistry="${DOCKER_USERNAME}" \
        --set image.repository="api-gateway" \
        --set secrets.jwtPublicKey="${JWT_PUBLIC_KEY}" \
        --set env.placeApiServiceUrl="http://place-api-service:${PORT}" \
        --set image.tag="${IMAGE_TAG}" \
        --set image.pullPolicy="Never" || {
        log_warning "⚠️  API Gateway 배포가 타임아웃되었습니다."
    }
    
    log_info "📦 Place Indexer Service 배포..."
    echo -e "elasticsearch username: ${ELASTICSEARCH_PRODUCER_USER_NAME}"
    echo -e "elasticsearch password: ${ELASTICSEARCH_PRODUCER_USER_PASS}"
    helm_deploy "place-indexer-service" "./infra/helm/apps/place-indexer-service" "${LOCAL_APP_NS}" "$HELM_TIMEOUT_MEDIUM" \
        --set 'nodeSelector.node-role=local' \
        --set global.dockerRegistry="${DOCKER_USERNAME}" \
        --set image.repository="place-indexer-service" \
        --set image.tag="${IMAGE_TAG}" \
        --set image.pullPolicy="Never" \
        --set env.kafkaBrokers="kafka.${LOCAL_DATA_STREAMING_NS}.svc.cluster.local:9092" \
        --set env.elasticsearchHosts="http://elasticsearch.${LOCAL_DATA_STORAGE_NS}.svc.cluster.local:9200" \
        --set secrets.elasticsearchUsername="${ELASTICSEARCH_PRODUCER_USER_NAME}" \
        --set secrets.elasticsearchPassword="${ELASTICSEARCH_PRODUCER_USER_PASS}" || {
        log_warning "⚠️  Place Indexer Service 배포가 타임아웃되었습니다."
    }
    
    # 마이그레이션은 Dockerfile의 CMD에서 자동으로 실행되므로 여기서는 제거
    # 컨테이너가 시작될 때마다 자동으로 prisma migrate deploy가 실행됩니다.
    
    echo ""
    log_success "✅ 애플리케이션 배포 완료"
    
    log_warning "📋 배포 상태 확인..."
    kubectl get pods -n "${LOCAL_APP_NS}" -o wide
    kubectl get svc -n "${LOCAL_APP_NS}"
}

# ============================================================================
# 메인 실행
# ============================================================================

main() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
    
    cd "${PROJECT_ROOT}"
    
    ENV_FILE="${PROJECT_ROOT}/.env.local"
    if [ ! -f "${ENV_FILE}" ]; then
        ENV_FILE="${PROJECT_ROOT}/.env"
    fi
    
    if [ -f "${ENV_FILE}" ]; then
        log_warning "📋 환경 변수 파일 로드: ${ENV_FILE}"
        set -a
        source "${ENV_FILE}"
        set +a
        log_success "✅ 환경 변수 로드 완료"
    else
        log_warning "⚠️  .env 또는 .env.local 파일을 찾을 수 없습니다."
        echo "환경 변수를 직접 설정하거나 .env 파일을 생성하세요."
    fi
    
    echo "======================================"
    echo "로컬 배포 테스트 시작"
    echo "배포 타입: ${DEPLOY_TYPE}"
    echo "======================================"
    
    check_env_vars
    check_helm
    check_kubectl
    check_docker
    
    label_nodes
    create_namespaces
    cleanup_resources
    update_helm_repo

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
            log_error "❌ 잘못된 배포 타입: ${DEPLOY_TYPE}"
            echo "사용법: $0 [infra|apps|all]"
            exit 1
            ;;
    esac
    
    echo ""
    log_header "배포 테스트 완료!"
    log_success "✅"
    echo ""
    log_info "📋 배포 정보:"
    echo "  - 이미지 태그: ${IMAGE_TAG}"
    echo "  - Docker Registry: ${DOCKER_USERNAME}"
    echo "  - 네임스페이스: ${LOCAL_APP_NS}, ${LOCAL_DATA_STORAGE_NS}, ${LOCAL_DATA_STREAMING_NS}, ${LOCAL_INGRESS_NS}, ${LOCAL_CERT_MANAGER_NS}"
    echo "  - nodeSelector: node-role=local (로컬 전용 노드)"
    echo ""
    log_success "✅ 로컬 배포는 nodeSelector로 실제 배포와 분리되어 있습니다"
    echo "  - nodeSelector 분리: 로컬은 node-role=local, 실제는 node-role=app/data"
    echo "  - 같은 클러스터에서도 다른 노드에 스케줄링되어 충돌하지 않습니다"
    echo ""
    log_info "🌐 외부 접속 정보:"
    echo "  - Kibana (NodePort): http://localhost:30561"
    echo "  - Kafka UI (NodePort): http://localhost:30080 (내부 포트 8080과 분리)"
    echo ""
    echo "  - Ingress Controller (NodePort):"
    echo "    HTTP: http://localhost:30081"
    echo "    HTTPS: https://localhost:30444"
    echo ""
    echo "  - Ingress를 통한 접속:"
    echo "    mecipe-was: http://${DOMAIN_NAME}:30081"
    echo "    (또는 https://${DOMAIN_NAME}:30444 - TLS 인증서가 있는 경우)"
    echo ""
    echo "  💡 /etc/hosts 파일에 다음을 추가하세요:"
    echo "     $(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || echo '<node-ip>')  ${DOMAIN_NAME}"
    echo ""
    echo "다음 명령어로 상태 확인:"
    echo "  kubectl get pods -n ${LOCAL_APP_NS}"
    echo "  kubectl get pods -n ${LOCAL_DATA_STORAGE_NS}"
    echo "  kubectl get pods -n ${LOCAL_DATA_STREAMING_NS}"
    echo "  kubectl get pods -n ${LOCAL_INGRESS_NS}"
    echo "  kubectl get pods -n ${LOCAL_CERT_MANAGER_NS}"
    echo "  kubectl logs -n ${LOCAL_DATA_STREAMING_NS} -l platform.confluent.io/type=kafka"
    echo "  kubectl logs -n ${LOCAL_APP_NS} deployment/mecipe-was"
    echo "  kubectl logs -n ${LOCAL_APP_NS} deployment/place-indexer-service"
    echo ""
    echo "Helm release 확인:"
    echo "  helm list -n ${LOCAL_APP_NS}"
    echo "  helm list -n ${LOCAL_DATA_STORAGE_NS}"
    echo "  helm list -n ${LOCAL_DATA_STREAMING_NS}"
    echo "  helm list -n ${LOCAL_INGRESS_NS}"
    echo "  helm list -n ${LOCAL_CERT_MANAGER_NS}"
}

main "$@"
