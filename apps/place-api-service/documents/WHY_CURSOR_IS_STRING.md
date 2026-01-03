# 왜 커서가 String인가요?

## 질문

커서를 숫자 ID가 아닌 문자열로 사용하는 이유는 무엇인가요?

## 답변

커서를 **문자열**로 사용하는 이유는 **유연성**과 **일관성** 때문입니다.

---

## 1️⃣ 현재 구현 방식

```typescript
// 현재 구현
cursor = Buffer.from(`id_123`).toString('base64')
// 결과: "aWQfMTIz"
```

숫자 ID를 문자열로 변환하는 이유:

### 장점

**1. 확장성**
```typescript
// 현재: id만 사용
"id_123"

// 나중에: 여러 컬럼 조합 가능
"id_123_createdAt_2024-01-01"
"id_123_timestamp_1704067200"
"name_카페A_id_123"
```

**2. 정렬 변경 지원**
```typescript
// 기본 정렬: ID 순
cursor: "id_123"

// 사용자 선택: 이름 순
cursor: "name_카페A_id_123"

// 날짜 순
cursor: "createdAt_2024-01-01_id_123"
```

**3. 필터링 지원**
```typescript
// 필터 적용된 페이지네이션
cursor: "regionId_1_id_123"  // 특정 지역만
cursor: "status_active_id_123"  // 활성만
```

**4. 복합 정렬**
```typescript
// 여러 컬럼으로 정렬
cursor: "status_active_priority_1_createdAt_2024-01-01_id_123"
```

---

## 2️⃣ 다른 접근 방식 비교

### ❌ 방법 1: 순수 숫자만 사용

```typescript
cursor: 123  // 숫자
```

**문제점:**
```typescript
// 첫 페이지: ID 순
WHERE id > 123 ORDER BY id

// 다음 페이지: 이름 순으로 변경하면?
// ❌ 커서가 의미를 잃어버림
WHERE ??? > ??? ORDER BY name
// 숫자 커서로는 처리 불가능!
```

### ❌ 방법 2: ID만 직접 Base64 인코딩

```typescript
cursor = Buffer.from('123').toString('base64')
// "MTIz"
```

**문제점:**
```typescript
// 커서가 무엇을 의미하는지 알 수 없음
"MTIz"  // ID? 타임스탬프? 다른 값?

// vs 현재 방식
"aWQfMTIz"  // 명확: "id_123"
```

---

## 3️⃣ 현재 구현의 장점 상세

### 문자열 커서의 구조

```
"id_123"
 ↑   ↑
 │   └─ 실제 값
 └─ 의미 (semantic)
```

이 구조 덕분에:

**1. 명확한 의미**
```typescript
decodedCursor = "id_123"
const [type, value] = decodedCursor.split('_')
// type = "id"
// value = "123"

// 다른 타입도 쉽게 처리
"timestamp_1704067200"  → type = "timestamp"
"name_카페A"            → type = "name"
```

**2. 파싱 가능**
```typescript
if (decodedCursor.startsWith('id_')) {
  // ID 기반 페이지네이션
  const id = parseInt(decodedCursor.split('_')[1])
  WHERE id > id
}
else if (decodedCursor.startsWith('timestamp_')) {
  // 타임스탬프 기반
  const timestamp = decodedCursor.split('_')[1]
  WHERE createdAt > timestamp
}
```

**3. 미래 확장**
```typescript
// 현재
"id_123"

// 미래: UUID 지원
"uuid_a1b2c3d4-e5f6-7890-abcd-ef1234567890"

// 미래: 복합 키
"userId_123_postId_456_timestamp_1704067200"

// 미래: 암호화된 커서
"encrypted_eyJhbGciOiJIUzI1NiIs...J9"
```

---

## 4️⃣ 실제 사용 예시

### 예시 1: 현재 구현

```typescript
// 커서 생성
cursor = "id_123"

// 인코딩
Base64.encode("id_123") = "aWQfMTIz"

// 디코딩
Base64.decode("aWQfMTIz") = "id_123"

// 파싱
const [type, value] = "id_123".split('_')
// type = "id", value = "123"

// 쿼리
WHERE id > 123
```

### 예시 2: 날짜 기반으로 확장

```typescript
// 커서 생성
cursor = "createdAt_2024-01-01T00:00:00Z_id_123"

// 인코딩
Base64.encode(cursor)

// 디코딩 및 파싱
const parts = decodedCursor.split('_')
// parts[0] = "createdAt"
// parts[1] = "2024-01-01T00:00:00Z"
// parts[2] = "id"
// parts[3] = "123"

// 쿼리
WHERE createdAt > '2024-01-01T00:00:00Z'
  AND (createdAt = '2024-01-01T00:00:00Z' AND id > 123)
ORDER BY createdAt DESC, id ASC
```

### 예시 3: 필터링 적용

```typescript
// 커서 생성 (필터: regionId = 1)
cursor = "regionId_1_id_123"

// 쿼리
WHERE regionId = 1 AND id > 123
ORDER BY id ASC
```

---

## 5️⃣ GraphQL Relay 스펙 준수

### Relay Connection 스펙

Relay 스펙은 커서를 **opaque string**으로 정의합니다:

