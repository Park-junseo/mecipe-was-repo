# Helm 구조 마이그레이션 가이드

## 목표 구조

```
infra/helm/
├── nginx/              # Instance A (node-role=app)
├── cert-manager/       # Instance A (node-role=app)
├── kafka/              # Instance A (node-role=app) - Bitnami dependency
├── kafka-ui/           # Instance A (node-role=app)
├── ksqldb/             # Instance A (node-role=app)
├── postgres/           # Instance B (node-role=data) ✅ 완료
├── elasticsearch/      # Instance B (node-role=data)
├── debezium/           # Instance B (node-role=data)
├── kibana/             # Instance B (node-role=data)
└── apps/
    ├── mecipe-was/     # Instance A (node-role=app)
    └── place-indexer-service/  # Instance A (node-role=app)
```

## 각 Chart 구조

각 Chart는 다음 파일들을 포함해야 합니다:

```
chart-name/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── _helpers.tpl    # common-helpers.tpl include
    ├── service.yaml
    ├── deployment.yaml (또는 statefulset.yaml)
    ├── secrets.yaml (필요시)
    └── pvc.yaml (필요시)
```

## 공통 패턴

### 1. Chart.yaml
```yaml
apiVersion: v2
name: chart-name
description: Description
type: application
version: 0.1.0
appVersion: "1.0.0"
```

### 2. values.yaml - nodeSelector
```yaml
# Instance A 컴포넌트
nodeSelector:
  node-role: app

# Instance B 컴포넌트
nodeSelector:
  node-role: data
```

### 3. templates/_helpers.tpl
```tpl
{{- include "common.name" . }}
{{- include "common.fullname" . }}
{{- include "common.chart" . }}
{{- include "common.labels" . }}
{{- include "common.selectorLabels" . }}
{{- include "common.image" . }}
{{- include "common.nodeSelector" . }}
```

### 4. templates/deployment.yaml - nodeSelector 추가
```yaml
spec:
  template:
    spec:
      {{- include "common.nodeSelector" . }}
      containers:
      ...
```

## Service DNS 이름 변경

### 기존
- `kafka.instance-pre-a.svc.cluster.local:9092`
- `elasticsearch.instance-b.svc.cluster.local:9200`
- `postgresql.instance-b.svc.cluster.local:5432`

### 새로운
- `kafka.default.svc.cluster.local:9092` (또는 `kafka:9092`)
- `elasticsearch.default.svc.cluster.local:9200` (또는 `elasticsearch:9200`)
- `postgres.default.svc.cluster.local:5432` (또는 `postgres:5432`)

## 마이그레이션 체크리스트

- [x] 디렉토리 구조 생성
- [x] 공통 헬퍼 템플릿 생성
- [x] postgres Chart 생성
- [ ] elasticsearch Chart 생성
- [ ] kafka Chart 생성 (Bitnami dependency)
- [ ] kafka-ui Chart 생성
- [ ] ksqldb Chart 생성
- [ ] debezium Chart 생성
- [ ] kibana Chart 생성
- [ ] nginx Chart 생성
- [ ] cert-manager Chart 생성
- [ ] mecipe-was Chart 생성
- [ ] place-indexer-service Chart 생성
- [ ] 모든 Chart에 nodeSelector 추가
- [ ] Service DNS 이름 업데이트
- [ ] GitHub Actions 워크플로우 수정

## 다음 단계

나머지 컴포넌트들을 동일한 패턴으로 생성하세요.

