param(
  [string]$DnsName = "localhost",
  [string]$PfxPath = "c:\xampp\htdocs\development\NexGenAuction\tools\certs\localhost.pfx",
  [string]$Password = "devpassword123"
)

Write-Host "Generating self-signed certificate for $DnsName" -ForegroundColor Cyan

$certFolder = Split-Path -Parent $PfxPath
if (!(Test-Path $certFolder)) {
  New-Item -ItemType Directory -Path $certFolder | Out-Null
}

$secure = ConvertTo-SecureString -String $Password -Force -AsPlainText
$cert = New-SelfSignedCertificate `
  -DnsName $DnsName `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -FriendlyName "NexGenAuction Dev Localhost" `
  -KeyLength 2048 `
  -HashAlgorithm "SHA256" `
  -KeyExportPolicy Exportable `
  -NotAfter (Get-Date).AddYears(1)

if ($null -eq $cert) {
  Write-Error "Failed to create self-signed certificate. Try running PowerShell as Administrator."
  exit 1
}

Export-PfxCertificate -Cert $cert -FilePath $PfxPath -Password $secure | Out-Null

Write-Host "PFX saved to $PfxPath" -ForegroundColor Green
Write-Host "You may import it to Trusted Root Certification Authorities to avoid browser warnings." -ForegroundColor Yellow
