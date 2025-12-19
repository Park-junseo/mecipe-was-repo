# 환경 변수 저장 위치 가이드

민감한 정보인 환경 변수(비밀번호, API 키 등)를 어디에 저장해야 하는지 안내합니다.

## 📋 환경 변수 저장 위치 요약

| 환경 | 저장 위치 | 접근 방법 |
|------|----------|----------|
| **로컬 개발** | `.env` 파일 | 스크립트가 자동으로 읽음 |
| **GitHub Actions** | GitHub Secrets | `${{ secrets.VARIABLE_NAME }}` |
| **Kubernetes 배포** | Helm Secrets | `helm --set secrets.key=value` |
| **프로덕션 서버** | 서버의 `.env` 파일 | 직접 관리 (Git에 커밋 안 함) |

---

## 1. 로컬 개발 환경

### `.env` 파일 생성

프로젝트 루트에 `.env` 파일을 생성합니다:

```bash
# env.example을 복사
cp env.example .env

# .env 파일 편집
nano .env  # 또는 원하는 에디터 사용
```

### `.env` 파일 예시

```env
# ========================================
# 데이터베이스 설정
# ========================================
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_local_password
POSTGRES_DB=mydb

# ========================================
# Elasticsearch 설정
# ========================================
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_elasticsearch_password

# ========================================
# 인스턴스 내부 IP (선택사항)
# ========================================
INSTANCE_B_INTERNAL_IP=192.168.1.100

# ========================================
# 애플리케이션 설정
# ========================================
DATABASE_URL="postgresql://postgres:your_local_password@localhost:5432/mydb?schema=public"
JWT_SECRET=your_local_jwt_secret
SECRET_LOGIN_CRYPTO=your_local_crypto
COUPON_SECRET=your_local_coupon_secret
PRODUCT_SECRET=your_local_product_secret

# ========================================
# Docker 설정 (로컬 테스트용)
# ========================================
DOCKER_USERNAME=local
```

### ⚠️ 중요 사항

- `.env` 파일은 **절대 Git에 커밋하지 마세요**
- `.gitignore`에 이미 포함되어 있음
- `.env.example`은 예시만 포함 (실제 비밀번호 없음)

---

## 2. GitHub Actions (CI/CD)

### GitHub Secrets 설정

GitHub 저장소의 **Settings > Secrets and variables > Actions**에서 설정합니다.

#### 필수 Secrets 목록

```yaml
# 데이터베이스
POSTGRES_HOST: "your-postgres-host"
POSTGRES_PORT: "5432"
POSTGRES_USER: "postgres"
POSTGRES_PASSWORD: "your-production-password"
POSTGRES_DB: "mydb"

# Elasticsearch
ELASTICSEARCH_HOST: "your-elasticsearch-host"
ELASTICSEARCH_PORT: "9200"
ELASTICSEARCH_USERNAME: "elastic"
ELASTICSEARCH_PASSWORD: "your-production-password"

# 인스턴스 내부 IP
INSTANCE_B_INTERNAL_IP: "192.168.1.100"

# 애플리케이션
DATABASE_URL: "postgresql://user:pass@host:5432/db?schema=public"
JWT_SECRET: "your-production-jwt-secret"
SECRET_LOGIN_CRYPTO: "your-production-crypto"
COUPON_SECRET: "your-production-coupon-secret"
PRODUCT_SECRET: "your-production-product-secret"

# Docker Hub
DOCKER_USERNAME: "your-dockerhub-username"
DOCKER_PASSWORD: "your-dockerhub-token"

# Kubernetes
KUBECONFIG: "<base64-encoded-kubeconfig>"

# 기타
DOMAIN_NAME: "your-domain.com"
SSL_EMAIL: "admin@your-domain.com"
KIBANA_PASSWORD: "your-kibana-password"
```

### GitHub Secrets 사용 방법

워크플로우 파일에서 다음과 같이 사용:

```yaml
env:
  POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
  ELASTICSEARCH_PASSWORD: ${{ secrets.ELASTICSEARCH_PASSWORD }}
```

---

## 3. Kubernetes 배포 (Helm)

### 방법 1: Helm `--set` 옵션 사용 (권장)

```bash
helm upgrade --install mecipe-instance-b ./helm/mecipe-instance-b \
  --set secrets.postgresPassword="your-password" \
  --set secrets.elasticPassword="your-password"
```

### 방법 2: Values 파일 사용

`helm/mecipe-instance-b/values-production.yaml` 파일 생성:

```yaml
secrets:
  postgresPassword: "your-password"
  elasticPassword: "your-password"
  # ... 기타 secrets
```

