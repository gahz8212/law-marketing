#!/bin/bash
cd /home/ubuntu/law-marketing
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
