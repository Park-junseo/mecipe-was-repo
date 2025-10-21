# Meta Viewer API Documentation

## Overview
이 문서는 Meta Viewer 시스템의 RESTful API 엔드포인트를 설명합니다.

## Authentication
- **어드민 API**: `AdminAuthGuard` 사용 - ADMIN 권한 필요
- **사용자 API**: `@Public()` 데코레이터 - 인증 불필요

---

## 어드민 페이지용 API

### MetaViewerInfo 관련

#### 1. MetaViewerInfo 생성
```
POST /meta-viewer-infos/admin
```

**Request Body:**
```json
{
  "code": "cafe_001",
  "cafeInfoId": 1,
  "isDisable": false  // optional, default: false
}
```

**Response:**
```json
{
  "id": 1,
  "createdAt": "2025-10-10T00:00:00.000Z",
  "code": "cafe_001",
  "isDisable": false,
  "cafeInfoId": 1,
  "CafeInfo": { ... },
  "ActiveMaps": null
}
```

---

#### 2. MetaViewerInfo 수정
```
PATCH /meta-viewer-infos/admin/:id
```

**Request Body:**
```json
{
  "code": "cafe_001_updated",  // optional
  "cafeInfoId": 2,              // optional
  "isDisable": true             // optional
}
```

---

#### 3. MetaViewerInfo 페이징 조회
```
GET /meta-viewer-infos/admin?page=1&limit=10&cafeInfoId=1&isDisable=false&searchText=cafe&searchType=code
```

**Query Parameters:**
- `page`: 페이지 번호 (default: 1)
- `limit`: 페이지당 개수 (default: 10)
- `cafeInfoId`: CafeInfo ID로 필터링 (optional)
- `isDisable`: disable 상태로 필터링 (optional)
- `searchText`: 검색 텍스트 (optional)
- `searchType`: 검색 타입 - 'code' | 'cafeInfoId' (optional)

**Response:**
```json
{
  "metaViewerInfos": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

#### 4. ID로 MetaViewerInfo 조회
```
GET /meta-viewer-infos/admin/:id
```

**Response:**
```json
{
  "id": 1,
  "code": "cafe_001",
  "isDisable": false,
  "cafeInfoId": 1,
  "CafeInfo": { ... },
  "ActiveMaps": {
    "id": 1,
    "metaViewerInfoId": 1,
    "activeRenderMapId": 1,
    "activeColliderMapId": 2,
    "ActiveRenderMap": {
      "id": 1,
      "type": "RENDER",
      "url": "https://...",
      "size": 1024000,
      "version": 1
    },
    "ActiveColliderMap": {
      "id": 2,
      "type": "COLLIDER",
      "url": "https://...",
      "size": 512000,
      "version": 1
    }
  }
}
```

---

#### 5. MetaViewerInfo 삭제
```
DELETE /meta-viewer-infos/admin/:id
```

**Response:**
```json
{
  "message": "MetaViewerInfo deleted successfully"
}
```

---

### MetaViewerMap 관련

#### 6. MetaViewerMap 등록
```
POST /meta-viewer-infos/admin/:metaViewerInfoId/maps
```

**Request Body:**
```json
{
  "type": "RENDER",  // "RENDER" | "COLLIDER"
  "url": "https://example.com/map.glb",
  "size": 1024000,
  "version": 1  // optional, default: 0
}
```

**Response:**
```json
{
  "id": 1,
  "createdAt": "2025-10-10T00:00:00.000Z",
  "type": "RENDER",
  "url": "https://example.com/map.glb",
  "size": 1024000,
  "version": 1
}
```

---

#### 7. MetaViewerMap 수정
```
PATCH /meta-viewer-infos/admin/maps/:mapId
```

**Request Body:**
```json
{
  "type": "COLLIDER",  // optional - ActiveMap 참조 확인
  "url": "https://...",  // optional
  "size": 2048000,      // optional
  "version": 2          // optional
}
```

**제약사항:**
- RENDER 타입의 맵이 ActiveRenderMap으로 사용 중일 때는 COLLIDER로 변경 불가
- COLLIDER 타입의 맵이 ActiveColliderMap으로 사용 중일 때는 RENDER로 변경 불가

---

#### 8. MetaViewerMap 삭제
```
DELETE /meta-viewer-infos/admin/maps/:mapId
```

**제약사항:**
- MetaViewerActiveMap에서 참조 중이면 삭제 불가

**Response:**
```json
{
  "message": "MetaViewerMap deleted successfully"
}
```

---

#### 9. MetaViewerMap 목록 조회
```
GET /meta-viewer-infos/admin/:metaViewerInfoId/maps
```

**Response:**
```json
[
  {
    "id": 1,
    "type": "RENDER",
    "url": "https://...",
    "size": 1024000,
    "version": 1,
    "createdAt": "2025-10-10T00:00:00.000Z"
  },
  ...
]
```

---

### MetaViewerActiveMap 관련

#### 10. MetaViewerActiveMap 등록
```
POST /meta-viewer-infos/admin/active-maps
```

**Request Body:**
```json
{
  "metaViewerInfoId": 1,
  "activeRenderMapId": 1,   // RENDER 타입만 가능
  "activeColliderMapId": 2  // COLLIDER 타입만 가능
}
```

**제약사항:**
- `activeRenderMapId`는 반드시 RENDER 타입의 MetaViewerMap이어야 함
- `activeColliderMapId`는 반드시 COLLIDER 타입의 MetaViewerMap이어야 함
- MetaViewerInfo당 하나의 ActiveMap만 존재 가능 (1:1 관계)

**Response:**
```json
{
  "id": 1,
  "metaViewerInfoId": 1,
  "activeRenderMapId": 1,
  "activeColliderMapId": 2,
  "updatedAt": "2025-10-10T00:00:00.000Z",
  "MetaViewerInfo": { ... },
  "ActiveRenderMap": { ... },
  "ActiveColliderMap": { ... }
}
```

---

#### 11. MetaViewerActiveMap 수정
```
PATCH /meta-viewer-infos/admin/active-maps/:activeMapId
```

**Request Body:**
```json
{
  "activeRenderMapId": 3,   // optional - RENDER 타입만 가능
  "activeColliderMapId": 4  // optional - COLLIDER 타입만 가능
}
```

---

#### 12. MetaViewerActiveMap 삭제
```
DELETE /meta-viewer-infos/admin/active-maps/:activeMapId
```

**Response:**
```json
{
  "message": "MetaViewerActiveMap deleted successfully"
}
```

---

## 사용자 조회용 API

#### 13. Code로 MetaViewerInfo 조회
```
GET /meta-viewer-infos/code/:code
```

**제약사항:**
- `isDisable`이 `false`이고 `ActiveMaps`가 존재해야 조회 가능
- 조건을 만족하지 않으면 BadRequestException 발생

**Response:**
```json
{
  "id": 1,
  "code": "cafe_001",
  "isDisable": false,
  "cafeInfoId": 1,
  "CafeInfo": { ... },
  "ActiveMaps": {
    "id": 1,
    "metaViewerInfoId": 1,
    "activeRenderMapId": 1,
    "activeColliderMapId": 2,
    "ActiveRenderMap": {
      "id": 1,
      "type": "RENDER",
      "url": "https://...",
      "size": 1024000,
      "version": 1
    },
    "ActiveColliderMap": {
      "id": 2,
      "type": "COLLIDER",
      "url": "https://...",
      "size": 512000,
      "version": 1
    }
  }
}
```

---

## Error Responses

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "MetaViewerInfo not found"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Code already exists"
}
```

