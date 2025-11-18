#!/bin/bash

echo "==================================="
echo "Learning Management System Starter"
echo "==================================="
echo ""

# Check if backend virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "Setting up backend virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    echo "✓ Backend setup complete"
    echo ""
fi

# Check if frontend node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✓ Frontend setup complete"
    echo ""
fi

echo "Starting backend server..."
cd backend
source venv/bin/activate
python app.py &
BACKEND_PID=$!
cd ..

echo "Backend started with PID: $BACKEND_PID"
echo "Waiting for backend to initialize..."
sleep 3

echo "Starting frontend server..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo "Frontend started with PID: $FRONTEND_PID"
echo ""
echo "==================================="
echo "LMS is running!"
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo "==================================="
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Trap Ctrl+C and kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT

wait
