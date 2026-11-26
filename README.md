# SKKU Seat (SvelteKit)

성균관대학교 학술정보관 열람실 좌석 배정을 빠르게 이용하기 위한 비공식 웹 프로토타입입니다. 상위 폴더의 React Native/Expo 앱의 핵심 기능을 SvelteKit으로 옮긴 것이며, 이 폴더만으로 독립 실행됩니다. **성균관대학교 또는 학술정보관의 공식 앱이 아닙니다.**

## 구현 범위

- 로그인 / 로그아웃 / 세션 만료 처리
- 캠퍼스(인문사회·자연과학) 전환, 열람실 목록, 현재 이용 좌석
- 열람실 상세와 전체 좌석의 이용 가능 / 사용 중 표시 (상태가 없는 좌석은 좌석 상세로 점진 조회)
- 구역형 열람실 묶음: 같은 지점·층에서 `이름 숫자` 형태(예: `[B1] A열람실 1`, `… 2`, `… 3 (노트북)`; 뒤의 괄호 설명은 허용)인 열람실을 하나의 카드로 합치고 구역별 잔여(`1구역 76/210`, `2구역 32/78` …)를 보여 줍니다. 카드를 누르면 구역 전체가 한 페이지(`/rooms/<첫 구역 id>`)에 열립니다. 3층은 묶지 않으며, 구역이 하나뿐이거나 이름 규칙에 맞지 않는 열람실도 단독 표시됩니다(`src/lib/rooms.ts`의 `UNGROUPED_FLOORS`, `NUMBERED_NAME`).
- 열람실 목록은 지하 → 4층 순으로 정렬해 두 칸씩 보여 줍니다.
- 열람실 상세의 좌석 격자는 한 줄에 5개씩 표시하고, 좌석번호 검색과 `빈좌석만` 토글(필터 초기화 포함)을 지원합니다.
- 양쪽 캠퍼스 열람실은 `번호 | 배치도` 토글로 실제 배치도 위에 좌석 상태를 볼 수 있습니다(자연과학 17곳, 인문사회과학 11곳). 구역이 여럿이면(`1구역 / 2구역 / 3구역`) 탭으로 한 구역씩 보여 주고, `+ / − / 전체` 버튼과 두 손가락 확대로 폰에서 번호가 읽히도록 줌합니다. 검색·`빈좌석만` 필터는 배치도에서도 적용됩니다.
    - 자연과학: 공식 배경 이미지(`static/seatmaps/*.jpg`)에 의자가 이미 그려져 있어 그 위에 번호 배지만 올립니다.
    - 인문사회과학: 완성된 배경 이미지가 없어(반복 바닥 타일뿐) 바닥 타일 + 기둥·벽·출입문·방향 화살표를 직접 그리고 좌석을 직사각형 칩으로 그립니다. 공식 화면의 파랑/초록(오픈형/칸막이) 색은 쓰지 않고 이 앱의 이용 가능/사용 중 색을 씁니다. 회전된 좌석은 좌표에 각도가 없어 가로 칩으로 그려집니다.
    - 좌표 데이터는 `src/lib/seatmaps.json`입니다.
- 좌석 상세 확인 후에만 수행되는 명시적 좌석 배정
- 입실 대기(게이트) 안내, 예약 취소·좌석 반납(확인 창 포함)
- 입실 대기 중에만 포그라운드 10초 간격 현재 좌석 갱신
- 학교 서버를 호출하지 않는 mock 모드

좌석 연장, 즐겨찾기는 서비스 동작이 확인되지 않아 포함하지 않았습니다. 배치도는 공식 사이트 화면의 좌석 위치를 옮긴 정적 데이터이며, 열람실 이름이 같은 경우에만 연결됩니다(좌석 번호가 배치도에 없거나 API 목록에 없는 좌석은 선택할 수 없는 흰색 표시). 인문사회과학 `학부열람실 B`의 148·98번처럼 한 번호가 두 위치에 있는 경우 두 위치 모두 같은 좌석으로 연결됩니다.

## 실행

Node.js 22.17 이상이 필요합니다(`.nvmrc` 참고).

```bash
nvm use
npm install
cp .env.example .env   # 설정 파일 생성 (.env 는 git 에 올라가지 않음)
npm run dev            # http://localhost:5173
```

설정은 `.env` 파일에서 바꿉니다.

```dotenv
# true: 학교 서버를 호출하지 않는 mock 모드 (아무 ID/비밀번호로 로그인)
# false: 실제 학교 서버에 로그인
USE_MOCK_API=false
```

값을 바꾼 뒤에는 `npm run dev`를 다시 시작하세요.

프로덕션:

```bash
npm run build
ORIGIN=https://your.domain ADDRESS_HEADER=X-Forwarded-For npm start
```

반드시 HTTPS로 서비스하세요. `adapter-node`는 TLS를 직접 처리하지 않으므로 Caddy/nginx 같은 프록시나 HTTPS를 제공하는 호스팅이 필요합니다.

### 배포 환경변수

| 변수 | 의미 | 필요한 경우 |
| --- | --- | --- |
| `ORIGIN` | 사용자가 실제로 접속하는 주소 (예: `https://seat.example.com`) | 프로덕션 전체. 없으면 로그인/로그아웃 같은 POST가 CSRF 검사에서 403으로 막힐 수 있음 |
| `ADDRESS_HEADER` | 접속자 실제 IP가 담긴 헤더 이름 | 리버스 프록시 뒤. 없으면 모든 사용자가 프록시 IP 하나로 보여 로그인 시도 제한이 전체에 걸림 |
| `USE_MOCK_API` | `true`이면 학교 서버 호출 없이 mock 동작 | 개발/데모 |

