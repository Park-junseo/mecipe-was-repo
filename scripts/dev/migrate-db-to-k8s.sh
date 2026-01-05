#!/bin/bash

# PostgreSQL 데이터베이스 간 데이터 복제 스크립트
# 소스와 타겟 DB가 어디에 있든 (로컬, Docker, Kubernetes, 클라우드 등) 호스트/포트/계정 정보만 있으면 복제 가능
# 사용법: ./scripts/dev/migrate-db-to-k8s.sh [OPTIONS]
#
# 예시:
#   # 일반 PostgreSQL에서 일반 PostgreSQL로 (권장)
#   ./scripts/dev/migrate-db-to-k8s.sh \
#     --source local --source-db sourcedb --source-user user --source-password pass \
#     --target-host target.example.com --target-port 5432 --target-db targetdb --target-user user --target-password pass
#
#   # Kubernetes로 복제 (선택사항)
#   ./scripts/dev/migrate-db-to-k8s.sh \
#     --source local --source-db sourcedb \
#     --target-k8s --target-ns data-storage --target-service postgres --target-db targetdb --target-password pass
#
#   # URL로 직접 연결
#   ./scripts/dev/migrate-db-to-k8s.sh \
#     --source-url "postgresql://user:pass@localhost:5432/sourcedb" \
#     --target-url "postgresql://user:pass@target:5432/targetdb"

set -e
set -o pipefail

# ============================================================================
# 색상 및 로깅 함수
# ============================================================================

readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================================
# 기본값 설정
# ============================================================================

# 소스 DB 설정 (로컬/도커)
SOURCE_TYPE=""  # local, docker
SOURCE_HOST="localhost"
SOURCE_PORT="5432"
SOURCE_DB=""
SOURCE_USER="postgres"
SOURCE_PASSWORD=""
SOURCE_CONTAINER=""
SOURCE_DB_URL=""  # 또는 직접 URL 제공

# 타겟 DB 설정
TARGET_TYPE=""  # k8s, direct, url (비어있으면 direct 기본값)
TARGET_HOST="localhost"
TARGET_PORT="5432"
TARGET_DB="mydb"
TARGET_USER="postgres"
TARGET_PASSWORD=""
TARGET_DB_URL=""  # 또는 직접 URL 제공

# 타겟 K8s DB 설정 (--target-k8s 사용 시)
TARGET_K8S_NS="data-storage"
TARGET_DB_NAME="postgres"  # K8s 서비스 이름
TARGET_SERVICE_PORT="5432"

# 기타 설정
TEMP_DIR="./.migration-temp"
PORT_FORWARD_PORT="5433"
PORT_FORWARD_PID=""
SKIP_CONFIRM=false
VERBOSE=false
DATA_ONLY=false  # 데이터만 복사 (스키마 유지)

# ============================================================================
# 함수 정의
# ============================================================================

