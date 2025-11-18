@echo off
echo ===================================
echo Learning Management System Starter
echo ===================================
echo.

REM Check if backend virtual environment exists
if not exist "backend\venv" (
    echo Setting up backend virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
    echo [OK] Backend setup complete
    echo.
)

REM Check if frontend node_modules exists
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo [OK] Frontend setup complete
    echo.
)

echo Starting backend server...
cd backend
call venv\Scripts\activate
start cmd /k "python app.py"
cd ..

echo Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

echo Starting frontend server...
cd frontend
start cmd /k "npm start"
cd ..

echo.
echo ===================================
echo LMS is running!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo ===================================
echo.
echo Close the terminal windows to stop the servers
echo.
pause
