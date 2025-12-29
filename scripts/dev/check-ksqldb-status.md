# KSQLDB 상태 확인 가이드

## 빠른 확인 명령어 (Windows PowerShell/CMD)

### 1. 스트림 목록 확인
```powershell
kubectl exec -n app ksqldb-0 -- sh -c "curl -s -X POST http://localhost:8088/ksql -H 'Content-Type: application/vnd.ksql.v1+json' -d '{\"ksql\": \"SHOW STREAMS;\", \"streamsProperties\": {}}'"
```

### 2. 테이블 목록 확인
```powershell
kubectl exec -n app ksqldb-0 -- sh -c "curl -s -X POST http://localhost:8088/ksql -H 'Content-Type: application/vnd.ksql.v1+json' -d '{\"ksql\": \"SHOW TABLES;\", \"streamsProperties\": {}}'"
```

### 3. 쿼리 상태 확인
```powershell
kubectl exec -n app ksqldb-0 -- sh -c "curl -s -X POST http://localhost:8088/query -H 'Content-Type: application/vnd.ksql.v1+json' -d '{\"ksql\": \"SHOW QUERIES;\", \"streamsProperties\": {}}'"
```

### 4. 테이블 데이터 확인 (tbl_cafe_info)
```powershell
kubectl exec -n app ksqldb-0 -- sh -c "curl -s -X POST http://localhost:8088/query -H 'Content-Type: application/vnd.ksql.v1+json' -d '{\"ksql\": \"SELECT * FROM tbl_cafe_info LIMIT 5;\", \"streamsProperties\": {}}'"
```

### 5. 테이블 데이터 확인 (tbl_region_category)
```powershell
kubectl exec -n app ksqldb-0 -- sh -c "curl -s -X POST http://localhost:8088/query -H 'Content-Type: application/vnd.ksql.v1+json' -d '{\"ksql\": \"SELECT * FROM tbl_region_category LIMIT 5;\", \"streamsProperties\": {}}'"
```

### 6. Materialized View 데이터 확인
```powershell
kubectl exec -n app ksqldb-0 -- sh -c "curl -s -X POST http://localhost:8088/query -H 'Content-Type: application/vnd.ksql.v1+json' -d '{\"ksql\": \"SELECT * FROM mv_cafe_info_with_region LIMIT 5;\", \"streamsProperties\": {}}'"
```

### 7. Kafka 토픽에서 직접 확인 (mv_cafe_info_with_region)
```powershell
# Kafka 토픽 리스트 확인
kubectl exec -n app kafka-0 -- kafka-topics --bootstrap-server localhost:9092 --list | findstr mv_cafe_info_with_region

# 토픽 메시지 확인 (최근 10개)
kubectl exec -n app kafka-0 -- kafka-console-consumer --bootstrap-server localhost:9092 --topic mv_cafe_info_with_region --from-beginning --max-messages 10
```

### 8. 원본 Kafka 토픽 데이터 확인 (Debezium CDC)
```powershell
# CafeInfo CDC 토픽
kubectl exec -n app kafka-0 -- kafka-console-consumer --bootstrap-server localhost:9092 --topic dbserver.public.CafeInfo --from-beginning --max-messages 5

# RegionCategory CDC 토픽
kubectl exec -n app kafka-0 -- kafka-console-consumer --bootstrap-server localhost:9092 --topic dbserver.public.RegionCategory --from-beginning --max-messages 5
```

## 문제 진단 체크리스트

### ✅ queries.sql이 실행되었는지 확인
- `mv_cafe_info_with_region` 토픽이 존재하면 ✅ 실행됨
- Job 로그 확인:
  ```powershell
  kubectl logs -n app -l job-name=ksqldb-apply-queries
  ```

### ✅ 테이블이 생성되었는지 확인
- `SHOW TABLES;` 명령어로 확인
- 다음 테이블이 있어야 함:
  - `tbl_cafe_info`
  - `tbl_region_category`
  - `mv_cafe_info_with_region` (TABLE로 표시됨)

### ✅ 원본 데이터가 Kafka에 있는지 확인
- `dbserver.public.CafeInfo` 토픽에 메시지가 있는지 확인
- `dbserver.public.RegionCategory` 토픽에 메시지가 있는지 확인

### ✅ 테이블에 데이터가 있는지 확인
- `SELECT * FROM tbl_cafe_info LIMIT 5;` 실행
- `SELECT * FROM tbl_region_category LIMIT 5;` 실행
- 데이터가 없으면 JOIN 결과도 없음

### ✅ JOIN 조건 확인
- `tbl_cafe_info.regionCategoryId`와 `tbl_region_category.id`가 매칭되는지 확인
- 만약 데이터가 있지만 JOIN 결과가 없다면:
  ```sql
  -- 각 테이블의 키 값 확인
  SELECT DISTINCT "regionCategoryId" FROM tbl_cafe_info;
  SELECT DISTINCT id FROM tbl_region_category;
  ```

## 일반적인 문제 해결

### 문제 1: 테이블은 있지만 데이터가 없음
**원인**: Debezium CDC가 제대로 작동하지 않거나, 원본 테이블에 데이터가 없음

**해결**:
1. PostgreSQL에서 원본 테이블 확인:
   ```sql
   SELECT COUNT(*) FROM "CafeInfo";
   SELECT COUNT(*) FROM "RegionCategory";
   ```
2. Debezium 커넥터 로그 확인:
   ```powershell
   kubectl logs -n data -l app.kubernetes.io/name=debezium
   ```

### 문제 2: JOIN 결과가 없음 (테이블에 데이터는 있음)
**원인**: `regionCategoryId`와 `id`가 매칭되지 않음

**해결**:
1. 각 테이블의 키 값 확인
2. JOIN 조건 확인 (queries.sql의 172번째 줄)
3. NULL 값 체크

### 문제 3: 스트림/테이블이 보이지 않음
**원인**: queries.sql이 실행되지 않았거나 실패함

**해결**:
1. Job 로그 확인
2. Job을 수동으로 재실행:
   ```powershell
   # Job 삭제
   kubectl delete job -n app ksqldb-apply-queries
   
   # Helm upgrade로 Job 재생성
   helm upgrade ksqldb ./infra/helm/ksqldb -f ./infra/helm/ksqldb/values-local.yaml -n app
   ```




