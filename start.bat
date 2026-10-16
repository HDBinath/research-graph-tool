@echo off
echo Starting ResearchGraph Tool...
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Virtual environment not found. Please run:
    echo   python -m venv .venv
    echo   .\.venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

echo Opening browser at http://localhost:8000 ...
start http://localhost:8000

echo Launching FastAPI Server (serving Web UI + API)...
cd backend
..\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