**⚠️ 주의**: 이 파일은 **Git에 커밋하지 마세요**!

`.gitignore`에 추가:
```
helm/**/values-production.yaml
helm/**/values-*.yaml
!helm/**/values.yaml
```

### 방법 3: Kubernetes Secrets 사용

```bash
# Secret 생성
kubectl create secret generic mecipe-secrets \
  --from-literal=postgres-password=your-password \
  --from-literal=elastic-password=your-password \
  -n instance-b

# Helm에서 참조
helm upgrade --install mecipe-instance-b ./helm/mecipe-instance-b \
  --set secrets.existingSecret=mecipe-secrets
```

---

## 4. 프로덕션 서버

### 서버에 `.env` 파일 생성

배포 서버에 직접 `.env` 파일을 생성합니다:

```bash
# 서버에 접속
ssh user@your-server

# .env 파일 생성
cd /app/mecipe-was
nano .env
```

### 서버 `.env` 파일 예시

```env
# 프로덕션 환경 변수
POSTGRES_HOST=your-production-db-host
POSTGRES_PASSWORD=your-production-password
ELASTICSEARCH_HOST=your-production-elasticsearch-host
ELASTICSEARCH_PASSWORD=your-production-password
# ... 기타 프로덕션 설정
```

### ⚠️ 보안 권장사항

1. **파일 권한 설정**
   ```bash
   chmod 600 .env  # 소유자만 읽기/쓰기
   ```

2. **백업 시 제외**
   - `.env` 파일은 백업에 포함하지 않기
   - 별도로 안전한 곳에 보관

3. **정기적 비밀번호 변경**
   - 프로덕션 비밀번호는 정기적으로 변경
   - 변경 시 모든 관련 설정 업데이트

---

## 5. 환경별 설정 예시

### 로컬 개발 (`.env`)

```env
POSTGRES_HOST=localhost
POSTGRES_PASSWORD=dev_password_123
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PASSWORD=dev_elastic_123
JWT_SECRET=dev-jwt-secret-key
```

### 스테이징 (GitHub Secrets)

```yaml
POSTGRES_PASSWORD: "staging_password_456"
ELASTICSEARCH_PASSWORD: "staging_elastic_456"
JWT_SECRET: "staging-jwt-secret-key"
```

### 프로덕션 (GitHub Secrets + 서버 `.env`)

```yaml
# GitHub Secrets
POSTGRES_PASSWORD: "production_strong_password_789"
ELASTICSEARCH_PASSWORD: "production_strong_elastic_789"
JWT_SECRET: "production-very-strong-jwt-secret-key"
```

---

## 6. 환경 변수 로드 순서

로컬 테스트 스크립트(`scripts/dev/local-deploy-test.sh`)는 다음 순서로 환경 변수를 로드합니다:

1. **시스템 환경 변수** (최우선)
2. **`.env` 파일** (프로젝트 루트)
3. **기본값** (스크립트 내부)

```bash
# 환경 변수 우선순위
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-default_password}"
```

---

## 7. 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] `env.example`에는 실제 비밀번호가 없는지 확인
- [ ] GitHub Secrets에 모든 프로덕션 비밀번호 설정
- [ ] 서버의 `.env` 파일 권한이 600인지 확인
- [ ] 프로덕션 비밀번호는 강력한 비밀번호 사용 (최소 16자, 영문/숫자/특수문자)
- [ ] 정기적으로 비밀번호 변경
- [ ] 비밀번호를 코드나 문서에 직접 작성하지 않기

---

## 8. 문제 해결

### 문제: 환경 변수가 로드되지 않음

**해결:**
```bash
# .env 파일이 있는지 확인
ls -la .env

# 환경 변수 확인
echo $POSTGRES_PASSWORD

# .env 파일 수동 로드
source .env
```

### 문제: GitHub Secrets가 작동하지 않음

**해결:**
1. GitHub 저장소의 Settings > Secrets 확인
2. Secret 이름이 정확한지 확인 (대소문자 구분)
3. 워크플로우 파일에서 `${{ secrets.VARIABLE_NAME }}` 형식 확인

### 문제: Kubernetes에서 Secret을 찾을 수 없음

**해결:**
```bash
# Secret 확인
kubectl get secrets -n instance-b

# Secret 상세 정보 확인
kubectl describe secret mecipe-secrets -n instance-b
```

---

## 참고 자료

- [GitHub Secrets 문서](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Kubernetes Secrets 문서](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Helm Values 파일 가이드](https://helm.sh/docs/chart_template_guide/values_files/)

