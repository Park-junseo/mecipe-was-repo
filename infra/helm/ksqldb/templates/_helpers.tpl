{{/*
Expand the name of the chart.
*/}}
{{- define "ksqldb.name" -}}
{{- default .Chart.Name .Values.name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "ksqldb.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.name }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "ksqldb.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "ksqldb.labels" -}}
helm.sh/chart: {{ include "ksqldb.chart" . }}
{{ include "ksqldb.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "ksqldb.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ksqldb.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Image registry helper
Usage: {{ include "ksqldb.image" (dict "Values" .Values "image" "confluentinc/cp-ksqldb-server:8.1.0") }}
*/}}
{{- define "ksqldb.image" -}}
{{- $values := index . "Values" }}
{{- $registry := "" }}
{{- if $values.global }}
{{- $registry = $values.global.dockerRegistry | default "" }}
{{- end }}
{{- $image := index . "image" }}
{{- if and $registry (ne $registry "") }}
{{- printf "%s/%s" $registry $image }}
{{- else }}
{{- $image }}
{{- end }}
{{- end }}

{{/*
Namespace
*/}}
{{- define "ksqldb.namespace" -}}
{{- .Values.namespace | default .Release.Namespace }}
{{- end }}

{{/*
Kafka bootstrap endpoint
*/}}
{{- define "ksqldb.kafkaBootstrapEndpoint" -}}
{{- if .Values.dependencies.kafka.bootstrapEndpoint }}
{{- .Values.dependencies.kafka.bootstrapEndpoint }}
{{- else if and .Values.dependencies.kafka.name .Values.dependencies.kafka.namespace }}
{{- printf "%s.%s.svc.cluster.local:9071" .Values.dependencies.kafka.name .Values.dependencies.kafka.namespace }}
{{- else }}
{{- printf "kafka.%s.svc.cluster.local:9071" (include "ksqldb.namespace" .) }}
{{- end }}
{{- end }}


