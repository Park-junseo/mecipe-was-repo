# Self-Hosted Runner 설정 가이드

## 개요

GitHub Actions의 self-hosted runner는 특정 태그(라벨)로 구분됩니다. 각 인스턴스에 고유한 runner를 설치하고 태그를 부여해야 합니다.

## Runner 태그 구조

현재 워크플로우에서 사용하는 태그:

- **인스턴스 A**: `[self-hosted, instance-a, Linux, X64]`
- **인스턴스 B**: `[self-hosted, instance-b, Linux, X64]`

## 인스턴스 A Runner 설치

### 1. 인스턴스 A 서버에서 실행

```bash
# GitHub Actions Runner 다운로드
cd ~
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Runner 설정
./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_RUNNER_TOKEN
```

### 2. Runner 설정 중 태그 지정

설정 과정에서 다음과 같이 입력:

```
Enter the name of the runner group to add this runner to: [Press Enter for Default]
Enter the name of runner: [instance-a-runner]
Enter any additional labels (ex. label-1,label-2): instance-a,Linux,X64
```

또는 설정 후 태그 추가:

```bash
# Runner 설정 파일 수정
nano ~/actions-runner/.runner

# 또는 config.sh 재실행하여 태그 추가
./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_RUNNER_TOKEN --labels instance-a,Linux,X64
```

### 3. Runner 서비스 등록 및 시작

```bash
# 서비스로 등록
sudo ./svc.sh install

# 서비스 시작
sudo ./svc.sh start

# 상태 확인
sudo ./svc.sh status
```

## 인스턴스 B Runner 설치

### 1. 인스턴스 B 서버에서 실행

```bash
# GitHub Actions Runner 다운로드
cd ~
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Runner 설정
./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_RUNNER_TOKEN
```

### 2. Runner 설정 중 태그 지정

```
Enter the name of the runner group to add this runner to: [Press Enter for Default]
Enter the name of runner: [instance-b-runner]
Enter any additional labels (ex. label-1,label-2): instance-b,Linux,X64
```

### 3. Runner 서비스 등록 및 시작

```bash
# 서비스로 등록
sudo ./svc.sh install

# 서비스 시작
sudo ./svc.sh start

# 상태 확인
sudo ./svc.sh status
```

## Runner 토큰 발급

### GitHub 웹 UI에서

1. Repository > Settings > Actions > Runners
2. "New self-hosted runner" 클릭
3. 운영 체제 선택 (Linux)
4. 표시된 토큰 복사

### GitHub CLI로

```bash
gh auth login
gh api repos/:owner/:repo/actions/runners/registration-token --method POST
```

## Runner 태그 확인 및 수정

### 현재 태그 확인

```bash
# Runner 디렉토리에서
cat .runner

# 또는 GitHub 웹 UI에서
# Repository > Settings > Actions > Runners
```

### 태그 수정

```bash
# Runner 중지
sudo ./svc.sh stop

# 설정 제거
./config.sh remove --token YOUR_RUNNER_TOKEN

# 새 태그로 재설정
./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_RUNNER_TOKEN --labels instance-a,Linux,X64

# 서비스 재시작
sudo ./svc.sh start
```

## 워크플로우에서 Runner 선택

### 현재 설정

```yaml
# 인스턴스 A 배포
deploy_instance_a:
  runs-on: [self-hosted, instance-a, Linux, X64]

# 인스턴스 B 배포
deploy_instance_b:
  runs-on: [self-hosted, instance-b, Linux, X64]
```

### Runner 매칭 규칙

GitHub Actions는 `runs-on`에 지정된 모든 태그를 가진 runner를 찾습니다:

- `[self-hosted, instance-a, Linux, X64]` → `instance-a`, `Linux`, `X64` 태그를 모두 가진 runner
- `[self-hosted, instance-b, Linux, X64]` → `instance-b`, `Linux`, `X64` 태그를 모두 가진 runner

## 단일 Runner 사용 시 (대안)

만약 하나의 서버에서 두 인스턴스를 모두 관리한다면:

### 옵션 1: 같은 Runner 사용

```yaml
# 모든 job이 같은 runner 사용
runs-on: [self-hosted, Linux, X64]
```

**주의**: 이 경우 인스턴스 A와 B가 같은 서버에서 실행됩니다.

### 옵션 2: Job 내에서 네임스페이스 분리

```yaml
# 같은 runner 사용하지만 Kubernetes 네임스페이스로 분리
deploy_instance_a:
  runs-on: [self-hosted, Linux, X64]
  steps:
    - name: Deploy to instance-a namespace
      run: |
        helm upgrade --install mecipe-instance-a ./helm/mecipe-instance-a \
          --namespace instance-a

deploy_instance_b:
  runs-on: [self-hosted, Linux, X64]
  steps:
    - name: Deploy to instance-b namespace
      run: |
        helm upgrade --install mecipe-instance-b ./helm/mecipe-instance-b \
          --namespace instance-b
```

## Runner 상태 확인

### GitHub 웹 UI

1. Repository > Settings > Actions > Runners
2. 각 runner의 상태 확인:
   - 🟢 Idle: 작업 대기 중
   - 🟡 Active: 작업 실행 중
   - 🔴 Offline: 오프라인

### Runner 로그 확인

```bash
# 서비스 로그
sudo journalctl -u actions.runner.* -f

# 또는 Runner 디렉토리에서
cd ~/actions-runner
tail -f _diag/Runner_*.log
```

## 트러블슈팅

### Runner가 작업을 받지 못할 때

1. **태그 확인**
   ```bash
   cat ~/actions-runner/.runner
   # labels 필드 확인
   ```

2. **Runner 재시작**
   ```bash
   sudo ./svc.sh stop
   sudo ./svc.sh start
   ```

3. **네트워크 확인**
   ```bash
   curl -I https://github.com
   ```

### Runner가 오프라인으로 표시될 때

1. **서비스 상태 확인**
   ```bash
   sudo ./svc.sh status
   ```

2. **Runner 재등록**
   ```bash
   sudo ./svc.sh stop
   ./config.sh remove --token YOUR_TOKEN
   ./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token NEW_TOKEN
   sudo ./svc.sh start
   ```

### 작업이 특정 Runner에서 실행되지 않을 때

1. **워크플로우 태그 확인**
   ```yaml
   runs-on: [self-hosted, instance-a, Linux, X64]
   ```

2. **Runner 태그 확인**
   ```bash
   cat ~/actions-runner/.runner | grep labels
   ```

3. **태그 일치 확인**
   - 워크플로우의 모든 태그가 runner에 있어야 함
   - `self-hosted`는 자동으로 추가되므로 명시할 필요 없음

## 보안 고려사항

1. **Runner 토큰 보호**
   - 토큰을 안전하게 보관
   - 정기적으로 토큰 갱신

2. **Runner 권한**
   - 최소 권한 원칙 적용
   - 필요한 권한만 부여

3. **네트워크 격리**
   - 가능하면 방화벽 규칙 설정
   - 필요한 포트만 열기

## 참고 자료

- [GitHub Actions Runner 문서](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Runner 설정 가이드](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners)
- [Runner 태그 관리](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/using-labels-with-self-hosted-runners)

