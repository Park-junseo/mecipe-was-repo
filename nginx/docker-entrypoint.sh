#!/bin/sh
set -e

# 환경 변수 기본값 설정
export DOMAIN_NAME=${DOMAIN_NAME:-localhost}
export APP_PORT=${APP_PORT:-4000}
export SOCKET_PORT=${SOCKET_PORT:-4100}

echo "Configuring Nginx..."
echo "  Domain: $DOMAIN_NAME"
echo "  App Port: $APP_PORT"
echo "  Socket Port: $SOCKET_PORT"

# envsubst를 사용하여 템플릿에서 실제 설정 파일 생성
envsubst '${DOMAIN_NAME} ${APP_PORT} ${SOCKET_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Nginx 설정 테스트
nginx -t

# Nginx 시작 (원래 CMD 실행)
exec "$@"

