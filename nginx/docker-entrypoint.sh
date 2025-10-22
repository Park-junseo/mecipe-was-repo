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

# SSL 인증서 확인
if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
    echo "  SSL Certificate: Found ✓"
    echo "  Using HTTPS configuration"
    # HTTPS 설정 사용
    envsubst '${DOMAIN_NAME} ${APP_PORT} ${SOCKET_PORT}' \
        < /etc/nginx/conf.d/default.conf.template \
        > /etc/nginx/conf.d/default.conf
else
    echo "  SSL Certificate: Not found"
    echo "  Using HTTP-only configuration"
    echo "  Run './scripts/init-ssl.sh' to enable HTTPS"
    # HTTP만 사용
    envsubst '${DOMAIN_NAME} ${APP_PORT} ${SOCKET_PORT}' \
        < /etc/nginx/conf.d/default-http-only.conf.template \
        > /etc/nginx/conf.d/default.conf
fi

# Nginx 설정 테스트
nginx -t

# Nginx 시작 (원래 CMD 실행)
exec "$@"

