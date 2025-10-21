#!/bin/bash

# SSL 인증서 초기 설정 스크립트
# Let's Encrypt 인증서를 최초로 발급받을 때 사용합니다.

set -e

# 환경 변수 로드
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
else
    echo "Error: .env file not found!"
    exit 1
fi

# 필수 변수 확인
if [ -z "$DOMAIN_NAME" ] || [ -z "$SSL_EMAIL" ]; then
    echo "Error: DOMAIN_NAME and SSL_EMAIL must be set in .env file"
    exit 1
fi

echo "Initializing SSL certificate for domain: $DOMAIN_NAME"
echo "Email: $SSL_EMAIL"

# certbot 디렉토리 생성
mkdir -p certbot/conf
mkdir -p certbot/www

# 임시 자체 서명 인증서 생성 (최초 nginx 시작을 위해)
echo "Creating temporary self-signed certificate..."
docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
    -keyout '/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem' \
    -out '/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem' \
    -subj '/CN=localhost'" certbot

# Docker Compose 서비스 시작 (환경 변수가 자동으로 적용됨)
echo "Starting services..."
docker compose up -d nginx

# Let's Encrypt 인증서 발급
echo "Requesting Let's Encrypt certificate..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email $SSL_EMAIL \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d $DOMAIN_NAME \
  -d www.$DOMAIN_NAME

# Nginx 재시작
echo "Reloading nginx with new certificate..."
docker compose restart nginx

echo "SSL certificate has been successfully installed!"
echo "Your site should now be accessible via HTTPS"

