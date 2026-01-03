# 페이지네이션 방식 비교

## 질문

2페이지부터 받고 싶다면 커서 기반 페이지네이션이 부적절한가요?

## 답변

**경우에 따라 다릅니다!** 

- ✅ **순차 접근만**: 커서 기반 적합
- ❌ **무작위 접근**: 오프셋 기반 또는 하이브리드 필요

---

## 각 방식의 특징

### 1️⃣ 커서 기반 (현재 구현)

```
┌─────────┬─────────┬─────────┬─────────┐
│ 페이지1 │ 페이지2 │ 페이지3 │ 페이지4 │
└─────────┴─────────┴─────────┴─────────┘
  ✅ 가능    ❌불가능  ❌불가능  ❌불가능
```

**특징:**
- ✅ 빠름 (인덱스 활용)
- ✅ 일관성 보장
- ❌ 순차 접근만 가능
- ❌ 특정 페이지로 바로 이동 불가

**사용 사례:**
- 무한 스크롤 (Instagram, Twitter)
- 실시간 피드
- 채팅 메시지
- 로그 조회

---

### 2️⃣ 오프셋 기반

```
┌─────────┬─────────┬─────────┬─────────┐
│ 페이지1 │ 페이지2 │ 페이지3 │ 페이지4 │
└─────────┴─────────┴─────────┴─────────┘
  ✅ 가능    ✅가능    ✅가능    ✅가능
```

**특징:**
- ✅ 어떤 페이지든 바로 이동
- ✅ 사용자 친화적 (1, 2, 3...)
- ❌ 느림 (OFFSET 클수록)
- ❌ 일관성 문제 (데이터 추가/삭제시)

**사용 사례:**
- 관리자 페이지
- 검색 결과
- 페이지 번호 있는 목록

---

### 3️⃣ 하이브리드 (권장)

둘 다 지원하는 방식입니다.

---

## 실제 시나리오별 선택

### 시나리오 1: 사용자가 URL에 페이지 번호를 입력

**예시:**
```
/admin/cafes?page=5
```

**요구사항:**
- 사용자가 URL에 page=5 입력
- 5번 페이지로 바로 이동

**적합한 방식:**
```typescript
// ❌ 커서 기반: 불가능
// 5페이지로 가려면 1,2,3,4를 거쳐야 함

// ✅ 오프셋 기반: 가능
SELECT * FROM cafe_info 
ORDER BY id ASC 
LIMIT 10 OFFSET 40  -- (5-1) * 10
```

---

### 시나리오 2: 관리자가 특정 카페 검토

**예시:**
```
관리자: "100번 카페는 몇 페이지에 있지?"
```

**적합한 방식:**
```typescript
// ❌ 커서: 100번 ID를 찾기 위해 처음부터 스캔 필요
// ✅ 오프셋: ID로 바로 조회
```

---

### 시나리오 3: 모바일 앱 무한 스크롤

**예시:**
```
사용자: "더 보기" 버튼 클릭
→ 다음 10개 자동 로드
```

**적합한 방식:**
```typescript
// ✅ 커서: 완벽함
after: "curor123"

// ❌ 오프셋: 괜찮지만 일관성 이슈 가능
OFFSET 10
```

---

## 해결 방안

### 방법 1: 하이브리드 구현 (권장)

두 방식 모두 지원합니다.

#### GraphQL Schema 확장

```typescript
// 기존: 커서 기반
@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { nullable: true })
  first?: number;

  @Field(() => String, { nullable: true })
  after?: string;
}

// 추가: 오프셋 기반
@ArgsType()
export class OffsetPaginationArgs {
  @Field(() => Int, { nullable: true })
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true })
  @Min(1)
  limit?: number;
}

// 또는 통합
@ArgsType()
export class UniversalPaginationArgs {
  // 커서 방식
  @Field(() => Int, { nullable: true })
  first?: number;

  @Field(() => String, { nullable: true })
  after?: string;

  // 오프셋 방식
  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => Int, { nullable: true })
  limit?: number;
}
```

#### Service 구현

```typescript
async findPaginatedCafeInfos(
  args: UniversalPaginationArgs
): Promise<Connection | Array<CafeInfo>> {
  // 오프셋 방식 우선
  if (args.page && args.limit) {
    return this.findWithOffset(args.page, args.limit);
  }
  
  // 커서 방식
  if (args.first) {
    return this.findWithCursor(args.first, args.after);
  }
  
  throw new Error('Pagination method not specified');
}

// 오프셋 방식
async findWithOffset(page: number, limit: number) {
  const skip = (page - 1) * limit;
  
  const [items, total] = await Promise.all([
    this.prisma.cafeInfo.findMany({
      skip,
      take: limit,
      orderBy: { id: 'asc' },
      include: { RegionCategory: true },
    }),
    this.prisma.cafeInfo.count(),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: skip + limit < total,
    hasPreviousPage: page > 1,
  };
}

// 커서 방식 (기존)
async findWithCursor(first: number, after?: string) {
  // 기존 구현 그대로
}
```

---

### 방법 2: 별도 쿼리 제공

커서용과 오프셋용을 분리합니다.