print_usage() {
    cat << EOF
사용법: $0 [OPTIONS]

PostgreSQL 데이터베이스 간 데이터를 복제합니다.
소스와 타겟이 어디에 있든 (로컬, Docker, Kubernetes, 클라우드 등) 연결 정보만 있으면 됩니다.

옵션:
  --source TYPE              소스 DB 타입 (local, docker, url)
                            - local: 로컬에 설치된 PostgreSQL
                            - docker: Docker 컨테이너의 PostgreSQL
                            - url: 직접 연결 URL 제공

  --source-host HOST        소스 DB 호스트 (기본값: localhost)
  --source-port PORT        소스 DB 포트 (기본값: 5432)
  --source-db DB            소스 DB 이름 (필수)
  --source-user USER        소스 DB 사용자 (기본값: postgres)
  --source-password PASS    소스 DB 비밀번호
  --source-container NAME   Docker 컨테이너 이름 (docker 타입 사용 시)

  --source-url URL          소스 DB 연결 URL (예: postgresql://user:pass@host:port/db)

  타겟 DB 설정 (일반 PostgreSQL - 권장):
  --target-host HOST        타겟 DB 호스트 (기본값: localhost)
  --target-port PORT        타겟 DB 포트 (기본값: 5432)
  --target-db DB            타겟 DB 이름 (기본값: mydb)
  --target-user USER        타겟 DB 사용자 (기본값: postgres)
  --target-password PASS    타겟 DB 비밀번호
  --target-url URL          타겟 DB 연결 URL (예: postgresql://user:pass@host:port/db)

  타겟 DB 설정 (Kubernetes - 선택사항):
  --target-k8s              타겟이 Kubernetes인 경우 사용
  --target-ns NAMESPACE     타겟 K8s 네임스페이스 (기본값: data-storage)
  --target-service NAME     타겟 K8s 서비스 이름 (기본값: postgres)

  --temp-dir DIR            임시 파일 디렉토리 (기본값: ./.migration-temp)
  --port-forward-port PORT  포트 포워딩 포트 (기본값: 5433)
  --data-only               데이터만 복사 (스키마 유지, --clean 미사용)
  --skip-confirm            확인 없이 실행
  --verbose                 상세한 로그 출력
  -h, --help                도움말 표시

환경 변수:
  SOURCE_DB_URL             소스 DB 연결 URL
  SOURCE_DB_PASSWORD        소스 DB 비밀번호
  TARGET_DB_PASSWORD        타겟 DB 비밀번호
  TARGET_K8S_NS             타겟 K8s 네임스페이스
  TARGET_DB_NAME            타겟 K8s 서비스 이름

예시:
  # 로컬 PostgreSQL에서 복제
  $0 --source local --source-db mydb --source-user myuser --source-password mypass

  # Docker 컨테이너에서 복제
  $0 --source docker --source-container my-db --source-db mydb

  # URL로 직접 연결
  $0 --source url --source-url "postgresql://user:pass@localhost:5432/mydb"

  # 환경 변수 사용
  SOURCE_DB_URL="postgresql://user:pass@localhost:5432/sourcedb" \\
  TARGET_DB_PASSWORD="targetpass" \\
  $0 --source url --source-db sourcedb --target-db targetdb
EOF
}

cleanup() {
    log_info "정리 중..."
    
    # 포트 포워딩 종료
    if [ -n "$PORT_FORWARD_PID" ]; then
        log_info "포트 포워딩 종료 중 (PID: $PORT_FORWARD_PID)..."
        kill $PORT_FORWARD_PID 2>/dev/null || true
        wait $PORT_FORWARD_PID 2>/dev/null || true
    fi
    
    # 임시 디렉토리 정리
    if [ "$SKIP_CONFIRM" = "true" ] || [ -z "$TEMP_DIR" ]; then
        # 자동 정리 옵션이 있으면 스킵
        return
    fi
    
    if [ -d "$TEMP_DIR" ]; then
        read -p "임시 파일을 삭제하시겠습니까? ($TEMP_DIR) [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$TEMP_DIR"
            log_success "임시 파일 삭제 완료"
        else
            log_info "임시 파일 유지: $TEMP_DIR"
        fi
    fi
}

trap cleanup EXIT INT TERM

check_dependencies() {
    local missing_deps=()
    
    # Kubernetes를 사용하는 경우만 kubectl 필요
    if [ "$TARGET_TYPE" = "k8s" ] && ! command -v kubectl &> /dev/null; then
        missing_deps+=("kubectl")
    fi
    
    if ! command -v pg_dump &> /dev/null; then
        missing_deps+=("pg_dump (PostgreSQL client)")
    fi
    
    if ! command -v psql &> /dev/null; then
        missing_deps+=("psql (PostgreSQL client)")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "다음 도구들이 필요합니다: ${missing_deps[*]}"
        exit 1
    fi
}

check_k8s_connection() {
    log_info "Kubernetes 연결 확인 중..."
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Kubernetes 클러스터에 연결할 수 없습니다"
        exit 1
    fi
    log_success "Kubernetes 연결 확인 완료"
}

check_source_db_connection() {
    local url="$1"
    
    log_info "소스 DB 연결 확인 중..."
    
    if psql "$url" -c "SELECT 1;" &> /dev/null; then
        log_success "소스 DB 연결 확인 완료"
        return 0
    else
        log_error "소스 DB에 연결할 수 없습니다"
        return 1
    fi
}

check_target_db_connection() {
    local url="$1"
    
    log_info "타겟 DB 연결 확인 중..."
    
    if psql "$url" -c "SELECT 1;" &> /dev/null; then
        log_success "타겟 DB 연결 확인 완료"
        return 0
    else
        log_error "타겟 DB에 연결할 수 없습니다"
        return 1
    fi
}

setup_port_forward() {
    log_info "Kubernetes 서비스에 포트 포워딩 설정 중..."
    
    kubectl port-forward -n "$TARGET_K8S_NS" "svc/$TARGET_DB_NAME" "$PORT_FORWARD_PORT:$TARGET_SERVICE_PORT" > /dev/null 2>&1 &
    PORT_FORWARD_PID=$!
    
    # 포트 포워딩이 준비될 때까지 대기
    sleep 2
    
    # 포트 포워딩 프로세스 확인
    if ! kill -0 $PORT_FORWARD_PID 2>/dev/null; then
        log_error "포트 포워딩 실패"
        exit 1
    fi
    
    log_success "포트 포워딩 설정 완료 (PID: $PORT_FORWARD_PID, 포트: $PORT_FORWARD_PORT)"
}

build_source_db_url() {
    local url=""
    local password="${SOURCE_PASSWORD:-${SOURCE_DB_PASSWORD:-}}"
    
    if [ -n "$SOURCE_DB_URL" ]; then
        echo "$SOURCE_DB_URL"
        return
    fi
    
    if [ "$SOURCE_TYPE" = "docker" ] && [ -n "$SOURCE_CONTAINER" ]; then
        # Docker 컨테이너에서 실행
        url="postgresql://${SOURCE_USER}:${password}@localhost:${SOURCE_PORT}/${SOURCE_DB}"
    elif [ "$SOURCE_TYPE" = "local" ]; then
        # 로컬 PostgreSQL
        url="postgresql://${SOURCE_USER}:${password}@${SOURCE_HOST}:${SOURCE_PORT}/${SOURCE_DB}"
    else
        log_error "소스 DB 타입이 올바르지 않거나 필수 정보가 없습니다"
        exit 1
    fi
    
    echo "$url"
}

build_target_db_url() {
    local password="${TARGET_PASSWORD:-${TARGET_DB_PASSWORD:-}}"
    
    # URL이 직접 제공된 경우
    if [ -n "$TARGET_DB_URL" ]; then
        echo "$TARGET_DB_URL"
        return
    fi
    
    # Kubernetes인 경우 (포트 포워딩 사용)
    if [ "$TARGET_TYPE" = "k8s" ]; then
        echo "postgresql://${TARGET_USER}:${password}@localhost:${PORT_FORWARD_PORT}/${TARGET_DB}"
    else
        # 일반 PostgreSQL 연결
        echo "postgresql://${TARGET_USER}:${password}@${TARGET_HOST}:${TARGET_PORT}/${TARGET_DB}"
    fi
}

dump_source_db() {
    local source_url="$1"
    local dump_file="$2"
    
    if [ "$DATA_ONLY" = "true" ]; then
        log_info "소스 DB 데이터 덤프 중... (스키마 제외, 파일: $dump_file)"
    else
        log_info "소스 DB 덤프 중... (스키마 + 데이터, 파일: $dump_file)"
    fi
    
    local pg_dump_opts=(
        --format=custom
        --verbose
        --no-owner
        --no-privileges
    )
    
    if [ "$DATA_ONLY" = "true" ]; then
        pg_dump_opts+=(--data-only)
    fi
    
    if [ "$VERBOSE" = "true" ]; then
        pg_dump "$source_url" "${pg_dump_opts[@]}" -f "$dump_file"
    else
        pg_dump "$source_url" "${pg_dump_opts[@]}" -f "$dump_file" 2>/dev/null
    fi
    
    if [ -f "$dump_file" ] && [ -s "$dump_file" ]; then
        local size=$(du -h "$dump_file" | cut -f1)
        log_success "덤프 완료 (크기: $size)"
    else
        log_error "덤프 실패"
        exit 1
    fi
}

restore_to_target_db() {
    local target_url="$1"
    local dump_file="$2"
    
    if [ "$DATA_ONLY" = "true" ]; then
        log_info "타겟 DB에 데이터 복원 중... (스키마 유지)"
    else
        log_info "타겟 DB에 복원 중... (스키마 + 데이터)"
    fi
    
    # 기존 데이터 확인
    local existing_tables=$(psql "$target_url" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$DATA_ONLY" = "true" ]; then
        if [ "$existing_tables" -eq 0 ]; then
            log_error "타겟 DB에 테이블이 없습니다. --data-only 옵션은 스키마가 이미 존재해야 합니다."
            log_error "먼저 Prisma 마이그레이션을 실행하거나 스키마를 생성해주세요."
            exit 1
        fi
        log_info "타겟 DB에 $existing_tables 개의 테이블이 있습니다 (스키마 유지됨)"
    else
        if [ "$existing_tables" -gt 0 ] && [ "$SKIP_CONFIRM" = "false" ]; then
            log_warning "타겟 DB에 기존 테이블이 있습니다 ($existing_tables 개)"
            log_warning "주의: --clean 옵션으로 인해 기존 스키마가 삭제됩니다."
            read -p "계속하시겠습니까? 기존 스키마와 데이터가 삭제됩니다. [y/N]: " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "복원 취소됨"
                log_info "팁: 스키마를 유지하고 싶다면 --data-only 옵션을 사용하세요."
                exit 0
            fi
        fi
    fi
    
    local pg_restore_opts=(
        --no-owner
        --no-privileges
        --verbose
    )
    
    # --data-only 옵션이 있으면 --clean을 사용하지 않음 (스키마 유지)
    if [ "$DATA_ONLY" = "true" ]; then
        pg_restore_opts+=(--data-only)
    else
        pg_restore_opts+=(--clean --if-exists)
    fi
    
    if [ "$VERBOSE" = "true" ]; then
        pg_restore -d "$target_url" "${pg_restore_opts[@]}" "$dump_file"
    else
        pg_restore -d "$target_url" "${pg_restore_opts[@]}" "$dump_file" 2>/dev/null
    fi
    
    log_success "복원 완료"
}

# ============================================================================
# 매개변수 파싱
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --source)
            SOURCE_TYPE="$2"
            shift 2
            ;;
        --source-host)
            SOURCE_HOST="$2"
            shift 2
            ;;
        --source-port)
            SOURCE_PORT="$2"
            shift 2
            ;;
        --source-db)
            SOURCE_DB="$2"
            shift 2
            ;;
        --source-user)
            SOURCE_USER="$2"
            shift 2
            ;;
        --source-password)
            SOURCE_PASSWORD="$2"
            shift 2
            ;;
        --source-container)
            SOURCE_CONTAINER="$2"
            shift 2
            ;;
        --source-url)
            SOURCE_DB_URL="$2"
            SOURCE_TYPE="url"
            shift 2
            ;;
        --target-k8s)
            TARGET_TYPE="k8s"
            shift
            ;;
        --target-host)
            TARGET_HOST="$2"
            TARGET_TYPE="${TARGET_TYPE:-direct}"
            shift 2
            ;;
        --target-port)
            TARGET_PORT="$2"
            TARGET_TYPE="${TARGET_TYPE:-direct}"
            shift 2
            ;;
        --target-db)
            TARGET_DB="$2"
            shift 2
            ;;
        --target-user)
            TARGET_USER="$2"
            shift 2
            ;;
        --target-password)
            TARGET_PASSWORD="$2"
            shift 2
            ;;
        --target-url)
            TARGET_DB_URL="$2"
            TARGET_TYPE="url"
            shift 2
            ;;
        --target-ns)
            TARGET_K8S_NS="$2"
            shift 2
            ;;
        --target-service)
            TARGET_DB_NAME="$2"
            shift 2
            ;;
        --temp-dir)
            TEMP_DIR="$2"
            shift 2
            ;;
        --port-forward-port)
            PORT_FORWARD_PORT="$2"
            shift 2
            ;;
        --data-only)
            DATA_ONLY=true
            shift
            ;;
        --skip-confirm)
            SKIP_CONFIRM=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            print_usage
            exit 1
            ;;
    esac
