# Helm Charts for Mecipe

이 디렉토리에는 Mecipe 애플리케이션을 위한 Helm 차트가 포함되어 있습니다.

## 구조

```
helm/
├── mecipe-instance-a/    # 인스턴스 A: 애플리케이션 및 스트리밍 서비스
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
└── mecipe-instance-b/    # 인스턴스 B: 데이터베이스 및 검색 엔진
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
```

## Helm의 장점

1. **템플릿화**: 환경별 설정을 쉽게 관리
2. **재사용성**: 차트를 여러 환경에서 재사용 가능
3. **의존성 관리**: 차트 간 의존성 자동 관리
4. **릴리스 관리**: `helm upgrade` 및 `helm rollback`으로 버전 관리
5. **값 관리**: `values.yaml`로 중앙 집중식 설정 관리

## 설치 방법

### 1. 사전 준비

```bash
# Helm 설치 확인
helm version

# Helm 저장소 추가 (필요시)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add confluentinc https://confluentinc.github.io/cp-helm-charts/
helm repo update
```

### 2. Values 파일 준비

각 환경별로 `values.yaml` 파일을 생성하거나 기존 파일을 수정합니다:

```bash
# 프로덕션 환경용 values 파일 생성
cp helm/mecipe-instance-a/values.yaml helm/mecipe-instance-a/values-production.yaml

# 개발 환경용 values 파일 생성
cp helm/mecipe-instance-a/values.yaml helm/mecipe-instance-a/values-dev.yaml
```

### 3. 인스턴스 A 배포

```bash
# Namespace 생성
kubectl create namespace instance-a

# Helm 릴리스 설치
helm install mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --set global.dockerRegistry="your-docker-registry" \
  --set placeIndexerService.image.repository="your-docker-registry/place-indexer-service" \
  --set placeIndexerService.image.tag="latest" \
  --set mecipeWAS.image.repository="your-docker-registry/mecipe-api-server" \
  --set mecipeWAS.image.tag="latest" \
  --set nginx.image.repository="your-docker-registry/mecipe-nginx" \
  --set nginx.image.tag="latest" \
  --set configMap.domainName="your-domain.com" \
  --set secrets.databaseUrl="postgresql://..." \
  --set secrets.jwtSecret="..." \
  --set-file secrets.elasticsearchPassword=<(echo -n "password") \
  -f helm/mecipe-instance-a/values-production.yaml
```

### 4. 인스턴스 B 배포

```bash
# Namespace 생성
kubectl create namespace instance-b

# Helm 릴리스 설치
helm install mecipe-instance-b ./helm/mecipe-instance-b \
  --namespace instance-b \
  --set secrets.postgresPassword="your-password" \
  --set secrets.elasticPassword="your-password" \
  --set secrets.kibanaPassword="your-password" \
  --set debezium.kafka.bootstrapServers="kafka.instance-a.svc.cluster.local:9092" \
  -f helm/mecipe-instance-b/values-production.yaml
```

## 업데이트

```bash
# 인스턴스 A 업데이트
helm upgrade mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --set mecipeWAS.image.tag="v1.1.0" \
  -f helm/mecipe-instance-a/values-production.yaml

# 인스턴스 B 업데이트
helm upgrade mecipe-instance-b ./helm/mecipe-instance-b \
  --namespace instance-b \
  -f helm/mecipe-instance-b/values-production.yaml
```

## 롤백

```bash
# 이전 버전으로 롤백
helm rollback mecipe-instance-a --namespace instance-a
helm rollback mecipe-instance-b --namespace instance-b

# 특정 리비전으로 롤백
helm rollback mecipe-instance-a 2 --namespace instance-a
```

## 릴리스 상태 확인

```bash
# 릴리스 목록 확인
helm list --namespace instance-a
helm list --namespace instance-b

# 릴리스 상세 정보 확인
helm status mecipe-instance-a --namespace instance-a
helm status mecipe-instance-b --namespace instance-b

# 릴리스 히스토리 확인
helm history mecipe-instance-a --namespace instance-a
helm history mecipe-instance-b --namespace instance-b
```

## Values 파일 관리

### 환경별 Values 파일

각 환경별로 별도의 values 파일을 유지하는 것을 권장합니다:

- `values.yaml`: 기본값
- `values-dev.yaml`: 개발 환경
- `values-staging.yaml`: 스테이징 환경
- `values-production.yaml`: 프로덕션 환경

### Secret 관리

민감한 정보는 Helm Secret이나 외부 Secret 관리 도구를 사용하세요:

```bash
# Sealed Secrets 사용 예시
kubectl create secret generic mecipe-secrets \
  --from-literal=database-url="..." \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# 또는 External Secrets Operator 사용
```

## CI/CD 통합

GitHub Actions에서 Helm을 사용하는 예시:

```yaml
- name: Install Helm
  uses: azure/setup-helm@v3
  with:
    version: 'latest'

- name: Deploy with Helm
  run: |
    helm upgrade --install mecipe-instance-a ./helm/mecipe-instance-a \
      --namespace instance-a \
      --create-namespace \
      --set image.tag=${{ github.sha }} \
      -f helm/mecipe-instance-a/values-production.yaml
```

## 트러블슈팅

### 차트 검증

```bash
# 차트 문법 검증
helm lint ./helm/mecipe-instance-a

# 템플릿 렌더링 확인
helm template ./helm/mecipe-instance-a --debug
```

### 디버깅

```bash
# Dry-run으로 설치 확인
helm install mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --dry-run --debug

# 템플릿 렌더링 결과 확인
helm template mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --set image.tag=latest
```

## 참고 자료

- [Helm 공식 문서](https://helm.sh/docs/)
- [Helm Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Helm Values 파일 가이드](https://helm.sh/docs/chart_template_guide/values_files/)

