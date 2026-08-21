param(
  [string]$StackName = 'hng-korea-working-holiday',
  [string]$Region = 'ap-northeast-2',
  [string]$BucketName = 'hng-korea-working-holiday-site'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$template = Join-Path $PSScriptRoot 'template.yaml'
$public = Join-Path $root 'public'

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw 'AWS CLI가 설치되어 있지 않습니다. AWS CLI 설치 후 다시 실행해 주세요.'
}

Write-Host "Deploying stack: $StackName" -ForegroundColor Cyan

aws cloudformation deploy `
  --template-file $template `
  --stack-name $StackName `
  --region $Region `
  --parameter-overrides SiteBucketName=$BucketName `
  --capabilities CAPABILITY_IAM

$outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region | ConvertFrom-Json
$stackOutputs = $outputs.Stacks[0].Outputs
$bucket = ($stackOutputs | Where-Object OutputKey -eq 'SiteBucketName').OutputValue
$distributionId = ($stackOutputs | Where-Object OutputKey -eq 'DistributionId').OutputValue
$cloudFrontUrl = ($stackOutputs | Where-Object OutputKey -eq 'CloudFrontUrl').OutputValue

Write-Host "Uploading public assets to s3://$bucket" -ForegroundColor Cyan
aws s3 sync $public "s3://$bucket" --region $Region --delete

Write-Host "Creating CloudFront invalidation for $distributionId" -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $distributionId --paths '/*' | Out-Null

Write-Host "Published: $cloudFrontUrl" -ForegroundColor Green
Write-Host "If CloudFront is still propagating, refresh after a few minutes." -ForegroundColor Yellow