done

# 환경 변수에서 값 읽기 (매개변수로 덮어쓸 수 있음)
TARGET_PASSWORD="${TARGET_PASSWORD:-${TARGET_DB_PASSWORD:-}}"
SOURCE_PASSWORD="${SOURCE_PASSWORD:-${SOURCE_DB_PASSWORD:-}}"

# Kubernetes 옵션 기본값 (--target-k8s 사용 시)
TARGET_K8S_NS="${TARGET_K8S_NS:-data-storage}"
TARGET_DB_NAME="${TARGET_DB_NAME:-postgres}"

# ============================================================================
# 유효성 검사
# ============================================================================

if [ -z "$SOURCE_TYPE" ]; then
    if [ -n "$SOURCE_DB_URL" ]; then
        SOURCE_TYPE="url"
    else
        log_error "소스 DB 타입을 지정해야 합니다 (--source local|docker|url)"
        print_usage
        exit 1
    fi
fi

if [ "$SOURCE_TYPE" != "url" ] && [ -z "$SOURCE_DB" ]; then
    log_error "소스 DB 이름을 지정해야 합니다 (--source-db)"
    exit 1
fi

if [ "$SOURCE_TYPE" = "docker" ] && [ -z "$SOURCE_CONTAINER" ]; then
    log_error "Docker 컨테이너 이름을 지정해야 합니다 (--source-container)"
    exit 1
