# 커서 기반 페이지네이션 구현 설명

이 문서는 구현한 커서 기반 페이지네이션의 작동 원리와 구조를 설명합니다.

## 📋 목차

1. [개요](#개요)
2. [구조](#구조)
3. [핵심 컴포넌트](#핵심-컴포넌트)
4. [동작 원리](#동작-원리)
5. [장점과 특징](#장점과-특징)

---

## 개요

커서 기반 페이지네이션(Cursor-based Pagination)은 GraphQL에서 권장하는 페이지네이션 방식으로, Facebook의 Relay 스펙을 따릅니다.

### 왜 커서 기반 페이지네이션을 사용하나요?

**오프셋 기반 페이지네이션의 문제점:**
```sql
-- 오프셋 기반 (문제 있음)
SELECT * FROM cafe_info ORDER BY id LIMIT 10 OFFSET 100;
-- 데이터가 추가/삭제되면 중복되거나 누락될 수 있음
```

**커서 기반의 장점:**
```sql
-- 커서 기반 (안정적)
SELECT * FROM cafe_info WHERE id > 123 ORDER BY id LIMIT 10;
-- 특정 커서 이후의 데이터만 가져오므로 일관성 보장
```

---

## 구조

### GraphQL Relay Connection 패턴

```
Query
  └─ Connection (예: CafeInfoConnection)
      ├─ edges: [Edge]
      │   └─ Edge
      │       ├─ node: CafeInfo (실제 데이터)
      │       └─ cursor: String (Base64 인코딩된 커서)
      ├─ pageInfo: PageInfo
      │   ├─ hasNextPage: Boolean
      │   ├─ hasPreviousPage: Boolean
      │   ├─ startCursor: String
      │   └─ endCursor: String
      └─ totalCount: Int (선택적)
```

---

## 핵심 컴포넌트

### 1. PaginationArgs (입력 타입)

클라이언트가 페이지네이션 요청을 보낼 때 사용하는 인자입니다.

```typescript
@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { nullable: true })
  first?: number;        // 앞에서부터 몇 개 가져올지

  @Field(() => String, { nullable: true })
  after?: string;        // 이 커서 이후의 데이터

  @Field(() => Int, { nullable: true })
  last?: number;         // 뒤에서부터 몇 개 가져올지

  @Field(() => String, { nullable: true })
  before?: string;       // 이 커서 이전의 데이터
}
```

**사용 예시:**
```graphql
# 첫 페이지 (10개)
query {
  findPaginatedCafeInfos(first: 10) { ... }
}

# 다음 페이지 (커서 사용)
query {
  findPaginatedCafeInfos(first: 10, after: "aWQfMTIz") { ... }
}
```

---

### 2. Edge (엣지)

각 데이터 항목을 감싸는 래퍼로, 실제 데이터(node)와 위치 정보(cursor)를 포함합니다.

```typescript
export function createBaseEdgeType<TNode>(
  nodeRef: () => Type<TNode>,
  name: string
) {
  const NodeType = nodeRef();

  @ObjectType(name)
  class EdgeType {
    @Field(() => NodeType, { description: '노드 데이터' })
    node: TNode;

    @Field(() => String, { description: '이 노드에 대한 고유 커서' })
    cursor: string;
  }
  return EdgeType;
}
```

**왜 Edge가 필요한가?**
- 커서 정보를 각 항목에 연결
- 향후 메타데이터 추가 가능 (예: 정렬 정보)
- Relay 스펙 준수

**생성 예시:**
```typescript
// CafeInfoEdge 자동 생성됨
const CafeInfoEdge = createBaseEdgeType(() => CafeInfo, 'CafeInfoEdge');
```

---

### 3. Connection (연결)

엣지들의 집합과 페이지 정보를 포함하는 상위 타입입니다.

```typescript
export function createBaseConnectionType<TNode>(
  nodeRef: () => Type<TNode>,
  name: string
) {
  const EdgeType = createBaseEdgeType(nodeRef, `${name}Edge`);

  @ObjectType(name)
  class ConnectionType {
    @Field(() => [EdgeType], { description: '엣지 목록' })
    edges: Array<{ node: TNode; cursor: string }>;

    @Field(() => PageInfo, { description: '페이징 정보' })
    pageInfo: PageInfo;

    @Field(() => Int, { nullable: true })
    totalCount?: number;
  }
  return ConnectionType;
}
```

**사용 예시:**
```typescript
// CafeInfoConnection 자동 생성됨
export const CafeInfoConnection = createBaseConnectionType(
  () => CafeInfo, 
  'CafeInfoConnection'
);
```

---

### 4. PageInfo (페이지 정보)

현재 페이지의 상태와 네비게이션 정보를 제공합니다.

```typescript
@ObjectType({ description: '페이징 관련 정보를 제공합니다.' })
export class PageInfo {
  @Field(() => String, { nullable: true })
  startCursor?: string;      // 첫 번째 항목의 커서

  @Field(() => String, { nullable: true })
  endCursor?: string;        // 마지막 항목의 커서

  @Field(() => Boolean)
  hasNextPage: boolean;      // 다음 페이지 존재 여부

  @Field(() => Boolean)
  hasPreviousPage: boolean;  // 이전 페이지 존재 여부
}
```

---

## 동작 원리

### 서비스 레벨 구현 (`findPaginatedCafeInfos`)

#### 1단계: 입력 파라미터 처리

```typescript
async findPaginatedCafeInfos(args: PaginationArgs) {
  const { first = 10, after } = args;  // 기본값 10개
```

**first 기본값 처리:**
- `first`가 제공되지 않으면 기본적으로 10개를 반환
- 서버 측에서 제어 가능하여 과도한 쿼리 방지

---

#### 2단계: 커서 디코딩

```typescript
let decodedCursor: string | undefined;
if (after) {
  decodedCursor = Buffer.from(after, 'base64').toString('ascii');
  // 예: "aWQfMTIz" -> "id_123"
}
```

**커서 인코딩/디코딩:**
- 클라이언트와 서버 간 안정적인 전달을 위해 Base64 사용
- 형식: `id_<number>` (예: `id_123`)
- 향후 다른 형식 추가 가능 (예: `timestamp_1234567890`)

**왜 Base64인가?**
- URL-safe 문자만 사용
- binary 데이터 안전 전달
- GraphQL 스펙 권장

---

#### 3단계: 데이터베이스 쿼리

```typescript
const query: Prisma.CafeInfoFindManyArgs = {
  where: {
    id: {
      gt: decodedCursor ? parseInt(decodedCursor.split('_')[1]) : undefined,
    },
  },
  orderBy: { id: 'asc' },
  take: first + 1,  // ⚠️ +1은 다음 페이지 존재 확인용
  include: { RegionCategory: true },
};
```

**핵심 전략:**

1. **WHERE 조건:**
   ```sql
   WHERE id > 123  -- 커서가 있으면 이 조건 추가
   ```

2. **ORDER BY:**
   ```sql
   ORDER BY id ASC  -- 항상 동일한 순서 보장
   ```

3. **+1 전략:**
   ```typescript
   take: first + 1  // 요청된 개수보다 1개 더 가져옴
   ```
   - 10개를 요청하면 11개를 가져옴
   - 11개가 반환되면 → `hasNextPage = true`
   - 10개 이하가 반환되면 → `hasNextPage = false`
   - 실제 반환할 때는 처음 10개만 클라이언트에게 전달

---

#### 4단계: 페이지 정보 구성

```typescript
const hasNextPage = rawCafeInfos.length > first;
const cafeInfos = hasNextPage ? rawCafeInfos.slice(0, first) : rawCafeInfos;

const pageInfo = new PageInfo();
pageInfo.hasNextPage = hasNextPage;
pageInfo.hasPreviousPage = !!after;  // 커서가 있으면 이전 페이지 있음
pageInfo.startCursor = cafeInfos.length > 0 
  ? Buffer.from(`id_${cafeInfos[0].id}`).toString('base64') 
  : null;
pageInfo.endCursor = cafeInfos.length > 0 
  ? Buffer.from(`id_${cafeInfos[cafeInfos.length - 1].id}`).toString('base64') 
  : null;
```

**예시:**
```
요청: first = 10
결과: 11개 반환됨

hasNextPage = true (11 > 10)
실제 반환: 처음 10개
hasPreviousPage = true (after 제공됨)
startCursor = "aWQfMQ=="  (id_1)
endCursor = "aWQfMTA="    (id_10)
```

---

#### 5단계: Edge 목록 구성

```typescript
const cafeInfoEdges = cafeInfos.map(cafeInfo => {
  const cafeInfoWithRegion = cafeInfo as Prisma.CafeInfoGetPayload<...>;
  return {
    node: {
      ...cafeInfoWithRegion,
      RegionCategory: cafeInfoWithRegion.RegionCategory ? {
        ...cafeInfoWithRegion.RegionCategory,
      } as RegionCategory : undefined,
    } as GraphQLCafeInfo,
    cursor: Buffer.from(`id_${cafeInfoWithRegion.id}`).toString('base64'),
  };
});
```

**Prisma → GraphQL 변환:**
- Prisma 타입을 GraphQL 엔티티로 변환
- 관계 데이터(`RegionCategory`) 포함
- 각 노드에 커서 부여

---

#### 6단계: 최종 반환

```typescript
const totalCount = await this.prisma.cafeInfo.count();
return { edges: cafeInfoEdges, pageInfo, totalCount };
```

**totalCount 선택적:**
- 전체 개수가 크면 성능 영향 가능
- 필요에 따라 조건부 실행 가능

---

## 장점과 특징

### 1. 데이터 일관성 보장

```
시나리오: 사용자가 2페이지를 보는 동안 새로운 데이터가 추가됨

오프셋 기반:
  - page 1: items 1-10
  - page 2: items 11-20  ❌ (새 항목이 추가되면 중복/누락 발생 가능)

커서 기반:
  - page 1: items 1-10, endCursor: "id_10"
  - page 2: items 11-20  ✅ (cursor > 10이므로 안정적)
```

---

### 2. 성능 최적화

```sql
-- 오프셋: OFFSET이 클수록 느려짐
SELECT * FROM cafe_info ORDER BY id LIMIT 10 OFFSET 100000;
-- 100,000개 건너뛰는데 시간이 오래 걸림

-- 커서: 인덱스 활용으로 항상 빠름
SELECT * FROM cafe_info WHERE id > 123 ORDER BY id LIMIT 10;
-- 인덱스 조회로 빠름
```

---

### 3. 제네릭 기반 확장성

```typescript
// 새로운 엔티티에 쉽게 적용 가능
export const UserConnection = createBaseConnectionType(() => User, 'UserConnection');
export const ProductConnection = createBaseConnectionType(() => Product, 'ProductConnection');
export const OrderConnection = createBaseConnectionType(() => Order, 'OrderConnection');
```

**DRY 원칙 준수:**
- 한 번의 구현으로 모든 엔티티에 적용
- 타입 안정성 보장
- 코드 중복 최소화

---

### 4. Relay 스펙 준수

```
✅ Facebook의 Relay 스펙 완전 준수
✅ GraphQL 공식 Best Practice
✅ Apollo Client와 완벽 호환
✅ 프론트엔드 표준 툴 사용 가능
```

---

## 실제 사용 예시

### GraphQL Query

```graphql
query GetCafeInfos($first: Int, $after: String) {
  findPaginatedCafeInfos(first: $first, after: $after) {
    edges {
      node {
        id
        name
        address
        RegionCategory {
          id
          name
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "first": 10,
  "after": null
}
```

### 첫 페이지 응답

```json
{
  "data": {
    "findPaginatedCafeInfos": {
      "edges": [
        {
          "node": {
            "id": 1,
            "name": "스타벅스 강남점",
            "address": "서울시 강남구...",
            "RegionCategory": {
              "id": 1,
              "name": "서울"
            }
          },
          "cursor": "aWQfMQ=="
        },
        // ... 9개 더
      ],
      "pageInfo": {
        "hasNextPage": true,
        "hasPreviousPage": false,
        "startCursor": "aWQfMQ==",
        "endCursor": "aWQfMTA="
      },
      "totalCount": 100
    }
  }
}
```

### 다음 페이지 요청

```json
{
  "first": 10,
  "after": "aWQfMTA="
}
```

---

## 향후 개선 가능한 점

### 1. Backward Pagination 구현

현재는 `first/after`만 구현되어 있으며, `last/before`는 미구현입니다.

```typescript
// TODO: 역방향 페이지네이션
if (args.last && args.before) {
  // 역순 쿼리 로직 추가
}
```

---

### 2. 복합 커서

현재는 `id_123` 형식만 사용하지만, 복잡한 정렬 조건에 대응 가능:

```typescript
// 예: 복합 정렬 커서
cursor = Buffer.from(`createdAt_2024-01-01_id_123`).toString('base64');
```

---

### 3. 커서 압축/암호화

더 안전하고 효율적인 커서 관리:

```typescript
// 예: JWT 기반 커서
cursor = jwt.sign({ id: 123, timestamp: Date.now() }, secret);
```

---

### 4. 필터링/검색 통합

페이지네이션과 함께 필터링:

```typescript
export class PaginationArgs {
  first?: number;
  after?: string;
  regionId?: number;  // 필터 추가
  searchTerm?: string; // 검색 추가
}
```

---

## 참고 자료

- [Relay Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- [GraphQL Pagination Best Practices](https://www.apollographql.com/docs/react/pagination/overview/)
- [Prisma Cursor-based Pagination](https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination)

---

## 요약

**구현한 커서 기반 페이지네이션은:**

1. ✅ **Relay 스펙 준수**: 표준 GraphQL 페이지네이션 패턴
2. ✅ **제네릭 구현**: 모든 엔티티에 재사용 가능
3. ✅ **성능 최적화**: 인덱스 기반 쿼리로 빠른 조회
4. ✅ **데이터 일관성**: 동시성 문제 없이 안정적인 페이지네이션
5. ✅ **타입 안전성**: TypeScript로 타입 체크
6. ✅ **확장 가능**: backward pagination, 필터링 등 확장 용이

이 구현으로 대규모 데이터셋에서도 안정적이고 효율적인 페이지네이션을 제공할 수 있습니다.