로컬 `npm run dev`에서는 `ORIGIN`과 `ADDRESS_HEADER`가 필요 없습니다.

Cloudflare를 쓰는 경우:

- **DNS only(회색 구름)**: 트래픽이 Cloudflare를 거치지 않습니다. 서버 앞에 Caddy/nginx를 두고 `ORIGIN`과 `ADDRESS_HEADER=X-Forwarded-For`를 설정하세요.
- **Proxied(주황 구름)**: `ORIGIN=https://내도메인 ADDRESS_HEADER=CF-Connecting-IP`로 설정하세요.

```bash
npm run check      # 타입 체크
npm test           # 단위 테스트
```

## 로그인 구조

브라우저는 `lib.skku.edu`를 직접 호출할 수 없으므로(CORS, `Origin`/`Referer` 헤더 제한, `Set-Cookie` 읽기 불가) SvelteKit 서버가 얇은 중계(BFF) 역할을 합니다.

```
브라우저 ──(form POST /login)──▶ SvelteKit 서버 ──(POST /api/auth/login)──▶ lib.skku.edu
        ◀─(httpOnly 세션 쿠키)───                ◀─(accessToken)──────────
```

- **토큰은 JS에서 읽을 수 없음**: 도서관 access token은 `httpOnly; SameSite=Lax` 쿠키(HTTPS에서는 `Secure`)에만 담기며, 모든 도서관 API 호출은 서버에서 수행됩니다. 클라이언트로는 화면에 필요한 최소 DTO만 내려갑니다. 출입 바코드 페이지는 로그인한 계정의 인쇄용 회원번호만 학교 응답에서 가져옵니다.
- **서버는 무상태**: 비밀번호·토큰을 DB/파일/메모리/로그에 저장하지 않습니다. 비밀번호는 로그인 요청 body로만 쓰이고, 실패 응답에도 되돌려 보내지 않으며, 클라이언트 입력값은 요청이 끝나면 비웁니다.
- **토큰 추출**: 로그인 응답 JSON의 `accessToken`을 우선 사용하고, 없으면 `Set-Cookie`의 `LOPE_PYXIS3` 값에서 꺼냅니다(`src/lib/server/token.ts`, 단위 테스트 포함).
- **세션 수명과 만료**: 쿠키 수명은 로그인 시점부터 7일 고정이며(`src/lib/server/session.ts`), 사용할 때마다 연장되지 않습니다. 7일은 임의로 정한 값이고 학교 서버의 실제 토큰 만료 시간은 확인되지 않았습니다. 어느 요청이든 도서관이 인증 오류를 돌려주면 쿠키를 지우고 `/login?expired=1`로 이동합니다. 오프라인/서버 장애는 세션을 유지한 채 재시도 화면을 보여줍니다.
- **토큰 리프레시는 없음**: 리프레시 API가 확인되지 않았으므로 구현하지 않았고, 비밀번호를 저장하지 않으므로 자동 재로그인도 하지 않습니다. 만료되면 다시 로그인해야 합니다.
- **로그아웃**: 도서관 로그아웃을 시도하고, 성공 여부와 무관하게 쿠키를 항상 지웁니다.
- **무차별 대입 방지**: IP당 10분에 8회 실패하면 잠시 차단합니다(인메모리). 네트워크 오류는 횟수에 포함하지 않습니다.
- **CSRF**: 상태를 바꾸는 모든 요청은 `Sec-Fetch-Site`/`Origin` 검사로 동일 출처만 허용합니다.
- **보안 헤더**: CSP, `Cache-Control: no-store`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: same-origin`.

**실제 ID, 비밀번호, 토큰을 `.env`, 소스, 스크린샷, 커밋에 넣지 마세요.**

## 데이터 갱신 주기

| 대상 | 갱신 시점 |
| --- | --- |
| 현재 이용 좌석 | 입실 대기 중이고 탭이 보이는 동안 10초마다, 그리고 다른 탭에서 돌아왔을 때 |
| 열람실 목록 / 좌석 상태 | 자동 갱신 없음. 페이지 이동 또는 "새로고침" 버튼 |

## 구조

```
src/
  hooks.server.ts            세션 로드, 접근 제어, CSRF, 보안 헤더
  env.ts                     환경변수 정의 (USE_MOCK_API)
  lib/
    campus.ts types.ts date.ts seats.ts charge.ts seatmaps.ts   공용 로직(+ 단위 테스트)
    components/              RoomCard, SeatCell, SeatMap, SeatSheet, CurrentSeatCard
    server/                  http, auth, token, session, rate-limit, library, mock
  routes/
    login/  logout/          로그인·로그아웃
    (app)/                   인증 필요 영역: 홈, rooms/[roomId], current-seat
    api/                     좌석 상세 조회, 좌석 배정 (JSON)
```

## 외부 서비스 변경에 관하여

관찰 시점의 외부 서비스 동작에 기반한 프로토타입입니다. 인증 방식과 이용 규정은 언제든 바뀔 수 있으므로 실제 사용 전 본인 계정으로 로그인 → 열람실 조회 → (직접 선택한 경우에만) 좌석 배정 순서로 확인하세요.
