# Bin directory
$userBin = "$env:USERPROFILE\bin"

# Check if work is already installed
if (Get-Command -Name "work" -ErrorAction SilentlyContinue) {
    Write-Host "work is already installed"
    exit 1
}

# Add bin directory to path
if (-not (Test-Path -Path $userBin)) {
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\bin"

    $userPath = [System.Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::User)
    $newPath = "$userPath$userBin;"
    [System.Environment]::SetEnvironmentVariable("PATH", $newPath, [System.EnvironmentVariableTarget]::User)
}

# Version
$version = if ($env:VERSION) { $env:VERSION } else { "latest" }

# Install work
Invoke-WebRequest -URI "https://github.com/milesstoetzner/stoetzms-work/releases/download/$version/stoetzms-work-win-x64.exe.xz" -OutFile stoetzms-work-win-x64.exe.xz
tar -xf stoetzms-work-win-x64.exe.xz
Remove-Item stoetzms-work-win-x64.exe.xz
Move-Item stoetzms-work-win-x64.exe "$userBin\work.exe"

