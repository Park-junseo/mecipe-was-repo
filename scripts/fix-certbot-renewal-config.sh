#!/bin/bash

# Certbot 갱신 설정을 webroot 모드로 수정하는 스크립트
# 한 번만 실행하면 됩니다.

set -e

DOMAIN_NAME="${1:-api.mecipe.com}"

echo "=========================================="
echo "Certbot 갱신 설정을 webroot 모드로 수정"
echo "도메인: $DOMAIN_NAME"
echo "=========================================="
echo ""

# 갱신 설정 파일 확인
RENEWAL_CONFIG="/etc/letsencrypt/renewal/${DOMAIN_NAME}.conf"

echo "1. 현재 갱신 설정 확인..."
docker run --rm \
  -v mecipe-certbot-conf:/etc/letsencrypt \
  alpine cat "$RENEWAL_CONFIG" 2>/dev/null || {
    echo "❌ 갱신 설정 파일을 찾을 수 없습니다: $RENEWAL_CONFIG"
    exit 1
  }

echo ""
echo "2. 갱신 설정을 webroot 모드로 수정..."

# 설정 파일 수정
docker run --rm \
  -v mecipe-certbot-conf:/etc/letsencrypt \
  alpine sh -c "
    # authenticator를 webroot로 변경
    sed -i 's/authenticator = standalone/authenticator = webroot/' $RENEWAL_CONFIG
    
    # webroot_path가 없으면 추가
    if ! grep -q 'webroot_path' $RENEWAL_CONFIG; then
      echo 'webroot_path = /var/www/certbot' >> $RENEWAL_CONFIG
    else
      # 기존 webroot_path를 업데이트
      sed -i 's|webroot_path = .*|webroot_path = /var/www/certbot|' $RENEWAL_CONFIG
    fi
    
    echo '✅ 갱신 설정 수정 완료'
    echo ''
    echo '수정된 설정:'
    grep -E 'authenticator|webroot_path' $RENEWAL_CONFIG || true
  "

echo ""
echo "3. 수정된 설정 확인..."
docker run --rm \
  -v mecipe-certbot-conf:/etc/letsencrypt \
  alpine sh -c "
    echo '갱신 설정 파일 내용:'
    echo '----------------------------------------'
    cat $RENEWAL_CONFIG | grep -E 'authenticator|webroot_path|domains' || cat $RENEWAL_CONFIG
  "

echo ""
echo "=========================================="
echo "✅ 설정 수정 완료!"
echo ""
echo "이제 certbot renew 명령어가 자동으로 webroot 모드를 사용합니다."
echo ""
echo "테스트:"
echo "  docker compose -f docker-compose.minimal.instance-a.yml run --rm certbot renew --dry-run"
echo "=========================================="
