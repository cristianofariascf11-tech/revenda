$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (!(Test-Path -LiteralPath 'node_modules/next')) {
    Write-Host 'Instale as dependencias com pnpm install --frozen-lockfile antes de iniciar.'
    exit 1
}
npm.cmd run dev -- --hostname 127.0.0.1
