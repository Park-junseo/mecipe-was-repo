# Oracle Cloud 설정 가이드

Oracle Cloud에서 배포 시 추가로 필요한 설정입니다.

## 🔧 1. 보안 그룹 (Security List) 설정

Oracle Cloud는 기본적으로 **모든 포트가 차단**되어 있습니다!

### 설정 방법:

#### 1단계: Oracle Cloud Console 접속

1. https://cloud.oracle.com/ 로그인
2. **Compute** > **Instances** 클릭
3. 해당 인스턴스 클릭

#### 2단계: VCN (Virtual Cloud Network) 확인

1. 인스턴스 상세 페이지에서 **Primary VNIC** 섹션 찾기
2. **Subnet** 링크 클릭
3. **Security Lists** 클릭

#### 3단계: Ingress Rules (인바운드 규칙) 추가

**Add Ingress Rules** 버튼 클릭

##### HTTP (포트 80):
```
Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Source Port Range: (leave blank)
Destination Port Range: 80
Description: HTTP for web traffic
```

##### HTTPS (포트 443):
```
Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Source Port Range: (leave blank)
Destination Port Range: 443
Description: HTTPS for secure web traffic
```

#### 4단계: 저장

**Add Ingress Rules** 버튼 클릭

### 최종 Ingress Rules:

```
┌──────────────┬──────────┬─────────────┬──────┬─────────────┐
│ Source       │ Protocol │ Source Port │ Dest │ Description │
├──────────────┼──────────┼─────────────┼──────┼─────────────┤
│ 0.0.0.0/0    │ TCP      │ All         │ 22   │ SSH         │
│ 0.0.0.0/0    │ TCP      │ All         │ 80   │ HTTP        │
│ 0.0.0.0/0    │ TCP      │ All         │ 443  │ HTTPS       │
└──────────────┴──────────┴─────────────┴──────┴─────────────┘
```

---

## 🔧 2. OS 방화벽 설정

Oracle Cloud의 OS (Oracle Linux/Ubuntu)에도 **iptables 방화벽**이 활성화되어 있습니다.

### Oracle Linux 7/8:

```bash
# 현재 규칙 확인
sudo iptables -L -n -v

# HTTP, HTTPS 허용
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# 영구 저장
sudo netfilter-persistent save
# 또는
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

### Ubuntu:

```bash
# UFW 사용
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

---

## 🔧 3. SELinux 설정 (Oracle Linux)

Oracle Linux는 SELinux가 활성화되어 있어 포트 바인딩을 차단할 수 있습니다.

### 확인:

```bash
# SELinux 상태 확인
getenforce

# Permissive or Disabled면 OK
# Enforcing이면 설정 필요
```

### 설정:

```bash
# HTTP, HTTPS 포트 허용
sudo semanage port -a -t http_port_t -p tcp 80
sudo semanage port -a -t http_port_t -p tcp 443

# 또는 임시로 Permissive 모드
sudo setenforce 0

# 영구적으로 비활성화 (선택)
sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
```

---

## 🔧 4. 공인 IP 확인

Oracle Cloud에서 인스턴스의 공인 IP 확인:

### Console에서:

1. **Compute** > **Instances**
2. 해당 인스턴스 클릭
3. **Instance Information** 섹션
4. **Public IP Address** 확인

### CLI에서:

```bash
# 서버에서
curl ifconfig.me

# 또는
curl ipinfo.io/ip

# 또는 OCI CLI
oci compute instance list-vnics \
  --instance-id <instance-ocid> \
  --query 'data[0]."public-ip"'
```

---

## 🎯 Oracle Cloud 완전한 체크리스트

### □ 1. Security List (필수!)
- [ ] HTTP (80) Ingress Rule 추가
- [ ] HTTPS (443) Ingress Rule 추가
- [ ] Source CIDR: `0.0.0.0/0`

### □ 2. OS 방화벽
- [ ] iptables에서 80, 443 허용
- [ ] 규칙 영구 저장

### □ 3. SELinux (Oracle Linux만)
- [ ] SELinux 확인
- [ ] 필요시 Permissive 모드

### □ 4. DNS
- [ ] 가비아에서 A 레코드 추가
- [ ] 공인 IP 확인 및 일치 여부

### □ 5. Docker
- [ ] 컨테이너 실행 중 확인
- [ ] 포트 매핑 확인

---

## 🔍 Oracle Cloud 특화 트러블슈팅

### 문제: Security List 추가했는데도 안 됨

**원인:** 
- OS 레벨 방화벽이 여전히 차단

**해결:**
```bash
# iptables 확인
sudo iptables -L INPUT -n --line-numbers

# 80, 443 규칙이 REJECT 규칙보다 위에 있어야 함
# 6번째 줄에 삽입
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# 저장
sudo netfilter-persistent save
```

### 문제: Nginx가 443 포트를 바인딩 못함

**원인:**
- SELinux가 443 포트 바인딩 차단

**해결:**
```bash
# SELinux 로그 확인
sudo ausearch -m AVC -ts recent | grep nginx

# HTTP 포트 추가
sudo semanage port -a -t http_port_t -p tcp 443

# 또는 임시로 비활성화
sudo setenforce 0
```

---

## 🆘 긴급 진단 스크립트 (Oracle Cloud용)

```bash
#!/bin/bash

echo "=== Oracle Cloud 배포 진단 ==="
echo ""

echo "1. 공인 IP:"
curl -s ifconfig.me
echo ""

echo "2. 컨테이너 상태:"
docker compose ps
echo ""

echo "3. iptables 규칙:"
sudo iptables -L INPUT -n --line-numbers | grep -E 'Chain|80|443|REJECT'
echo ""

echo "4. SELinux 상태:"
getenforce 2>/dev/null || echo "SELinux not installed"
echo ""

echo "5. 포트 리스닝:"
sudo netstat -tulpn | grep -E ':80|:443|:4000'
echo ""

echo "6. 로컬 연결:"
curl -I http://localhost 2>&1 | head -3
echo ""

echo "7. Nginx 로그 (최근 10줄):"
docker compose logs nginx --tail=10 2>&1 | tail -10
echo ""

echo "8. App 로그 (최근 10줄):"
docker compose logs app --tail=10 2>&1 | tail -10
echo ""

echo "=== 진단 완료 ==="
```

---

## 📞 지원

이 스크립트 결과를 공유해주시면 정확한 문제를 찾을 수 있습니다!

```bash
# 스크립트 저장
cat > diagnose.sh << 'EOF'
[위의 스크립트 내용]
EOF

# 실행
chmod +x diagnose.sh
./diagnose.sh
```