fi

# ============================================================================
# 메인 로직
# ============================================================================

log_info "=== PostgreSQL 데이터베이스 간 마이그레이션 시작 ==="
echo

# 1. 의존성 확인
check_dependencies

# 2. Kubernetes 연결 확인 (Kubernetes 타겟인 경우만)
if [ "$TARGET_TYPE" = "k8s" ]; then
    check_k8s_connection
fi

# 3. 임시 디렉토리 생성
mkdir -p "$TEMP_DIR"
DUMP_FILE="$TEMP_DIR/db_dump_$(date +%Y%m%d_%H%M%S).dump"

# 4. 소스 DB URL 구성
if [ "$SOURCE_TYPE" = "docker" ]; then
    log_info "Docker 컨테이너에서 실행: $SOURCE_CONTAINER"
    # Docker 컨테이너 내부에서 실행하거나 호스트를 통해 연결
    SOURCE_URL=$(build_source_db_url)
elif [ "$SOURCE_TYPE" = "url" ]; then
    SOURCE_URL="$SOURCE_DB_URL"
    if [ -z "$SOURCE_DB" ] && [[ "$SOURCE_DB_URL" =~ /([^/]+)$ ]]; then
        # URL에서 DB 이름 추출 (간단한 파싱)
        SOURCE_DB="${BASH_REMATCH[1]}"
        SOURCE_DB="${SOURCE_DB%%\?*}"  # 쿼리 파라미터 제거
    fi
