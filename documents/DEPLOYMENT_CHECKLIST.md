# 배포 후 연결 확인 체크리스트

배포 후 연결이 안 될 때 단계별로 확인하는 가이드입니다.

## 🔍 1단계: 컨테이너 상태 확인

### 서버에서 실행:

```bash
cd /home/opc/actions-runner/_work/mecipe-was-repo/mecipe-was-repo
# 또는 배포 디렉토리로 이동

# 컨테이너 상태 확인
docker compose ps

# 예상 출력:
# NAME           IMAGE                              STATUS
# mecipe-app     parkjunseo/mecipe-api-server      Up (healthy)
# mecipe-nginx   parkjunseo/mecipe-nginx           Up
# mecipe-certbot certbot/certbot                   Up
```

### ✅ 확인 사항:

- [ ] 모든 컨테이너가 `Up` 상태인가?
- [ ] `mecipe-app`이 `(healthy)` 상태인가?
- [ ] 컨테이너가 계속 재시작(Restarting)하지 않는가?

### ❌ 문제가 있다면:

```bash
# 특정 컨테이너가 Down이면 로그 확인
docker compose logs app --tail=100
docker compose logs nginx --tail=100

# 모든 로그 확인
docker compose logs --tail=200
```

---

## 🔍 2단계: 포트 리스닝 확인

### 서버에서 실행:

```bash
# 80, 443 포트가 열려있는지 확인
sudo netstat -tulpn | grep -E ':80|:443'

# 또는
sudo ss -tulpn | grep -E ':80|:443'

# 예상 출력:
# tcp    0    0 0.0.0.0:80    0.0.0.0:*    LISTEN    12345/nginx
# tcp    0    0 0.0.0.0:443   0.0.0.0:*    LISTEN    12345/nginx
```

### ✅ 확인 사항:

- [ ] 80 포트가 nginx에 의해 리스닝되고 있나?
- [ ] 443 포트가 nginx에 의해 리스닝되고 있나?

### ❌ 포트가 리스닝 안 되면:

```bash
# Nginx 컨테이너 로그 확인
docker compose logs nginx

# Nginx 설정 테스트
docker compose exec nginx nginx -t

# Nginx 프로세스 확인
docker compose exec nginx ps aux | grep nginx
```

---

## 🔍 3단계: 로컬 연결 테스트 (서버 내부)

### 서버에서 실행:

```bash
# HTTP 테스트
curl -I http://localhost

# HTTPS 테스트 (인증서 검증 무시)
curl -Ik https://localhost

# Health check
curl http://localhost/health
curl https://localhost/health

# NestJS 직접 접근
curl http://localhost:4000/hello
```

### ✅ 확인 사항:

- [ ] `http://localhost` 응답 있나? (301 Redirect 또는 200)
- [ ] `http://localhost:4000/hello` NestJS 응답 있나?
- [ ] `/health` 엔드포인트 응답 있나?

### ❌ 응답 없으면:

**NestJS 응답 없음:**
```bash
# App 컨테이너 로그
docker compose logs app --tail=100

# App이 4000 포트로 리스닝하는지 확인
docker compose exec app netstat -tln | grep 4000
```

**Nginx 응답 없음:**
```bash
# Nginx 로그
docker compose logs nginx

# Nginx 설정 확인
docker compose exec nginx cat /etc/nginx/conf.d/default.conf
```

---

## 🔍 4단계: 방화벽 확인

### 서버에서 실행:

```bash
# 방화벽 상태 확인
sudo ufw status

# 또는 iptables
sudo iptables -L -n -v | grep -E '80|443'

# firewalld (CentOS/Oracle Linux)
sudo firewall-cmd --list-all
```

### ✅ 확인 사항:

- [ ] 80 포트가 ALLOW 상태인가?
- [ ] 443 포트가 ALLOW 상태인가?

### ❌ 차단되어 있다면:

#### UFW (Ubuntu/Debian):
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

#### firewalld (CentOS/Oracle Linux):
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

#### iptables:
```bash
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save
```

---

## 🔍 5단계: 클라우드 보안 그룹 확인

Oracle Cloud 사용 중이신 것 같습니다 (`/home/opc`).

### Oracle Cloud Console에서:

1. **Compute** > **Instances** > 해당 인스턴스 클릭
2. **Virtual Cloud Network** 클릭
3. **Security Lists** 확인
4. **Ingress Rules** (인바운드 규칙) 확인

#### 필요한 규칙:

| Source CIDR | Protocol | Port Range | 설명 |
|-------------|----------|------------|------|
| 0.0.0.0/0 | TCP | 22 | SSH |
| 0.0.0.0/0 | TCP | 80 | HTTP |
| 0.0.0.0/0 | TCP | 443 | HTTPS |

### ✅ 확인 사항:

- [ ] HTTP (80) 포트가 열려있나?
- [ ] HTTPS (443) 포트가 열려있나?
- [ ] Source가 `0.0.0.0/0` (모든 IP 허용)인가?

---

## 🔍 6단계: DNS 확인

### 로컬(Windows)에서 실행:

```powershell
# DNS 확인
nslookup api.mecipe.com

# 예상 출력:
# Name:    api.mecipe.com
# Address: 서버_공인_IP
```

### ✅ 확인 사항:

- [ ] DNS가 올바른 서버 IP를 가리키나?
- [ ] IP가 서버의 공인 IP와 일치하나?

### 서버 공인 IP 확인:

```bash
# 서버에서
curl ifconfig.me
# 또는
curl ipinfo.io/ip
```

---

## 🔍 7단계: SSL 인증서 확인

### 서버에서 실행:

```bash
# SSL 인증서 디렉토리 확인
ls -la certbot/conf/live/

# 인증서 파일 확인
ls -la certbot/conf/live/api.mecipe.com/

# 예상 파일:
# fullchain.pem
# privkey.pem
# chain.pem
```

### ✅ 확인 사항:

- [ ] `certbot/conf/live/api.mecipe.com/` 디렉토리가 존재하나?
- [ ] `fullchain.pem`, `privkey.pem` 파일이 존재하나?

### ❌ 인증서가 없다면:

```bash
# SSL 초기 설정 실행
./scripts/init-ssl.sh

# 또는 수동으로
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@mecipe.com \
  --agree-tos \
  --no-eff-email \
  -d api.mecipe.com

# Nginx 재시작
docker compose restart nginx
```

---

## 🔍 8단계: Nginx 설정 확인

### 서버에서 실행:

```bash
# 생성된 Nginx 설정 확인
docker compose exec nginx cat /etc/nginx/conf.d/default.conf

# 도메인이 올바르게 설정되었는지 확인
docker compose exec nginx cat /etc/nginx/conf.d/default.conf | grep server_name

# 예상 출력:
# server_name api.mecipe.com www.api.mecipe.com;
```

### ✅ 확인 사항:

- [ ] `server_name`이 `api.mecipe.com`인가?
- [ ] `proxy_pass`가 `http://app:4000`인가?
- [ ] SSL 인증서 경로가 올바른가?

### Nginx 설정 테스트:

```bash
docker compose exec nginx nginx -t

# 예상 출력:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## 🔍 9단계: 외부 접속 테스트

### 로컬(Windows)에서 실행:

```powershell
# HTTP 테스트
curl http://api.mecipe.com

# HTTPS 테스트
curl https://api.mecipe.com

# Health check
curl https://api.mecipe.com/health

# 브라우저에서
# https://api.mecipe.com/health
```

### ✅ 확인 사항:

- [ ] HTTP로 접속 시 HTTPS로 리다이렉트 되나?
- [ ] HTTPS로 접속 시 정상 응답 있나?
- [ ] 브라우저 주소창에 자물쇠 아이콘이 있나?

---

## 🔍 10단계: 로그 확인

### 서버에서 실행:

```bash
# 전체 로그 확인
docker compose logs --tail=100

# App 로그
docker compose logs app --tail=50

# Nginx 로그
docker compose logs nginx --tail=50

# 에러만 필터링
docker compose logs | grep -i error
docker compose logs | grep -i failed
```

---

## 🚨 일반적인 문제 및 해결

### 문제 1: "Connection refused"

**원인:**
- 컨테이너가 실행 중이지 않음
- 포트가 열려있지 않음

**해결:**
```bash
docker compose ps
docker compose logs app
sudo netstat -tulpn | grep -E ':80|:443'
```

### 문제 2: "502 Bad Gateway"

**원인:**
- Nginx는 실행 중이지만 NestJS가 응답 안 함

**해결:**
```bash
# NestJS 컨테이너 상태 확인
docker compose ps app

