# SKKU Seat

성균관대학교 학술정보관 좌석 조회·배정, 층별 배치도, 출입 바코드를 지원하는 비공식 웹앱입니다.

## Docker

```sh
docker build -t skku-seat:1.0.0 .
docker run -d --name skku-seat -p 3000:3000 \
  -e ORIGIN=http://localhost:3000 skku-seat:1.0.0
```

[http://localhost:3000](http://localhost:3000)에서 접속합니다.

배포 시 HTTPS 프록시 뒤에서 실행하고 `ORIGIN`을 실제 서비스 주소로 설정하세요.
체험 모드는 `-e USE_MOCK_API=true`, 신뢰하는 프록시의 실제 IP 헤더는 `-e ADDRESS_HEADER=X-Forwarded-For`로 설정합니다.

종료는 `docker stop skku-seat`, 컨테이너 삭제는 `docker rm skku-seat`입니다.

## 로컬 개발

Node.js 22.17 이상이 필요합니다.

```sh
npm ci
cp .env.example .env
npm run dev
```

검증은 `npm run check && npm test`, 빌드는 `npm run build`, 실행은 `npm start`입니다.