else
    SOURCE_URL=$(build_source_db_url)
fi

# 5. 소스 DB 연결 확인
    if [ "$SOURCE_TYPE" = "docker" ] && [ -n "$SOURCE_CONTAINER" ]; then
        log_info "Docker 컨테이너를 통한 연결 확인..."
        if docker exec "$SOURCE_CONTAINER" pg_isready -U "$SOURCE_USER" -d "$SOURCE_DB" &> /dev/null; then
            log_success "Docker 컨테이너 DB 연결 확인 완료"
            # Docker 컨테이너 내부에서 덤프 실행
            if [ "$DATA_ONLY" = "true" ]; then
                log_info "Docker 컨테이너에서 데이터 덤프 생성 중... (스키마 제외)"
                docker exec "$SOURCE_CONTAINER" pg_dump -U "$SOURCE_USER" -d "$SOURCE_DB" --format=custom --data-only --no-owner --no-privileges > "$DUMP_FILE"
            else
                log_info "Docker 컨테이너에서 덤프 생성 중..."
                docker exec "$SOURCE_CONTAINER" pg_dump -U "$SOURCE_USER" -d "$SOURCE_DB" --format=custom --no-owner --no-privileges > "$DUMP_FILE"
            fi
            if [ -f "$DUMP_FILE" ] && [ -s "$DUMP_FILE" ]; then
                local size=$(du -h "$DUMP_FILE" | cut -f1)
                log_success "덤프 완료 (크기: $size)"
            else
                log_error "덤프 실패"
                exit 1
            fi
        else
            log_error "Docker 컨테이너 DB에 연결할 수 없습니다"
            exit 1
        fi
else
    if ! check_source_db_connection "$SOURCE_URL"; then
        exit 1
    fi
    
    # 6. 소스 DB 덤프
    dump_source_db "$SOURCE_URL" "$DUMP_FILE"
fi

# 7. 타겟 DB 타입 확인 및 설정
if [ -z "$TARGET_TYPE" ]; then
    # 타입이 지정되지 않았으면 기본값 (일반 PostgreSQL)
    TARGET_TYPE="direct"
fi

# Kubernetes인 경우 포트 포워딩 설정
if [ "$TARGET_TYPE" = "k8s" ]; then
    setup_port_forward
fi

# 8. 타겟 DB URL 구성
TARGET_URL=$(build_target_db_url)

# 9. 타겟 DB 연결 확인
if ! check_target_db_connection "$TARGET_URL"; then
    log_error "타겟 DB 연결 정보를 확인해주세요 (호스트, 포트, 사용자, 비밀번호)"
    exit 1
fi

# 10. 타겟 DB에 복원
restore_to_target_db "$TARGET_URL" "$DUMP_FILE"

# 11. 완료
echo
log_success "=== 마이그레이션 완료 ==="
log_info "소스: $SOURCE_URL"
if [ "$TARGET_TYPE" = "k8s" ]; then
    log_info "타겟: Kubernetes $TARGET_K8S_NS/$TARGET_DB_NAME ($TARGET_URL)"
else
    log_info "타겟: $TARGET_URL"
fi
if [ "$DATA_ONLY" = "true" ]; then
    log_info "모드: 데이터만 복사 (스키마 유지됨)"
else
    log_info "모드: 스키마 + 데이터 복사"
fi
log_info "덤프 파일: $DUMP_FILE"

