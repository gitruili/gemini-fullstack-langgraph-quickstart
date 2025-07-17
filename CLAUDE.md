# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🏗️ Architecture Overview

**Fullstack LangGraph Research Agent** with React frontend and Python backend:
- **Frontend**: React + Vite + TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Python FastAPI + LangGraph agent using Gemini models
- **Research Flow**: Dynamic query generation → Google Search → Reflection → Answer synthesis
- **New Feature**: Dual-mode input (Search/Direct) for blueprint generation

## 🚀 Quick Commands

### Development Setup
```bash
# Install dependencies
make dev                    # Start both frontend (5173) and backend (2024)
make dev-frontend          # Frontend only
make dev-backend           # Backend only

# Backend setup
cd backend && pip install .
cp .env.example .env       # Add GEMINI_API_KEY to .env

# Frontend setup  
cd frontend && npm install
```

### Build & Test
```bash
# Frontend
cd frontend
npm run build              # Build for production
npm run lint               # ESLint check
npm run dev                # Development server

# Backend
cd backend
pip install -e .           # Install package
langgraph dev              # Start LangGraph dev server
python examples/cli_research.py "Your query"  # CLI testing
```

## 📁 Key File Structure

```
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx        # Main app with dual-mode logic
│   │   ├── components/    # UI components (InputForm with mode selector)
│   │   └── lib/           # Blueprint generation (pngGenerator.ts)
│   └── package.json       # npm scripts and dependencies
├── backend/               # Python LangGraph backend
│   ├── src/agent/
│   │   ├── graph.py       # LangGraph agent flow
│   │   ├── prompts.py     # System prompts
│   │   └── configuration.py # Agent settings
│   └── pyproject.toml     # Python dependencies
└── Makefile              # Development commands
```

## 🔍 Agent Architecture

**LangGraph Flow** (backend/src/agent/graph.py):
1. **generate_query** → Creates search queries from user input
2. **web_research** → Uses Google Search API with Gemini
3. **reflection** → Analyzes knowledge gaps
4. **evaluate_research** → Decides to continue or finalize
5. **finalize_answer** → Synthesizes final response with citations

## 🎯 Dual-Mode Input System

**New Feature**: Users can choose between:
- **Search Mode**: Original LangGraph research flow
- **Direct Mode**: Skip search, generate blueprint directly from text

**Implementation**:
- `InputForm.tsx` has mode selector dropdown
- `App.tsx` handles different flows based on mode parameter
- Direct mode uses existing blueprint generation without backend calls

## 📝 Environment Setup

**Required**:
- `GEMINI_API_KEY` in backend/.env
- Node.js 20+ and Python 3.11+

**API Endpoints**:
- Development: `http://localhost:5173` (frontend), `http://localhost:2024` (backend)
- Production: `http://localhost:8123` (via docker-compose)

## 🔄 Development Workflow

1. **Feature Development**: Start with `make dev` for hot-reload
2. **Blueprint Testing**: Use Direct mode for quick blueprint generation
3. **Research Testing**: Use Search mode for full research flow
4. **Production**: Build with `npm run build` (frontend) + Docker for full stack

# Summary instructions

When you are using compact, please focus on test output and code changes