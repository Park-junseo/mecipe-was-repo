{{/*
Expand the name of the chart.
*/}}
{{- define "mecipe-instance-pre-a.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "mecipe-instance-pre-a.fullname" -}}
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
Create chart name and version as used by the chart label.
*/}}
{{- define "mecipe-instance-pre-a.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "mecipe-instance-pre-a.labels" -}}
helm.sh/chart: {{ include "mecipe-instance-pre-a.chart" . }}
{{ include "mecipe-instance-pre-a.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "mecipe-instance-pre-a.selectorLabels" -}}
app.kubernetes.io/name: {{ include "mecipe-instance-pre-a.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "mecipe-instance-pre-a.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "mecipe-instance-pre-a.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Image registry and repository
Usage: {{ include "mecipe-instance-pre-a.image" (dict "Values" .Values "repository" "image/repo" "tag" "tag") }}
*/}}
{{- define "mecipe-instance-pre-a.image" -}}
{{- $values := index . "Values" }}
{{- $registry := index $values "global" "dockerRegistry" | default "" }}
{{- $repository := index . "repository" }}
{{- $tag := index . "tag" }}
{{- if and $registry (ne $registry "") }}
{{- printf "%s/%s:%s" $registry $repository $tag }}
{{- else }}
{{- printf "%s:%s" $repository $tag }}
{{- end }}
{{- end }}

