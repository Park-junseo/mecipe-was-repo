# 배포 전략 검토 및 제안

## 현재 상황 분석

### 네임스페이스 구조 (Option 2 적용)
- `infra`: ingress-nginx
- `data-storage`: postgres, elasticsearch, kibana
- `data-streaming`: kafka, ksqldb, debezium, confluent-operator, kafka-ui
- `app`: mecipe-was, place-indexer-service

### Node Selector 요구사항
- `nginx`: `node-role: ingress`
- `mecipe-was`, `place-indexer-service`: `node-role: app`
- `kafka`, `ksqldb`: `node-role: stream`
- `postgres`, `elasticsearch`, `debezium`: `node-role: storage`

### 의존성 관계
```
confluent-operator
    ↓
kafka (node-role: stream)
    ↓
├─ debezium (node-role: storage) ──→ postgres (node-role: storage)
├─ ksqldb (node-role: stream)
├─ place-indexer-service (node-role: app) ──→ elasticsearch (node-role: storage)
└─ mecipe-was (node-role: app) ──→ elasticsearch (node-role: storage)
```

### 배포 빈도
- **자주 배포**: mecipe-was, place-indexer-service (로직 변경)
- **거의 배포 안 함**: 나머지 인프라 컴포넌트

---

## 제안하는 배포 전략

### 전략 1: 3단계 워크플로우 분리 (권장)

#### 1.1 인프라 배포 워크플로우 (`infra-deploy.yml`)

**실행 조건**:
- `infra/helm/**` 변경 시
- `workflow_dispatch` (수동 실행)

**배포 순서**:
```yaml
Phase 1: Streaming 인프라 (data-streaming namespace)
  1. confluent-operator (node-role: stream)
  2. kafka (node-role: stream) - Kafka 준비 대기 필수
  3. kafka-ui (node-role: stream) - Kafka 의존
  4. ksqldb (node-role: stream) - Kafka 의존

Phase 2: Storage 인프라 (data-storage namespace)
  5. postgres (node-role: storage) - 선택적 (외부 DB 사용 가능)
  6. elasticsearch (node-role: storage)
  7. kibana (node-role: storage) - Elasticsearch 의존

Phase 3: Debezium (data-streaming namespace, storage node)
  8. debezium (node-role: storage) - kafka + postgres 의존

Phase 4: Ingress (infra namespace)
  9. ingress-nginx (node-role: ingress)
```

**특징**:
- ✅ 인프라 변경 시에만 실행 (드물게)
- ✅ Kafka 먼저 배포하여 의존성 해결
- ✅ PostgreSQL은 외부 사용 가능 (Git secret으로 제어)
- ✅ 각 Phase 간 의존성 대기 로직 포함

**PostgreSQL 외부 사용 처리**:
```bash
# GitHub Secret: POSTGRES_DEPLOY=false 인 경우
if [ "$POSTGRES_DEPLOY" = "false" ]; then
  # PostgreSQL Helm chart는 배포하지 않음 (--set enabled=false)
  # postgres-connection ConfigMap/Secret만 생성하여 외부 DB 정보 저장
  POSTGRES_HOST="${{ secrets.POSTGRES_HOST }}"
  POSTGRES_PORT="${{ secrets.POSTGRES_PORT }}"
else
  # PostgreSQL Helm chart 배포
  POSTGRES_HOST="postgres.data-storage.svc.cluster.local"
  POSTGRES_PORT="5432"
fi
```

---

#### 1.2 애플리케이션 배포 워크플로우 (`app-deploy.yml`)

**실행 조건**:
- `mecipe-was/**` 변경 시
- `apps/place-indexer-service/**` 변경 시
- `infra/helm/apps/**` 변경 시
- `workflow_run`: infra-deploy.yml 완료 후 (인프라와 앱이 동시에 변경된 경우)
- `workflow_dispatch` (수동 실행)

**배포 순서**:
```yaml
1. 테스트 및 빌드 (Ubuntu runner)
   - mecipe-was 테스트
   - place-indexer-service 빌드

2. Docker 이미지 빌드 및 푸시 (Ubuntu runner)
   - mecipe-api-server:${GITHUB_SHA}
   - place-indexer-service:${GITHUB_SHA}

3. 인프라 준비 상태 확인 (Self-hosted runner)
   - Kafka ready 확인 (data-streaming namespace)
   - Elasticsearch ready 확인 (data-storage namespace)
   - PostgreSQL 연결 가능 확인 (외부일 경우)

4. 애플리케이션 배포 (Self-hosted runner)
   - mecipe-was (node-role: app)
   - place-indexer-service (node-role: app)

5. 데이터베이스 마이그레이션
   - mecipe-was Prisma migrate deploy

6. Health check 및 검증
```

