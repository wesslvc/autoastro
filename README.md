# 원격 천문대

N.I.N.A.(Advanced API 플러그인)를 브라우저에서 제어하는 웹앱. Vite + React 프론트엔드와 `api/` 서버리스 함수(Express)로 구성되어 Vercel에 그대로 배포됩니다.

## 환경 변수

| 이름 | 설명 |
| --- | --- |
| `NINA_API_URL` | N.I.N.A. Advanced API 주소 (예: `https://<터널>/v2/api`). 없으면 내장 시뮬레이터 사용 |
| `OBSERVER_LAT`, `OBSERVER_LON` | 관측지 좌표 (기본: 서울) |

> Vercel 서버리스는 요청 사이에 메모리가 유지되지 않아 시뮬레이터 상태가 초기화될 수 있습니다. 실제 장비 제어는 `NINA_API_URL`에 외부에서 접근 가능한 주소(Cloudflare Tunnel, Tailscale Funnel 등)를 지정하세요.

## 개발

```bash
npm install
npm run dev            # 프론트엔드 (:5173), /api 는 :3000 으로 프록시
npx vercel dev         # API 포함 전체 실행
```
