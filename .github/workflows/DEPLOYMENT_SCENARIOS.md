# 배포 시나리오 가이드

## 배포 전략

### 원칙
- ✅ **앱만 변경** → 앱만 배포
- ✅ **인프라만 변경** → 인프라만 배포
- ✅ **앱 + 인프라 변경** → 인프라 먼저, 그 다음 앱

---

## 시나리오별 동작

### 시나리오 1: 최초 main branch 업데이트 (인프라 + 앱 모두 변경)

**상황**: 
- `infra/helm/**` 변경
- `apps/**`, `mecipe-was/**` 변경

**동작**:
```
1. infra-deploy.yml 실행
   └─ Kafka, PostgreSQL, Elasticsearch 배포
   
2. app-deploy.yml 실행 (동시에 시작하지만...)
   └─ "Wait for Infrastructure" 단계에서 대기
   └─ Kafka, Elasticsearch 준비 확인 후 진행
   └─ 앱 배포
```

**결과**: ✅ 인프라 배포 완료 후 앱 배포

---

### 시나리오 2: 앱만 변경 (일상적인 배포)

**상황**: 
- `apps/place-indexer-service/**` 변경
- `mecipe-was/**` 변경
- `nginx/**` 변경

**동작**:
```
1. app-deploy.yml만 실행
   └─ 테스트
   └─ Docker 빌드
   └─ "Wait for Infrastructure" 단계
      └─ 기존 인프라 준비 상태 확인 (이미 배포되어 있음)
   └─ 앱 배포
```

**결과**: ✅ 앱만 배포 (인프라는 그대로)

---

### 시나리오 3: 인프라만 변경

**상황**: 
- `infra/helm/**` 변경

**동작**:
```
1. infra-deploy.yml만 실행
   └─ 인프라 배포/업데이트
   
2. app-deploy.yml은 실행되지 않음
   └─ paths 필터에 해당하지 않음
```

**결과**: ✅ 인프라만 배포 (앱은 그대로)

---

### 시나리오 4: 수동 실행

**상황**: 
- GitHub Actions에서 수동 실행

**동작**:
```
1. infra-deploy.yml 수동 실행
   └─ 인프라 배포
   
2. app-deploy.yml 수동 실행
   └─ "Wait for Infrastructure" 단계
      └─ 인프라 준비 상태 확인
   └─ 앱 배포
```

**결과**: ✅ 수동으로 순차 배포 가능

---

## 인프라 준비 상태 확인

### 확인 대상
- ✅ **Kafka** (app namespace) - 필수
- ✅ **Elasticsearch** (data namespace) - 필수
- ⚠️ **PostgreSQL** (data namespace 또는 외부) - 선택적

### 동작 방식
```bash
# 최대 30회 재시도 (약 5분)
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kafka -n app
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=elasticsearch -n data
```

### 실패 시
- ⚠️ 경고 메시지 출력
- ⚠️ 배포는 계속 진행 (이미 배포된 인프라가 있을 수 있음)

---

## 배포 순서 권장사항

### 최초 배포
1. **먼저 `infra-deploy.yml` 실행** (또는 자동 실행 대기)
2. 인프라 배포 완료 확인
3. **그 다음 `app-deploy.yml` 실행** (자동 또는 수동)

### 일상적인 배포
- **앱 변경**: `app-deploy.yml`만 실행 (자동)
- **인프라 변경**: `infra-deploy.yml`만 실행 (자동)

---

## 트러블슈팅

### 문제: 앱 배포 시 인프라를 찾을 수 없음

**증상**:
```
Error: connection refused
kafka.app.svc.cluster.local:9092
```

**해결**:
1. 인프라 배포 확인: `kubectl get pods -n app -n data`
2. 인프라 먼저 배포: `infra-deploy.yml` 실행
3. 인프라 준비 대기: `kubectl wait --for=condition=ready pod ...`

### 문제: 앱 배포가 너무 오래 걸림

**원인**: 인프라 준비 상태 확인 단계에서 대기

**해결**:
1. 인프라가 이미 배포되어 있는지 확인
2. 인프라 Pod 상태 확인: `kubectl get pods -n app -n data`
3. 필요시 `Wait for Infrastructure` 단계의 타임아웃 조정

---

## 워크플로우 트리거 조건

### infra-deploy.yml
```yaml
on:
  push:
    branches: ["main"]
    paths:
      - 'infra/helm/**'
      - '.github/workflows/infra-deploy.yml'
```

### app-deploy.yml
```yaml
on:
  push:
    branches: ["main"]
    paths:
      - 'apps/place-indexer-service/**'
      - 'mecipe-was/**'
      - 'nginx/**'
      - '.github/workflows/app-deploy.yml'
```

**중요**: 두 워크플로우는 **독립적으로** 실행됩니다.
- 인프라 변경 → `infra-deploy.yml`만 실행
- 앱 변경 → `app-deploy.yml`만 실행
- 둘 다 변경 → 두 워크플로우 모두 실행 (앱은 인프라 준비 대기)

---

## 요약

| 상황 | infra-deploy | app-deploy | 결과 |
|------|--------------|------------|------|
| 최초 배포 (인프라+앱) | ✅ 실행 | ✅ 실행 (인프라 대기) | ✅ 순차 배포 |
| 앱만 변경 | ❌ 실행 안 함 | ✅ 실행 | ✅ 앱만 배포 |
| 인프라만 변경 | ✅ 실행 | ❌ 실행 안 함 | ✅ 인프라만 배포 |
| 수동 실행 | ✅ 수동 | ✅ 수동 | ✅ 순차 배포 |