**특징**:
- ✅ 자주 실행 (앱 로직 변경 시)
- ✅ 인프라 배포와 분리되어 빠른 배포
- ✅ 인프라 준비 상태 확인 로직 포함
- ✅ `workflow_run`으로 인프라 배포 완료 대기 (동시 변경 시)

---

#### 1.3 인프라 업데이트 워크플로우 (`infra-update.yml`) - 선택적

**목적**: 인프라 컴포넌트만 개별적으로 업데이트할 때 사용

**실행 조건**:
- 특정 인프라 Helm chart만 변경된 경우
- `workflow_dispatch`로 특정 컴포넌트만 선택 업데이트

**예시**:
```yaml
# Elasticsearch만 업데이트
- name: Update Elasticsearch
  run: |
    helm upgrade elasticsearch ./infra/helm/elasticsearch \
      --namespace data-storage \
      --set nodeSelector.node-role=storage \
      ...

# Kafka만 업데이트
- name: Update Kafka
  run: |
    helm upgrade kafka ./infra/helm/kafka \
      --namespace data-streaming \
      --set nodeSelector.node-role=stream \
      ...
```

---

### 전략 2: 통합 워크플로우 (대안)

**단일 워크플로우**에서 모든 배포 관리

**장점**:
- ✅ 명확한 순서 보장
- ✅ 단일 워크플로우로 관리 용이

**단점**:
- ⚠️ 앱 변경 시에도 인프라 검증 수행 (비효율)
- ⚠️ 인프라 변경 시에도 앱 테스트 수행 (비효율)
- ⚠️ 배포 시간 증가

**권장 여부**: ❌ **비권장** (배포 빈도 차이 때문에)

---

## 배포 순서 상세

### Phase 1: Streaming 인프라 (data-streaming namespace)

```yaml
1. Confluent Operator 배포
   - Chart: confluentinc/confluent-for-kubernetes
   - Namespace: data-streaming
   - Node Selector: node-role: stream
   - Timeout: 10m
   - 대기: Operator Pod Ready

2. Kafka 배포
   - Chart: ./infra/helm/kafka
   - Namespace: data-streaming
   - Node Selector: node-role: stream
   - Timeout: 15m (Kafka는 초기화 시간이 길 수 있음)
   - 대기: Kafka Pod Ready + kafka-brokers Service Ready
   - 검증: kubectl wait --for=condition=ready pod -l platform.confluent.io/type=kafka

3. Kafka UI 배포
   - Chart: ./infra/helm/kafka-ui
   - Namespace: data-streaming
   - Node Selector: node-role: stream
   - Timeout: 10m
   - 의존성: Kafka Ready

4. KSQLDB 배포
   - Chart: ./infra/helm/ksqldb
   - Namespace: data-streaming
   - Node Selector: node-role: stream
   - Timeout: 10m
   - 의존성: Kafka Ready
   - 연결 정보: kafka.data-streaming.svc.cluster.local:9092
```

---

### Phase 2: Storage 인프라 (data-storage namespace)

```yaml
5. PostgreSQL 배포 (선택적)
   - Chart: ./infra/helm/postgres
   - Namespace: data-storage
   - Node Selector: node-role: storage
   - Timeout: 10m
   - 조건: POSTGRES_DEPLOY != "false"
   - 외부 사용 시: --set enabled=false

6. PostgreSQL 연결 정보 관리 (항상)
   - Chart: ./infra/helm/postgres-connection
   - Namespace: data-storage
   - 외부 DB 사용 시: POSTGRES_HOST, POSTGRES_PORT 시크릿 사용
   - 내부 DB 사용 시: postgres.data-storage.svc.cluster.local:5432

7. Elasticsearch 배포
   - Chart: ./infra/helm/elasticsearch
   - Namespace: data-storage
   - Node Selector: node-role: storage
   - Timeout: 10m
   - 대기: Elasticsearch Pod Ready + Cluster Health Green/Yellow
   - 검증: kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=elasticsearch

8. Kibana 배포
   - Chart: ./infra/helm/kibana
   - Namespace: data-storage
   - Node Selector: node-role: storage
   - Timeout: 10m
   - 의존성: Elasticsearch Ready
```

---

### Phase 3: Debezium (data-streaming namespace, storage node)

```yaml
9. Debezium 배포
   - Chart: ./infra/helm/debezium
   - Namespace: data-streaming
   - Node Selector: node-role: storage (중요: storage node에 배포)
   - Timeout: 10m
   - 의존성: 
     - Kafka Ready (kafka.data-streaming.svc.cluster.local:9092)
     - PostgreSQL Ready (내부) 또는 연결 가능 (외부)
   - 연결 정보:
     - Kafka: kafka.data-streaming.svc.cluster.local:9092
     - PostgreSQL: postgres.data-storage.svc.cluster.local:5432 (내부) 또는 ${POSTGRES_HOST}:${POSTGRES_PORT} (외부)
```

