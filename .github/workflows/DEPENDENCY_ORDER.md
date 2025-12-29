# 배포 의존성 순서 가이드

## 문제점

Debezium은 Kafka에 의존하는데, 기존 워크플로우에서는:
1. ❌ Instance B (Debezium 포함)를 먼저 배포
2. ❌ Instance A (Kafka)를 나중에 배포
3. ❌ Debezium이 Kafka 없이 시작하려고 해서 실패 가능

또한:
- Debezium은 `data` namespace에 있음
- Kafka는 `app` namespace에 있음
- `kafka:9092`는 같은 namespace 내의 서비스를 찾음
- ❌ 올바른 서비스 DNS는 `kafka.app.svc.cluster.local:9092`여야 함

---

## 해결 방법

### 1. 배포 순서 변경

**이전:**
```
Instance B (Debezium) → Instance A (Kafka)
```

**개선:**
```
Instance A (Kafka) → Instance B (Debezium)
```

### 2. Kafka 연결 정보 수정

**이전:**
```yaml
# infra/helm/debezium/values.yaml
kafka:
  bootstrapServers: "kafka:9092"  # ❌ 같은 namespace만 찾음
```

**개선:**
```yaml
# infra/helm/debezium/values.yaml
kafka:
  bootstrapServers: "kafka.app.svc.cluster.local:9092"  # ✅ FQDN 사용
```

**워크플로우에서:**
```bash
helm upgrade --install debezium \
  --set kafka.bootstrapServers="kafka.app.svc.cluster.local:9092"
```

---

## 현재 배포 순서

### Step 1: Instance A - Kafka 먼저 배포
```yaml
- name: Deploy Infra (Instance A - Kafka First)
  # Kafka 배포
  # Kafka ready 대기 (10분)
```

### Step 2: Instance B - Debezium 배포
```yaml
- name: Deploy Infra (Instance B)
  # PostgreSQL 배포
  # Elasticsearch 배포
  # Debezium 배포 (Kafka 연결 정보 포함)
  # Kibana 배포
```

### Step 3: Instance A - 나머지 인프라 배포
```yaml
- name: Deploy Infra (Instance A - Remaining)
  # Kafka UI 배포
  # KSQLDB 배포
  # Nginx 배포
  # Cert-manager 배포
```

---

## 네임스페이스 간 서비스 연결

### 같은 Namespace
```yaml
# app namespace 내에서
kafka:9092  # ✅ 가능
```

### 다른 Namespace
```yaml
# data namespace에서 app namespace의 Kafka 접근
kafka.app.svc.cluster.local:9092  # ✅ FQDN 필요
```

### Kubernetes Service DNS 형식
```
<service-name>.<namespace>.svc.cluster.local:<port>
```

---

## 의존성 체크리스트

### Debezium 의존성
- ✅ Kafka (app namespace) - **먼저 배포 필요**
- ✅ PostgreSQL (data namespace 또는 외부)

### KSQLDB 의존성
- ✅ Kafka (app namespace) - 같은 namespace이므로 `kafka:9092` 가능

### Kafka UI 의존성
- ✅ Kafka (app namespace) - 같은 namespace이므로 `kafka:9092` 가능

---

## 검증 방법

### 1. Kafka가 먼저 배포되었는지 확인
```bash
kubectl get pods -n app | grep kafka
```

### 2. Debezium이 Kafka에 연결할 수 있는지 확인
```bash
# Debezium Pod 로그 확인
kubectl logs -n data deployment/debezium-connect | grep -i kafka
```

### 3. 네트워크 연결 테스트
```bash
# Debezium Pod에서 Kafka 연결 테스트
kubectl exec -n data deployment/debezium-connect -- \
  sh -c "nc -zv kafka.app.svc.cluster.local 9092"
```

---

## 주의사항

1. ⚠️ Kafka가 준비될 때까지 충분히 대기해야 함 (10분 timeout)
2. ⚠️ Debezium 배포 시 Kafka 연결 정보를 명시적으로 전달
3. ⚠️ 네임스페이스 간 연결은 FQDN 사용 필수