```json
{
  "statusCode": 400,
  "message": "activeRenderMap must be of type RENDER"
}
```

```json
{
  "statusCode": 400,
  "message": "Cannot delete map: it is referenced by active maps"
}
```

---

## 작업 흐름 예시

### 1. 새로운 Meta Viewer 설정하기

```bash
# 1. MetaViewerInfo 생성
POST /meta-viewer-infos/admin
{
  "code": "cafe_gangnam_001",
  "cafeInfoId": 5
}

# 2. RENDER 맵 등록
POST /meta-viewer-infos/admin/1/maps
{
  "type": "RENDER",
  "url": "https://cdn.example.com/render_v1.glb",
  "size": 2048000,
  "version": 1
}
# Response: { "id": 101, ... }

# 3. COLLIDER 맵 등록
POST /meta-viewer-infos/admin/1/maps
{
  "type": "COLLIDER",
  "url": "https://cdn.example.com/collider_v1.glb",
  "size": 512000,
  "version": 1
}
# Response: { "id": 102, ... }

# 4. ActiveMap 설정
POST /meta-viewer-infos/admin/active-maps
{
  "metaViewerInfoId": 1,
  "activeRenderMapId": 101,
  "activeColliderMapId": 102
}

# 5. 사용자가 code로 조회
GET /meta-viewer-infos/code/cafe_gangnam_001
```

### 2. 맵 버전 업데이트하기

```bash
# 1. 새 버전의 RENDER 맵 등록
POST /meta-viewer-infos/admin/1/maps
{
  "type": "RENDER",
  "url": "https://cdn.example.com/render_v2.glb",
  "size": 2560000,
  "version": 2
}
# Response: { "id": 103, ... }

# 2. ActiveMap 업데이트
PATCH /meta-viewer-infos/admin/active-maps/1
{
  "activeRenderMapId": 103
}

# 3. 이전 맵 삭제 (더 이상 사용되지 않으므로)
DELETE /meta-viewer-infos/admin/maps/101
```

---

## 데이터베이스 스키마

### MetaViewerInfo
- `id`: Primary Key
- `code`: Unique 코드
- `isDisable`: 비활성화 여부
- `cafeInfoId`: CafeInfo 외래키
- `ActiveMaps`: MetaViewerActiveMap (1:1 관계)

### MetaViewerMap
- `id`: Primary Key
- `type`: RENDER | COLLIDER
- `url`: 맵 파일 URL
- `size`: 파일 사이즈
- `version`: 버전
- `ActiveRenderFor`: 이 맵을 Render로 사용하는 ActiveMap들
- `ActiveColliderFor`: 이 맵을 Collider로 사용하는 ActiveMap들

### MetaViewerActiveMap
- `id`: Primary Key
- `metaViewerInfoId`: MetaViewerInfo 외래키 (Unique)
- `activeRenderMapId`: RENDER 타입 MetaViewerMap 외래키
- `activeColliderMapId`: COLLIDER 타입 MetaViewerMap 외래키
- `updatedAt`: 마지막 수정 시간

---

## 주의사항

1. **타입 제약**: ActiveRenderMap은 RENDER 타입, ActiveColliderMap은 COLLIDER 타입만 가능
2. **삭제 제약**: ActiveMap에서 참조 중인 MetaViewerMap은 삭제 불가
3. **타입 변경 제약**: ActiveMap에서 사용 중인 맵의 타입은 변경 불가
4. **1:1 관계**: MetaViewerInfo 당 하나의 ActiveMap만 존재 가능
5. **사용자 조회**: isDisable=false이고 ActiveMaps가 있어야 조회 가능

