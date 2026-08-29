<#
.SYNOPSIS
  Prepara la base de datos local de PomAss en Windows, sin Docker.

.DESCRIPTION
  Usa el PostgreSQL que ya esté instalado como servicio en la máquina.
  Crea el rol y la base que espera `backend/.env`, aplica las migraciones y
  siembra el catálogo.

  La contraseña del superusuario `postgres` la pide el propio `psql`: este
  script nunca la recibe, ni la guarda, ni la muestra.

.EXAMPLE
  cd backend
  .\scripts\setup-local-windows.ps1
#>

[CmdletBinding()]
param(
  [string]$DbUser = 'pomass',
  [string]$DbPassword = 'pomass_pass',
  [string]$DbName = 'pomass',
  [string]$SuperUser = 'postgres'
)

$ErrorActionPreference = 'Stop'

function Write-Paso($texto) { Write-Host "`n=== $texto ===" -ForegroundColor Cyan }
function Write-Ok($texto) { Write-Host "  OK  $texto" -ForegroundColor Green }
function Write-Aviso($texto) { Write-Host "  !   $texto" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
Write-Paso 'Buscando PostgreSQL'

$psql = Get-Command psql -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $psql) {
  # Instalación típica de Windows: no queda en el PATH.
  $psql = Get-ChildItem 'C:\Program Files\PostgreSQL' -Recurse -Filter 'psql.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $psql) {
  throw 'No se encontró psql.exe. Instala PostgreSQL 16+ o añádelo al PATH.'
}
Write-Ok "psql: $psql"

$servicio = Get-Service | Where-Object { $_.Name -match '^postgresql' } | Select-Object -First 1
if ($servicio) {
  if ($servicio.Status -ne 'Running') {
    Write-Aviso "El servicio $($servicio.Name) está detenido; intentando arrancarlo..."
    Start-Service $servicio.Name
  }
  Write-Ok "Servicio $($servicio.Name): $((Get-Service $servicio.Name).Status)"
} else {
  Write-Aviso 'No se encontró un servicio de PostgreSQL; se asume que escucha en localhost:5432.'
}

# ---------------------------------------------------------------------------
Write-Paso "Creando rol '$DbUser' y base '$DbName'"
Write-Host "  psql te pedirá la contraseña del superusuario '$SuperUser'." -ForegroundColor Gray

# Idempotente: no falla si el rol o la base ya existen.
$sql = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$DbUser') THEN
    CREATE ROLE $DbUser LOGIN PASSWORD '$DbPassword';
    RAISE NOTICE 'Rol $DbUser creado';
  ELSE
    ALTER ROLE $DbUser LOGIN PASSWORD '$DbPassword';
    RAISE NOTICE 'Rol $DbUser ya existía; contraseña actualizada';
  END IF;
END
`$`$;
SELECT 'CREATE DATABASE $DbName OWNER $DbUser'
 WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$DbName')\gexec
"@

$tmp = New-TemporaryFile
Set-Content -Path $tmp -Value $sql -Encoding utf8
try {
  & $psql -U $SuperUser -h localhost -d postgres -v ON_ERROR_STOP=1 -f $tmp
  if ($LASTEXITCODE -ne 0) { throw "psql terminó con código $LASTEXITCODE" }
} finally {
  Remove-Item $tmp -ErrorAction SilentlyContinue
}
Write-Ok "Rol y base listos"

# ---------------------------------------------------------------------------
Write-Paso 'Comprobando la conexión de la aplicación'

$env:PGPASSWORD = $DbPassword
& $psql -U $DbUser -h localhost -d $DbName -c 'SELECT current_user, current_database();' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'La aplicación no puede conectarse con las credenciales de .env' }
Remove-Item Env:PGPASSWORD
Write-Ok "$DbUser puede conectarse a $DbName"

# ---------------------------------------------------------------------------
Write-Paso 'Aplicando migraciones'
Push-Location (Join-Path $PSScriptRoot '..')
try {
  npm run prisma:deploy
  if ($LASTEXITCODE -ne 0) { throw 'Falló prisma migrate deploy' }
  Write-Ok 'Migraciones aplicadas'

  Write-Paso 'Sembrando el catálogo'
  npm run prisma:seed
  if ($LASTEXITCODE -ne 0) { throw 'Falló el seed' }
  Write-Ok 'Catálogo sembrado'
} finally {
  Pop-Location
}

# ---------------------------------------------------------------------------
Write-Paso 'Listo'
Write-Host @'
  Base de datos preparada.

  Falta Redis (el carrito de invitado lo necesita). Opciones:
    winget install Memurai.MemuraiDeveloper     <- Redis para Windows, gratis
    o un Redis gratuito en https://redis.io/try-free/ y pon la URL en REDIS_URL

  Después, desde la raíz del repo:
    npm run dev        <- levanta backend (:3000) y frontend (:5173)
'@ -ForegroundColor Gray
