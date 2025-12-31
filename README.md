# Holler Summary Manager

A local-first application for ingesting, organizing, and interacting with YouTube video summaries stored as Markdown files.

## Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLite with sqlite-vec
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui
- **LLM/Embeddings**: Local Ollama instance (nomic-embed-text:latest)

## Project Structure

```
holler/
├── backend/           # Python FastAPI backend
├── frontend/          # React + Vite frontend
└── data/              # Default directory for .md files
```

## Quick Start

### Backend

```bash
# Activate virtual environment
C:\Users\amankar\Documents\mylearning\lpython\venvs\euv_holler\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Run CLI for ETL (Mode 1)
python cli.py --mode 1 --directory ../data

# Run CLI for Vectorization (Mode 2)
python cli.py --mode 2

# Start API server
uvicorn app.main:app --reload --port 8000

# Start API server in Debug mode (Windows) powershell
$env:HOLLER_DEBUG="true"; uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `GET /api/files` - List all summaries
- `GET /api/files/{id}` - Get summary details
- `POST /api/files/upload` - Upload single file
- `POST /api/files/batch` - Batch process directory
- `POST /api/chat` - RAG chat endpoint
- `GET /api/models` - List Ollama models