```typescript
@Resolver(() => CafeInfo)
export class PlacesResolver {
  // 커서 기반
  @Query(() => CafeInfoConnection, { name: 'findPaginatedCafeInfos' })
  async findPaginatedCafeInfos(
    @Args() paginationArgs: PaginationArgs,
  ) {
    return this.placesService.findPaginatedCafeInfos(paginationArgs);
  }

  // 오프셋 기반 (신규)
  @Query(() => OffsetCafeInfoConnection, { name: 'cafeInfosWithOffset' })
  async cafeInfosWithOffset(
    @Args() offsetArgs: OffsetPaginationArgs,
  ) {
    return this.placesService.findCafeInfosWithOffset(
      offsetArgs.page,
      offsetArgs.limit
    );
  }
}
```

**사용 예시:**

```graphql
# 커서 방식 (앱)
query {
  findPaginatedCafeInfos(first: 10, after: "cursor123") {
    edges { node { id name } }
  }
}

# 오프셋 방식 (관리자)
query {
  cafeInfosWithOffset(page: 5, limit: 10) {
    items { id name }
    totalPages
  }
}
```

---

### 방법 3: 커서로 특정 항목 찾기

커서 기반에서 특정 항목으로 바로 이동하는 트릭입니다.

**케이스: "이 ID부터 시작하고 싶어"**

```typescript
// 추가 헬퍼
async findCafeInfosFromId(
  startId: number,
  first: number
): Promise<CafeInfoConnectionType> {
  // 해당 ID의 커서 생성
  const cursor = Buffer.from(`id_${startId}`).toString('base64');
  
  // 기존 커서 방식 사용
  return this.findPaginatedCafeInfos({
    first,
    after: cursor
  });
}

// 또는 내부 처리
async findPaginatedCafeInfos(args: PaginationArgs & { startId?: number }) {
  const { first = 10, after, startId } = args;
  
  // startId가 있으면 그것을 커서로 사용
  const actualAfter = startId 
    ? Buffer.from(`id_${startId}`).toString('base64')
    : after;
  
  // 나머지는 기존 로직
  // ...
}
```

**사용:**
```graphql
query {
  findPaginatedCafeInfos(first: 10, startId: 100) {
    edges { node { id name } }
  }
}
```

**한계:**
- ID를 알 때만 가능
- 실제 "페이지 번호" 개념 없음

---

## 실전 예시

### GitHub의 하이브리드 접근

GitHub는 GraphQL에서 커서 기반을 쓰고, REST API에서 오프셋 기반을 제공합니다.

```
GraphQL API (커서):
  repositories(first: 10, after: "cursor123")

REST API (오프셋):
  GET /repositories?page=2&per_page=10
```

### Instagram의 접근

```
무한 스크롤: 커서 기반
  /api/feed?cursor=xyz

검색/탐색: 오프셋 기반
  /api/search?q=cat&offset=20
```

---

## 성능 비교

### 오프셋이 느린 이유

```sql
-- OFFSE T 작을 때: 빠름
SELECT * FROM items ORDER BY id LIMIT 10 OFFSET 100;
-- 인덱스 활용 가능

-- OFFSET 클 때: 느림
SELECT * FROM items ORDER BY id LIMIT 10 OFFSET 1000000;
-- 100만개 건너뛰는데 시간 오래 걸림
```

### 커서가 빠른 이유

```sql
-- 항상 빠름
SELECT * FROM items WHERE id > 123 ORDER BY id LIMIT 10;
-- 인덱스로 바로 찾음
```

**성능 차이:**
```
데이터: 100만개

오프셋 방식:
  OFFSET 100     → 10ms
  OFFSET 10000   → 100ms
  OFFSET 100000  → 1000ms
  
커서 방식:
  항상 → 10ms
```

---

## 권장 사항

### 프로젝트별 권장

| 프로젝트 | 권장 방식 | 이유 |
|---------|---------|------|
| 모바일 앱 | 커서 | 무한 스크롤, 성능 |
| 관리자 페이지 | 오프셋 | 페이지 번호 필요 |
| 검색 결과 | 오프셋 | 정확한 페이지 |
| 실시간 피드 | 커서 | 일관성 |
| 통계/리포트 | 오프셋 | 페이지 이동 |

### My Recommendation

**현재 프로젝트 (카페 정보):**

```typescript
// 1. 기본: 커서 기반 유지 (앱용)
@Query(() => CafeInfoConnection)
findPaginatedCafeInfos(args: PaginationArgs)

// 2. 추가: 관리자용 오프셋
@Query(() => OffsetCafeInfoConnection)
adminCafeInfos(page: Int!, limit: Int!)
```

**이유:**
- 앱 사용자는 무한 스크롤
- 관리자는 정확한 페이지 번호
- 역할에 따라 방식 분리

---

## 요약

### 2페이지부터 받고 싶다면?

**질문:** "커서 기반이 부적절한가요?"

**답변:**
1. **무작위 접근 필요** → 오프셋 필요
2. **순차 접근만** → 커서 적합
3. **둘 다** → 하이브리드 권장

**결론:** 커서 기반만으로는 충분하지 않다면, 오프셋 기반을 추가하거나 하이브리드로 가는 것을 권장합니다.

---

## 구현 예시

완전한 하이브리드 구현은 `HYBRID_PAGINATION_IMPLEMENTATION.md`를 참고하세요.



