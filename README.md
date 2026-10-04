# Syllabus Generation

An AI-powered web app that generates a complete, structured, editable academic course
syllabus (prerequisites, overview, objectives, outcomes, unit-wise topics, assignments,
unit-test questions, textbooks, reference books, electronic resources) from a few basic
inputs, and exports it as a downloadable `.docx` file.

It **never crashes or shows an error page**: if no AI key is configured (or the AI call
fails for any reason), it automatically falls back to a built-in baseline generator so the
app always returns a usable, editable syllabus.

---

## 1. Run it locally

### Requirements
- Python 3.10+

### Steps

```bash
# 1. Go into the project folder
cd syllabus-app

# 2. (Recommended) create a virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional but recommended) enable real AI generation — see section 2 below
cp .env.example .env
#   edit .env and paste your free Groq API key

# 5. Run the app
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

> Without step 4, the app still works end-to-end — it will use the built-in baseline
> generator instead of a live AI model. You'll see a small notice in the UI when that
> happens.

---

## 2. (Optional) Turn on real AI generation — free, 2 minutes

The app calls any **OpenAI-compatible** chat-completions API. The easiest free option is
**Groq**:

1. Go to https://console.groq.com/keys and sign up (free).
2. Create an API key.
3. Set these environment variables (in your `.env` file locally, or in Render's
   dashboard when deployed):

```
LLM_API_KEY=your_groq_key_here
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
```

You can swap in OpenAI instead by setting `LLM_BASE_URL=https://api.openai.com/v1` and
`LLM_MODEL=gpt-4o-mini` (or any other OpenAI-compatible provider, e.g. OpenRouter,
Together AI — just point `LLM_BASE_URL` at their `/v1` endpoint).

---

## 3. How to use it

1. Fill in: Course Name, Course Code (optional), Level (UG/PG/Diploma), Semester, Credits,
   Duration (weeks), number of units, rough course objectives (optional), and any
   additional requirements.
2. Click **Generate Syllabus**.
3. Every field — prerequisites, overview, objectives, outcomes, each unit's topics,
   assignments, unit-test questions, textbooks, reference books, electronic resources —
   is **directly editable** in the page. You can also add/remove list items (e.g. add a
   6th assignment, remove an objective).
4. Click **Download DOCX** at any time to export the current (edited) version as a
   formatted Word document.
5. Toggle **Edit Mode** off for a clean read-only view.

---

## 4. Deploy for free on Render

### Option A — one-click with the included blueprint

1. Push this project to a GitHub repository.
2. Go to https://render.com → **New** → **Blueprint**.
3. Connect your repo. Render will read `render.yaml` automatically and create a free web
   service.
4. In the Render dashboard, open the new service → **Environment** and set
   `LLM_API_KEY` to your Groq (or other) API key. (`LLM_BASE_URL` and `LLM_MODEL` are
   already set from `render.yaml` — change them there if you're using a different
   provider.)
5. Click **Deploy**. Your app will be live at `https://<your-service-name>.onrender.com`.

### Option B — manual web service (no blueprint)

1. Push this project to GitHub.
2. Render → **New** → **Web Service** → connect the repo.
3. Settings:
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
   - **Plan:** Free
4. Add environment variable `LLM_API_KEY` (and optionally `LLM_BASE_URL`, `LLM_MODEL`) in
   the **Environment** tab.
5. Click **Create Web Service**.

> Render's free plan spins the service down after periods of inactivity — the first
> request after idling may take ~30–50 seconds to wake up. This is normal and free.

---

## 5. Project structure

```
syllabus-app/
├── app.py                 # Flask backend: AI call, fallback generator, DOCX export
├── templates/
│   └── index.html         # Single-page UI
├── static/
│   ├── style.css          # Theme / styling
│   └── app.js             # Form handling, editable rendering, DOCX download
├── requirements.txt
├── Procfile                # for Render/Heroku-style start command
├── render.yaml              # Render blueprint (one-click deploy)
├── .env.example
└── README.md
```

## 6. Notes for your project report

- Backend: **Python / Flask**, python-docx for document generation.
- AI layer: pluggable, OpenAI-compatible REST call (works with Groq, OpenAI, OpenRouter,
  etc.) with a deterministic rule-based fallback for 100% uptime/demo reliability.
- Frontend: vanilla HTML/CSS/JS (no build step required) — matches the "Web Interface",
  "Input Module", "LLM Generation Engine", "Validation Module" and "Export Module" blocks
  described in your synopsis's system architecture diagram.
- `normalize_syllabus()` in `app.py` acts as the **Validation Module** from your
  synopsis — it guarantees the correct number of units/assignments/unit-tests even if the
  AI response is malformed.
