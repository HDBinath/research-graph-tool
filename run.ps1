Write-Host "Starting ResearchGraph Tool..." -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "Virtual environment not found. Initializing..." -ForegroundColor Yellow
    python -m venv .venv
    .\.venv\Scripts\pip install -r backend\requirements.txt
}

Write-Host "Opening browser at http://localhost:8000 ..." -ForegroundColor Green
Start-Process "http://localhost:8000"

Write-Host "Launching server on http://127.0.0.1:8000 (Press Ctrl+C to stop)..." -ForegroundColor Cyan
Set-Location backend
..\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
