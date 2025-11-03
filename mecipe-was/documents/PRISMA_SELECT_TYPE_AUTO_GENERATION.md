# Prisma Select 타입 자동 생성 가이드

## 문제 상황

현재 `grphql-prisma-parser.util.ts`에서 Prisma 모델의 Select 타입을 사용하기 위해 조건부 타입 매핑을 수동으로 관리하고 있습니다:

```typescript
type PrismaModelSelect<TModelName extends Prisma.ModelName> = 
  TModelName extends 'CafeInfo' ? Prisma.CafeInfoSelect :
  TModelName extends 'RegionCategory' ? Prisma.RegionCategorySelect :
  // ... 수동으로 모든 모델 추가 필요
```

**문제점:**
- Prisma 스키마에 새 모델 추가 시 수동 업데이트 필요
- 실수로 모델을 빠뜨릴 가능성
- 유지보수 부담

## 해결책

자동 생성 스크립트를 만들어서 Prisma 스키마 변경 시 자동으로 타입 매핑을 업데이트합니다.

---

## 자동 생성 스크립트 사용법

### 1. 스크립트 실행

```bash
# 직접 실행
npx ts-node scripts/generate-prisma-select-types.ts

# 또는 npm 스크립트 사용
npm run generate:select-types
```

### 2. Prisma Generate와 연동 (권장)

`package.json`에 다음 스크립트가 추가되어 있습니다:

```json
{
  "scripts": {
    "postgenerate": "npm run generate:select-types"
  }
}
```

이렇게 하면 `prisma generate` 실행 후 자동으로 Select 타입이 업데이트됩니다:

```bash
npx prisma generate
# → 자동으로 generate:select-types 실행됨
```

### 3. 마이그레이션과 함께 사용

```bash
# 마이그레이션 후
npx prisma migrate dev

# Prisma generate가 자동 실행되므로
# Select 타입도 자동으로 업데이트됨
```

---

## 생성되는 파일

스크립트는 다음 파일을 생성/업데이트합니다:

```
src/util/prisma/prisma-model-select-type.ts
```

**생성된 내용 예시:**

```typescript
/**
 * ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
 * 
 * 생성 명령: npx ts-node scripts/generate-prisma-select-types.ts
 */

import { Prisma } from 'prisma/basic';

/**
 * Prisma ModelName으로부터 해당 모델의 Select 타입을 추출하는 헬퍼 타입
 */
export type PrismaModelSelect<TModelName extends Prisma.ModelName> = 
  TModelName extends 'Board' ? Prisma.BoardSelect :
  TModelName extends 'BoardImage' ? Prisma.BoardImageSelect :
  TModelName extends 'BoardReply' ? Prisma.BoardReplySelect :
  TModelName extends 'CafeBoard' ? Prisma.CafeBoardSelect :
  TModelName extends 'CafeInfo' ? Prisma.CafeInfoSelect :
  // ... 모든 모델 자동 포함
  Record<string, any>;
```

---

## grphql-prisma-parser.util.ts 업데이트

생성된 타입을 사용하도록 파일을 업데이트합니다:

```typescript
// 기존 (수동 관리)
type PrismaModelSelect<TModelName extends Prisma.ModelName> = 
  TModelName extends 'CafeInfo' ? Prisma.CafeInfoSelect :
  // ... 수동 매핑

// 변경 후 (자동 생성된 타입 사용)
import { PrismaModelSelect } from './prisma-model-select-type';
```

---

## 워크플로우

### 정상적인 워크플로우

1. **Prisma 스키마 수정**
   ```prisma
   // prisma/schema.prisma
   model NewModel {
     id    Int    @id @default(autoincrement())
     name  String
   }
   ```

2. **마이그레이션 생성**
   ```bash
   npx prisma migrate dev --name add_new_model
   ```

3. **Prisma Client 생성 (자동)**
   - `prisma migrate dev`는 자동으로 `prisma generate` 실행
   - `postgenerate` 훅이 `generate:select-types` 실행
   - Select 타입 자동 업데이트 완료! ✅

