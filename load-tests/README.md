# Load Tests

Artillery를 사용한 부하 테스트 도구입니다.

## 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`load-tests` 폴더에 `.env` 파일을 생성하고 Artillery Cloud API Key를 설정하세요:

```bash
# .env 파일 생성
echo API_KEY=your_artillery_cloud_api_key > .env
```

또는 직접 `.env` 파일을 편집:

```env
API_KEY=your_artillery_cloud_api_key
```

**Artillery Cloud API Key 발급:**
- https://app.artillery.io 에서 계정 생성 후 API Key 발급
- Artillery Cloud를 사용하지 않는 경우 이 설정은 선택사항입니다

## 사용 명령어

### 1. 부하 테스트 실행 (로컬)

로컬에서 부하 테스트를 실행하고 결과를 JSON 파일로 저장합니다.

```bash
npm run artillery
```

**동작:**
1. `scenarios/` 폴더의 시나리오 목록 표시
2. 번호를 선택하여 테스트 실행
3. 결과는 `reports/{시나리오이름}-{날짜}.json` 형식으로 저장

**예시:**
```
📋 사용 가능한 시나리오:
  1. basic-load-test.yml
  2. products-api-test.yml
  3. stress-test.yml
  4. meta-viewer-test.yml

시나리오 번호를 선택하세요: 1
```

### 2. HTML 리포트 생성

부하 테스트 결과를 HTML 그래프로 시각화합니다.

```bash
npm run artillery:graph
```

**동작:**
1. `reports/` 폴더의 JSON 파일 목록 표시
2. 번호를 선택하여 HTML 리포트 생성
3. 생성된 HTML 파일을 브라우저에서 열어 그래프 확인

**생성되는 리포트:**
- 시간별 응답 시간 그래프
- 시간별 요청률 그래프
- 엔드포인트별 통계 테이블
- HTTP 상태 코드 분포

### 3. Artillery Cloud에 기록

부하 테스트 결과를 Artillery Cloud에 업로드하여 대시보드에서 확인합니다.

```bash
npm run artillery:cloud
```

**동작:**
1. `.env` 파일에서 `API_KEY` 읽기
2. 시나리오 선택
3. Artillery Cloud에 테스트 결과 기록
4. https://app.artillery.io 에서 결과 확인

**필수 조건:**
- `.env` 파일에 `API_KEY` 설정 필요
- Artillery Cloud 계정 필요

## 환경 변수 설정

### .env 파일 위치

```
load-tests/
  └── .env
```

### 필수 환경 변수

| 변수명 | 설명 | 필수 여부 | 예시 |
|--------|------|-----------|------|
| `API_KEY` | Artillery Cloud API Key | Artillery Cloud 사용 시 필수 | `art_xxxxxxxxxxxxx` |

### .env 파일 예시

```env
# Artillery Cloud API Key
# https://app.artillery.io 에서 발급
API_KEY=art_xxxxxxxxxxxxx
```

## 디렉토리 구조

```
load-tests/
├── scenarios/          # 부하 테스트 시나리오 파일 (.yml)
├── scripts/            # 실행 스크립트
│   ├── run-scenario.js      # 로컬 테스트 실행
│   ├── generate-report.js    # HTML 리포트 생성
│   └── run-cloud.js          # Artillery Cloud 기록
├── reports/            # 테스트 결과 (JSON, HTML)
├── helper/             # 헬퍼 함수
├── .env                # 환경 변수 (gitignore)
├── package.json
└── README.md
```

## 시나리오 파일

부하 테스트 시나리오는 `scenarios/` 폴더에 YAML 형식으로 작성됩니다.

**시나리오 목록:**
- `basic-load-test.yml` - 기본 부하 테스트
- `products-api-test.yml` - 제품 API 전용 테스트
- `stress-test.yml` - 스트레스 테스트
- `meta-viewer-test.yml` - 메타 뷰어 API 테스트

각 시나리오의 상세한 부하 설정은 [LOAD_TEST_SCENARIOS.md](./scenarios/LOAD_TEST_SCENARIOS.md)를 참조하세요.

## 테스트 대상 서버 변경

각 시나리오 파일의 `config.target`을 수정하여 테스트 대상 서버를 변경할 수 있습니다:

```yaml
config:
  target: "http://localhost:4000"  # 여기를 변경
```

**예시:**
- 로컬: `http://localhost:4000`
- 개발 서버: `https://dev.example.com`
- 프로덕션: `https://api.example.com`

## 결과 파일

### JSON 결과 파일

테스트 실행 후 `reports/` 폴더에 JSON 형식으로 저장됩니다:
- 파일명: `{시나리오이름}-{날짜}.json`
- 예시: `stress-test-2025-11-06.json`

### HTML 리포트

`npm run artillery:graph` 실행 시 생성됩니다:
- 파일명: `{시나리오이름}-{날짜}.html`
- 브라우저에서 열어 그래프 확인 가능

## 문제 해결

### 서버 연결 실패

```
❌ 서버에 연결할 수 없습니다: http://localhost:4000
```

**해결 방법:**
1. 테스트 대상 서버가 실행 중인지 확인
2. 시나리오 파일의 `target` URL 확인
3. 방화벽 설정 확인

### API_KEY 오류

```
❌ .env 파일에 API_KEY가 설정되어 있지 않습니다.
```

**해결 방법:**
1. `load-tests/.env` 파일 생성
2. `API_KEY=your_api_key` 추가
3. Artillery Cloud에서 API Key 발급 확인

### Artillery 명령어를 찾을 수 없음

```
❌ Artillery 실행 중 오류가 발생했습니다
```

**해결 방법:**
```bash
npm install
```

## 참고 자료

- [Artillery 공식 문서](https://www.artillery.io/docs)
- [Artillery Cloud](https://app.artillery.io)
- [시나리오 부하 설정 가이드](./scenarios/LOAD_TEST_SCENARIOS.md)