# NestJS 로그 확인
docker compose logs app

# 재시작
docker compose restart app
```

### 문제 3: "SSL certificate problem"

**원인:**
- SSL 인증서가 없거나 잘못됨

**해결:**
```bash
# SSL 인증서 확인
ls -la certbot/conf/live/api.mecipe.com/

# 재발급
./scripts/init-ssl.sh
```

### 문제 4: "Name or service not known"

**원인:**
- DNS가 설정되지 않았거나 전파 안 됨

**해결:**
```bash
# DNS 확인
nslookup api.mecipe.com

# 가비아 DNS 설정 재확인
```

### 문제 5: Oracle Cloud에서 접속 안 됨

**원인:**
- 보안 그룹/Security List에서 포트 차단

**해결:**
- Oracle Cloud Console > Networking > Virtual Cloud Networks
- Security Lists > Ingress Rules
- 80, 443 포트 추가

---

## 📋 빠른 진단 스크립트

서버에서 이 스크립트 실행:

```bash
#!/bin/bash

echo "=== 배포 상태 진단 ==="
echo ""

echo "1. 컨테이너 상태:"
docker compose ps
echo ""

echo "2. 포트 리스닝:"
sudo netstat -tulpn | grep -E ':80|:443|:4000'
echo ""

echo "3. 로컬 연결 테스트:"
curl -I http://localhost 2>&1 | head -5
echo ""

echo "4. Health check:"
curl http://localhost/health 2>&1
echo ""

echo "5. NestJS 직접 접근:"
curl http://localhost:4000/hello 2>&1 | head -5
echo ""

echo "6. SSL 인증서:"
ls -la certbot/conf/live/ 2>&1 | tail -5
echo ""

echo "7. 환경 변수:"
cat .env | grep -E 'DOMAIN_NAME|PORT' | head -5
echo ""

echo "8. 최근 로그 (에러):"
docker compose logs --tail=20 | grep -i error
echo ""

echo "=== 진단 완료 ==="
```

---

## 🎯 체크리스트 요약

### 필수 확인 사항:

1. **컨테이너 실행 중** ✅
   ```bash
   docker compose ps
   # 모두 Up 상태여야 함
   ```

2. **포트 열림** ✅
   ```bash
   sudo netstat -tulpn | grep -E ':80|:443'
   # nginx가 80, 443 리스닝
   ```

3. **방화벽 허용** ✅
   ```bash
   sudo ufw status
   # 80, 443 ALLOW
   ```

4. **클라우드 보안 그룹** ✅
   - Oracle Cloud Security List
   - 80, 443 인바운드 허용

5. **DNS 설정** ✅
   ```bash
   nslookup api.mecipe.com
   # 서버 IP 확인
   ```

6. **SSL 인증서** ✅
   ```bash
   ls certbot/conf/live/api.mecipe.com/
   # fullchain.pem, privkey.pem 존재
   ```

7. **환경 변수** ✅
   ```bash
   cat .env | grep DOMAIN_NAME
   # DOMAIN_NAME=api.mecipe.com
   ```

8. **로그 확인** ✅
   ```bash
   docker compose logs --tail=50
   # 에러 메시지 확인
   ```

---

## 💡 가장 흔한 원인 TOP 3

### 1위: 클라우드 보안 그룹 미설정 (70%)

→ Oracle Cloud Console에서 80, 443 포트 열기

### 2위: SSL 인증서 미발급 (20%)

→ `./scripts/init-ssl.sh` 실행

### 3위: DNS 미전파 (10%)

→ 가비아 DNS 설정 확인 및 전파 대기

---

## 🆘 긴급 디버깅 명령어 모음

```bash
# 한 번에 복사해서 실행
echo "=== Quick Debug ===" && \
docker compose ps && \
echo "" && \
sudo netstat -tulpn | grep -E ':80|:443' && \
echo "" && \
curl -I http://localhost 2>&1 | head -3 && \
echo "" && \
docker compose logs app --tail=10 && \
echo "" && \
docker compose logs nginx --tail=10
```

결과를 공유해주시면 정확한 문제를 찾을 수 있습니다!

