# GraphQL API 사용 가이드

이 문서는 NestJS GraphQL API를 사용하는 방법을 설명합니다.

## GraphQL 엔드포인트

기본적으로 GraphQL 엔드포인트는 다음 위치에서 제공됩니다:

- **로컬 개발**: `http://localhost:4000/graphql` (또는 설정된 PORT)
- **프로덕션**: `https://your-domain.com/graphql`

## GraphQL Playground

GraphQL Playground는 개발 모드에서 자동으로 활성화됩니다. 브라우저에서 엔드포인트에 접속하면 GraphQL 쿼리를 테스트할 수 있는 인터페이스가 제공됩니다.

## 기본 요청 방법

### 1. HTTP POST 요청

GraphQL은 항상 POST 메서드를 사용하며, 요청 본문에 쿼리를 JSON 형식으로 전달합니다.

**curl 예시:**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "query": "query { findPaginatedCafeInfos(first: 10) { edges { node { id name address } cursor } pageInfo { hasNextPage endCursor } totalCount } }"
  }'
```

**JavaScript (fetch) 예시:**
```javascript
const response = await fetch('http://localhost:4000/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'X-API-Key': 'YOUR_API_KEY',
  },
  body: JSON.stringify({
    query: `
      query {
        findPaginatedCafeInfos(first: 10) {
          edges {
            node {
              id
              name
              address
              code
              directions
              businessNumber
              ceoName
              regionCategoryId
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
    `
  })
});

const data = await response.json();
console.log(data);
```

**TypeScript/Axios 예시:**
```typescript
import axios from 'axios';

const response = await axios.post('http://localhost:4000/graphql', {
  query: `
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
          endCursor
        }
        totalCount
      }
    }
  `,
  variables: {
    first: 10,
    after: null
  }
}, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'X-API-Key': 'YOUR_API_KEY'
  }
});

console.log(response.data);
```

## 커서 기반 페이지네이션

### 첫 페이지 가져오기

```graphql
query {
  findPaginatedCafeInfos(first: 10) {
    edges {
      node {
        id
        name
        address
        code
        directions
        businessNumber
        ceoName
        createdAt
        isDisable
        regionCategoryId
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

### 다음 페이지 가져오기

이전 쿼리의 `pageInfo.endCursor` 값을 사용합니다:

```graphql
query {
  findPaginatedCafeInfos(first: 10, after: "aWQfMTIz") {
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

### 변수 사용 (권장)

```graphql
query GetCafeInfos($first: Int, $after: String) {
  findPaginatedCafeInfos(first: $first, after: $after) {
    edges {
      node {
        id
        name
        address
        code
        directions
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

**변수 값:**
```json
{
  "first": 10,
  "after": "aWQfMTIz"  // 이전 페이지의 endCursor 값
}
```

## 인증

현재 애플리케이션은 다음 인증 방식을 사용합니다:

1. **JWT 토큰**: `Authorization: Bearer <token>` 헤더
2. **API Key**: `X-API-Key: <api_key>` 헤더

인증이 필요한 경우 요청 헤더에 추가해야 합니다.

## 쿼리 예시 모음

### 1. 기본 카페 정보 조회

```graphql
query {
  findPaginatedCafeInfos(first: 5) {
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
  }
}
```

### 2. 지역 카테고리 포함 조회

```graphql
query {
  findPaginatedCafeInfos(first: 10) {
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
      endCursor
    }
    totalCount
  }
}
```

### 3. 특정 필드만 조회

```graphql
query {
  findPaginatedCafeInfos(first: 20) {
    edges {
      node {
        id
        name
        code
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

## React에서 사용하는 예시

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
          RegionCategory {
            id
            name
          }
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

function CafeInfoList() {
  const { data, loading, error, fetchMore } = useQuery(GET_CAFE_INFOS, {
    variables: {
      first: 10,
      after: null
    }
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const loadMore = () => {
    if (data.findPaginatedCafeInfos.pageInfo.hasNextPage) {
      fetchMore({
        variables: {
          after: data.findPaginatedCafeInfos.pageInfo.endCursor
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            findPaginatedCafeInfos: {
              ...fetchMoreResult.findPaginatedCafeInfos,
              edges: [
                ...prev.findPaginatedCafeInfos.edges,
                ...fetchMoreResult.findPaginatedCafeInfos.edges
              ]
            }
          };
        }
      });
    }
  };

  return (
    <div>
      <h2>카페 목록 (총 {data.findPaginatedCafeInfos.totalCount}개)</h2>
      <ul>
        {data.findPaginatedCafeInfos.edges.map(({ node, cursor }) => (
          <li key={cursor}>
            <h3>{node.name}</h3>
            <p>{node.address}</p>
            {node.RegionCategory && (
              <p>지역: {node.RegionCategory.name}</p>
            )}
          </li>
        ))}
      </ul>
      {data.findPaginatedCafeInfos.pageInfo.hasNextPage && (
        <button onClick={loadMore}>더 보기</button>
      )}
    </div>
  );
}
```

## 오류 처리

GraphQL 응답은 항상 200 상태 코드를 반환하며, 오류는 `errors` 필드에 포함됩니다:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Unauthorized",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["findPaginatedCafeInfos"]
    }
  ]
}
```

성공적인 응답 예시:

```json
{
  "data": {
    "findPaginatedCafeInfos": {
      "edges": [
        {
          "node": {
            "id": 1,
            "name": "카페 이름",
            "address": "주소",
            "RegionCategory": {
              "id": 1,
              "name": "서울"
            }
          },
          "cursor": "aWQfMQ=="
        }
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

## 참고사항

1. **커서 디코딩**: 커서는 Base64로 인코딩된 문자열입니다. 형식은 `id_<number>`입니다.
2. **기본값**: `first` 파라미터가 제공되지 않으면 기본값 10이 사용됩니다.
3. **최대 개수**: `first` 파라미터에 대한 최대값 제한이 있을 수 있습니다.
4. **정렬**: 현재는 ID 오름차순으로 정렬됩니다.

## GraphQL Playground 사용 팁

1. 브라우저에서 `http://localhost:3000/graphql` 접속
2. 왼쪽 상단의 **SCHEMA** 버튼을 클릭하여 사용 가능한 쿼리와 타입 확인
3. 쿼리를 작성하고 **Play** 버튼 클릭
4. 하단의 **Query Variables** 탭에서 변수 입력
5. **Docs** 탭에서 API 문서 확인





