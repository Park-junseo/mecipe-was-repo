# 워크플로우 충돌 해결 가이드

## 문제 상황

현재 두 개의 워크플로우가 `main` 브랜치 push 시 동시에 실행될 수 있습니다:

1. **`deploy-self-hosted.yml`**: Docker Compose 기반 배포
2. **`deploy-helm.yml`**: Helm 기반 Kubernetes 배포

## 해결 방법

### ✅ 적용된 해결책: 경로 기반 조건부 실행

두 워크플로우에 경로 기반 조건을 추가하여 충돌을 방지했습니다.

#### `deploy-self-hosted.yml` (Docker Compose)
```yaml
on:
  push:
    branches: ["main"]
    paths-ignore:
      - 'helm/**'
      - '.github/workflows/deploy-helm.yml'
      - 'apps/place-indexer-service/**'
```

**동작**: 다음 경로가 변경되지 않으면 실행
- `helm/**` 디렉토리
- `deploy-helm.yml` 워크플로우 파일
- `apps/place-indexer-service/**` 디렉토리

#### `deploy-helm.yml` (Helm/Kubernetes)
```yaml
on:
  push:
    branches: ["main"]
    paths:
      - 'helm/**'
      - '.github/workflows/deploy-helm.yml'
      - 'apps/place-indexer-service/**'
      - 'mecipe-was/**'
      - 'nginx/**'
      - 'scripts/healthcheck-and-fallback.sh'
```

**동작**: 다음 경로가 변경되면 실행
- `helm/**` 디렉토리
- `deploy-helm.yml` 워크플로우 파일
- `apps/place-indexer-service/**` 디렉토리
- `mecipe-was/**` 디렉토리
- `nginx/**` 디렉토리
- `scripts/healthcheck-and-fallback.sh` 스크립트

## 실행 시나리오

### 시나리오 1: Helm 관련 파일만 변경
```
변경 파일: helm/mecipe-instance-a/values.yaml
  ↓
deploy-helm.yml 실행 ✅
deploy-self-hosted.yml 실행 안 함 ✅
```

### 시나리오 2: mecipe-was만 변경
```
변경 파일: mecipe-was/src/app.controller.ts
  ↓
deploy-helm.yml 실행 ✅
deploy-self-hosted.yml 실행 안 함 ✅
```

### 시나리오 3: Docker Compose 관련 파일만 변경
```
변경 파일: docker-compose.yml
  ↓
deploy-self-hosted.yml 실행 ✅
deploy-helm.yml 실행 안 함 ✅
```

### 시나리오 4: 둘 다 변경
```
변경 파일: 
  - helm/mecipe-instance-a/values.yaml
  - docker-compose.yml
  ↓
deploy-helm.yml 실행 ✅
deploy-self-hosted.yml 실행 안 함 ✅
(Helm이 우선순위)
```

## 대안 해결책

### 옵션 1: 완전히 비활성화 (권장하지 않음)

```bash
# Docker Compose 워크플로우 비활성화
mv .github/workflows/deploy-self-hosted.yml .github/workflows/deploy-self-hosted.yml.disabled
```

**장점**: 완전히 분리
**단점**: 필요할 때 수동으로 활성화해야 함

### 옵션 2: 브랜치 분리

```yaml
# deploy-self-hosted.yml
on:
  push:
    branches: ["docker-compose"]

# deploy-helm.yml
on:
  push:
    branches: ["main", "kubernetes"]
```

**장점**: 명확한 분리
**단점**: 브랜치 관리 복잡도 증가

### 옵션 3: 워크플로우 호출 (권장)

```yaml
# deploy-self-hosted.yml
on:
  workflow_call:
    inputs:
      enabled:
        type: boolean
        default: false

jobs:
  deploy:
    if: ${{ inputs.enabled }}
    # ...
```

**장점**: 명시적 제어
**단점**: 수동 호출 필요

## 현재 설정의 장점

1. **자동 분리**: 파일 변경에 따라 자동으로 적절한 워크플로우 실행
2. **명확한 책임**: 각 워크플로우가 담당하는 파일 경로가 명확
3. **충돌 방지**: 동시 실행 방지
4. **유연성**: 필요시 `workflow_dispatch`로 수동 실행 가능

## 주의사항

1. **경로 조건 확인**: 변경 파일이 예상한 워크플로우를 트리거하는지 확인
2. **수동 실행**: `workflow_dispatch`로 언제든지 수동 실행 가능
3. **테스트**: 실제 배포 전에 테스트 브랜치에서 검증 권장

## 검증 방법

```bash
# 테스트 브랜치 생성
git checkout -b test-workflow-separation

# Helm 파일만 변경
echo "# test" >> helm/mecipe-instance-a/values.yaml
git add helm/mecipe-instance-a/values.yaml
git commit -m "test: helm workflow trigger"
git push origin test-workflow-separation

# GitHub Actions에서 확인:
# - deploy-helm.yml이 실행되어야 함
# - deploy-self-hosted.yml이 실행되지 않아야 함
```

