# Prisma migrations 폴더 삭제 가이드

기존 Prisma 프로젝트를 새로운 DB와 연결하는 프로젝트로 분할할 때 `prisma/migrations` 폴더를 지워도 되는지에 대한 가이드입니다.

## 결론

**대부분의 경우 삭제하지 않는 것을 권장**하지만, 다음 조건을 **모두** 만족하는 경우에만 삭제할 수 있습니다:

1. ✅ **새로운 DB가 완전히 비어있음** (테이블이 전혀 없음)
2. ✅ **프로덕션 환경이 아님** (개발/테스트 환경)
3. ✅ **마이그레이션 히스토리가 필요 없음**
4. ✅ **완전히 새로운 시작을 원함**

## 상황별 가이드

### ✅ 삭제해도 되는 경우

#### 1. 완전히 새로운 DB로 시작 (개발 환경)

새로운 빈 DB에 연결하고 마이그레이션 히스토리를 새로 시작하고 싶은 경우:

```bash
# 1. migrations 폴더 삭제
rm -rf apps/place-api-service/prisma/migrations

# 2. DB의 _prisma_migrations 테이블도 확인 (비어있어야 함)
# 또는 DB가 완전히 비어있어야 함

# 3. 새로운 초기 마이그레이션 생성
cd apps/place-api-service
npx prisma migrate dev --name init
```

**주의사항:**
- DB에 `_prisma_migrations` 테이블이 있으면 먼저 확인하세요
- 프로덕션 환경에서는 절대 하지 마세요

#### 2. 기존 DB를 새로 시작

기존 DB를 완전히 초기화하고 새로 시작하는 경우:

```bash
# 1. DB 백업 (중요!)
pg_dump -U postgres -d mydb > backup_before_reset.sql

# 2. DB 초기화 (모든 테이블 삭제)
psql -U postgres -d mydb -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. migrations 폴더 삭제
rm -rf apps/place-api-service/prisma/migrations

# 4. 새로운 초기 마이그레이션 생성
npx prisma migrate dev --name init
```

### ❌ 삭제하면 안 되는 경우

#### 1. 기존 DB에 스키마가 이미 존재하는 경우

타겟 DB에 이미 테이블이 있거나 마이그레이션이 적용된 경우:

```bash
# 마이그레이션 폴더를 유지해야 함
# Prisma가 현재 DB 상태를 마이그레이션 히스토리와 비교하기 때문
```

**해결 방법:**
- 마이그레이션 폴더를 유지
- `prisma migrate resolve`를 사용하여 충돌 해결
- 또는 `prisma db pull`로 현재 스키마를 가져온 후 비교

#### 2. 프로덕션 환경

프로덕션 환경에서는 **절대 삭제하지 마세요**:

- 마이그레이션 히스토리는 롤백, 감사, 문제 추적에 필수
- `prisma migrate deploy`는 마이그레이션 히스토리에 의존함
- 삭제 시 데이터베이스 상태와 코드 불일치 가능

#### 3. 협업하는 팀이 있는 경우

다른 팀원들이 이미 마이그레이션 히스토리를 사용 중인 경우:

- 다른 팀원의 로컬 DB와 충돌 가능
- Git 히스토리 불일치 문제

## 권장 워크플로우

### 시나리오 1: 새로운 DB로 완전히 새로 시작 (권장)

```bash
# 1. 새 DB 생성
createdb new_service_db

# 2. DATABASE_URL 변경 (.env 또는 환경 변수)
export DATABASE_URL="postgresql://user:pass@localhost:5432/new_service_db"

# 3. 기존 migrations 폴더 확인
ls -la apps/place-api-service/prisma/migrations

# 4. 새 DB가 비어있는지 확인
psql $DATABASE_URL -c "\dt"

# 5. (선택) 기존 migrations 폴더 백업
cp -r apps/place-api-service/prisma/migrations apps/place-api-service/prisma/migrations.backup

# 6. migrations 폴더 삭제
rm -rf apps/place-api-service/prisma/migrations

# 7. 새 초기 마이그레이션 생성
cd apps/place-api-service
npx prisma migrate dev --name init

# 8. Prisma Client 생성
npx prisma generate
```

### 시나리오 2: 기존 DB와 연결 (마이그레이션 유지)

기존 DB에 스키마가 있는 경우:

