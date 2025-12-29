# 컴포넌트 템플릿 패턴

나머지 컴포넌트들(debezium, kibana, nginx, cert-manager, mecipe-was, place-indexer-service)은 다음 패턴을 따라 생성하세요.

## 공통 구조

각 컴포넌트는 다음 파일들을 포함합니다:

1. **Chart.yaml** - Chart 메타데이터
2. **values.yaml** - 기본 설정값 (nodeSelector 포함)
3. **templates/_helpers.tpl** - 공통 헬퍼 include
4. **templates/service.yaml** - Service 리소스
5. **templates/deployment.yaml** (또는 statefulset.yaml) - Deployment/StatefulSet 리소스
6. **templates/secrets.yaml** (필요시) - Secret 리소스
7. **templates/pvc.yaml** (필요시) - PersistentVolumeClaim 리소스

## Debezium 패턴

**Chart.yaml**
```yaml
apiVersion: v2
name: debezium
description: Debezium Connect for Mecipe
type: application
version: 0.1.0
appVersion: "2.6"
```

**values.yaml**
```yaml
nodeSelector:
  node-role: data

image:
  repository: debezium/connect
  tag: "2.6"

kafka:
  bootstrapServers: "kafka:9092"

connector:
  name: "cafe-infos-debezium-connector"
  database:
    hostname: "postgres"
    port: "5432"
    user: ""
    password: ""
    dbname: ""
  serverName: "dbserver"
  tableIncludeList: "public.CafeInfo,public.RegionCategory"
```

## Kibana 패턴

**Chart.yaml**
```yaml
apiVersion: v2
name: kibana
description: Kibana for Mecipe
type: application
version: 0.1.0
appVersion: "8.14.0"
```

**values.yaml**
```yaml
nodeSelector:
  node-role: data

image:
  repository: docker.elastic.co/kibana/kibana
  tag: "8.14.0"

elasticsearch:
  hosts: "http://elasticsearch:9200"
  username: kibana_system
  password: ""
```

## Nginx 패턴

**Chart.yaml**
```yaml
apiVersion: v2
name: nginx
description: Nginx for Mecipe
type: application
version: 0.1.0
appVersion: "latest"
```

**values.yaml**
```yaml
nodeSelector:
  node-role: app

image:
  repository: ""
  tag: "latest"

env:
  domainName: ""
  appPort: "4000"
  socketPort: "4100"

persistence:
  certbotConf:
    enabled: true
    size: 1Gi
  certbotWww:
    enabled: true
    size: 1Gi
  media:
    enabled: true
    size: 10Gi
```

## Cert-manager 패턴

**Chart.yaml**
```yaml
apiVersion: v2
name: cert-manager
description: Certbot for Mecipe
type: application
version: 0.1.0
appVersion: "latest"
```

**values.yaml**
```yaml
nodeSelector:
  node-role: app

schedule: "0 0,12 * * *"

persistence:
  certbotConf:
    enabled: true
  certbotWww:
    enabled: true
```

## Mecipe-WAS 패턴

**Chart.yaml**
```yaml
apiVersion: v2
name: mecipe-was
description: Mecipe WAS Application
type: application
version: 0.1.0
appVersion: "latest"
```

**values.yaml**
```yaml
nodeSelector:
  node-role: app

image:
  repository: ""
  tag: "latest"

env:
  nodeEnv: production
  port: "4000"
  socketPort: "4100"
  databaseUrl: "postgresql://user:pass@postgres:5432/db"
  jwtSecret: ""
  # ... 기타 환경 변수

persistence:
  enabled: true
  size: 10Gi
```

## Place-Indexer-Service 패턴

**Chart.yaml**
```yaml
apiVersion: v2
name: place-indexer-service
description: Place Indexer Service
type: application
version: 0.1.0
appVersion: "latest"
```

**values.yaml**
```yaml
nodeSelector:
  node-role: app

image:
  repository: ""
  tag: "latest"

env:
  nodeEnv: production
  elasticsearchHosts: "http://elasticsearch:9200"
  kafkaBrokers: "kafka:9092"
```

## Service DNS 이름 변경

모든 Service DNS 이름을 간단하게 변경:

- `kafka.instance-pre-a.svc.cluster.local:9092` → `kafka:9092`
- `elasticsearch.instance-b.svc.cluster.local:9200` → `elasticsearch:9200`
- `postgresql.instance-b.svc.cluster.local:5432` → `postgres:5432`

Kubernetes는 같은 네임스페이스 내에서 Service 이름으로 자동 DNS 해석을 제공합니다.

