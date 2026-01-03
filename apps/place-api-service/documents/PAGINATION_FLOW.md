# 페이지네이션 흐름 설명

## 질문

클라이언트에서 한 페이지에 10개씩 가져온다면, 1번 페이지, 2번 페이지, 3번 페이지 이렇게 요청할 수 있나요?

## 답변

✅ **네, 가능합니다!** 바로 그렇게 동작합니다.

---

## 전체 흐름 예시

가정: 전체 카페 데이터가 30개 (ID: 1~30) 있다고 가정

### 📄 페이지 1 요청

**GraphQL Query:**
```graphql
query {
  findPaginatedCafeInfos(first: 10) {
    edges {
      node {
        id
        name
        address
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**서버 처리:**
```typescript
// 1. 입력 파라미터
first = 10
after = undefined  // 첫 페이지이므로 커서 없음

// 2. 쿼리
WHERE id > undefined  // (조건 없음)
ORDER BY id ASC
LIMIT 11  // 10 + 1

// 3. 결과
rawCafeInfos = [id:1, id:2, ..., id:11]  // 11개 반환됨

// 4. 페이지네이션 처리
hasNextPage = (11 > 10) = true  ✅ 다음 페이지 있음
cafeInfos = [id:1, ..., id:10]  // 11개 중 10개만 반환

// 5. 커서 생성
startCursor = "id_1"   → Base64 → "aWQfMQ=="
endCursor = "id_10"    → Base64 → "aWQfMTA="
```

**응답:**
```json
{
  "data": {
    "findPaginatedCafeInfos": {
      "edges": [
        { "node": { "id": 1, "name": "카페1" }, "cursor": "aWQfMQ==" },
        { "node": { "id": 2, "name": "카페2" }, "cursor": "aWQfMg==" },
        ...
        { "node": { "id": 10, "name": "카페10" }, "cursor": "aWQfMTA=" }
      ],
      "pageInfo": {
        "hasNextPage": true,
        "endCursor": "aWQfMTA="
      },
      "totalCount": 30
    }
  }
}
```

**클라이언트가 저장:**
- `endCursor` = `"aWQfMTA="` (다음 페이지 요청에 사용)

---

### 📄 페이지 2 요청

**GraphQL Query:**
```graphql
query {
  findPaginatedCafeInfos(
    first: 10
    after: "aWQfMTA="
  ) {
    edges {
      node {
        id
        name
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**서버 처리:**
```typescript
// 1. 입력 파라미터
first = 10
after = "aWQfMTA="  // 이전 페이지의 endCursor

// 2. 커서 디코딩
Base64.decode("aWQfMTA=") = "id_10"
decodedCursor = "id_10"
idValue = parseInt("10") = 10

// 3. 쿼리
WHERE id > 10  // ✅ 10번 이후만 조회
ORDER BY id ASC
LIMIT 11

// 4. 결과
rawCafeInfos = [id:11, id:12, ..., id:21]  // 11개 반환됨

// 5. 페이지네이션 처리
hasNextPage = (11 > 10) = true  ✅ 다음 페이지 있음
cafeInfos = [id:11, ..., id:20]  // 11개 중 10개만 반환

// 6. 커서 생성
startCursor = "id_11"   → Base64 → "aWQfMTE="
endCursor = "id_20"     → Base64 → "aWQfMjA="
```

**응답:**
```json
{
  "data": {
    "findPaginatedCafeInfos": {
      "edges": [
        { "node": { "id": 11, "name": "카페11" }, "cursor": "aWQfMTE=" },
        { "node": { "id": 12, "name": "카페12" }, "cursor": "aWQfMTI=" },
        ...
        { "node": { "id": 20, "name": "카페20" }, "cursor": "aWQfMjA=" }
      ],
      "pageInfo": {
        "hasNextPage": true,
        "endCursor": "aWQfMjA="
      },
      "totalCount": 30
    }
  }
}
```

**클라이언트가 저장:**
- `endCursor` = `"aWQfMjA="` (다음 페이지 요청에 사용)

---

### 📄 페이지 3 요청

**GraphQL Query:**
```graphql
query {
  findPaginatedCafeInfos(
    first: 10
    after: "aWQfMjA="  // 페이지 2의 endCursor
  ) {
    edges {
      node {
        id
        name
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**서버 처리:**
```typescript
// 1. 입력 파라미터
first = 10
after = "aWQfMjA="

// 2. 커서 디코딩
Base64.decode("aWQfMjA=") = "id_20"
idValue = 20

// 3. 쿼리
WHERE id > 20  // ✅ 20번 이후만 조회
ORDER BY id ASC
LIMIT 11

// 4. 결과
rawCafeInfos = [id:21, id:22, ..., id:30]  // 10개 반환됨

// 5. 페이지네이션 처리
hasNextPage = (10 > 10) = false  ❌ 다음 페이지 없음
cafeInfos = [id:21, ..., id:30]  // 10개 모두 반환

// 6. 커서 생성
startCursor = "id_21"   → Base64 → "aWQfMjE="
endCursor = "id_30"     → Base64 → "aWQfMzA="
```

**응답:**
```json
{
  "data": {
    "findPaginatedCafeInfos": {
      "edges": [
        { "node": { "id": 21, "name": "카페21" }, "cursor": "aWQfMjE=" },
        { "node": { "id": 22, "name": "카페22" }, "cursor": "aWQfMjI=" },
        ...
        { "node": { "id": 30, "name": "카페30" }, "cursor": "aWQfMzA=" }
      ],
      "pageInfo": {
        "hasNextPage": false,  // 마지막 페이지!
        "endCursor": "aWQfMzA="
      },
      "totalCount": 30
    }
  }
}
```

**클라이언트가 확인:**
- `hasNextPage` = `false` → "더 보기" 버튼 숨기기

---

## 핵심 메커니즘

### 1️⃣ 커서 기반이므로

```
페이지 1: 커서 없음 → id > undefined → 처음 10개
페이지 2: after="id_10" → id > 10 → 다음 10개
페이지 3: after="id_20" → id > 20 → 다음 10개
```

### 2️⃣ +1 전략

```
페이지 1: 11개 조회 → 10개 반환 + hasNextPage=true
페이지 2: 11개 조회 → 10개 반환 + hasNextPage=true
페이지 3: 10개 조회 → 10개 반환 + hasNextPage=false
```

### 3️⃣ 안정성

```
데이터가 추가/삭제되어도:
✅ 각 페이지는 항상 올바른 데이터만 포함
✅ 중복이나 누락 없음
```

---

## 클라이언트 구현 예시

### React + Apollo Client

```typescript
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_CAFE_INFOS = gql`
  query GetCafeInfos($first: Int, $after: String) {
    findPaginatedCafeInfos(first: $first, after: $after) {
      edges {
        node {
          id
          name
          address
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

function CafeList() {
  const [page, setPage] = useState(1);
  const [afterCursor, setAfterCursor] = useState<string | null>(null);
  
  const { data, loading, fetchMore } = useQuery(GET_CAFE_INFOS, {
    variables: {
      first: 10,
      after: afterCursor
    }
  });

  const loadNextPage = () => {
    if (data?.findPaginatedCafeInfos?.pageInfo?.hasNextPage) {
      fetchMore({
        variables: {
          after: data.findPaginatedCafeInfos.pageInfo.endCursor
        }
      });
      setPage(page + 1);
    }
  };

  return (
    <div>
      <h2>페이지 {page}</h2>
      
      {data?.findPaginatedCafeInfos?.edges.map(({ node }) => (
        <div key={node.id}>{node.name}</div>
      ))}
      
      {data?.findPaginatedCafeInfos?.pageInfo?.hasNextPage && (
        <button onClick={loadNextPage}>다음 페이지</button>
      )}
    </div>
  );
}
```

### 순수 JavaScript (fetch)

```javascript
let currentEndCursor = null;

async function loadPage(pageNumber) {
  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query {
          findPaginatedCafeInfos(first: 10${currentEndCursor ? `, after: "${currentEndCursor}"` : ''}) {
            edges {
              node {
                id
                name
                address
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `
    })
  });

  const result = await response.json();
  const { edges, pageInfo } = result.data.findPaginatedCafeInfos;
  
  // 현재 페이지의 데이터 표시
  console.log(`페이지 ${pageNumber}:`, edges);
  
  // 다음 페이지를 위한 커서 저장
  if (pageInfo.hasNextPage) {
    currentEndCursor = pageInfo.endCursor;
    console.log(`다음 페이지 커서: ${currentEndCursor}`);
  } else {
    console.log('마지막 페이지입니다.');
  }
  
  return pageInfo.hasNextPage;
}

