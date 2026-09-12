[CmdletBinding()]
param(
    [switch]$SkipDownload,
    [switch]$Clean
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$projectDir = Join-Path $PSScriptRoot 'android-owner'
$toolRoot = Join-Path $repoRoot '.android-build'
$jdkDir = Join-Path $toolRoot 'jdk17'
$sdkDir = Join-Path $toolRoot 'android-sdk'
$gradleDir = Join-Path $toolRoot 'gradle-8.7'
$gradleZip = Join-Path $toolRoot 'gradle-8.7-bin.zip'
$jdkZip = Join-Path $toolRoot 'jdk17.zip'
$cmdlineZip = Join-Path $toolRoot 'commandlinetools.zip'

$jdkUrl = 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk'
$gradleUrl = 'https://services.gradle.org/distributions/gradle-8.7-bin.zip'
$cmdlineUrl = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'

function Expand-Zip([string]$archive, [string]$destination) {
    if (Test-Path $destination) { return }
    New-Item -ItemType Directory -Force -Path $destination | Out-Null
    Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
}

if (-not $SkipDownload) {
    New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
    if (-not (Test-Path $jdkZip)) { Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkZip -UseBasicParsing }
    if (-not (Test-Path $gradleZip)) { Invoke-WebRequest -Uri $gradleUrl -OutFile $gradleZip -UseBasicParsing }
    if (-not (Test-Path $cmdlineZip)) { Invoke-WebRequest -Uri $cmdlineUrl -OutFile $cmdlineZip -UseBasicParsing }
}

if (-not (Test-Path (Join-Path $jdkDir 'bin\java.exe'))) {
    $tmpJdk = Join-Path $toolRoot 'jdk-extract'
    if (Test-Path $tmpJdk) { Remove-Item -LiteralPath $tmpJdk -Recurse -Force }
    Expand-Zip $jdkZip $tmpJdk
    $jdkHome = Get-ChildItem $tmpJdk -Directory | Select-Object -First 1
    if (-not $jdkHome) { throw 'Không tìm thấy thư mục JDK trong gói tải về.' }
    Move-Item -LiteralPath $jdkHome.FullName -Destination $jdkDir
    Remove-Item -LiteralPath $tmpJdk -Recurse -Force
}

if (-not (Test-Path (Join-Path $gradleDir 'bin\gradle.bat'))) {
    $tmpGradle = Join-Path $toolRoot 'gradle-extract'
    if (Test-Path $tmpGradle) { Remove-Item -LiteralPath $tmpGradle -Recurse -Force }
    Expand-Zip $gradleZip $tmpGradle
    $gradleHome = Get-ChildItem $tmpGradle -Directory | Select-Object -First 1
    if (-not $gradleHome) { throw 'Không tìm thấy Gradle trong gói tải về.' }
    Move-Item -LiteralPath $gradleHome.FullName -Destination $gradleDir
    Remove-Item -LiteralPath $tmpGradle -Recurse -Force
}

$cmdlineRoot = Join-Path $sdkDir 'cmdline-tools\latest'
if (-not (Test-Path (Join-Path $cmdlineRoot 'bin\sdkmanager.bat'))) {
    $tmpCmd = Join-Path $toolRoot 'cmdline-extract'
    if (Test-Path $tmpCmd) { Remove-Item -LiteralPath $tmpCmd -Recurse -Force }
    Expand-Zip $cmdlineZip $tmpCmd
    $cmdHome = Join-Path $tmpCmd 'cmdline-tools'
    if (-not (Test-Path $cmdHome)) { $cmdHome = $tmpCmd }
    New-Item -ItemType Directory -Force -Path (Split-Path $cmdlineRoot) | Out-Null
    Move-Item -LiteralPath $cmdHome -Destination $cmdlineRoot
    Remove-Item -LiteralPath $tmpCmd -Recurse -Force
}

$env:JAVA_HOME = $jdkDir
$env:ANDROID_SDK_ROOT = $sdkDir
$env:ANDROID_HOME = $sdkDir
$env:Path = "$jdkDir\bin;$gradleDir\bin;$sdkDir\platform-tools;$cmdlineRoot\bin;$env:Path"

$sdkManager = Join-Path $cmdlineRoot 'bin\sdkmanager.bat'
if (-not (Test-Path (Join-Path $sdkDir 'platforms\android-35\android.jar'))) {
    1..20 | ForEach-Object { 'y' } | & $sdkManager --sdk_root=$sdkDir --licenses | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Không thể chấp nhận giấy phép Android SDK, mã $LASTEXITCODE" }
    & $sdkManager --sdk_root=$sdkDir 'platform-tools' 'platforms;android-35' 'build-tools;34.0.0' 'build-tools;35.0.0'
    if ($LASTEXITCODE -ne 0) { throw "sdkmanager thất bại với mã $LASTEXITCODE" }
}

$localProperties = Join-Path $projectDir 'local.properties'
"sdk.dir=$($sdkDir.Replace('\', '\\'))" | Set-Content -LiteralPath $localProperties -Encoding ASCII

if ($Clean) {
    & (Join-Path $gradleDir 'bin\gradle.bat') '-p' $projectDir '--no-daemon' 'clean'
    if ($LASTEXITCODE -ne 0) { throw "Gradle clean thất bại với mã $LASTEXITCODE" }
}

& (Join-Path $gradleDir 'bin\gradle.bat') '-p' $projectDir '--no-daemon' 'assembleDebug'
if ($LASTEXITCODE -ne 0) { throw "Gradle assembleDebug thất bại với mã $LASTEXITCODE" }

$apk = Join-Path $projectDir 'app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $apk)) { throw 'Gradle hoàn tất nhưng không thấy file APK đầu ra.' }
$deliveryApk = Join-Path $PSScriptRoot 'ANIO-Owner-0.2.0-debug.apk'
Copy-Item -LiteralPath $apk -Destination $deliveryApk -Force
$hash = (Get-FileHash -LiteralPath $deliveryApk -Algorithm SHA256).Hash
Write-Output "APK build: $apk"
Write-Output "APK bàn giao: $deliveryApk"
Write-Output "SHA256: $hash"
