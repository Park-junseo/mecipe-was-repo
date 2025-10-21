#!/bin/bash

# 수동 배포 스크립트
# GitHub Actions 없이 수동으로 배포할 때 사용합니다.

set -e

echo "======================================"
echo "Starting deployment process..."
echo "======================================"

# 환경 변수 로드
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
else
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Git 최신 코드 가져오기
echo "Pulling latest code from git..."
git pull origin main

# Docker 이미지 빌드
echo "Building Docker images..."
docker compose build

# 기존 컨테이너 중지 및 제거
echo "Stopping existing containers..."
docker compose down

# 새 컨테이너 시작
echo "Starting new containers..."
docker compose up -d

# 헬스체크 대기
echo "Waiting for services to be healthy..."
sleep 30

# 서비스 상태 확인
echo "Checking service status..."
docker compose ps

# 로그 출력
echo "======================================"
echo "Recent logs:"
echo "======================================"
docker compose logs --tail=50

# 최종 상태 확인
if docker compose ps | grep -q "Up"; then
    echo "======================================"
    echo "Deployment successful!"
    echo "======================================"
else
    echo "======================================"
    echo "Deployment failed! Check logs above."
    echo "======================================"
    exit 1
fi

