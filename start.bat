@echo off
echo Starting SentinelAI...

echo Starting backend (FastAPI) on port 8000...
start "SentinelAI Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 4 /nobreak >nul

echo Starting frontend (Vite) on port 5174...
start "SentinelAI Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo  SentinelAI is starting up...
echo  Frontend:  http://localhost:5174
echo  Backend:   http://localhost:8000
echo  API Docs:  http://localhost:8000/docs
echo  Score API: POST http://localhost:8000/api/score
echo.
echo  Both servers are running in separate windows.
echo  Close this window when done.
pause
