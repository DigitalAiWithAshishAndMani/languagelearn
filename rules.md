# Project Rules and Guidelines: Language Learning & Training Application

This document defines the architectural guidelines, technology stack, and design standards for the language learning and training application. All development and AI agent edits must adhere to these rules.

---

## 1. Technology Stack

### Frontend
- **Framework:** React with Vite (TypeScript preferred).
- **Styling:** Vanilla CSS. No utility-first CSS frameworks (like Tailwind CSS) unless explicitly requested.
- **Aesthetic:** Dark-themed developer dashboard featuring rich gradients, modern typography (Inter/Outfit), and glassmorphism elements.

### Backend
- **Framework:** FastAPI (Python 3.10+).
- **Database:** SQLite for lightweight, serverless local storage of user progress, login sessions, and evaluation history.
- **ORM / DB Access:** SQLAlchemy or SQLModel for database interactions and migrations.

### AI & RAG Pipeline
- **Runner:** Local OpenAI-compatible server (e.g., LM Studio, llama.cpp, LocalAI) running embedding and generation models.
- **Pipeline:** Retrieval-Augmented Generation (RAG) using **FAISS** (Facebook AI Similarity Search) to index local question sets and knowledge chunks.
- **Code Execution Sandbox:** **Judge0** for compiling and running user coding submissions securely against test cases.
- **Supported Languages:** Python, Java, C++, JavaScript.

---

## 2. Codebase Structure & Directory Layout

The workspace should be structured as follows:

```
languagelearn/
├── backend/               # FastAPI backend application
│   ├── app/
│   │   ├── api/           # API endpoints (auth, questions, evaluation)
│   │   ├── core/          # Configuration, security, database connection
│   │   ├── models/        # SQLAlchemy / SQLModel database models
│   │   ├── schemas/       # Pydantic schemas for request/response
│   │   ├── services/      # RAG service, database CRUD operations
│   │   └── main.py        # FastAPI entry point
│   ├── requirements.txt   # Python dependencies
│   └── database.db        # SQLite local database (git ignored)
├── frontend/              # Vite + React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (Dashboard, Login, QuestionView)
│   │   ├── styles/        # CSS styles (variables, base, components)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── package.json
├── README.md              # Project overview
└── rules.md               # Project rules and guidelines (this file)
```

---

## 3. Frontend Development Rules

### Design System & CSS
- **Color Palette:** Curated HSL colors, sleek dark mode palette (e.g., deep dark blues/greys `#0B0F19`, `#1E293B`) with vibrant accents (e.g., cyan `#06B6D4`, violet `#8B5CF6`).
- **Typography:** Modern sans-serif fonts like **Inter** or **Outfit** fetched from Google Fonts.
- **Glassmorphism:** Apply backdrop-blur, subtle borders, and semi-transparent backgrounds for cards and panels:
  ```css
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  ```
- **Animations:** Use smooth micro-animations on interactive elements (buttons, inputs, cards) using CSS transitions.
- **No Placeholders:** All UI elements must have realistic sample data or active functionality.

### State & Routing
- Use standard React Hooks (`useState`, `useEffect`, `useContext`) for state management.
- Keep components focused and reusable.

---

## 4. Backend Development Rules

### FastAPI Conventions
- Use Pydantic schemas for payload validation and documentation generation.
- Keep route handlers thin; business logic (RAG, evaluation, authentication) must live in `services/`.
- Handle CORS configuration properly to allow communication from the Vite frontend port (default: `http://localhost:5173`).

### Database & Security
- Use bcrypt or a similar secure hashing library for password storage.
- Manage user sessions using JWT tokens passed in the authorization header.
- SQLite database connection must be initialized using context managers (`yield` dependency in FastAPI) to ensure sessions are closed.

---

## 5. RAG, FAISS & Judge0 Integration Rules

### OpenAI-Compatible API Client
- Connect to the local model and embedding engine using the standard `openai` Python package.
- The base URL, API key (if any), model name, and embedding model name must be configured dynamically via environment variables (`.env`) loaded through `config.py`.

### FAISS Vector Indexing & RAG
- Predefined question bank and educational resource chunks should be converted into vector embeddings using the configured embedding model.
- Vector embeddings must be indexed and searched locally using **FAISS** (`faiss-cpu` library).
- Querying FAISS indices should match difficulty, programming language, and proficiency levels defined by the user.
- Emphasize zero repeating questions: maintain a history of previously shown question IDs in the SQLite database and exclude them from retrieval.

### Judge0 Sandbox Integration
- Connect to the local **Judge0 API** endpoint deployed directly within the Docker Compose stack.
- Configured internally via `JUDGE0_API_URL=http://judge0-server:2358` (no API key needed) or externally via `http://localhost:2358` for testing.
- Code evaluation requests must compile and run the student's solution in a clean sandbox context matching the selected language environment (Python, Java, C++, JavaScript).
- Return test execution outputs, execution metrics, and any compilation/runtime errors.

### Predefined Question Bank Schema
- Questions must contain:
  - Question ID
  - Target Language (Python, Java, C++, JavaScript)
  - Difficulty Level (Beginner, Intermediate, Advanced)
  - Topic / Tags
  - Question type (Theory or Coding)
  - Question content, options (for MCQs), or coding prompt
  - Reference answer or test cases (inputs and expected outputs for Judge0 evaluation)

---

## 6. Development Workflow

- All environment-specific variables (endpoints, ports, database paths, secrets) must be stored in `.env` files and loaded via standard config loaders (e.g., `pydantic-settings` in python, `import.meta.env` in Vite).
- Never commit credentials or `.env` files to git.
