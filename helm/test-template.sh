#!/bin/bash
# Helm 템플릿 검증 스크립트

echo "Testing Helm charts..."

# Instance A 테스트
echo "Testing mecipe-instance-a..."
if helm template test ./helm/mecipe-instance-a --namespace instance-a --set placeIndexerService.image.repository=test --set placeIndexerService.image.tag=test --set mecipeWAS.image.repository=test --set mecipeWAS.image.tag=test --set nginx.image.repository=test --set nginx.image.tag=test > /dev/null 2>&1; then
    echo "✅ mecipe-instance-a: OK"
else
    echo "❌ mecipe-instance-a: FAILED"
    helm template test ./helm/mecipe-instance-a --namespace instance-a --set placeIndexerService.image.repository=test --set placeIndexerService.image.tag=test --set mecipeWAS.image.repository=test --set mecipeWAS.image.tag=test --set nginx.image.repository=test --set nginx.image.tag=test 2>&1 | head -20
    exit 1
fi

# Instance B 테스트
echo "Testing mecipe-instance-b..."
if helm template test ./helm/mecipe-instance-b --namespace instance-b --set secrets.postgresPassword=test --set secrets.elasticPassword=test --set secrets.kibanaPassword=test > /dev/null 2>&1; then
    echo "✅ mecipe-instance-b: OK"
else
    echo "❌ mecipe-instance-b: FAILED"
    helm template test ./helm/mecipe-instance-b --namespace instance-b --set secrets.postgresPassword=test --set secrets.elasticPassword=test --set secrets.kibanaPassword=test 2>&1 | head -20
    exit 1
fi

echo "All tests passed!"

