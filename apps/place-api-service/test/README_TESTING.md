*커서AI 생성 테스팅 가이드 참고용용*

# 테스트 가이드

## 테스트 철학

이 프로젝트는 **실용적인 테스트 전략**을 따릅니다:

### ✅ 작성하는 테스트

1. **E2E 테스트** (주로 사용)
   - 실제 API 엔드포인트 동작 검증
   - 전체 플로우 테스트
   - `test/app.e2e-spec.ts` 참고

2. **복잡한 비즈니스 로직 단위 테스트**
   - 복잡한 계산 로직
   - 인증/인가 로직
   - 복잡한 데이터 변환
   - 예시: `src/users/users.service.spec.ts`

### ❌ 작성하지 않는 테스트

1. 단순 CRUD 컨트롤러 테스트
2. 단순 Getter/Setter 테스트
3. "should be defined" 같은 의미 없는 테스트
4. 프레임워크 자체를 테스트하는 것

## 테스트 실행

```bash
# 단위 테스트 (있는 경우만)
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov

# Watch 모드
npm run test:watch
```

## 새로운 테스트 작성 가이드

### 1. E2E 테스트 추가

`test/app.e2e-spec.ts`에 새로운 describe 블록 추가:

```typescript
describe('Users API', () => {
  it('POST /users - should create user', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'test@example.com',
        name: 'Test User'
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@example.com');
  });

  it('GET /users/:id - should get user', async () => {
    // 테스트 작성
  });
});
```

### 2. 복잡한 로직 단위 테스트

정말 필요한 경우에만 `*.service.spec.ts` 생성:

```typescript
describe('ComplexCalculationService', () => {
  describe('calculateDiscount', () => {
    it('should apply 20% discount for VIP users', () => {
      // 실제 복잡한 비즈니스 로직 테스트
    });

    it('should apply cumulative discounts correctly', () => {
      // 실제 복잡한 비즈니스 로직 테스트
    });
  });
});
```

## 테스트 구조

```
project/
├── src/
│   └── users/
│       ├── users.service.ts
│       └── users.service.spec.ts    # 복잡한 로직만
├── test/
│   ├── app.e2e-spec.ts              # 주요 E2E 테스트
│   └── jest-e2e.json
└── package.json
```

## 기억하세요!

> **"테스트는 가치를 제공해야 합니다"**

- ✅ 버그를 잡는 테스트를 작성하세요
- ✅ 리팩토링을 안전하게 만드는 테스트를 작성하세요
- ❌ 커버리지 숫자만 채우는 테스트는 작성하지 마세요
- ❌ 유지보수 비용이 더 큰 테스트는 작성하지 마세요