**주의사항**: 
- Debezium은 `data-streaming` namespace에 있지만 `node-role: storage` 노드에 배포해야 함
- Helm chart에서 nodeSelector를 명시적으로 설정해야 함

---

### Phase 4: Ingress (infra namespace)

```yaml
10. Ingress Nginx 배포
    - Chart: ingress-nginx/ingress-nginx
    - Namespace: infra
    - Node Selector: node-role: ingress
    - Timeout: 10m
    - 의존성: 없음 (독립 배포 가능)
```

---

### Phase 5: 애플리케이션 (app namespace)

```yaml
11. Mecipe WAS 배포
    - Chart: ./infra/helm/apps/mecipe-was
    - Namespace: app
    - Node Selector: node-role: app
    - Timeout: 10m
    - 의존성:
      - Kafka Ready (kafka.data-streaming.svc.cluster.local:9092)
      - Elasticsearch Ready (elasticsearch.data-storage.svc.cluster.local:9200)
      - PostgreSQL 연결 가능
    - 이미지: ${DOCKER_USERNAME}/mecipe-api-server:${GITHUB_SHA}

12. Place Indexer Service 배포
    - Chart: ./infra/helm/apps/place-indexer-service
    - Namespace: app
    - Node Selector: node-role: app
    - Timeout: 10m
    - 의존성:
      - Kafka Ready (kafka.data-streaming.svc.cluster.local:9092)
      - Elasticsearch Ready (elasticsearch.data-storage.svc.cluster.local:9200)
    - 이미지: ${DOCKER_USERNAME}/place-indexer-service:${GITHUB_SHA}

13. Database Migration (Mecipe WAS)
    - kubectl exec -n app deployment/mecipe-was -- npx prisma migrate deploy
    - Timeout: 5m
```

---

## 네임스페이스 간 서비스 연결

### 같은 네임스페이스
```
# data-streaming namespace 내에서
kafka:9092  ✅ 가능
ksqldb:8088  ✅ 가능
```

### 다른 네임스페이스 (FQDN 사용 필수)
```
# data-storage namespace에서 data-streaming의 Kafka 접근
kafka.data-streaming.svc.cluster.local:9092  ✅

# app namespace에서 data-storage의 Elasticsearch 접근
elasticsearch.data-storage.svc.cluster.local:9200  ✅

# app namespace에서 data-storage의 PostgreSQL 접근
postgres.data-storage.svc.cluster.local:5432  ✅
```

---

## GitHub Secrets 구성

### 필수 Secrets
```yaml
# Kubernetes
KUBECONFIG: <base64-encoded kubeconfig>

# Docker
DOCKER_USERNAME: <dockerhub-username>
DOCKER_PASSWORD: <dockerhub-password>

# PostgreSQL (외부 사용 시)
POSTGRES_DEPLOY: "false"  # 또는 "true"
POSTGRES_HOST: <external-postgres-host>
POSTGRES_PORT: "5432"
POSTGRES_USER: <postgres-user>
POSTGRES_PASSWORD: <postgres-password>
POSTGRES_DB: <database-name>
DATABASE_URL: <postgresql://...>

# Elasticsearch
ELASTICSEARCH_SUPERUSER_PASSWORD: <password>
ELASTICSEARCH_KIBANA_PASSWORD: <password>
ELASTICSEARCH_PRODUCER_USER_NAME: <username>
ELASTICSEARCH_PRODUCER_USER_PASS: <password>
ELASTICSEARCH_APP_USER_NAME: <username>
ELASTICSEARCH_APP_USER_PASS: <password>

# Application
PORT: "4000"
SOCKET_PORT: "4100"
JWT_SECRET: <secret>
SECRET_LOGIN_CRYPTO: <secret>
API_KEY: <optional>
BUILD_API_KEY: <optional>
COUPON_SECRET: <secret>
PRODUCT_SECRET: <secret>
DOMAIN_NAME: <your-domain.com>
```

---

## 배포 시나리오별 동작

### 시나리오 1: 최초 전체 배포 (인프라 + 앱 모두 변경)
```
1. infra-deploy.yml 실행 (자동 또는 수동)
   → 모든 인프라 배포 (Phase 1-4)
   → 완료

2. app-deploy.yml 자동 실행 (workflow_run 트리거)
   → 테스트 및 빌드
   → Docker 이미지 푸시
   → 앱 배포 (Phase 5)
   → 마이그레이션
```

### 시나리오 2: 인프라만 변경
```
1. infra-deploy.yml 실행
   → 변경된 인프라만 업데이트
   → 완료

2. app-deploy.yml은 실행되지 않음 (paths 필터)
```

