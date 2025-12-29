{{/*
Expand the name of the chart.
*/}}
{{- define "kafka-zookeeper.name" -}}
{{- default .Chart.Name .Values.name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "kafka-zookeeper.fullname" -}}
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
Common labels
*/}}
{{- define "kafka-zookeeper.labels" -}}
helm.sh/chart: {{ include "kafka-zookeeper.chart" . }}
{{ include "kafka-zookeeper.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Namespace
*/}}
{{- define "kafka-zookeeper.namespace" -}}
{{- .Values.namespace | default .Release.Namespace }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "kafka-zookeeper.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Image registry helper
Usage: {{ include "kafka-zookeeper.image" (dict "Values" .Values "image" "confluentinc/cp-zookeeper:8.1.0") }}
*/}}
{{- define "kafka-zookeeper.image" -}}
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
Selector labels
*/}}
{{- define "kafka-zookeeper.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kafka-zookeeper.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}