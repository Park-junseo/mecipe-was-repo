# 커서 기반 페이지네이션 핵심 요약

## 🎯 핵심 개념

### Relay Connection 패턴
```
Query → Connection → Edge → Node
```

**예시:**
```graphql
findPaginatedCafeInfos {
  edges {              # Connection
    node {             # Edge
      id               # Node (실제 데이터)
      name
    }
    cursor
  }
  pageInfo
}
```

---

## 📦 주요 컴포넌트

### 1️⃣ PaginationArgs (입력)
```typescript
first: 10          // 몇 개 가져올지
after: "aWQfMTIz"  // 이 커서 이후부터
```

### 2️⃣ Edge (엣지)
```typescript
{
  node: CafeInfo,   // 실제 데이터
  cursor: "aWQfMQ==" // 위치 정보 (Base64)
}
```

### 3️⃣ Connection (연결)
```typescript
{
  edges: [Edge],      // 엣지 배열
  pageInfo: {         // 페이지 정보
    hasNextPage: true,
    endCursor: "..."
  },
  totalCount: 100     // 전체 개수
}
```

---

## ⚙️ 동작 방식

### 1. 쿼리 전략
```typescript
take: first + 1  // +1은 다음 페이지 확인용
WHERE id > 123   // 커서 이후만 조회
```

### 2. 커서 생성
```typescript
cursor = Buffer.from(`id_123`).toString('base64')
// "aWQfMTIz"
```

### 3. 다음 페이지 확인
```typescript
hasNextPage = (결과 개수 > first)
// 11개 반환 → hasNextPage = true
// 10개 반환 → hasNextPage = false
```

---

## 🔄 사용 흐름

### 첫 페이지
```graphql
query {
  findPaginatedCafeInfos(first: 10) {
    edges { node { id name } cursor }
    pageInfo { hasNextPage endCursor }
  }
}
```

### 다음 페이지
```graphql
query {
  findPaginatedCafeInfos(
    first: 10
    after: "이전페이지의_endCursor_값"
  ) {
    edges { node { id name } cursor }
    pageInfo { hasNextPage endCursor }
  }
}
```

---

## ✨ 장점

| 항목 | 오프셋 기반 | 커서 기반 ✅ |
|------|-----------|-------------|
| 일관성 | ❌ 중복/누락 가능 | ✅ 항상 안정적 |
| 성능 | ❌ OFFSET 크면 느림 | ✅ 빠름 |
| 복잡도 | 간단 | 약간 복잡 |
| 표준성 | 일반적 | GraphQL 권장 |

---

## 🛠️ 확장성

### 새로운 엔티티에 적용
```typescript
export const UserConnection = createBaseConnectionType(
  () => User, 
  'UserConnection'
);
// 자동으로 UserEdge, UserConnection 생성됨!
```

---

## 📝 실제 예시

```typescript
// 1. 입력
args = { first: 10, after: "aWQfMTIz" }

// 2. 디코딩
decodedCursor = "id_123"

// 3. 쿼리
SELECT * FROM cafe_info 
WHERE id > 123 
ORDER BY id 
LIMIT 11

// 4. 처리
hasNextPage = (11 > 10) = true
반환할 데이터 = 처음 10개
endCursor = "id_132"

// 5. 응답
{
  edges: [...10개...],
  pageInfo: {
    hasNextPage: true,
    endCursor: "aWQfMTMy"
  }
}
```

---

## 🎓 요점 정리

1. **커서는 위치 추적**: `id_123` → Base64 → `aWQfMTIz`
2. **+1 전략**: 다음 페이지 존재 여부 확인
3. **WHERE 조건**: 커서 이후 데이터만 조회
4. **일관성 보장**: 데이터 추가/삭제와 무관하게 안정적
5. **제네릭 구현**: 모든 엔티티에 재사용

---

더 자세한 내용은 `CURSOR_PAGINATION_EXPLANATION.md` 참조!



