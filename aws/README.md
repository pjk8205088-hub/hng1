# AWS 배포

이 프로젝트는 S3 private bucket + CloudFront OAC 구성으로 배포할 수 있는 정적 사이트입니다.

## 사전 조건

- AWS CLI 로그인 완료 (`aws configure` 또는 SSO)
- 배포 계정에 CloudFormation, S3, CloudFront 권한
- `public/config.js`에 실제 ANSA 웹사이트, 문의 endpoint, PIX/카드 결제 링크 입력
- S3 버킷 이름은 전 세계적으로 유일해야 함

## 배포

PowerShell에서 프로젝트 루트 기준으로 실행합니다.

```powershell
./aws/deploy.ps1 -BucketName hng-고유한-버킷이름 -Region ap-northeast-2
```

CloudFormation stack이 S3 bucket과 CloudFront distribution을 만들고, 이후 `public/` 전체를 업로드합니다. 배포가 끝나면 스크립트가 CloudFront URL을 출력합니다.

## 운영 전환 체크

- `public/config.js`의 `leadEndpoint`를 API Gateway/Lambda 또는 승인된 폼 수집 endpoint로 교체
- 실제 PIX QR/결제 링크와 해외 카드 checkout URL 연결
- ANSA 공식 웹사이트 URL 입력
- 비자 거절 100% 환불 조건의 증빙, 기간, 제외 비용을 사업자·법률 검토 후 확정
- 커스텀 도메인과 HTTPS 인증서를 연결하려면 CloudFront ViewerCertificate 설정을 추가
