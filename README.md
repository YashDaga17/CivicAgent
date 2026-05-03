# 🗳️ CivicAgent — Indian Election Process Education Assistant

An **agentic AI assistant** that helps Indian voters understand election timelines, voter registration, and voting procedures — personalized to their state and available in 10+ regional languages.

---

## 🎯 Vertical: Indian Election Process Education

CivicAgent addresses a critical civic need: making India's election processes accessible and understandable. With over 900 million eligible voters across 28 states and 8 UTs, each with unique election schedules, the process can be overwhelming. CivicAgent provides:

- **Personalized timelines** based on the voter's state
- **Clear deadline tracking** for registration, nominations, polling, and counting
- **State-specific guidance** on Voter ID, EVM/VVPAT, and ECI procedures
- **🔊 Text-to-Speech & Voice Input** — Listen to election steps aloud and ask questions using voice
- **🌐 Regional language translation** — Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Malayalam, Punjabi, Odia
- **📍 Auto-location tracking** — Detects user state automatically via browser GPS
- **📰 Live Election News** — Fetches real-time news and updates using Google Search grounding
- **Action links** to official ECI, NVSP, and state CEO websites

---

## 🤖 Agentic AI Architecture

CivicAgent uses an **agentic triage engine** powered by Google Gemini with function-calling:

```
User Query (Text or Voice)
    │
    ▼
┌──────────────────────────┐
│     Triage Engine         │ ◄── Gemini (API Key or Vertex AI)
│     (Orchestrator)        │     with function-calling + Google Search
└──────┬──────┬────────────┘
       │      │
       ▼      ▼
┌──────────┐ ┌──────────────┐
│ Location │ │   RAG Tool   │ ◄── Firestore / local JSON
│   Tool   │ │              │
└──────────┘ └──────────────┘
       │            │
       ▼            ▼
┌──────────────────────────┐
│  Structured JSON Response │ ◄── user_context + steps[] + summary
└──────────────────────────┘
       │
   ┌───┴───┐
   ▼       ▼
┌──────┐ ┌────────────┐
│ TTS  │ │ Translation │ ◄── Cloud TTS + Cloud Translation
└──────┘ └────────────┘
```

### How It Works

1. **Gemini Function Calling**: The Triage Engine sends the user's query to Gemini along with tool declarations. Gemini decides which tools to invoke based on the query intent.
2. **Google Search Grounding**: The engine uses Google Search to fetch live election news, recent ECI announcements, and up-to-date timelines.
3. **LocationTool**: Resolves Indian state names, abbreviations, PIN codes (6-digit), and city names into structured `UserContext`. Supports both mock resolution and GCP Geocoding API.
4. **RAGTool**: Retrieves election guidelines and timeline data. Queries Firestore first, falls back to local `election_data.json` covering 8 major Indian states.
5. **Structured Output**: Every response follows a strict JSON schema — never plain text — enabling the frontend to render rich interactive timelines.
6. **Voice Input & TTS**: Users can ask questions using their microphone (Cloud Speech-to-Text), and each timeline step can be read aloud using Google Cloud TTS.
7. **Translation**: Responses can be translated on-the-fly into 10+ Indian languages using Cloud Translation API.

---

## ☁️ Google Cloud Services Used

| # | Service | Free Tier | Purpose |
|---|---------|-----------|---------|
| 1 | **Vertex AI / Gemini** | $300 trial | Agentic reasoning + function calling + Search Grounding |
| 2 | **Cloud Firestore** | 1GB, 50K reads/day | Election data storage + RAG |
| 3 | **Cloud Text-to-Speech** | 1M chars/month | Audio accessibility (read aloud) |
| 4 | **Cloud Speech-to-Text** | 60 mins/month | Voice input transcription |
| 5 | **Cloud Translation** | 500K chars/month | Regional language support |
| 6 | **Geocoding API** | $200/month credit | GPS & PIN code → state resolution |
| 7 | **Cloud Run** | 2M requests/month | Container deployment |

---

## 📁 Project Structure

