#!/usr/bin/env bash
if [ -d "backend" ]; then
  cd backend
fi
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
