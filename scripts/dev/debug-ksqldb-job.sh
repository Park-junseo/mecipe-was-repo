#!/bin/bash

# KSQLDB Job 디버깅 스크립트

LOCAL_APP_NS="app"

echo "======================================"
echo "KSQLDB Job 디버깅"
echo "======================================"

# Job 상태 확인
echo -e "\n--- 📋 Job 상태 ---"
kubectl get jobs -n "${LOCAL_APP_NS}" ksqldb-apply-queries 2>/dev/null || echo "Job이 없습니다"

# 실패한 Pod 로그 확인 (Job의 이전 Pod들)
echo -e "\n--- 📋 실패한 Pod 목록 ---"
kubectl get pods -n "${LOCAL_APP_NS}" --field-selector=status.phase!=Running --show-labels | grep ksqldb-apply-queries || echo "실패한 Pod를 찾을 수 없습니다"

# 가장 최근 Pod 이름 찾기
RECENT_POD=$(kubectl get pods -n "${LOCAL_APP_NS}" -l job-name=ksqldb-apply-queries --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}' 2>/dev/null || echo "")

if [ -n "$RECENT_POD" ]; then
    echo -e "\n--- 📋 가장 최근 Pod: ${RECENT_POD} ---"
    echo -e "\n--- 📋 Pod 로그 (전체) ---"
    kubectl logs -n "${LOCAL_APP_NS}" "${RECENT_POD}" 2>&1 || echo "로그를 가져올 수 없습니다"
    
    echo -e "\n--- 📋 Pod 상태 ---"
    kubectl describe pod -n "${LOCAL_APP_NS}" "${RECENT_POD}" 2>&1 | tail -30 || echo "Pod 정보를 가져올 수 없습니다"
else
    echo -e "\n--- ⚠️  Pod를 찾을 수 없습니다 ---"
    echo "Job을 재실행하거나 수동으로 테스트하세요:"
    echo ""
    echo "1. Job 재실행:"
    echo "   kubectl delete job -n ${LOCAL_APP_NS} ksqldb-apply-queries"
    echo "   helm upgrade ksqldb ./infra/helm/ksqldb -f ./infra/helm/ksqldb/values-local.yaml -n ${LOCAL_APP_NS}"
    echo ""
    echo "2. 수동 테스트 (KSQLDB Pod에서):"
    echo "   kubectl exec -n ${LOCAL_APP_NS} ksqldb-0 -- sh"
    echo "   curl -s -X POST http://localhost:8088/ksql \\"
    echo "     -H 'Content-Type: application/vnd.ksql.v1+json' \\"
    echo "     -d '{\"ksql\":\"SHOW STREAMS;\",\"streamsProperties\":{}}'"
fi

# KSQLDB Pod 상태 확인
echo -e "\n--- 📋 KSQLDB Pod 상태 ---"
KSQLDB_POD=$(kubectl get pods -n "${LOCAL_APP_NS}" -l platform.confluent.io/type=ksqldb -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$KSQLDB_POD" ]; then
    echo "KSQLDB Pod: ${KSQLDB_POD}"
    kubectl get pod -n "${LOCAL_APP_NS}" "${KSQLDB_POD}"
    
    echo -e "\n--- 📋 KSQLDB에서 스트림/테이블 확인 ---"
    echo "SHOW STREAMS:"
    kubectl exec -n "${LOCAL_APP_NS}" "${KSQLDB_POD}" -- curl -s -X POST http://localhost:8088/ksql \
      -H "Content-Type: application/vnd.ksql.v1+json" \
      -d '{"ksql":"SHOW STREAMS;","streamsProperties":{}}' 2>/dev/null | head -20 || echo "실패"
    
    echo -e "\nSHOW TABLES:"
    kubectl exec -n "${LOCAL_APP_NS}" "${KSQLDB_POD}" -- curl -s -X POST http://localhost:8088/ksql \
      -H "Content-Type: application/vnd.ksql.v1+json" \
      -d '{"ksql":"SHOW TABLES;","streamsProperties":{}}' 2>/dev/null | head -20 || echo "실패"
else
    echo "KSQLDB Pod를 찾을 수 없습니다"
fi

echo ""
echo "======================================"
echo "디버깅 완료"
echo "======================================"

