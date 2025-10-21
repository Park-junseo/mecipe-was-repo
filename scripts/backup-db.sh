#!/bin/bash

# 데이터베이스 백업 스크립트

set -e

# 환경 변수 로드
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
else
    echo "Error: .env file not found!"
    exit 1
fi

# 백업 디렉토리 생성
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# 백업 파일명 (날짜 포함)
BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Starting database backup..."
echo "Backup file: $BACKUP_FILE"

# PostgreSQL 백업 실행
docker compose exec -T db pg_dump \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  --clean --if-exists > $BACKUP_FILE

# 백업 파일 압축
gzip $BACKUP_FILE

echo "Database backup completed: ${BACKUP_FILE}.gz"

# 오래된 백업 파일 삭제 (30일 이상)
find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +30 -delete

echo "Old backups cleaned up (older than 30 days)"

