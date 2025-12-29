# Helm vs 순수 Kubernetes 매니페스트 비교

## Helm의 장점

### 1. **템플릿화 및 재사용성**
- **순수 K8s**: 각 환경마다 별도의 YAML 파일 필요
- **Helm**: 하나의 템플릿으로 여러 환경 관리
  ```bash
  # Helm: 하나의 차트로 여러 환경 배포
  helm install mecipe ./helm/mecipe-instance-a -f values-dev.yaml
  helm install mecipe ./helm/mecipe-instance-a -f values-prod.yaml
  ```

### 2. **값 관리**
- **순수 K8s**: 환경변수를 직접 YAML에 하드코딩하거나 sed로 치환
- **Helm**: `values.yaml`로 중앙 집중식 관리
  ```yaml
  # values.yaml
  image:
    tag: "latest"
  
  # 배포 시
  helm install mecipe ./helm/mecipe-instance-a --set image.tag=v1.0.0
  ```

### 3. **릴리스 관리**
- **순수 K8s**: 수동으로 버전 관리 및 롤백
- **Helm**: 자동 릴리스 히스토리 및 간편한 롤백
  ```bash
  # Helm: 자동 히스토리 관리
  helm history mecipe-instance-a
  helm rollback mecipe-instance-a 2
  ```

### 4. **의존성 관리**
- **순수 K8s**: 수동으로 의존성 순서 관리
- **Helm**: `Chart.yaml`에서 의존성 자동 관리
  ```yaml
  # Chart.yaml
  dependencies:
    - name: kafka
      version: "~22.1.0"
      repository: "https://charts.bitnami.com/bitnami"
  ```

### 5. **차트 검증**
- **순수 K8s**: 수동으로 YAML 문법 검증
- **Helm**: 자동 검증 도구 제공
  ```bash
  helm lint ./helm/mecipe-instance-a
  helm template ./helm/mecipe-instance-a --debug
  ```

### 6. **업그레이드 전략**
- **순수 K8s**: `kubectl apply`로 수동 업데이트
- **Helm**: `helm upgrade`로 선언적 업데이트
  ```bash
  helm upgrade mecipe-instance-a ./helm/mecipe-instance-a --set image.tag=v1.1.0
  ```

## 순수 Kubernetes의 장점

### 1. **단순성**
- 복잡한 템플릿 없이 직접적인 YAML
- 학습 곡선이 낮음

### 2. **명시적**
- 모든 리소스가 명시적으로 보임
- 템플릿 변환 과정 없이 바로 확인 가능

### 3. **디버깅 용이**
- 템플릿 렌더링 과정 없이 바로 문제 파악 가능

## 권장 사항

### Helm을 사용하는 것이 더 적합한 경우

✅ **현재 프로젝트에 Helm을 권장합니다** 이유:

1. **여러 환경 관리**: dev, staging, production 환경이 있음
2. **복잡한 설정**: 많은 환경변수와 설정값이 있음
3. **버전 관리**: 릴리스 히스토리 관리가 필요함
4. **재사용성**: 두 개의 인스턴스에 유사한 구조 적용
5. **업그레이드**: 정기적인 업데이트가 필요함

### 마이그레이션 전략

1. **기존 k8s/ 디렉토리 유지**: 참고용으로 보관
2. **Helm 차트 사용**: 새로운 배포는 Helm으로 진행
3. **점진적 전환**: 기존 배포는 유지하고 새 배포만 Helm 사용

## 사용 예시

### Helm으로 배포

```bash
# 개발 환경
helm install mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --set image.tag=dev-latest \
  -f helm/mecipe-instance-a/values-dev.yaml

# 프로덕션 환경
helm install mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --set image.tag=v1.0.0 \
  -f helm/mecipe-instance-a/values-production.yaml
```

### 업그레이드

```bash
# 새 버전으로 업그레이드
helm upgrade mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --set image.tag=v1.1.0

# 문제 발생 시 롤백
helm rollback mecipe-instance-a --namespace instance-a
```

## 결론

**Helm이 현재 프로젝트에 더 적합합니다.** 특히:
- 환경별 설정 관리가 쉬움
- 릴리스 관리가 체계적
- 업그레이드 및 롤백이 간편
- CI/CD 파이프라인과 통합 용이

기존 `k8s/` 디렉토리는 참고용으로 유지하고, 새로운 배포는 `helm/` 디렉토리의 차트를 사용하는 것을 권장합니다.

