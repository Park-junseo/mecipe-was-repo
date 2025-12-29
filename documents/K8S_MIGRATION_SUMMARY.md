# Kubernetes CI/CD 마이그레이션 요약

## 생성된 파일 목록

### 쿠버네티스 매니페스트
- `k8s/instance-a/`: 인스턴스 A 배포 파일들
  - `namespace.yaml`: instance-a 네임스페이스
  - `kafka.yaml`: Kafka StatefulSet 및 Service
  - `ksqldb.yaml`: KSQLDB Deployment 및 Service
  - `kafka-ui.yaml`: Kafka UI Deployment 및 Service
  - `place-indexer-service.yaml`: Place Indexer Service Deployment
  - `mecipe-was.yaml`: Mecipe WAS Deployment 및 Service
  - `nginx.yaml`: Nginx Deployment 및 LoadBalancer Service
  - `certbot.yaml`: Certbot CronJob
  - `pvc.yaml`: PersistentVolumeClaim 정의

- `k8s/instance-b/`: 인스턴스 B 배포 파일들
  - `namespace.yaml`: instance-b 네임스페이스
  - `postgresql.yaml`: PostgreSQL StatefulSet 및 Service
  - `elasticsearch.yaml`: Elasticsearch StatefulSet 및 Service
  - `kibana.yaml`: Kibana Deployment 및 Service
  - `debezium.yaml`: Debezium Connect Deployment 및 Service

### 스크립트
- `scripts/healthcheck-and-fallback.sh`: PostgreSQL 및 Elasticsearch 헬스체크 및 Docker 폴백 스크립트

### CI/CD
- `.github/workflows/deploy-k8s.yml`: 쿠버네티스 기반 GitHub Actions 워크플로우

### 문서
- `k8s/README.md`: 쿠버네티스 배포 가이드
- `documents/KUBERNETES_DEPLOYMENT.md`: 배포 전략 및 Nx 도입 가이드
- `documents/K8S_MIGRATION_SUMMARY.md`: 이 문서

### Dockerfile
- `apps/place-indexer-service/Dockerfile`: Place Indexer Service용 Dockerfile

## 주요 변경사항

### 1. 인스턴스 분리
- **인스턴스 A**: 애플리케이션 및 스트리밍 서비스
- **인스턴스 B**: 데이터베이스 및 검색 엔진

### 2. 헬스체크 및 폴백
- PostgreSQL과 Elasticsearch에 대해 30초 타임아웃 헬스체크
- 응답이 없으면 자동으로 Docker 컨테이너로 시작

### 3. CI/CD 파이프라인
- 테스트 → 빌드 → 헬스체크 → 배포 순서로 실행
- 인스턴스 A와 B를 순차적으로 배포
- 롤링 업데이트 지원

## 필요한 GitHub Secrets

### 필수 Secrets
- `DOCKER_USERNAME`: Docker Hub 사용자명
- `DOCKER_PASSWORD`: Docker Hub 비밀번호
- `KUBECONFIG`: Base64 인코딩된 kubeconfig 파일 (인스턴스 A용)
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `JWT_SECRET`: JWT 시크릿 키
- `SECRET_LOGIN_CRYPTO`: 로그인 암호화 시크릿
- `POSTGRES_PASSWORD`: PostgreSQL 비밀번호
- `ELASTICSEARCH_PASSWORD`: Elasticsearch 비밀번호
- `KIBANA_PASSWORD`: Kibana 비밀번호
- `DOMAIN_NAME`: 도메인 이름

### 선택적 Secrets
- `POSTGRES_HOST`: PostgreSQL 호스트 (기본값: `postgresql.instance-b.svc.cluster.local`)
- `POSTGRES_PORT`: PostgreSQL 포트 (기본값: `5432`)
- `POSTGRES_USER`: PostgreSQL 사용자명 (기본값: `postgres`)
- `POSTGRES_DB`: PostgreSQL 데이터베이스명 (기본값: `mydb`)
- `ELASTICSEARCH_HOST`: Elasticsearch 호스트 (기본값: `elasticsearch.instance-b.svc.cluster.local`)
- `ELASTICSEARCH_PORT`: Elasticsearch 포트 (기본값: `9200`)
- `ELASTICSEARCH_USERNAME`: Elasticsearch 사용자명 (기본값: `elastic`)
- `API_KEY`: API 키 (선택)
- `BUILD_API_KEY`: 빌드 API 키 (선택)
- `COUPON_SECRET`: 쿠폰 시크릿
- `PRODUCT_SECRET`: 제품 시크릿

## 배포 전 체크리스트

### 사전 준비
- [ ] 두 개의 쿠버네티스 클러스터 준비 (인스턴스 A, B)
- [ ] kubectl 설치 및 클러스터 접근 설정
- [ ] Docker Hub 계정 및 이미지 저장소 준비
- [ ] GitHub Secrets 설정
- [ ] 네트워크 연결 확인 (인스턴스 A ↔ B)

### 쿠버네티스 클러스터 설정
- [ ] StorageClass 설정 (PVC용)
- [ ] LoadBalancer 또는 Ingress Controller 설정
- [ ] 네트워크 정책 설정 (필요시)
- [ ] 리소스 제한 설정 (필요시)

### 배포 테스트
- [ ] ConfigMap 및 Secret 생성 테스트
- [ ] 단일 서비스 배포 테스트
- [ ] 헬스체크 스크립트 테스트
- [ ] 전체 파이프라인 테스트

## 트러블슈팅 가이드

### Pod가 시작되지 않음
1. `kubectl get pods -n <namespace>`로 상태 확인
2. `kubectl describe pod <pod-name> -n <namespace>`로 이벤트 확인
3. `kubectl logs <pod-name> -n <namespace>`로 로그 확인

### 이미지 Pull 실패
1. Docker Hub 로그인 확인
2. imagePullSecrets 설정 확인
3. 이미지 태그 확인

### 서비스 간 통신 실패
1. Service DNS 확인: `<service-name>.<namespace>.svc.cluster.local`
2. 네트워크 정책 확인
3. 포트 및 프로토콜 확인

### PVC 마운트 실패
1. StorageClass 확인
2. PVC 상태 확인
3. 노드의 디스크 공간 확인

## 다음 단계

1. **환경별 설정 분리**: Kustomize를 사용하여 dev/staging/production 환경 분리
2. **모니터링 추가**: Prometheus 및 Grafana 통합
3. **로깅 통합**: ELK 스택 또는 Loki 통합
4. **자동 스케일링**: HPA (Horizontal Pod Autoscaler) 설정
5. **서비스 메시**: Istio 또는 Linkerd 도입 검토
6. **Nx 도입**: 모노레포 구조 개선

## 참고 자료

- [Kubernetes 공식 문서](https://kubernetes.io/docs/)
- [Kustomize 가이드](https://kustomize.io/)
- [Nx 공식 문서](https://nx.dev/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)

