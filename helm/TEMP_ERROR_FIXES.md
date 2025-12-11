# Helm 차트 에러 수정 내역

## 수정된 문제들

### 1. 이미지 헬퍼 함수 수정
**문제**: `dict`로 전달된 `.Values` 접근이 복잡하고 에러 발생 가능
**해결**: `index` 함수를 사용하여 안전하게 접근하도록 수정

```yaml
# 수정 전
{{- $registry := .Values.global.dockerRegistry }}

# 수정 후
{{- $registry := index . "Values" "global" "dockerRegistry" | default "" }}
```

### 2. Secret 빈 값 처리
**문제**: Secret에 빈 값이 있으면 Kubernetes에서 에러 발생
**해결**: 값이 있을 때만 Secret 키를 생성하도록 조건부 처리

```yaml
# 수정 전
stringData:
  database-url: {{ .Values.secrets.databaseUrl | quote }}

# 수정 후
stringData:
  {{- if .Values.secrets.databaseUrl }}
  database-url: {{ .Values.secrets.databaseUrl | quote }}
  {{- end }}
```

### 3. Elasticsearch 헬스체크 인증 제거
**문제**: 헬스체크에 인증 헤더를 추가했지만 Secret 값 접근이 복잡함
**해결**: 헬스체크는 인증 없이 수행 (Elasticsearch 초기 설정 후 인증 활성화)

### 4. Kafka UI 환경변수 배열 처리
**문제**: `kafkaClusters.0.name` 형태로 접근하면 배열이 여러 개일 때 문제 발생
**해결**: `range`를 사용하여 동적으로 환경변수 생성

```yaml
# 수정 전
- name: KAFKA_CLUSTERS_0_NAME
  value: {{ .Values.kafkaUI.kafkaClusters.0.name | quote }}

# 수정 후
{{- range $index, $cluster := .Values.kafkaUI.kafkaClusters }}
- name: KAFKA_CLUSTERS_{{ $index }}_NAME
  value: {{ $cluster.name | quote }}
{{- end }}
```

### 5. Secret 참조 Optional 처리
**문제**: Secret 키가 없을 때 Pod 시작 실패
**해결**: 조건부로 환경변수 설정

```yaml
# 수정 전
- name: ELASTICSEARCH_USERNAME
  valueFrom:
    secretKeyRef:
      name: {{ include "mecipe-instance-a.fullname" . }}-secrets
      key: elasticsearch-username

# 수정 후
{{- if .Values.secrets.elasticsearchUsername }}
- name: ELASTICSEARCH_USERNAME
  valueFrom:
    secretKeyRef:
      name: {{ include "mecipe-instance-a.fullname" . }}-secrets
      key: elasticsearch-username
{{- end }}
```

## 검증 방법

```bash
# 차트 린트
helm lint ./helm/mecipe-instance-a
helm lint ./helm/mecipe-instance-b

# 템플릿 렌더링 테스트
helm template test ./helm/mecipe-instance-a --debug
helm template test ./helm/mecipe-instance-b --debug

# 실제 배포 전 Dry-run
helm install test ./helm/mecipe-instance-a --dry-run --debug
helm install test ./helm/mecipe-instance-b --dry-run --debug
```

## 남은 작업

1. **Kafka 및 KSQLDB 템플릿 추가**: 현재 values에만 정의되어 있음
2. **의존성 차트 설정**: Chart.yaml의 dependencies 섹션 확인 필요
3. **테스트 추가**: helm test를 위한 테스트 템플릿 추가

