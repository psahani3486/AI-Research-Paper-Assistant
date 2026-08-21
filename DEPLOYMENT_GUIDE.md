# 🚀 Deployment Guide: Vercel (Frontend) & Render (Backend)

This document provides step-by-step instructions for deploying the **AI Research Paper Assistant** to **Vercel** (Frontend React SPA) and **Render** (FastAPI Backend).

---

## 1. ⚙️ Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com/) and sign in with GitHub.
2. Click **New +** → **Web Service**.
3. Connect your GitHub Repository: `https://github.com/psahani3486/AI-Research-Paper-Assistant`.
4. Configure the Web Service settings:
   - **Name:** `ai-research-paper-assistant-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Scroll down to **Environment Variables** and add:
   - `GROQ_API_KEY`: `your_groq_api_key_here`
   - `GROQ_MODEL`: `groq/compound`
   - `EMBEDDING_MODEL_NAME`: `all-MiniLM-L6-v2`
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://ai-research-paper-assistant-backend.onrender.com`).

---

## 2. 🌐 Deploy Frontend to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and sign in with GitHub.
2. Click **Add New...** → **Project**.
3. Import `AI-Research-Paper-Assistant`.
4. Configure Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand **Environment Variables** and add:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://ai-research-paper-assistant-backend.onrender.com` (Your Render backend URL from Step 1)
6. Click **Deploy**.

---

## 🎯 Verification
After deployment finishes:
- Open your Vercel URL (e.g., `https://ai-research-paper-assistant.vercel.app`).
- The top header indicator will show **Online** connected to Render backend.
