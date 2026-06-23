# 🧠 AI-Powered Programming Interview & Learning Platform

An intelligent, locally-hosted platform that acts as an AI technical interviewer and personalized learning coach. It evaluates a user's programming knowledge through theory and coding questions, identifies strengths and weaknesses, and generates personalized learning roadmaps — all powered by a local LLM with zero cloud dependency.

---

## ✨ Features

- 🔐 **User Authentication** — Register, login, and securely maintain personalized study sessions via JWT
- 🌐 **Language Selection** — Choose from **Python, Java, C++, or JavaScript**
- 📊 **Difficulty Levels** — Beginner, Intermediate, and Advanced interview sessions
- 🤖 **RAG-Powered Question Generation** — Questions generated using FAISS-indexed knowledge chunks and a locally-running LLM (via LM Studio, llama.cpp, or LocalAI)
- ✅ **Theory Answer Evaluation** — LLM-graded answers with detailed feedback on correctness, completeness, and technical accuracy
- 💻 **Code Execution & Evaluation** — User-submitted code is compiled and executed against hidden test cases via a fully local **Judge0** sandbox
- 📈 **Knowledge Tracking** — Per-topic proficiency scores tracked over time (e.g., `{ "oop": 80, "asyncio": 20 }`)
- 🗺️ **Personalized Learning Plans** — Auto-generated roadmaps based on identified weak areas
- 🔗 **Resource Recommendations** — Curated docs, tutorials, and practice problems based on your gaps
- 🔁 **Session Continuation** — Resume learning from where you left off
- 🚫 **No Repeated Questions** — Full history tracking prevents duplicate questions across sessions

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────┐
│              React + Vite Frontend              │
│         (Port 5173 dev / 80 production)        │
└─────────────────────┬──────────────────────────┘
                      │ HTTP / REST
┌─────────────────────▼──────────────────────────┐
│              FastAPI Backend                   │
│                 (Port 8000)                    │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │   Auth   │  │   RAG    │  │  Evaluator  │  │
│  │ (JWT)    │  │  FAISS   │  │  (LLM+J0)   │  │
│  └──────────┘  └──────────┘  └─────────────┘  │
│            SQLite (local DB)                   │
└─────┬──────────────────┬───────────────────────┘
      │                  │
      ▼                  ▼
