# Human Plus 웹사이트 배포 가이드

이 문서는 Human Plus 웹사이트를 아파치 서버에 배포하는 방법을 설명합니다.

## 시스템 요구사항

- Apache 2.4 이상
- Node.js 14 이상
- npm 6 이상
- PM2 (Node.js 프로세스 관리자)

## 설치 단계

### 1. 필요한 패키지 설치

```bash
# 아파치 서버 설치 (Ubuntu/Debian)
sudo apt update
sudo apt install apache2

# 필요한 아파치 모듈 활성화
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
sudo a2enmod expires
sudo a2enmod ssl

# Node.js 설치 (필요한 경우)
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 설치
sudo npm install -g pm2

# 방화벽 설정 (필요한 경우)
sudo ufw allow 'Apache Full'
```

### 2. 프로젝트 배포

```bash
# 웹사이트 파일 디렉토리 생성
sudo mkdir -p /var/www/humanplus

# 파일 권한 설정
sudo chown -R $USER:$USER /var/www/humanplus

# 프로젝트 파일 복사
cp -R /path/to/humanplus_page-main/* /var/www/humanplus/

# 디렉토리 이동
cd /var/www/humanplus

# 의존성 설치
npm install

# .env 파일 설정 (예시)
echo "OPENAI_API_KEY=your_api_key_here
OPENAI_API_ENDPOINT=https://api.openai.com/v1
UPDATE_SCHEDULE=\"0 0 * * *\"
NODE_ENV=production
PORT=3000" > .env
```

### 3. 아파치 설정

```bash
# 아파치 설정 파일 복사
sudo cp apache-config.conf /etc/apache2/sites-available/humanplus.conf

# 사이트 활성화
sudo a2ensite humanplus.conf

# 기본 사이트 비활성화 (선택 사항)
sudo a2dissite 000-default.conf

# 아파치 설정 테스트
sudo apache2ctl configtest

# 아파치 재시작
sudo systemctl restart apache2
```

### 4. PM2로 Node.js 애플리케이션 시작

```bash
# PM2로 애플리케이션 시작
cd /var/www/humanplus
pm2 start server.js --name="humanplus"

# PM2 시작 프로그램 등록
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
pm2 save

# 상태 확인
pm2 status
```

### 5. SSL 인증서 설정 (선택 사항)

```bash
# Let's Encrypt 인증서 설치 (Ubuntu/Debian)
sudo apt install certbot python3-certbot-apache

# 인증서 발급
sudo certbot --apache -d humanplus.example.com -d www.humanplus.example.com

# 인증서 자동 갱신 확인
sudo certbot renew --dry-run
```

## 유지보수

### 로그 확인

```bash
# 아파치 로그 확인
sudo tail -f /var/log/apache2/humanplus-error.log
sudo tail -f /var/log/apache2/humanplus-access.log

# Node.js 애플리케이션 로그 확인
pm2 logs humanplus
```

### 애플리케이션 업데이트

```bash
# 코드 업데이트
cd /var/www/humanplus
git pull  # 또는 새 파일 복사

# 의존성 업데이트
npm install

# 애플리케이션 재시작
pm2 restart humanplus
```

### 콘텐츠 자동 업데이트 확인

웹사이트는 매일 자정에 자동으로 새로운 콘텐츠를 생성합니다. 이 기능이 제대로 작동하는지 확인하려면:

```bash
# 스케줄러 상태 확인
curl http://localhost:3000/api/scheduler/status

# 수동으로 콘텐츠 업데이트 실행
curl -X POST http://localhost:3000/api/scheduler/run

# 로그 확인
pm2 logs humanplus
```

## 문제 해결

1. **아파치 서버가 시작되지 않는 경우**
   ```bash
   sudo systemctl status apache2
   sudo journalctl -xe
   ```

2. **Node.js 애플리케이션이 실행되지 않는 경우**
   ```bash
   pm2 logs humanplus
   ```

3. **프록시 연결 오류**
   - 아파치 모듈이 활성화되어 있는지 확인: `sudo a2enmod proxy proxy_http`
   - 포트가 방화벽에서 열려 있는지 확인: `sudo ufw status`

4. **콘텐츠 업데이트가 작동하지 않는 경우**
   - .env 파일에 올바른 OPENAI_API_KEY가 설정되어 있는지 확인
   - 로그 확인: `pm2 logs humanplus` 또는 `/var/www/humanplus/logs/combined.log` 