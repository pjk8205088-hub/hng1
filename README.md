# H&G Korea Working Holiday Landing

첨부된 `TalkFile_H&G 웹사이트 시안 레이아웃.pdf`의 구조를 기준으로 만든 H&G 한국 워킹홀리데이 정착 지원 랜딩페이지입니다.

## 로컬 실행

```powershell
python -m http.server 8001 --directory public
```

브라우저에서 <http://127.0.0.1:8001/>을 엽니다.

## 구성

- Hero: H&G 중앙 웰컴 메시지, CTA, 도착 이미지
- Trust: 20년 현지 경험과 4대 지원 카드
- Process: 상담·결제·입국 3단계 및 대표 웰컴 카드
- Partner: ANSA 비자·항공 파트너 영역
- Pricing: R$ 3.980 → R$ 2.980 1개월 런칭 프로모션
- Contact/Footer: WhatsApp, Instagram, 이용약관, 환불 규정 및 사업자 정보
- KO / EN / PT 언어 전환

## 관리자 페이지

- `/admin` 또는 `/admin.html`에서 관리자 로그인을 엽니다.
- 서버 환경변수 `ADMIN_EMAIL`과 `ADMIN_PASSWORD`로 로그인 계정을 설정합니다. 실제 비밀번호는 저장소에 커밋하지 않습니다.
- 공개 신청서는 `/api/checkout`으로 주문과 회원 데이터를 서버에 저장하고, 관리자 화면에서 주문·환불 상태·추천인 코드·회원·상품을 관리합니다.
- Railway에서 재배포 간에도 데이터를 보존하려면 볼륨을 연결한 뒤 `ADMIN_DATA_FILE=/data/admin-data.json`을 설정하세요. 현재 환불 버튼은 관리자 상태를 `Reembolsado`로 기록하며, 실제 PG 취소 API 연동은 PG 인증키와 웹훅 설정이 추가로 필요합니다.

대표 카드 이미지는 실제 대표 사진이 제공되지 않아 교체 가능한 중립 프로필 이미지로 넣었습니다. 실제 사진을 사용하려면 `public/assets/founder-welcome.png`를 교체하면 됩니다.

## AWS

S3 + CloudFront 배포 파일은 [`aws/`](aws/)에 있습니다. 실제 결제·DB·ANSA 링크는 배포 전 [`public/config.js`](public/config.js)에 연결해야 합니다. 현재 정적 사이트에는 실결제가 발생하지 않도록 빈 설정을 사용합니다.
