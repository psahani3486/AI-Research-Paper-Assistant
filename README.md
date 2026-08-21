# 📚 AI Research Paper Assistant (BTP Project)

A clean, modular, college-level **Retrieval-Augmented Generation (RAG)** application for uploading research papers, performing semantic search, asking questions with page citations, generating structured summaries, comparing multiple papers, and identifying research gaps.

Built using **FastAPI (Python), React (TypeScript + Tailwind CSS), ChromaDB, Sentence-Transformers, and Groq (LLaMA-3)**.

---

## 🏗️ Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + TS)                  │
│   • Paper Library       • RAG Chatbot (ChatGPT Style)       │
│   • Document Summarizer • Paper Comparison Matrix           │
│   • Research Gap Finder • Source Citation Viewer            │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    BACKEND (FastAPI / Python)               │
│                                                             │
│  [API Layer]       /papers, /chat, /comparison              │
│  [PDF Service]     PyMuPDF (fitz) page-by-page extraction   │
│  [Chunking]        Recursive sliding window (800c / 150o)   │
│  [Embeddings]      sentence-transformers (all-MiniLM-L6-v2) │
│  [Vector Store]    ChromaDB local persistent collection     │
│  [RAG Pipeline]    Top-K Retrieval + Grounded Prompting     │
│  [LLM Engine]      Groq API (LLaMA-3.3-70B-Versatile)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│     SQLite DB         │             │      ChromaDB         │
│  (Papers & Messages)  │             │  (Vector Embeddings)  │
└───────────────────────┘             └───────────────────────┘
```

---

## 🛠️ Technology Stack & Rationale

| Layer | Technology | Why Chosen? |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Tailwind CSS | Fast development, type safety, responsive academic UI |
| **Backend Framework** | FastAPI (Python 3.10+) | High performance, automatic Swagger documentation at `/docs`, async support |
| **PDF Extraction** | PyMuPDF (`fitz`) | Robust extraction of text, handles multi-column academic formats |
| **Embedding Model** | `all-MiniLM-L6-v2` (Sentence-Transformers) | Fast, runs locally on CPU/GPU without external API dependency, 384-dimensional dense vectors |
| **Vector Database** | ChromaDB (Local) | Zero configuration, file-based persistence, native cosine similarity search |
| **LLM Inference** | Groq API (`llama-3.3-70b-versatile`) | Ultra-fast token generation speed, high reasoning capability, free-tier friendly |
| **Application DB** | SQLite | Serverless, zero-setup relational database for paper metadata and chat history |

---

## 📁 Project Directory Structure

```text
ai-research-paper-assistant/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── papers.py          # Paper upload, list, delete
│   │   │   ├── chat.py            # RAG question answering & conversation
│   │   │   └── comparison.py      # Multi-paper comparative matrix & gaps
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   └── database.py        # SQLite schema initialization
│   │   ├── models/                # Database entities
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── pdf_service.py     # PDF text extraction (PyMuPDF)
│   │   │   ├── chunking_service.py# Recursive sliding chunker
│   │   │   ├── embedding_service.py # Vector embedding generator
│   │   │   ├── vector_service.py  # ChromaDB vector store
│   │   │   ├── rag_service.py     # Prompt assembly & context synthesis
│   │   │   └── llm_service.py     # Groq API client
│   │   ├── config.py              # Environment variables & constants
│   │   └── main.py                # FastAPI app & CORS setup
│   ├── requirements.txt
│   └── venv/                      # Python virtual environment
│
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   ├── pages/                 # Home, Library, Chat, Compare, Insights
│   │   ├── services/              # API clients (Axios)
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx                # Main App entry
│   │   ├── main.tsx
│   │   └── index.css              # Tailwind CSS styles
│   ├── package.json
│   └── vite.config.ts
│
├── data/
│   ├── uploads/                   # Uploaded PDF papers storage
│   └── chroma/                    # ChromaDB vector database index
│
├── .env.example                   # Sample environment configuration
├── .gitignore
└── README.md
```

---

## 🚀 Step-by-Step Setup Guide

### 1. Configure Environment Variables
Open the `.env` file in the root directory and add your Groq API key:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2
CHUNK_SIZE=800
CHUNK_OVERLAP=150
TOP_K_RETRIEVAL=5
```
> *(Get your free Groq API key at [https://console.groq.com/keys](https://console.groq.com/keys))*

---

### 2. Start the Backend (FastAPI)

In terminal 1:
```bash
cd backend
# Activate virtual environment:
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Or Windows (Command Prompt):
.\venv\Scripts\activate.bat

# Start the server:
uvicorn app.main:app --reload --port 8000
```
- API is live at: `http://localhost:8000`
- Interactive Swagger API Documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

---

### 3. Start the Frontend (React + Vite)

In terminal 2:
```bash
cd frontend
npm run dev
```
- Frontend is live at: `http://localhost:5173`

---

## 🧠 Viva / Interview Key Questions (Stage 1)

**Q1: What is Retrieval-Augmented Generation (RAG)?**
> **Answer:** RAG is an architectural technique that combines information retrieval from private/custom documents (like research papers) with text generation from an LLM. Instead of relying solely on the LLM's parametric memory (which may be outdated or hallucinate), RAG retrieves relevant document snippets and provides them as grounding context in the prompt.

**Q2: Why use Groq instead of standard OpenAI or local LLM?**
> **Answer:** Groq uses LPUs (Language Processing Units) designed specifically for tensor streaming, providing inference speeds exceeding 300+ tokens per second. It allows our college project to achieve instant answers on powerful models like LLaMA-3.3-70B completely free of cost.

**Q3: Why do we separate the SQLite database and ChromaDB?**
> **Answer:** SQLite is a relational database optimal for structured tabular data (paper metadata, filenames, page counts, chat histories). ChromaDB is a specialized vector database designed for high-dimensional nearest-neighbor similarity searches (embeddings). Each tool handles the workload it was specifically optimized for.