### 수동 실행이 필요한 경우

마이그레이션 없이 스키마만 수정한 경우:

```bash
# 1. Prisma Client만 재생성
npx prisma generate

# 2. Select 타입도 업데이트 (자동 실행됨)

# 또는 수동 실행
npm run generate:select-types
```

---

## 주의사항

### ⚠️ 생성된 파일은 수정하지 마세요

`prisma-model-select-type.ts` 파일은 **자동 생성 파일**입니다.

- ✅ 수정 가능: `scripts/generate-prisma-select-types.ts` (생성 스크립트)
- ❌ 수정 금지: `src/util/prisma/prisma-model-select-type.ts` (생성된 파일)

### ⚠️ Git에 포함 여부

선택 사항:

**옵션 1: Git에 포함 (권장)**
```gitignore
# .gitignore에 추가하지 않음
# 팀원들이 일관된 타입 사용
```

**옵션 2: Git에 제외**
```gitignore
src/util/prisma/prisma-model-select-type.ts
```
- 각 개발자가 로컬에서 생성
- CI/CD 파이프라인에서 자동 생성 필요

---

## 문제 해결

### 스크립트 실행 오류

```bash
Error: Cannot find module 'ts-node'
```

**해결:**
```bash
npm install -D ts-node typescript
```

### Prisma 스키마 파일을 찾을 수 없음

**확인 사항:**
- `prisma/schema.prisma` 파일이 존재하는지 확인
- 프로젝트 루트에서 스크립트 실행

### 생성된 타입이 업데이트되지 않음

1. Prisma 스키마가 저장되었는지 확인
2. `npx prisma generate` 실행 확인
3. 수동으로 스크립트 실행:
   ```bash
   npm run generate:select-types
   ```

---

## 고급: 커스터마이징

스크립트를 커스터마이징하려면 `scripts/generate-prisma-select-types.ts` 파일을 수정합니다.

### 예시: 특정 모델 제외

```typescript
function extractModelNames(schemaPath: string): string[] {
  // ... 기존 코드
  const allModels = /* 추출된 모델들 */;
  
  // 특정 모델 제외
  return allModels.filter(model => 
    !['InternalModel', 'TempModel'].includes(model)
  );
}
```

### 예시: 다른 출력 형식

```typescript
function generateTypeMapping(models: string[]): string {
  // 다른 형식으로 생성 가능
  // 예: switch 문 형식, map 형식 등
}
```

---

## 한계점

### TypeScript의 근본적 한계

Prisma가 **완전히 동적인 타입 접근**을 제공하지 않는 이유:

1. **TypeScript의 구조적 한계**
   - 런타임 문자열(ModelName)을 타입으로 변환 불가
   - 조건부 타입 외에는 동적 타입 접근 불가

2. **Prisma의 설계**
   - Prisma는 각 모델에 대해 명시적인 타입을 생성
   - `Prisma.TypeMap` 같은 동적 접근은 제공하지 않음

3. **타입 안전성**
   - 명시적 타입이 컴파일 타임 체크 제공
   - 동적 접근은 타입 안전성 저하

### 현재 방법이 최선인 이유

✅ **타입 안전성**: 컴파일 타임에 모든 타입 체크  
✅ **자동화**: 스크립트로 유지보수 부담 감소  
✅ **명확성**: 코드에서 타입 관계 명확히 표현  

---

## 요약

| 항목 | 설명 |
|------|------|
| **자동 생성 스크립트** | `scripts/generate-prisma-select-types.ts` |
| **생성 파일** | `src/util/prisma/prisma-model-select-type.ts` |
| **자동 실행** | `prisma generate` 후 자동 실행 |
| **수동 실행** | `npm run generate:select-types` |
| **업데이트 필요 시** | Prisma 스키마 변경 후 |

**결론**: Prisma 자체에서 완전히 동적인 접근은 제공하지 않지만, 자동 생성 스크립트로 유지보수 부담을 크게 줄일 수 있습니다! 🎉