┌───────────┐    ┌──────────────────────────────┐
│  LM Studio│    │  Judge0 Stack (Docker)       │
│  llama.cpp│    │  ┌──────────┐ ┌───────────┐  │
│  LocalAI  │    │  │  Server  │ │  Worker   │  │
│ (Port 1234│    │  │ :2358    │ │ (sandbox) │  │
└───────────┘    │  └──────────┘ └───────────┘  │
                 │  ┌──────────┐ ┌───────────┐  │
                 │  │PostgreSQL│ │   Redis   │  │
                 │  └──────────┘ └───────────┘  │
                 └──────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Vanilla CSS (dark theme, glassmorphism) |
| **Backend** | FastAPI (Python 3.11+) |
| **Database** | SQLite + SQLAlchemy |
| **Auth** | JWT (PyJWT + bcrypt) |
| **RAG / Retrieval** | FAISS (`faiss-cpu`) |
| **LLM Runner** | LM Studio / llama.cpp / LocalAI (OpenAI-compatible API) |
| **Code Sandbox** | Judge0 (self-hosted via Docker) |
| **Infrastructure** | Docker + Docker Compose |

---

## 📁 Project Structure

```
languagelearn/
├── backend/
│   ├── app/
│   │   ├── api/           # Route handlers (auth, questions, evaluation)
│   │   ├── core/          # Config, database connection
│   │   ├── models/        # SQLAlchemy database models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # RAG pipeline, CRUD, Judge0 client
│   │   └── main.py        # FastAPI app entrypoint
│   ├── venv/              # Python virtual environment (git ignored)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Dashboard, Login, QuestionView, etc.
│   │   └── styles/        # CSS variables, theming, global styles
│   ├── Dockerfile
│   └── package.json
├── docs/                  # Project documentation (git ignored)
├── .gitignore
├── docker-compose.yml     # Full stack orchestration
├── rules.md               # Architecture and coding standards
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the full stack)
- [Node.js v20+](https://nodejs.org/) (for local frontend development)
- [Python 3.11+](https://www.python.org/) (for local backend development)
- A running **OpenAI-compatible local LLM server** — [LM Studio](https://lmstudio.ai/), [llama.cpp](https://github.com/ggerganov/llama.cpp), or [LocalAI](https://github.com/mudler/LocalAI)

> **Recommended Models**
> - **Generation/Evaluation:** Qwen 3 8B Instruct (or any instruction-tuned model)
> - **Embedding:** nomic-embed-text-v1.5, BGE Small, or E5 Small

---

### 🐳 Running with Docker Compose (Recommended)

> **Note:** Judge0 containers require **privileged mode** and run best on Linux. On Windows/macOS, ensure Docker Desktop has at least **4GB RAM** allocated.

**1. Clone the repository:**
```bash
git clone https://github.com/your-username/languagelearn.git
cd languagelearn
```

**2. Start the Judge0 dependencies first** (allow them to initialize):
```bash
docker compose up -d judge0-db judge0-redis
# Wait ~10 seconds for postgres and redis to be ready
```

**3. Start the full stack:**
```bash
docker compose up -d
```

**4. Available services:**

| Service | URL |
|---|---|
| Frontend (Nginx) | http://localhost |
| Backend API | http://localhost:8000 |
| Backend API Docs | http://localhost:8000/docs |
| Judge0 API | http://localhost:2358 |

---

### 💻 Local Development (Without Docker)

#### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate     # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create a .env file (see configuration section below)
cp .env.example .env

# Run the development server
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run the dev server
npm run dev
```

Frontend will be available at `http://localhost:5173`.

---

## ⚙️ Configuration

Create a `.env` file inside `backend/` with the following variables:

```env
# App
APP_NAME=Language Learn API
DEBUG=True

# Database
DATABASE_URL=sqlite:///./database.db

# Auth
JWT_SECRET_KEY=your_super_secret_key_here

# Local LLM (OpenAI-compatible endpoint)
LOCAL_MODEL_BASE_URL=http://localhost:1234/v1
LOCAL_MODEL_API_KEY=lm-studio-not-needed
LOCAL_MODEL_NAME=meta-llama-3-8b-instruct
LOCAL_EMBEDDING_MODEL_NAME=nomic-embed-text-v1.5

# Judge0
JUDGE0_API_URL=http://localhost:2358
JUDGE0_API_KEY=
```

> ⚠️ Never commit your `.env` file — it is already in `.gitignore`.

---

## 📚 Supported Programming Languages

| Language | Theory Questions | Coding Sandbox |
|---|---|---|
| 🐍 Python | ✅ | ✅ |
| ☕ Java | ✅ | ✅ |
| ⚙️ C++ | ✅ | ✅ |
| 🟨 JavaScript | ✅ | ✅ |

---

## 🔬 API Reference

Once running, interactive API docs are available at:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

Key endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new user account |
| `POST` | `/auth/login` | Login and retrieve JWT token |
| `GET` | `/questions/next` | Fetch next RAG-generated question |
| `POST` | `/questions/evaluate` | Submit and evaluate an answer |
| `GET` | `/progress` | View topic-wise skill scores |
| `GET` | `/learning-plan` | Get personalized learning roadmap |

---

## 🧩 How the RAG Pipeline Works

```
Programming Docs / Tutorials
           ↓
   Text Chunking (by topic)
           ↓
  Embedding Generation (via local model)
           ↓
  FAISS Vector Index (stored locally)
           ↓
   User selects language + difficulty
           ↓
   Vector Search (filter: language, difficulty, exclude seen)
           ↓
   Top-K Relevant Chunks retrieved
           ↓
   LLM generates question from context
           ↓
   Question served to user
```

---

## 🏃 Running Judge0 Separately

If you want to test Judge0 standalone (outside the compose stack):

```bash
docker compose up -d judge0-db judge0-redis
sleep 10
docker compose up -d judge0-server judge0-worker
```

Then verify it's working:
```bash
curl http://localhost:2358/about
```

---

## 🤝 Contributing

See [rules.md](./rules.md) for full coding standards, architecture guidelines, and design system rules before contributing.

---

## 📄 License

This project is for educational purposes. See `LICENSE` for details.