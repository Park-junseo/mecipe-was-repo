#!/bin/bash

# KSQLDB 진단 스크립트
# 사용법: ./scripts/dev/diagnose-ksqldb.sh [namespace]

set -e

NAMESPACE="${1:-app}"
KSQLDB_NAME="ksqldb"

echo "======================================"
echo "KSQLDB 진단 스크립트"
echo "======================================"
echo "Namespace: ${NAMESPACE}"
echo ""

# 1. KSQLDB Pod 상태 확인
echo "1. KSQLDB Pod 상태 확인:"
echo "---"
kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name="${KSQLDB_NAME}" || echo "Pod를 찾을 수 없습니다."
echo ""

# 2. KSQLDB Service 확인
echo "2. KSQLDB Service 확인:"
echo "---"
kubectl get svc -n "${NAMESPACE}" "${KSQLDB_NAME}" || echo "Service를 찾을 수 없습니다."
echo ""

# 3. ConfigMap 확인
echo "3. KSQLDB Queries ConfigMap 확인:"
echo "---"
kubectl get configmap -n "${NAMESPACE}" "${KSQLDB_NAME}-queries" || echo "ConfigMap을 찾을 수 없습니다."
echo ""

# 4. Query Job 상태 확인
echo "4. KSQLDB 쿼리 실행 Job 상태 확인:"
echo "---"
JOB_NAME=$(kubectl get jobs -n "${NAMESPACE}" -o jsonpath='{.items[?(@.metadata.name=~"ksqldb.*apply-queries.*")].metadata.name}' 2>/dev/null | head -1)
if [ -n "$JOB_NAME" ]; then
    echo "Job 이름: ${JOB_NAME}"
    kubectl get job "${JOB_NAME}" -n "${NAMESPACE}" || echo "Job을 찾을 수 없습니다."
    echo ""
    echo "Job 로그:"
    kubectl logs -n "${NAMESPACE}" -l job-name="${JOB_NAME}" --tail=100 || echo "로그를 찾을 수 없습니다."
else
    echo "쿼리 실행 Job을 찾을 수 없습니다."
fi
echo ""

# 5. KSQLDB에 직접 접속하여 스트림/테이블 확인
echo "5. KSQLDB 스트림/테이블 확인:"
echo "---"
KSQLDB_POD=$(kubectl get pods -n "${NAMESPACE}" -l app.kubernetes.io/name="${KSQLDB_NAME}" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -n "$KSQLDB_POD" ]; then
    echo "KSQLDB Pod: ${KSQLDB_POD}"
    echo ""
    echo "스트림 목록:"
    kubectl exec -n "${NAMESPACE}" "${KSQLDB_POD}" -- sh -c 'curl -s -X POST http://localhost:8088/ksql -H "Content-Type: application/vnd.ksql.v1+json" -d "{\"ksql\": \"SHOW STREAMS;\", \"streamsProperties\": {}}"' | jq -r '.[0].streams[]?.name // .[].errorMessage // "스트림이 없거나 에러가 발생했습니다."' || echo "스트림 조회 실패"
    echo ""
    echo "테이블 목록:"
    kubectl exec -n "${NAMESPACE}" "${KSQLDB_POD}" -- sh -c 'curl -s -X POST http://localhost:8088/ksql -H "Content-Type: application/vnd.ksql.v1+json" -d "{\"ksql\": \"SHOW TABLES;\", \"streamsProperties\": {}}"' | jq -r '.[0].tables[]?.name // .[].errorMessage // "테이블이 없거나 에러가 발생했습니다."' || echo "테이블 조회 실패"
    echo ""
    echo "쿼리 상태 확인:"
    kubectl exec -n "${NAMESPACE}" "${KSQLDB_POD}" -- sh -c 'curl -s -X POST http://localhost:8088/query -H "Content-Type: application/vnd.ksql.v1+json" -d "{\"ksql\": \"SHOW QUERIES;\", \"streamsProperties\": {}}"' | jq -r '.[0].queries[]? | "\(.id) - \(.statusText) - \(.queryType)" // .[].errorMessage // "쿼리가 없거나 에러가 발생했습니다."' || echo "쿼리 상태 조회 실패"
else
    echo "KSQLDB Pod를 찾을 수 없습니다."
fi
echo ""

# 6. Kafka 토픽 확인
echo "6. 관련 Kafka 토픽 확인:"
echo "---"
kubectl exec -n "${NAMESPACE}" "${KSQLDB_POD}" -- curl -s -X GET http://localhost:8088/info | jq -r '.kafkaClusterId // "정보를 가져올 수 없습니다."' || echo "Kafka 정보 조회 실패"
echo ""

echo "======================================"
echo "진단 완료"
echo "======================================"
echo ""
echo "수동 진단 명령어:"
echo "  # KSQLDB Pod 접속:"
echo "  kubectl exec -it -n ${NAMESPACE} ${KSQLDB_POD} -- sh"
echo ""
echo "  # KSQLDB CLI 사용 (Pod 내부에서):"
echo "  kubectl exec -n ${NAMESPACE} ${KSQLDB_POD} -- sh -c 'curl -s -X POST http://localhost:8088/ksql -H \"Content-Type: application/vnd.ksql.v1+json\" -d \"{\\\"ksql\\\": \\\"SHOW STREAMS;\\\", \\\"streamsProperties\\\": {}}\"'"
echo ""
echo "  kubectl exec -n ${NAMESPACE} ${KSQLDB_POD} -- sh -c 'curl -s -X POST http://localhost:8088/ksql -H \"Content-Type: application/vnd.ksql.v1+json\" -d \"{\\\"ksql\\\": \\\"SHOW TABLES;\\\", \\\"streamsProperties\\\": {}}\"'"
echo ""
echo "  # 테이블 데이터 확인:"
echo "  kubectl exec -n ${NAMESPACE} ${KSQLDB_POD} -- sh -c 'curl -s -X POST http://localhost:8088/query -H \"Content-Type: application/vnd.ksql.v1+json\" -d \"{\\\"ksql\\\": \\\"SELECT * FROM tbl_cafe_info LIMIT 5;\\\", \\\"streamsProperties\": {}}\"'"
echo ""
echo "  # Kafka 토픽 확인 (mv_cafe_info_with_region 메시지 확인):"
echo "  kubectl exec -n ${NAMESPACE} ${KSQLDB_POD} -- sh -c 'curl -s http://localhost:8088/kafka/topics' | jq"