// 사용 예시
async function loadAllPages() {
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    console.log(`\n=== 페이지 ${page} 로딩 ===`);
    hasMore = await loadPage(page);
    page++;
  }
}

loadAllPages();
```

---

## 시각적 설명

```
전체 데이터: 30개
┌─────────┬─────────┬─────────┐
│ 1~10    │ 11~20   │ 21~30   │
│ 페이지1 │ 페이지2 │ 페이지3 │
└─────────┴─────────┴─────────┘
   ↓        ↓        ↓
 커서 없음 커서:10  커서:20
```

### 데이터베이스 쿼리 시각화

```sql
-- 페이지 1
SELECT * FROM cafe_info ORDER BY id ASC LIMIT 11;
-- WHERE 조건 없음 (처음부터)

-- 페이지 2
SELECT * FROM cafe_info WHERE id > 10 ORDER BY id ASC LIMIT 11;
-- 10번 이후만 조회

-- 페이지 3
SELECT * FROM cafe_info WHERE id > 20 ORDER BY id ASC LIMIT 11;
-- 20번 이후만 조회
```

---

## 주의사항

### ❌ 직접 페이지 번호 지정 불가

```typescript
// ❌ 불가능 - 커서 기반은 직접 페이지 번호로 접근 불가
findPaginatedCafeInfos(page: 3, limit: 10)
```

대신:
```typescript
// ✅ 첫 페이지부터 순차적으로
findPaginatedCafeInfos(first: 10)  // 페이지 1
findPaginatedCafeInfos(first: 10, after: "cursor1")  // 페이지 2
findPaginatedCafeInfos(first: 10, after: "cursor2")  // 페이지 3
```

### ✅ 무한 스크롤에 적합

```typescript
// 사용자가 스크롤하면 자동으로 다음 페이지 로드
onScrollEnd = () => {
  if (hasNextPage && !loading) {
    loadNextPage();
  }
};
```

### ✅ 특정 항목부터 시작 가능

```typescript
// 특정 항목의 커서로 바로 시작
findPaginatedCafeInfos(first: 10, after: "특정항목의_cursor")
```

---

## 요약

| 항목 | 설명 |
|------|------|
| **페이지 크기** | `first: 10`으로 10개씩 |
| **페이지 이동** | `endCursor` 사용해서 다음 페이지 |
| **페이지 번호** | 직접 지정 불가, 순차적 접근 |
| **첫 페이지** | `after` 파라미터 없이 요청 |
| **다음 페이지** | 이전 페이지의 `endCursor` 사용 |
| **마지막 확인** | `hasNextPage`로 확인 |

**결론**: ✅ 네, 1번, 2번, 3번 페이지 이렇게 순차적으로 요청 가능합니다!



