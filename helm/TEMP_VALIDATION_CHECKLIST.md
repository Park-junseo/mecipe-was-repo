# Helm 차트 검증 체크리스트

## 발견된 문제 및 수정 사항

### ✅ 수정 완료

1. **헬퍼 함수의 dict 접근**
   - 문제: `$values.global.dockerRegistry`는 dict에서 작동하지 않음
   - 수정: `index $values "global" "dockerRegistry"`로 변경

2. **Secret 참조 조건부 처리**
   - 문제: Secret이 조건부로 생성되는데 Pod가 무조건 참조
   - 수정: 모든 Secret 참조를 조건부로 처리

3. **imagePullSecrets 빈 배열 처리**
   - 문제: 빈 배열일 때도 생성됨
   - 수정: 배열이 비어있지 않을 때만 생성

4. **YAML 문서 구분자**
   - 문제: 조건문이 false일 때 `---`만 남음
   - 수정: `---`를 조건부로 생성

### ⚠️ 확인 필요

1. **Service와 Deployment 사이의 `---`**
   - 현재: 조건문 안에 `---`가 있음
   - 상태: 조건문이 true일 때는 정상 작동
   - 조건문이 false일 때는 파일이 비어지므로 문제 없음

2. **Secret 생성 조건**
   - 현재: 하나라도 값이 있으면 Secret 생성
   - 문제: Secret을 참조하는 Pod가 Secret이 없어도 시작 가능해야 함
   - 상태: 모든 Secret 참조를 조건부로 처리 완료

## 검증 방법

### 1. Helm Lint
```bash
helm lint ./helm/mecipe-instance-a
helm lint ./helm/mecipe-instance-b
```

### 2. 템플릿 렌더링 테스트
```bash
# 최소한의 값으로 테스트
helm template test ./helm/mecipe-instance-a \
  --namespace instance-a \
  --set placeIndexerService.image.repository=test \
  --set placeIndexerService.image.tag=test \
  --set mecipeWAS.image.repository=test \
  --set mecipeWAS.image.tag=test \
  --set nginx.image.repository=test \
  --set nginx.image.tag=test \
  --set secrets.databaseUrl=test \
  --set secrets.jwtSecret=test

helm template test ./helm/mecipe-instance-b \
  --namespace instance-b \
  --set secrets.postgresPassword=test \
  --set secrets.elasticPassword=test \
  --set secrets.kibanaPassword=test
```

### 3. 빈 값으로 테스트 (Secret이 생성되지 않아야 함)
```bash
helm template test ./helm/mecipe-instance-a \
  --namespace instance-a \
  --set placeIndexerService.image.repository=test \
  --set placeIndexerService.image.tag=test
# Secret이 생성되지 않아야 하고, Pod도 Secret 참조 없이 시작 가능해야 함
```

### 4. YAML 파싱 검증
```bash
# 렌더링된 YAML이 유효한지 확인
helm template test ./helm/mecipe-instance-a --namespace instance-a \
  --set placeIndexerService.image.repository=test \
  --set placeIndexerService.image.tag=test | \
  kubectl apply --dry-run=client -f -
```

## 알려진 제한사항

1. **Secret이 없을 때 Pod 시작**
   - 현재: Secret 참조가 조건부이므로 Secret이 없어도 Pod 시작 가능
   - 단, 필수 환경변수가 없으면 애플리케이션이 실패할 수 있음
   - 해결: values.yaml에 기본값 제공 또는 필수 값 검증 추가 권장

2. **이미지 레지스트리**
   - 현재: `global.dockerRegistry`가 비어있으면 레지스트리 없이 이미지 사용
   - 예상 동작: `repository:tag` 형태로 사용

## 다음 단계

1. 실제 Kubernetes 클러스터에서 테스트
2. 다양한 값 조합으로 테스트
3. Secret 관리 개선 (Sealed Secrets 또는 External Secrets Operator)

