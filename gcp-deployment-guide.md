# GCP를 이용한 Human Plus 웹사이트 호스팅 가이드

이 문서는 Google Cloud Platform(GCP)을 사용하여 Human Plus 웹사이트를 호스팅하고 외부에서 접근 가능하도록 설정하는 방법을 안내합니다.

## 1. Google Cloud Platform 계정 설정

### 계정 생성 및 프로젝트 설정
1. [Google Cloud Console](https://console.cloud.google.com)에 접속하여 Google 계정으로 로그인
2. 신규 프로젝트 생성:
   - 상단 프로젝트 선택 드롭다운 → "새 프로젝트"
   - 프로젝트 이름: "humanplus-website" 입력
   - "만들기" 클릭
3. 결제 계정 연결:
   - 왼쪽 메뉴 → "결제" → 결제 계정 설정
   - (신규 사용자는 $300 무료 크레딧과 90일 무료 체험 가능)

### API 및 서비스 활성화
1. Google Cloud Console에서 "API 및 서비스" → "API 라이브러리" 이동
2. 다음 API 활성화:
   - Compute Engine API
   - Cloud DNS API
   - Cloud Storage API

## 2. 가상 머신(VM) 인스턴스 생성

### Compute Engine VM 설정
1. 왼쪽 메뉴에서 "Compute Engine" → "VM 인스턴스" 이동
2. "인스턴스 만들기" 클릭
3. 다음과 같이 설정:
   - 이름: `humanplus-web-server`
   - 리전/영역: `asia-northeast3` (서울) 또는 고객 위치에 가까운 리전
   - 머신 구성: E2 시리즈, e2-medium (2 vCPU, 4GB 메모리)
   - 부팅 디스크: 
     - 운영체제: Ubuntu 20.04 LTS
     - 크기: 20GB
   - 방화벽:
     - HTTP 트래픽 허용
     - HTTPS 트래픽 허용
4. "만들기" 클릭

### 외부 고정 IP 할당
1. 왼쪽 메뉴에서 "VPC 네트워크" → "외부 IP 주소" 이동
2. "고정 주소 예약" 클릭
3. 다음과 같이 설정:
   - 이름: `humanplus-web-ip`
   - 리전: VM과 동일한 리전
   - 연결 대상: 방금 생성한 VM 인스턴스 선택
4. "예약" 클릭
5. 할당된 IP 주소 기록 (예: `35.123.456.789`)

## 3. 방화벽 규칙 설정

1. 왼쪽 메뉴에서 "VPC 네트워크" → "방화벽" 이동
2. "방화벽 규칙 만들기" 클릭
3. 다음과 같이 설정:
   - 이름: `allow-web-traffic`
   - 네트워크: default
   - 대상: 지정된 대상 태그
   - 대상 태그: `web-server`
   - 소스 필터: 0.0.0.0/0 (모든 IP)
   - 프로토콜 및 포트:
     - TCP: 80,443,3000 체크
4. "만들기" 클릭
5. VM 인스턴스로 돌아가서 네트워크 태그 추가:
   - VM 인스턴스 선택 → "수정" 클릭
   - 네트워크 태그에 `web-server` 추가
   - "저장" 클릭

## 4. 도메인 설정

### 도메인 구매 (선택 사항)
1. Google Domains, Namecheap, GoDaddy 등의 도메인 등록 업체에서 도메인 구매
2. 본 가이드에서는 `humanplus.example.com` 형식으로 표기 (실제 도메인으로 대체 필요)

### Cloud DNS 설정
1. Google Cloud Console에서 "네트워크 서비스" → "Cloud DNS" 이동
2. "영역 만들기" 클릭
3. 다음과 같이 설정:
   - 영역 유형: 공개
   - 영역 이름: `humanplus-zone`
   - DNS 이름: 구매한 도메인 (예: `example.com.`)
   - DNSSEC: 꺼짐
4. "만들기" 클릭
5. 영역 선택 후 "레코드 세트 추가" 클릭
6. A 레코드 추가:
   - DNS 이름: `@` (루트 도메인) 또는 `www`
   - 리소스 레코드 유형: A
   - TTL: 300
   - IP 주소: 위에서 할당한 고정 IP 입력
7. "만들기" 클릭
8. NS 레코드 정보를 도메인 등록 업체에 설정 (도메인 등록 업체 대시보드에서 네임서버 변경)

## 5. VM에 웹 서버 설치 및 구성

### VM 인스턴스 접속
1. Google Cloud Console에서 Compute Engine → VM 인스턴스로 이동
2. 방금 생성한 VM 옆의 "SSH" 버튼 클릭 (브라우저 기반 SSH 연결)

### 기본 패키지 설치
```bash
# 시스템 패키지 업데이트
sudo apt-get update
sudo apt-get upgrade -y

# 필수 패키지 설치
sudo apt-get install -y git curl wget unzip build-essential

# Node.js 설치 (14.x)
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs

# npm 업데이트
sudo npm install -g npm

# PM2 설치
sudo npm install -g pm2

# Apache 설치
sudo apt-get install -y apache2
```

### Apache 모듈 활성화
```bash
# 필요한 Apache 모듈 활성화
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod expires
sudo a2enmod ssl
sudo a2enmod rewrite

# Apache 재시작
sudo systemctl restart apache2
```

### 방화벽 확인
```bash
# Ubuntu 기본 방화벽 설정
sudo ufw allow 'Apache Full'
sudo ufw allow 3000
sudo ufw status
```

## 6. 프로젝트 배포

### 프로젝트 파일 준비
1. 프로젝트 코드 복제:
```bash
# 웹사이트 디렉토리 생성
sudo mkdir -p /var/www/humanplus
sudo chown -R $USER:$USER /var/www/humanplus

# 프로젝트 파일 다운로드 (예시: GitHub에서 다운로드)
cd /var/www/humanplus

# 직접 업로드 대신 Git에서 클론하는 경우
# git clone https://github.com/yourusername/humanplus_page.git .

# 개인 컴퓨터에서 Cloud Shell로 파일 업로드하고 VM으로 전송하는 방법도 가능
```

2. 수동으로 파일 업로드 (선택 사항):
   - 개인 컴퓨터에서 `gcloud` 명령어 사용하여 파일 전송:
   ```bash
   # 로컬에서 실행 (개인 컴퓨터)
   gcloud compute scp --recurse /path/to/humanplus_page/* humanplus-web-server:/var/www/humanplus
   ```

### 의존성 설치 및 환경 설정
```bash
cd /var/www/humanplus

# 의존성 설치
npm install

# .env 파일 생성
cat > .env << EOF
OPENAI_API_KEY=your_api_key_here
OPENAI_API_ENDPOINT=https://api.openai.com/v1
UPDATE_SCHEDULE="0 0 * * *"
NODE_ENV=production
PORT=3000
EOF

# 초기화 스크립트 실행
node scripts/init.js
```

### Apache 가상 호스트 설정
```bash
# Apache 설정 파일 생성
sudo tee /etc/apache2/sites-available/humanplus.conf > /dev/null << EOF
<VirtualHost *:80>
    ServerName humanplus.example.com
    ServerAlias www.humanplus.example.com
    
    ServerAdmin webmaster@example.com
    DocumentRoot /var/www/humanplus
    
    ErrorLog \${APACHE_LOG_DIR}/humanplus-error.log
    CustomLog \${APACHE_LOG_DIR}/humanplus-access.log combined
    
    <Location /api>
        ProxyPass http://localhost:3000/api
        ProxyPassReverse http://localhost:3000/api
    </Location>
    
    <Directory /var/www/humanplus>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
EOF

# 사이트 활성화 및 기본 사이트 비활성화
sudo a2dissite 000-default.conf
sudo a2ensite humanplus.conf

# Apache 구성 테스트
sudo apache2ctl configtest

# Apache 재시작
sudo systemctl restart apache2
```

### Node.js 애플리케이션 시작
```bash
cd /var/www/humanplus

# PM2로 서버 시작
pm2 start server.js --name="humanplus"

# 시스템 재시작시 자동 시작 설정
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
pm2 save

# 상태 확인
pm2 status
```

## 7. SSL 인증서 설정 (Let's Encrypt)

### Let's Encrypt 설치 및 인증서 발급
```bash
# Certbot 설치
sudo apt-get install -y certbot python3-certbot-apache

# 인증서 발급
sudo certbot --apache -d humanplus.example.com -d www.humanplus.example.com

# 프롬프트 지시 따라 이메일 입력 및 약관 동의
# "Redirect - Make all requests redirect to secure HTTPS access" 옵션 선택

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

## 8. 최종 확인 및 테스트

### 웹사이트 접속 확인
1. 웹 브라우저에서 `https://humanplus.example.com` 접속
2. 페이지가 올바르게 로드되는지 확인
3. API 엔드포인트 확인:
   ```bash
   curl https://humanplus.example.com/api/scheduler/status
   ```

### 스케줄러 작동 확인
```bash
# 스케줄러 상태 확인
curl http://localhost:3000/api/scheduler/status

# 수동으로 콘텐츠 업데이트 실행 (테스트용)
curl -X POST http://localhost:3000/api/scheduler/run

# 로그 확인
pm2 logs humanplus
```

## 9. 유지 보수 및 백업

### 로그 모니터링
```bash
# Apache 로그 확인
sudo tail -f /var/log/apache2/humanplus-error.log
sudo tail -f /var/log/apache2/humanplus-access.log

# Node.js 애플리케이션 로그 확인
pm2 logs humanplus
```

### 자동 백업 설정 (선택 사항)
1. Cloud Storage 버킷 생성:
   - Google Cloud Console → Storage → 버킷 만들기
   - 이름: `humanplus-backups`
   - 위치 유형: 리전 (VM과 동일한 리전)
   - 스토리지 클래스: Standard
   - 액세스 제어: 균일한 액세스 제어

2. 백업 스크립트 생성:
```bash
# 백업 스크립트 생성
cat > /var/www/humanplus/backup.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_DIR="/tmp/humanplus-backup-$TIMESTAMP"
BUCKET_NAME="humanplus-backups"

# 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

# 웹사이트 파일 복사
cp -r /var/www/humanplus/* $BACKUP_DIR/
find $BACKUP_DIR -name "node_modules" -type d -exec rm -rf {} +

# 백업 파일 압축
cd /tmp
tar -czf "humanplus-backup-$TIMESTAMP.tar.gz" "humanplus-backup-$TIMESTAMP"

# Cloud Storage에 업로드
gsutil cp "humanplus-backup-$TIMESTAMP.tar.gz" "gs://$BUCKET_NAME/"

# 임시 파일 정리
rm -rf "$BACKUP_DIR"
rm "humanplus-backup-$TIMESTAMP.tar.gz"

echo "Backup completed: humanplus-backup-$TIMESTAMP.tar.gz"
EOF

# 실행 권한 부여
chmod +x /var/www/humanplus/backup.sh

# cron에 등록 (매일 새벽 3시 실행)
(crontab -l 2>/dev/null; echo "0 3 * * * /var/www/humanplus/backup.sh") | crontab -
```

## 10. 문제 해결

### 일반적인 문제 해결 방법
1. **웹사이트가 로드되지 않는 경우**
   - 방화벽 규칙 확인: GCP Console → VPC 네트워크 → 방화벽
   - Apache 상태 확인: `sudo systemctl status apache2`
   - Node.js 애플리케이션 상태 확인: `pm2 status`

2. **SSL 인증서 문제**
   - Certbot 인증서 갱신: `sudo certbot renew`
   - Apache SSL 설정 확인: `sudo nano /etc/apache2/sites-available/humanplus-le-ssl.conf`

3. **API 엔드포인트 접근 불가**
   - Node.js 애플리케이션 로그 확인: `pm2 logs humanplus`
   - 프록시 설정 확인: `sudo nano /etc/apache2/sites-available/humanplus.conf`

4. **스케줄러가 작동하지 않는 경우**
   - .env 파일에 올바른 OPENAI_API_KEY가 설정되어 있는지 확인
   - 로그 확인: `pm2 logs humanplus` 또는 `/var/www/humanplus/logs/combined.log`
   - 스케줄러 상태 확인: `curl http://localhost:3000/api/scheduler/status`

### 성능 모니터링
- Google Cloud Console → Compute Engine → VM 인스턴스 → 모니터링 탭
- PM2 모니터링: `pm2 monit`
- Apache 서버 상태: `sudo systemctl status apache2`

## 11. 보안 강화 (선택 사항)

### 방화벽 강화
```bash
# 필요한 포트만 열어두기
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Apache Full'
sudo ufw enable
```

### SSH 보안 강화
1. SSH 구성 파일 수정:
```bash
sudo nano /etc/ssh/sshd_config
```

2. 다음 설정 변경:
```
PermitRootLogin no
PasswordAuthentication no
```

3. SSH 서비스 재시작:
```bash
sudo systemctl restart sshd
```

### 자동 보안 업데이트 설정
```bash
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 12. 스케줄러 자동 실행 설정

### PM2로 스케줄러 관리
```bash
# GCP VM에서 실행
cd /var/www/humanplus

# PM2로 서버와 함께 스케줄러도 관리
pm2 start scripts/scheduler-cli.js --name="humanplus-scheduler" -- start

# 상태 확인
pm2 status

# 로그 확인
pm2 logs humanplus-scheduler

# 시스템 재시작시 자동 시작 설정 (서버 설정과 함께)
pm2 save
```

### 스케줄러 상태 및 제어
스케줄러는 다음과 같은 방법으로 제어 및 모니터링할 수 있습니다:

1. **명령줄 인터페이스(CLI)**
```bash
# 상태 확인
node scripts/scheduler-cli.js status --verbose

# 수동 실행
node scripts/scheduler-cli.js run

# 중지
node scripts/scheduler-cli.js stop

# 시작 (다른 일정으로)
node scripts/scheduler-cli.js start --schedule "0 */4 * * *"  # 4시간마다 실행
```

2. **API 엔드포인트**
```bash
# 상태 확인
curl https://humanplus.example.com/api/scheduler/status

# 수동 실행
curl -X POST https://humanplus.example.com/api/scheduler/run

# 중지
curl -X POST https://humanplus.example.com/api/scheduler/stop

# 시작
curl -X POST -H "Content-Type: application/json" \
  -d '{"schedule":"0 */6 * * *"}' \
  https://humanplus.example.com/api/scheduler/start
```

### 스케줄러 로그 모니터링
스케줄러 활동은 다음 파일에서 확인할 수 있습니다:
```bash
# 일반 로그
tail -f /var/www/humanplus/logs/combined.log

# 에러 로그
tail -f /var/www/humanplus/logs/error.log

# 스케줄러 상태 파일
cat /var/www/humanplus/logs/scheduler-status.json
```

### 문제 해결
스케줄러 실행 문제 해결 방법:
1. API 키 설정 확인: `.env` 파일 내 `OPENAI_API_KEY` 값이 올바르게 설정되었는지 확인
2. 스케줄러 상태 확인: `node scripts/scheduler-cli.js status --verbose`
3. 로그 파일 검사: `/var/www/humanplus/logs/error.log`에서 오류 확인
4. OpenAI API 연결 테스트: `curl -X POST https://humanplus.example.com/api/scheduler/run`으로 수동 실행 후 로그 확인

### 커스텀 알림 설정 (선택 사항)
스케줄러 실행 실패 시 이메일 알림 설정:
```bash
# 알림 스크립트 생성
cat > /var/www/humanplus/scripts/monitor-scheduler.sh << 'EOF'
#!/bin/bash
STATUS_FILE="/var/www/humanplus/logs/scheduler-status.json"
EMAIL="admin@example.com"

if [ ! -f "$STATUS_FILE" ]; then
  echo "스케줄러 상태 파일이 없습니다" | mail -s "Human Plus 스케줄러 알림" $EMAIL
  exit 1
fi

# 마지막 실행 시간 확인
LAST_RUN=$(grep -o '"lastRun":"[^"]*' "$STATUS_FILE" | cut -d'"' -f4)
if [ -z "$LAST_RUN" ]; then
  echo "스케줄러가 아직 실행된 적이 없습니다" | mail -s "Human Plus 스케줄러 알림" $EMAIL
  exit 1
fi

# 24시간 이상 지났는지 확인
LAST_RUN_TIMESTAMP=$(date -d "$LAST_RUN" +%s)
NOW=$(date +%s)
DIFF=$((NOW - LAST_RUN_TIMESTAMP))

if [ $DIFF -gt 86400 ]; then
  echo "스케줄러가 24시간 이상 실행되지 않았습니다. 마지막 실행: $LAST_RUN" | \
  mail -s "Human Plus 스케줄러 알림" $EMAIL
fi

# 오류 확인
if grep -q '"success":false' "$STATUS_FILE"; then
  echo "스케줄러 실행에 오류가 발생했습니다. 상태 파일을 확인하세요." | \
  mail -s "Human Plus 스케줄러 오류" $EMAIL
fi
EOF

# 실행 권한 부여
chmod +x /var/www/humanplus/scripts/monitor-scheduler.sh

# cron에 등록 (매일 새벽 5시 실행)
(crontab -l 2>/dev/null; echo "0 5 * * * /var/www/humanplus/scripts/monitor-scheduler.sh") | crontab - 