# 부하 테스트 시나리오

이 폴더에는 Artillery 부하 테스트 시나리오 파일들이 있습니다.

## 시나리오 파일 목록

### 샘플
- `basic-load-test.yml` - 기본 부하 테스트
- `products-api-test.yml` - 제품 API 전용 테스트
- `stress-test.yml` - 스트레스 테스트
- `meta-viewer-test.yml` - 메타 뷰어 API 테스트

## 사용 방법

```bash
npm run artillery
```

실행하면 사용 가능한 시나리오 목록이 표시되고, 번호를 선택하여 테스트를 실행할 수 있습니다.

## 상세 가이드
각 시나리오의 상세한 부하 설정과 사용 목적은 아래를 참조하세요.

### 샘플
[SAMPLE_LOAD_TEST_SCENARIOS.md](./SAMPLE_LOAD_TEST_SCENARIOS.md)

## 시나리오 수정

각 시나리오 파일을 직접 수정하여 테스트 내용을 변경할 수 있습니다.

### 테스트 대상 서버 변경

```yaml
config:
  target: "http://localhost:4000"  # 여기를 변경
```

### 부하 설정 변경

```yaml
phases:
  - duration: 60        # 지속 시간 (초)
    arrivalRate: 5     # 초기 부하 (req/s)
    rampTo: 10         # 최종 부하 (req/s)
```