```
CivicAgent/
├── backend/
│   ├── main.py              # FastAPI — /api/chat, /api/tts, /api/translate, /api/health
│   ├── config.py            # Pydantic-settings configuration
│   ├── Dockerfile           # Docker image for Cloud Run
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variable template
│   ├── engine/
│   │   ├── triage.py        # Agentic engine (Gemini API key + Vertex AI + fallback)
│   │   └── prompts.py       # System prompts & tool declarations
│   ├── tools/
│   │   ├── location_tool.py # Indian state/PIN/city resolution
│   │   ├── rag_tool.py      # Firestore + local data retrieval
│   │   ├── tts_tool.py      # Cloud Text-to-Speech
│   │   ├── translate_tool.py# Cloud Translation
│   │   └── firestore_seed.py# Seed Firestore from JSON
│   ├── models/
│   │   └── schemas.py       # Pydantic schemas (Chat, TTS, Translate)
│   └── data/
│       └── election_data.json # Seed data (8 Indian states)
├── client/
│   ├── app/
│   │   ├── page.tsx         # Main chat page
│   │   ├── layout.tsx       # Root layout with SEO
│   │   ├── globals.css      # Dark-mode design system
│   │   ├── types.ts         # TypeScript types
│   │   ├── lib/api.ts       # API client
│   │   └── components/
│   │       ├── ElectionTimeline.tsx  # Animated timeline + audio
│   │       ├── ChatMessage.tsx      # Message bubbles + translate
│   │       ├── ChatInput.tsx        # Auto-resize input
│   │       ├── Header.tsx           # App branding
│   │       ├── SuggestedPrompts.tsx  # Indian state prompts
│   │       ├── AudioButton.tsx      # TTS playback button
│   │       └── TranslateMenu.tsx    # Language dropdown
│   ├── Dockerfile           # Multi-stage Next.js image
│   └── next.config.ts       # Standalone output for Docker
├── docker-compose.yml       # Run both services
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+** and **Node.js 18+**
- (Optional) **Google API Key** from [AI Studio](https://aistudio.google.com/apikey)
- (Optional) **GCP Project** with billing enabled (free trial $300)

### Option 1: Local Development

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### Option 2: Docker

```bash
# Copy and configure env
cp backend/.env.example backend/.env
# Edit backend/.env with your keys

# Build and run
docker compose up --build
```

Backend: http://localhost:8000 | Frontend: http://localhost:3000

### Option 3: Cloud Run

```bash
# Build and push backend
cd backend
gcloud builds submit --tag gcr.io/YOUR_PROJECT/civicagent-backend
gcloud run deploy civicagent-backend \
  --image gcr.io/YOUR_PROJECT/civicagent-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="USE_MOCK_MODE=false,GOOGLE_API_KEY=your-key"
```

---

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GCP_PROJECT_ID` | No | `mock-project` | GCP project ID |
| `GOOGLE_API_KEY` | No | — | Gemini API key (simplest auth) |
| `USE_MOCK_MODE` | No | `true` | Skip Gemini, use deterministic pipeline |
| `ENABLE_TTS` | No | `true` | Enable Cloud Text-to-Speech |
| `ENABLE_TRANSLATION` | No | `true` | Enable Cloud Translation |
| `ENABLE_GEOCODING` | No | `false` | Enable Geocoding API |
| `GEOCODING_API_KEY` | No | — | Google Maps API key |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Allowed CORS origins |

---

## 🔐 Security

- All API keys and credentials stored in `.env` (excluded from Git via `.gitignore`)
- No secrets hardcoded in source files
- CORS configured to only allow the frontend origin
- Input validation via Pydantic schemas with length limits

---

## ♿ Accessibility (a11y)

- **ARIA labels** on all interactive elements
- **Keyboard navigable** — Tab through timeline, Enter to expand
- **Text-to-Speech** — Listen to election information aloud
- **Regional languages** — Content available in 10+ Indian languages
- **High-contrast** dark theme with sufficient color contrast
- **Focus-visible** rings on all focusable elements
- **Semantic HTML** — `role="log"`, `role="list"`, `aria-expanded`

---

## 📜 License

MIT
