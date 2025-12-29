{{/*
Common helper templates for postgres-connection chart
*/}}

{{/*
Expand the name of the chart.
*/}}
{{- define "postgres-connection.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "postgres-connection.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
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
{{- define "postgres-connection.labels" -}}
helm.sh/chart: {{ include "postgres-connection.name" . }}-{{ .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{ include "postgres-connection.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "postgres-connection.selectorLabels" -}}
app.kubernetes.io/name: {{ include "postgres-connection.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

