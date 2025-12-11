# Helm 마이그레이션 요약

## 생성된 Helm 차트

### 인스턴스 A (`helm/mecipe-instance-a/`)
- **Chart.yaml**: 차트 메타데이터
- **values.yaml**: 기본 설정값
- **templates/**: Kubernetes 매니페스트 템플릿
  - `namespace.yaml`: 네임스페이스
  - `configmap.yaml`: ConfigMap
  - `secrets.yaml`: Secret
  - `pvc.yaml`: PersistentVolumeClaim
  - `place-indexer-service.yaml`: Place Indexer Service
  - `mecipe-was.yaml`: Mecipe WAS
  - `nginx.yaml`: Nginx
  - `certbot.yaml`: Certbot CronJob
  - `kafka-ui.yaml`: Kafka UI
  - `_helpers.tpl`: 헬퍼 템플릿

### 인스턴스 B (`helm/mecipe-instance-b/`)
- **Chart.yaml**: 차트 메타데이터
- **values.yaml**: 기본 설정값
- **templates/**: Kubernetes 매니페스트 템플릿
  - `namespace.yaml`: 네임스페이스
  - `secrets.yaml`: Secret
  - `postgresql.yaml`: PostgreSQL StatefulSet
  - `elasticsearch.yaml`: Elasticsearch StatefulSet
  - `kibana.yaml`: Kibana Deployment
  - `debezium.yaml`: Debezium Connect Deployment
  - `_helpers.tpl`: 헬퍼 템플릿

## Helm의 주요 장점

### 1. 환경별 설정 관리
```bash
# 개발 환경
helm install mecipe-instance-a ./helm/mecipe-instance-a \
  -f values-dev.yaml

# 프로덕션 환경
helm install mecipe-instance-a ./helm/mecipe-instance-a \
  -f values-production.yaml
```

### 2. 간편한 업그레이드
```bash
helm upgrade mecipe-instance-a ./helm/mecipe-instance-a \
  --set image.tag=v1.1.0
```

### 3. 자동 롤백
```bash
helm rollback mecipe-instance-a
```

### 4. 릴리스 히스토리
```bash
helm history mecipe-instance-a
```

## CI/CD 통합

새로운 GitHub Actions 워크플로우: `.github/workflows/deploy-helm.yml`

주요 변경사항:
- Helm 설치 및 릴리스 관리
- `helm upgrade --install`로 배포
- `--wait` 플래그로 배포 완료 대기
- 자동 롤백 지원

## 사용 방법

### 1. 차트 검증
```bash
helm lint ./helm/mecipe-instance-a
helm lint ./helm/mecipe-instance-b
```

### 2. 템플릿 미리보기
```bash
helm template mecipe-instance-a ./helm/mecipe-instance-a \
  --set image.tag=latest
```

### 3. 배포
```bash
# 인스턴스 A
helm upgrade --install mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --create-namespace \
  --set image.tag=latest

# 인스턴스 B
helm upgrade --install mecipe-instance-b ./helm/mecipe-instance-b \
  --namespace instance-b \
  --create-namespace \
  --set secrets.postgresPassword="password"
```

### 4. 업그레이드
```bash
helm upgrade mecipe-instance-a ./helm/mecipe-instance-a \
  --namespace instance-a \
  --set image.tag=v1.1.0
```

### 5. 롤백
```bash
helm rollback mecipe-instance-a --namespace instance-a
```

## 기존 k8s/ 디렉토리와의 관계

- **k8s/**: 순수 Kubernetes 매니페스트 (참고용)
- **helm/**: Helm 차트 (실제 사용)

기존 `k8s/` 디렉토리는 참고용으로 유지하고, 새로운 배포는 `helm/` 차트를 사용합니다.

## 다음 단계

1. **환경별 Values 파일 생성**
   - `values-dev.yaml`
   - `values-staging.yaml`
   - `values-production.yaml`

2. **Secret 관리 개선**
   - Sealed Secrets 또는 External Secrets Operator 도입

3. **차트 테스트**
   - `helm test` 명령어로 테스트 추가

4. **차트 패키징**
   - Helm 저장소에 업로드 (선택사항)

## 참고 자료

- [Helm 공식 문서](https://helm.sh/docs/)
- [Helm Best Practices](https://helm.sh/docs/chart_best_practices/)
- `documents/HELM_VS_KUBERNETES.md`: Helm vs 순수 K8s 비교

