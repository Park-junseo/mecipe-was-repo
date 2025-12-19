# 워크플로우 의존성 관리

## 문제점

최초 main branch 업데이트에서:
- `infra/helm/**` 파일들이 변경되고
- `apps/**`, `mecipe-was/**` 파일들도 변경되면

**두 워크플로우가 동시에 실행**될 수 있습니다:

```
infra-deploy.yml (인프라 배포)  ──┐
                                  ├── 동시 실행 ❌
app-deploy.yml (앱 배포)         ──┘
```

### 문제 상황

1. ❌ `app-deploy.yml`이 인프라 배포를 기다리지 않음
2. ❌ 앱이 Kafka, PostgreSQL, Elasticsearch 없이 시작될 수 있음
3. ❌ 의존성 오류 발생 가능

---

## 해결 방법

### 방법 1: `workflow_run` 사용 (권장)

`app-deploy.yml`이 `infra-deploy.yml` 완료를 기다리도록 설정:

```yaml
on:
  push:
    branches: ["main"]
    paths:
      - 'apps/**'
  workflow_run:
    workflows: ["Deploy Infrastructure"]
    types:
      - completed
    branches:
      - main
```

**장점**:
- ✅ 인프라 배포 완료 후 자동 실행
- ✅ 명확한 의존성 관리
- ✅ 실패 시 자동 스킵

**단점**:
- ⚠️ `workflow_run`은 성공한 워크플로우만 트리거
- ⚠️ 수동 실행(`workflow_dispatch`) 시에도 인프라 배포 필요

### 방법 2: 인프라 준비 상태 확인

`app-deploy.yml`에서 인프라 Pod 상태를 확인:

```yaml
- name: Wait for Infrastructure
  run: |
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kafka -n app --timeout=10m
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=elasticsearch -n data --timeout=10m
```

**장점**:
- ✅ 실제 Pod 상태 확인
- ✅ 수동 실행 시에도 작동

**단점**:
- ⚠️ 타임아웃까지 대기 가능
- ⚠️ 인프라 배포가 실패해도 계속 진행 가능

### 방법 3: 통합 워크플로우 (현재 `deploy-helm.yml`)

하나의 워크플로우에서 순차 실행:

```yaml
jobs:
  deploy_infra:
    # 인프라 배포
  
  deploy_apps:
    needs: deploy_infra
    # 앱 배포
```

**장점**:
- ✅ 명확한 순서 보장
- ✅ 단일 워크플로우로 관리

**단점**:
- ⚠️ 인프라 변경 시에도 앱 테스트 수행
- ⚠️ 앱 변경 시에도 인프라 검증 수행

---

## 현재 구현 (하이브리드 방식)

### 1. `workflow_run` 트리거 추가

```yaml
on:
  push:
    branches: ["main"]
    paths:
      - 'apps/**'
  workflow_run:
    workflows: ["Deploy Infrastructure"]
    types:
      - completed
    branches:
      - main
```

### 2. 인프라 준비 상태 확인 (fallback)

`workflow_run`이 아닌 경우 (직접 push 또는 수동 실행):

```yaml
- name: Wait for Infrastructure
  if: github.event_name != 'workflow_run'
  run: |
    # Kafka, PostgreSQL, Elasticsearch 준비 상태 확인
    kubectl wait --for=condition=ready pod ...
```

---

## 실행 시나리오

### 시나리오 1: 최초 main branch 업데이트 (인프라 + 앱 모두 변경)

```
1. infra-deploy.yml 실행
   └─ Kafka, PostgreSQL, Elasticsearch 배포
   
2. infra-deploy.yml 완료 후
   └─ app-deploy.yml 자동 실행 (workflow_run)
      └─ 앱 배포
```

### 시나리오 2: 인프라만 변경

```
1. infra-deploy.yml 실행
   └─ 인프라 배포
   
2. app-deploy.yml은 실행되지 않음 (paths 필터)
```

### 시나리오 3: 앱만 변경

```
1. app-deploy.yml 실행
   └─ 인프라 준비 상태 확인 (Wait for Infrastructure)
   └─ 앱 배포
```

### 시나리오 4: 수동 실행

```
1. infra-deploy.yml 수동 실행
   └─ 인프라 배포
   
2. app-deploy.yml 수동 실행
   └─ 인프라 준비 상태 확인
   └─ 앱 배포
```

---

## 권장 사항

### 초기 배포 (최초 main branch 업데이트)

1. **먼저 `infra-deploy.yml` 수동 실행** (또는 자동 실행 대기)
2. 인프라 배포 완료 확인
3. **그 다음 `app-deploy.yml` 자동 실행** (workflow_run)

### 일상적인 배포

- **인프라 변경**: `infra-deploy.yml`만 실행
- **앱 변경**: `app-deploy.yml`만 실행 (인프라 준비 상태 확인)

---

## 트러블슈팅

### 문제: `app-deploy.yml`이 인프라 없이 실행됨

**원인**: `workflow_run`이 트리거되지 않음

**해결**:
1. `Wait for Infrastructure` 단계가 실행되는지 확인
2. 인프라 Pod 상태 확인: `kubectl get pods -n app -n data`

### 문제: `workflow_run`이 트리거되지 않음

**원인**: 
- `infra-deploy.yml`이 실패했을 수 있음
- 워크플로우 이름이 정확하지 않을 수 있음

**해결**:
1. `infra-deploy.yml`의 `name` 확인
2. GitHub Actions에서 `infra-deploy.yml` 실행 상태 확인

---

## 참고

- [GitHub Actions: workflow_run](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run)
- [GitHub Actions: needs](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idneeds)