```bash
# 1. DATABASE_URL 변경
export DATABASE_URL="postgresql://user:pass@localhost:5432/existing_db"

# 2. 현재 DB 상태 확인
npx prisma migrate status

# 3. 마이그레이션 폴더 유지 (삭제하지 않음)
# migrations 폴더를 그대로 두고 진행

# 4. 필요한 경우 마이그레이션 동기화
npx prisma migrate resolve --applied <migration_name>
# 또는
npx prisma migrate deploy
```

### 시나리오 3: 기존 DB 스키마를 기반으로 새 마이그레이션 시작

기존 DB의 스키마를 가져와서 새 마이그레이션 히스토리 시작:

```bash
# 1. 현재 DB 스키마를 Prisma schema로 가져오기
npx prisma db pull

# 2. schema.prisma 확인 및 수정
# 필요시 schema.prisma를 수정

# 3. migrations 폴더 백업
cp -r apps/place-api-service/prisma/migrations apps/place-api-service/prisma/migrations.backup

# 4. migrations 폴더 삭제
rm -rf apps/place-api-service/prisma/migrations

# 5. DB의 _prisma_migrations 테이블 초기화 (주의: 프로덕션 아님)
psql $DATABASE_URL -c "DROP TABLE IF EXISTS _prisma_migrations;"

# 6. 새 초기 마이그레이션 생성 (현재 스키마를 baseline으로)
npx prisma migrate dev --name init --create-only

# 7. 생성된 마이그레이션 파일 확인 (비어있을 수 있음)
cat apps/place-api-service/prisma/migrations/*/migration.sql

# 8. 마이그레이션을 "이미 적용됨"으로 표시 (baseline)
npx prisma migrate resolve --applied <생성된_마이그레이션_이름>

# 9. 이후 변경사항은 정상적으로 마이그레이션 생성
npx prisma migrate dev --name add_new_feature
```

## Prisma 마이그레이션 히스토리 이해

### `_prisma_migrations` 테이블

Prisma는 DB 내부에 `_prisma_migrations` 테이블을 생성하여 마이그레이션 히스토리를 추적합니다:

```sql
-- 마이그레이션 히스토리 확인
SELECT * FROM _prisma_migrations ORDER BY started_at;
```

### 마이그레이션 폴더와 DB의 관계

```
prisma/migrations/          ← 파일 시스템 (코드)
├── 20250708083137_init/
│   └── migration.sql
└── ...

_prisma_migrations 테이블   ← 데이터베이스 (실제 적용 기록)
├── migration_name
├── checksum
└── applied_at
```

**두 곳이 일치해야 정상 동작합니다.**

## 주의사항

### 1. Git 충돌

migrations 폴더를 삭제하면:
- Git에서 삭제된 파일로 표시됨
- 다른 브랜치와 merge 시 충돌 가능
- 팀원들의 로컬 환경에 영향

**해결 방법:**
```bash
# 커밋하기 전에 팀원들과 상의
git status
git add apps/place-api-service/prisma/migrations
git commit -m "chore: reset migrations for new DB connection"
```

### 2. 프로덕션 DB와 불일치

migrations 폴더를 삭제하고 새로 생성하면:
- 프로덕션 DB의 실제 스키마와 불일치 가능
- `prisma migrate deploy` 실패 가능

### 3. 롤백 불가능

마이그레이션 히스토리를 잃으면:
- 특정 시점으로 롤백 불가능
- 변경 이력 추적 불가

## 체크리스트

migrations 폴더를 삭제하기 전에 확인:

- [ ] 새로운 DB가 완전히 비어있는가?
- [ ] 프로덕션 환경이 아닌가?
- [ ] 팀원들과 상의했는가?
- [ ] 기존 DB를 백업했는가?
- [ ] Git 커밋 전에 확인했는가?
- [ ] 마이그레이션 히스토리가 정말 필요 없는가?

## 권장사항

**대부분의 경우 migrations 폴더를 삭제하지 않는 것을 권장합니다.**

대신 다음 방법을 고려하세요:

1. **새 서비스로 완전히 분리**: 완전히 새로운 DB와 새로운 migrations 폴더
2. **마이그레이션 유지**: 기존 마이그레이션 히스토리를 그대로 사용
3. **Baseline 설정**: 기존 스키마를 baseline으로 설정하고 새로운 마이그레이션 시작

## 참고 자료

- [Prisma Migrate Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Migrate Troubleshooting](https://www.prisma.io/docs/guides/migrate/troubleshooting-development)
- [Prisma Baseline Migrations](https://www.prisma.io/docs/guides/migrate/production-troubleshooting#baseline-your-production-environment)


