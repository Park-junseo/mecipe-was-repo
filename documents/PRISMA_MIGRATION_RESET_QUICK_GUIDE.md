# Prisma Migrations 폴더 리셋 빠른 가이드

## ⚠️ 주의사항

**프로덕션 환경에서는 절대 하지 마세요!**

## 시나리오별 빠른 참조

### ✅ 완전히 새로운 DB로 시작 (개발 환경)

```bash
# 1. 새 DB가 비어있는지 확인
psql $DATABASE_URL -c "\dt"
# 결과가 비어있어야 함

# 2. migrations 폴더 삭제
rm -rf apps/place-api-service/prisma/migrations

# 3. 새 초기 마이그레이션 생성
cd apps/place-api-service
npx prisma migrate dev --name init

# 4. Prisma Client 생성
npx prisma generate
```

### ✅ 기존 DB를 새로 시작 (모든 데이터 삭제)

```bash
# 1. 백업 (중요!)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. DB 완전 초기화
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. migrations 폴더 삭제
rm -rf apps/place-api-service/prisma/migrations

# 4. 새 초기 마이그레이션 생성
cd apps/place-api-service
npx prisma migrate dev --name init
```

### ✅ 기존 DB 스키마를 baseline으로 설정

기존 DB는 유지하되 마이그레이션 히스토리는 새로 시작:

```bash
# 1. 현재 스키마를 schema.prisma로 가져오기
cd apps/place-api-service
npx prisma db pull

# 2. migrations 폴더 백업
cp -r prisma/migrations prisma/migrations.backup

# 3. migrations 폴더 삭제
rm -rf prisma/migrations

# 4. DB의 _prisma_migrations 테이블 삭제
psql $DATABASE_URL -c "DROP TABLE IF EXISTS _prisma_migrations;"

# 5. 초기 마이그레이션 생성 (비어있을 수 있음)
npx prisma migrate dev --name init --create-only

# 6. 생성된 마이그레이션을 "이미 적용됨"으로 표시
MIGRATION_NAME=$(ls -t prisma/migrations | head -1)
npx prisma migrate resolve --applied $MIGRATION_NAME

# 7. 확인
npx prisma migrate status
# "Database schema is up to date!" 메시지 확인
```

### ❌ 기존 DB와 연결 (migrations 유지) - 권장

가장 안전한 방법:

```bash
# 1. DATABASE_URL 변경
export DATABASE_URL="postgresql://user:pass@host:5432/new_db"

# 2. 마이그레이션 상태 확인
cd apps/place-api-service
npx prisma migrate status

# 3. 필요한 마이그레이션 적용
npx prisma migrate deploy

# migrations 폴더는 그대로 유지!
```

## 체크리스트

삭제하기 전에:
- [ ] 프로덕션이 아님
- [ ] DB가 비어있거나 초기화 가능
- [ ] 팀원들과 상의함
- [ ] 백업 완료
- [ ] Git 커밋 전 확인

## 자주 묻는 질문

### Q: 프로덕션에서 실수로 삭제했다면?

A: Git에서 복구:
```bash
git checkout HEAD -- apps/place-api-service/prisma/migrations
```

### Q: migrations 폴더와 DB의 _prisma_migrations가 불일치하면?

A: `prisma migrate resolve`로 해결하거나, migrations 폴더를 삭제하고 `prisma db pull` + 새 마이그레이션 생성

### Q: 팀원과 마이그레이션 충돌이 생기면?

A: migrations 폴더는 삭제하지 말고, Git merge 충돌을 해결하세요.