```graphql
type PageInfo {
  startCursor: String  # String!
  endCursor: String    # String!
}

type Edge {
  cursor: String!  # String!
  node: Node
}
```

**"Opaque"의 의미:**
- 클라이언트가 커서의 내부 구조를 알고 있어서는 안 됨
- 커서를 그대로 전달만 해야 함
- 서버만 커서를 생성하고 해석함

**우리 구현:**
```typescript
// 서버: 커서 생성
"id_123" → Base64 → "aWQfMTIz"

// 클라이언트: 그대로 전달
after: "aWQfMTIz"

// 서버: 커서 해석
Base64.decode() → "id_123" → id: 123
```

---

## 6️⃣ 다른 유명 서비스들의 구현

### Facebook (Relay)

```typescript
// 커서는 항상 Base64 인코딩된 문자열
"eyJpZCI6MTIzfQ=="  // JSON 인코딩: {"id": 123}
```

### GitHub GraphQL API

```typescript
// 커서는 불투명한 문자열
"Y3Vyc29yOnYyOpHOAkXP", "Y3Vyc29yOnYyOpHOAnT3"
```

### Twitter API

```typescript
// Next token은 긴 문자열
"DAABCgABGJLWuJjR6wACBgABJURxh..."
```

---

## 7️⃣ 왜 Base64인가?

### Base64를 사용하는 이유

```typescript
Buffer.from(`id_123`).toString('base64')
// "aWQfMTIz"
```

**1. URL-Safe**
```
URL에 안전하게 사용 가능한 문자만 사용
/, +, = 외의 특수문자 없음
```

**2. Binary Data 지원**
```typescript
// 향후 바이너리 데이터도 인코딩 가능
Buffer.from(uuid).toString('base64')
```

**3. 표준**
```
웹 표준
JSON, JWT 등에서도 사용
```

**4. 가독성**
```typescript
// vs 다른 인코딩
Base64: "aWQfMTIz"           // 읽기 어렵지만 URL-safe
Hex: "69645f313233"          // 더 읽기 어려움
UTF-8: "id_123"              // 읽기 쉽지만 URL unsafe
URL-Encode: "id_123"         // 유니코드 문제
```

---

## 8️⃣ 숫자를 쓰면 안 되는 이유

### 숫자를 직접 사용하는 경우

```typescript
// ❌ 나쁜 예
cursor: 123

// 문제점
1. 정렬 변경 불가능
2. 필터링 적용 불가능
3. 복합 키 불가능
4. 타입 구분 불가능
```

### 실제 시나리오

```typescript
// 시나리오: 사용자가 정렬을 변경
// 페이지 1: ID 순 (123, 124, 125)
cursor = 125

// 사용자: "이름 순으로 정렬해줘"
// 페이지 1: 이름 순 (다른 순서)
// ❌ cursor 125는 의미를 잃음!

// vs 문자열 커서
cursor = "id_125"  // ID 기반
cursor = "name_카페B_id_125"  // 이름 기반
// ✅ 명확!
```

---

## 9️⃣ 구현 예시

### 현재: 단순 ID

```typescript
// 커서 포맷
"id_123"

// 생성
const createCursor = (id: number) => 
  Buffer.from(`id_${id}`).toString('base64');

// 파싱
const parseCursor = (cursor: string) => {
  const decoded = Buffer.from(cursor, 'base64').toString('ascii');
  const [type, value] = decoded.split('_');
  return { type, value: parseInt(value) };
};
```

### 향후: 복합 커서

```typescript
// 커서 포맷
"col1_val1_col2_val2"

// 생성
const createCompoundCursor = (
  orderBy: Array<{ column: string, value: any }>
) => {
  const parts = orderBy.flatMap(({ column, value }) => [column, value]);
  return Buffer.from(parts.join('_')).toString('base64');
};

// 파싱
const parseCompoundCursor = (cursor: string) => {
  const decoded = Buffer.from(cursor, 'base64').toString('ascii');
  const parts = decoded.split('_');
  const result = [];
  for (let i = 0; i < parts.length; i += 2) {
    result.push({ column: parts[i], value: parts[i + 1] });
  }
  return result;
};
```

---

## 🔟 요약

### 왜 문자열인가?

| 항목 | 숫자만 | 문자열 ✅ |
|------|--------|----------|
| 단순 ID 정렬 | ✅ 가능 | ✅ 가능 |
| 복합 정렬 | ❌ 불가능 | ✅ 가능 |
| 필터링 적용 | ❌ 불가능 | ✅ 가능 |
| 확장성 | ❌ 제한적 | ✅ 유연 |
| 의미 전달 | ❌ 없음 | ✅ 명확 |
| Relay 준수 | ✅ | ✅ |

### 핵심 포인트

1. **"id_123"** 같은 형식으로 **의미(semantic)** 전달
2. Base64로 **URL-safe** 전달
3. 문자열이므로 **복합 정보** 저장 가능
4. Relay 스펙에서 **opaque string** 권장
5. 향후 **확장** 용이

---

**결론**: 숫자를 문자열로 변환하는 것은 단순함을 위한 것이 아니라, **확장성과 유연성**을 위한 설계입니다.