### 시나리오 3: 앱만 변경 (가장 흔한 경우)
```
1. app-deploy.yml 실행
   → 인프라 준비 상태 확인 (Wait for Infrastructure)
   → 테스트 및 빌드
   → Docker 이미지 푸시
   → 앱 배포
   → 마이그레이션
```

### 시나리오 4: 수동 실행
```
1. infra-deploy.yml 수동 실행
   → 인프라 배포

2. app-deploy.yml 수동 실행
   → 인프라 준비 상태 확인
   → 앱 배포
```

---

## 주의사항 및 고려사항

### 1. Debezium의 Node Selector
- **문제**: Debezium은 `data-streaming` namespace에 있지만 `node-role: storage` 노드에 배포해야 함
- **해결**: Helm chart에서 nodeSelector를 명시적으로 설정
  ```yaml
  # infra/helm/debezium/values.yaml
  nodeSelector:
    node-role: storage
  ```

### 2. PostgreSQL 외부 사용 처리
- **외부 DB 사용 시**:
  - `POSTGRES_DEPLOY=false` 시크릿 설정
  - PostgreSQL Helm chart는 `--set enabled=false`로 배포 스킵
  - `postgres-connection` ConfigMap/Secret만 생성하여 외부 DB 정보 저장
  - Debezium과 Mecipe WAS에서 `${POSTGRES_HOST}:${POSTGRES_PORT}` 사용

### 3. Kafka 초기화 시간
- Kafka는 초기화 시간이 길 수 있음 (최대 15분)
- `kubectl wait`으로 Pod Ready 대기
- 이후 컴포넌트 배포 전 추가 대기 시간 고려

### 4. Elasticsearch Cluster Health
- Elasticsearch는 Pod Ready 후에도 Cluster Health가 Yellow/Green이 될 때까지 시간 소요
- `/_cluster/health` 엔드포인트로 확인

### 5. 네임스페이스 간 서비스 연결
- 반드시 FQDN 사용: `<service-name>.<namespace>.svc.cluster.local:<port>`
- 같은 namespace 내에서만 짧은 서비스 이름 사용 가능

### 6. 배포 빈도 최적화
- **인프라 워크플로우**: 드물게 실행 (인프라 변경 시에만)
- **앱 워크플로우**: 자주 실행 (앱 로직 변경 시)
- 분리된 워크플로우로 불필요한 테스트/검증 스킵

---

## 구현 체크리스트

### infra-deploy.yml
- [ ] Phase 1: Streaming 인프라 배포
  - [ ] confluent-operator (node-role: stream)
  - [ ] kafka (node-role: stream) + 대기 로직
  - [ ] kafka-ui (node-role: stream)
  - [ ] ksqldb (node-role: stream)
- [ ] Phase 2: Storage 인프라 배포
  - [ ] postgres (node-role: storage, 선택적)
  - [ ] postgres-connection (외부/내부 처리)
  - [ ] elasticsearch (node-role: storage) + 대기 로직
  - [ ] kibana (node-role: storage)
- [ ] Phase 3: Debezium 배포
  - [ ] debezium (node-role: storage, data-streaming namespace)
- [ ] Phase 4: Ingress 배포
  - [ ] ingress-nginx (node-role: ingress)
- [ ] Pod placement 검증 로직

### app-deploy.yml
- [ ] 테스트 및 빌드 Job
- [ ] Docker 이미지 빌드 및 푸시 Job
- [ ] 인프라 준비 상태 확인
- [ ] mecipe-was 배포 (node-role: app)
- [ ] place-indexer-service 배포 (node-role: app)
- [ ] 데이터베이스 마이그레이션
- [ ] Health check
- [ ] workflow_run 트리거 설정

### 공통
- [ ] 모든 Helm chart에 nodeSelector 설정 확인
- [ ] 네임스페이스 간 서비스 연결 시 FQDN 사용 확인
- [ ] PostgreSQL 외부 사용 처리 로직
- [ ] GitHub Secrets 구성 문서화

---

## 다음 단계

1. **검토 및 피드백 수집**
   - 이 문서 검토
   - 팀과 논의하여 수정사항 반영

2. **워크플로우 구현**
   - `infra-deploy.yml` 수정/작성
   - `app-deploy.yml` 수정/작성
   - Helm chart nodeSelector 확인 및 수정

3. **테스트**
   - 로컬 환경에서 네임스페이스 구조 테스트
   - GitHub Actions에서 워크플로우 테스트
   - PostgreSQL 외부/내부 전환 테스트

4. **문서화**
   - 최종 워크플로우 문서 작성
   - 배포 가이드 작성
   - 트러블슈팅 가이드 작성


