# Meta Viewer Infos API 명세서

Base URL: `/meta-viewer-infos`

## 📌 목차
1. [MetaViewerInfo 관리](#1-metaviewerinfo-관리)
2. [MetaViewerMap 관리](#2-metaviewermap-관리)
3. [MetaViewerActiveMap 관리](#3-metavieweractiveMap-관리)
4. [사용자 조회](#4-사용자-조회)

---

## 1. MetaViewerInfo 관리

### 1.1 MetaViewerInfo 생성
**Endpoint:** `POST /meta-viewer-infos/admin`  
**인증:** 🔒 Admin  
**설명:** 새로운 MetaViewerInfo를 생성합니다.

**Request Body:**
```typescript
{
  code: string;           // 고유 코드 (required)
  cafeInfoId: number;     // 카페 정보 ID (required)
  isDisable?: boolean;    // 비활성화 여부 (optional, default: false)
}
```

**Response:** `200 OK`
```typescript
{
  id: number;
  createdAt: string;
  code: string;
  isDisable: boolean;
  cafeInfoId: number;
  CafeInfo: { ... };
  ActiveMaps: null | { ... };
}
```

**Error:**
- `404`: CafeInfo not found
- `400`: Code already exists

---

### 1.2 MetaViewerInfo 수정
**Endpoint:** `PATCH /meta-viewer-infos/admin/:id`  
**인증:** 🔒 Admin  
**설명:** 기존 MetaViewerInfo를 수정합니다.

**URL Parameters:**
- `id`: MetaViewerInfo ID (number)

**Request Body:**
```typescript
{
  code?: string;        // 고유 코드 (optional)
  cafeInfoId?: number;  // 카페 정보 ID (optional)
  isDisable?: boolean;  // 비활성화 여부 (optional)
}
```

**Response:** `200 OK`
```typescript
{
  id: number;
  createdAt: string;
  code: string;
  isDisable: boolean;
  cafeInfoId: number;
  CafeInfo: { ... };
  ActiveMaps: { ... };
}
```

**Error:**
- `404`: MetaViewerInfo not found / CafeInfo not found
- `400`: Code already exists

---

### 1.3 MetaViewerInfo 페이징 조회
**Endpoint:** `GET /meta-viewer-infos/admin`  
**인증:** 🔒 Admin  
**설명:** MetaViewerInfo 목록을 페이징하여 조회합니다.

**Query Parameters:**
```typescript
{
  page?: number;          // 페이지 번호 (default: 1)
  limit?: number;         // 페이지당 개수 (default: 10)
  cafeInfoId?: number;    // 카페 정보 ID로 필터링
  isDisable?: boolean;    // 비활성화 여부로 필터링
  searchText?: string;    // 검색어
  searchType?: 'code' | 'cafeInfoId';  // 검색 타입
}
```

**Example:**
```
GET /meta-viewer-infos/admin?page=1&limit=10&isDisable=false&searchText=cafe&searchType=code
```

**Response:** `200 OK`
```typescript
{
  metaViewerInfos: [
    {
      id: number;
      code: string;
      isDisable: boolean;
      cafeInfoId: number;
      CafeInfo: { ... };
      ActiveMaps: { ... };
    },
    ...
  ],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

---

### 1.4 MetaViewerInfo 단건 조회
**Endpoint:** `GET /meta-viewer-infos/admin/:id`  
**인증:** 🔒 Admin  
**설명:** ID로 특정 MetaViewerInfo를 조회합니다.

**URL Parameters:**
- `id`: MetaViewerInfo ID (number)

**Response:** `200 OK`
```typescript
{
  id: number;
  createdAt: string;
  code: string;
  isDisable: boolean;
  cafeInfoId: number;
  CafeInfo: { ... };
  ActiveMaps: {
    id: number;
    metaViewerInfoId: number;
    activeRenderMapId: number;
    activeColliderMapId: number;
    updatedAt: string;
    ActiveRenderMap: {
      id: number;
      type: "RENDER";
      url: string;
      size: number;
      version: number;
      createdAt: string;
    };
    ActiveColliderMap: {
      id: number;
      type: "COLLIDER";
      url: string;
      size: number;
      version: number;
      createdAt: string;
    };
  } | null;
}
```

**Error:**
- `404`: MetaViewerInfo not found

---

### 1.5 MetaViewerInfo 삭제
**Endpoint:** `DELETE /meta-viewer-infos/admin/:id`  
**인증:** 🔒 Admin  
**설명:** MetaViewerInfo를 삭제합니다. (ActiveMaps가 있으면 함께 삭제)

**URL Parameters:**
- `id`: MetaViewerInfo ID (number)

**Response:** `200 OK`
```typescript
{
  message: "MetaViewerInfo deleted successfully"
}
```

**Error:**
- `404`: MetaViewerInfo not found

---

## 2. MetaViewerMap 관리

### 2.1 MetaViewerMap 등록
**Endpoint:** `POST /meta-viewer-infos/admin/:metaViewerInfoId/maps`  
**인증:** 🔒 Admin  
**설명:** MetaViewerInfo에 새로운 맵을 등록합니다.

**URL Parameters:**
- `metaViewerInfoId`: MetaViewerInfo ID (number)

**Request Body:**
```typescript
{
  type: "RENDER" | "COLLIDER";  // 맵 타입 (required)
  url: string;                  // 맵 파일 URL (required)
  size: number;                 // 파일 크기 (bytes) (required)
  version?: number;             // 버전 (optional, default: 0)
}
```

**Example:**
```json
{
  "type": "RENDER",
  "url": "https://cdn.example.com/maps/render_v1.glb",
  "size": 2048000,
  "version": 1
}
```

**Response:** `200 OK`
```typescript
{
  id: number;
  createdAt: string;
  type: "RENDER" | "COLLIDER";
  url: string;
  size: number;
  version: number;
}
```

**Error:**
- `404`: MetaViewerInfo not found

---

### 2.2 MetaViewerMap 수정
**Endpoint:** `PATCH /meta-viewer-infos/admin/maps/:mapId`  
**인증:** 🔒 Admin  
**설명:** 기존 MetaViewerMap을 수정합니다.

**URL Parameters:**
- `mapId`: MetaViewerMap ID (number)

**Request Body:**
```typescript
{
  type?: "RENDER" | "COLLIDER";  // 맵 타입 (optional)
  url?: string;                  // 맵 파일 URL (optional)
  size?: number;                 // 파일 크기 (optional)
  version?: number;              // 버전 (optional)
}
```

**⚠️ 제약사항:**
- RENDER 타입의 맵이 ActiveRenderMap으로 사용 중일 때는 COLLIDER로 변경 불가
- COLLIDER 타입의 맵이 ActiveColliderMap으로 사용 중일 때는 RENDER로 변경 불가

**Response:** `200 OK`
```typescript
{
  id: number;
  createdAt: string;
  type: "RENDER" | "COLLIDER";
  url: string;
  size: number;
  version: number;
}
```

**Error:**
- `404`: MetaViewerMap not found
- `400`: Cannot change type to RENDER: map is used as active collider map
- `400`: Cannot change type to COLLIDER: map is used as active render map

---

### 2.3 MetaViewerMap 삭제
**Endpoint:** `DELETE /meta-viewer-infos/admin/maps/:mapId`  
**인증:** 🔒 Admin  
**설명:** MetaViewerMap을 삭제합니다.

**URL Parameters:**
- `mapId`: MetaViewerMap ID (number)

**⚠️ 제약사항:**
- MetaViewerActiveMap에서 참조 중이면 삭제 불가

**Response:** `200 OK`
```typescript
{
  message: "MetaViewerMap deleted successfully"
}
```

**Error:**
- `404`: MetaViewerMap not found
- `400`: Cannot delete map: it is referenced by active maps

---

### 2.4 MetaViewerMap 목록 조회
**Endpoint:** `GET /meta-viewer-infos/admin/:metaViewerInfoId/maps`  
**인증:** 🔒 Admin  
**설명:** 모든 MetaViewerMap 목록을 조회합니다.

**URL Parameters:**
- `metaViewerInfoId`: MetaViewerInfo ID (number)

**Response:** `200 OK`
```typescript
[
  {
    id: number;
    createdAt: string;
    type: "RENDER" | "COLLIDER";
    url: string;
    size: number;
    version: number;
  },
  ...
]
```

**Error:**
- `404`: MetaViewerInfo not found

---

## 3. MetaViewerActiveMap 관리

### 3.1 MetaViewerActiveMap 등록
**Endpoint:** `POST /meta-viewer-infos/admin/active-maps`  
**인증:** 🔒 Admin  
**설명:** MetaViewerInfo에 활성 맵을 설정합니다.

**Request Body:**
```typescript
{
  metaViewerInfoId: number;     // MetaViewerInfo ID (required)
  activeRenderMapId: number;    // RENDER 타입 맵 ID (required)
  activeColliderMapId: number;  // COLLIDER 타입 맵 ID (required)
}
```

**⚠️ 제약사항:**
- `activeRenderMapId`는 반드시 **RENDER** 타입의 MetaViewerMap이어야 함
- `activeColliderMapId`는 반드시 **COLLIDER** 타입의 MetaViewerMap이어야 함
- MetaViewerInfo당 하나의 ActiveMap만 존재 가능 (1:1 관계)

**Example:**
```json
{
  "metaViewerInfoId": 1,
  "activeRenderMapId": 101,
  "activeColliderMapId": 102
}
```

**Response:** `200 OK`
```typescript
{
  id: number;
  metaViewerInfoId: number;
  activeRenderMapId: number;
  activeColliderMapId: number;
  updatedAt: string;
  MetaViewerInfo: { ... };
  ActiveRenderMap: { ... };
  ActiveColliderMap: { ... };
}
```

**Error:**
- `404`: MetaViewerInfo not found / Render map not found / Collider map not found
- `400`: ActiveMap already exists for this MetaViewerInfo
- `400`: activeRenderMap must be of type RENDER
- `400`: activeColliderMap must be of type COLLIDER

---

### 3.2 MetaViewerActiveMap 수정
**Endpoint:** `PATCH /meta-viewer-infos/admin/active-maps/:activeMapId`  
**인증:** 🔒 Admin  
**설명:** 활성 맵을 수정합니다.

**URL Parameters:**
- `activeMapId`: MetaViewerActiveMap ID (number)

**Request Body:**
```typescript
{
  activeRenderMapId?: number;    // RENDER 타입 맵 ID (optional)
  activeColliderMapId?: number;  // COLLIDER 타입 맵 ID (optional)
}
```

**⚠️ 제약사항:**
- `activeRenderMapId`는 반드시 **RENDER** 타입의 MetaViewerMap이어야 함
- `activeColliderMapId`는 반드시 **COLLIDER** 타입의 MetaViewerMap이어야 함

**Response:** `200 OK`
```typescript
{
  id: number;
  metaViewerInfoId: number;
  activeRenderMapId: number;
  activeColliderMapId: number;
  updatedAt: string;
  MetaViewerInfo: { ... };
  ActiveRenderMap: { ... };
  ActiveColliderMap: { ... };
}
```

**Error:**
- `404`: MetaViewerActiveMap not found / Render map not found / Collider map not found
- `400`: activeRenderMap must be of type RENDER
- `400`: activeColliderMap must be of type COLLIDER

---

### 3.3 MetaViewerActiveMap 삭제
**Endpoint:** `DELETE /meta-viewer-infos/admin/active-maps/:activeMapId`  
**인증:** 🔒 Admin  
**설명:** 활성 맵을 삭제합니다. (MetaViewerInfo와의 참조는 끊어짐)

**URL Parameters:**
- `activeMapId`: MetaViewerActiveMap ID (number)

**Response:** `200 OK`
```typescript
{
  message: "MetaViewerActiveMap deleted successfully"
}
```

**Error:**
- `404`: MetaViewerActiveMap not found

---

## 4. 사용자 조회

### 4.1 Code로 MetaViewerInfo 조회
**Endpoint:** `GET /meta-viewer-infos/code/:code`  
**인증:** 🌐 Public (인증 불필요)  
**설명:** Code를 통해 MetaViewerInfo와 활성 맵을 조회합니다.

**URL Parameters:**
- `code`: MetaViewerInfo 코드 (string)

**⚠️ 조회 조건:**
- `isDisable`이 `false`이어야 함
- `ActiveMaps`가 설정되어 있어야 함

**Example:**
```
GET /meta-viewer-infos/code/cafe_gangnam_001
```

**Response:** `200 OK`
```typescript
{
  id: number;
  createdAt: string;
  code: string;
  isDisable: false;
  cafeInfoId: number;
  CafeInfo: {
    id: number;
    name: string;
    // ... 기타 CafeInfo 필드
  };
  ActiveMaps: {
    id: number;
    metaViewerInfoId: number;
    activeRenderMapId: number;
    activeColliderMapId: number;
    updatedAt: string;
    ActiveRenderMap: {
      id: number;
      type: "RENDER";
      url: string;
      size: number;
      version: number;
      createdAt: string;
    };
    ActiveColliderMap: {
      id: number;
      type: "COLLIDER";
      url: string;
      size: number;
      version: number;
      createdAt: string;
    };
  };
}
```

**Error:**
- `404`: MetaViewerInfo not found
- `400`: MetaViewerInfo is disabled
- `400`: No active maps configured

---

## 📊 API 엔드포인트 요약표

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/admin` | 🔒 Admin | MetaViewerInfo 생성 |
| PATCH | `/admin/:id` | 🔒 Admin | MetaViewerInfo 수정 |
| GET | `/admin` | 🔒 Admin | MetaViewerInfo 페이징 조회 |
| GET | `/admin/:id` | 🔒 Admin | MetaViewerInfo 단건 조회 |
| DELETE | `/admin/:id` | 🔒 Admin | MetaViewerInfo 삭제 |
| POST | `/admin/:metaViewerInfoId/maps` | 🔒 Admin | MetaViewerMap 등록 |
| PATCH | `/admin/maps/:mapId` | 🔒 Admin | MetaViewerMap 수정 |
| DELETE | `/admin/maps/:mapId` | 🔒 Admin | MetaViewerMap 삭제 |
| GET | `/admin/:metaViewerInfoId/maps` | 🔒 Admin | MetaViewerMap 목록 조회 |
| POST | `/admin/active-maps` | 🔒 Admin | MetaViewerActiveMap 등록 |
| PATCH | `/admin/active-maps/:activeMapId` | 🔒 Admin | MetaViewerActiveMap 수정 |
| DELETE | `/admin/active-maps/:activeMapId` | 🔒 Admin | MetaViewerActiveMap 삭제 |
| GET | `/code/:code` | 🌐 Public | Code로 조회 (사용자용) |

---

## 💡 사용 시나리오

### 시나리오 1: 신규 Meta Viewer 설정

```bash
# 1. MetaViewerInfo 생성
POST /meta-viewer-infos/admin
{
  "code": "cafe_gangnam_001",
  "cafeInfoId": 5
}
# → Response: { "id": 1, ... }

# 2. RENDER 맵 등록
POST /meta-viewer-infos/admin/1/maps
{
  "type": "RENDER",
  "url": "https://cdn.example.com/render_v1.glb",
  "size": 2048000,
  "version": 1
}
# → Response: { "id": 101, ... }

# 3. COLLIDER 맵 등록
POST /meta-viewer-infos/admin/1/maps
{
  "type": "COLLIDER",
  "url": "https://cdn.example.com/collider_v1.glb",
  "size": 512000,
  "version": 1
}
# → Response: { "id": 102, ... }

# 4. ActiveMap 설정
POST /meta-viewer-infos/admin/active-maps
{
  "metaViewerInfoId": 1,
  "activeRenderMapId": 101,
  "activeColliderMapId": 102
}
# → Response: { "id": 1, ... }

# 5. 사용자가 조회
GET /meta-viewer-infos/code/cafe_gangnam_001
# → 활성 맵 정보 포함하여 반환
```

### 시나리오 2: 맵 버전 업데이트

```bash
# 1. 새 버전 RENDER 맵 등록
POST /meta-viewer-infos/admin/1/maps
{
  "type": "RENDER",
  "url": "https://cdn.example.com/render_v2.glb",
  "size": 2560000,
  "version": 2
}
# → Response: { "id": 103, ... }

# 2. ActiveMap 업데이트
PATCH /meta-viewer-infos/admin/active-maps/1
{
  "activeRenderMapId": 103
}
# → 새 버전의 맵이 활성화됨

# 3. 이전 맵 삭제 (더 이상 사용되지 않음)
DELETE /meta-viewer-infos/admin/maps/101
# → Response: { "message": "..." }
```

### 시나리오 3: Meta Viewer 비활성화

```bash
# 1. MetaViewerInfo 비활성화
PATCH /meta-viewer-infos/admin/1
{
  "isDisable": true
}

# 2. 사용자가 조회 시도
GET /meta-viewer-infos/code/cafe_gangnam_001
# → Error 400: MetaViewerInfo is disabled
```

---

## ⚠️ 주요 제약사항 및 검증

1. **타입 제약**
   - ActiveRenderMap은 **RENDER** 타입만
   - ActiveColliderMap은 **COLLIDER** 타입만

2. **삭제 제약**
   - ActiveMap에서 참조 중인 MetaViewerMap은 삭제 불가
   - 삭제 전 ActiveMap 참조 해제 필요

3. **타입 변경 제약**
   - ActiveMap에서 사용 중인 맵의 타입은 변경 불가
   - 타입 변경 필요 시: 새 맵 등록 → ActiveMap 업데이트 → 이전 맵 삭제

4. **1:1 관계**
   - MetaViewerInfo당 하나의 ActiveMap만 존재 가능
   - 중복 생성 시 에러 발생

5. **사용자 조회 제한**
   - `isDisable = false` 필수
   - `ActiveMaps` 설정 필수

---

## 🔧 Validation

모든 Request Body는 `ValidationPipe`를 통해 검증됩니다:
- `whitelist: true` - DTO에 정의되지 않은 속성 제거
- `forbidNonWhitelisted: true` - 정의되지 않은 속성 포함 시 에러
- `transform: true` - 타입 자동 변환


