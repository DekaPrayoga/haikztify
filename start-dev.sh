#!/bin/bash
# Start both frontend and backend for local development
set -e

kill $(lsof -t -i:3001) 2>/dev/null || true
kill $(lsof -t -i:5173) 2>/dev/null || true
sleep 1

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting HaikZTIFY (split mode)..."
echo ""

# Backend
echo "  → Backend API on port 3001..."
cd "$DIR/backend"
if [ ! -d node_modules ]; then
  echo "  → Installing backend dependencies..."
  npm install
fi
node server.mjs &
API_PID=$!

# Frontend
echo "  → Frontend on port 5173..."
cd "$DIR/frontend"
if [ ! -d node_modules ]; then
  echo "  → Installing frontend dependencies..."
  npm install
fi
npx vite --host 0.0.0.0 --port 5173 &
VITE_PID=$!

echo ""
echo "✅ Ready!"
echo "  App:  http://localhost:5173"
echo "  API:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $API_PID $VITE_PID 2>/dev/null; exit" INT TERM
wait
