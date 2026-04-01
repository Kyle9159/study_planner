# Study Planner

A full-stack web app for managing Masters Degree coursework. Upload course materials, rubrics, and lecture videos — then use AI to generate focused study guides and project completion guides tailored to your grading criteria.

---

## Features

### Course Management
- **Per-course organization** — add courses with name, code, semester, year, instructor, and description
- **Material uploads** — PDF, DOCX, TXT files and YouTube video links (transcript auto-fetched)
- **Rubric uploads** — upload project instructions and grading rubrics separately from study materials

### AI Study Guide
Generates a structured, interactive guide from your uploaded content:
- Overview summary of key focus areas
- Subject cards ranked by **priority** (High / Medium / Low) based on rubric criteria
- Actionable key points per subject
- Source excerpts pulled directly from your uploaded documents
- One-click search links to DuckDuckGo, Google Scholar, and YouTube for each topic
- **Minimal Pass Mode** — toggle to focus the AI only on B-level competency, skipping nice-to-haves (great for time-constrained studying)

### AI Project Guide
Step-by-step completion guide mapped directly to rubric criteria, including common pitfalls and a suggested timeline.

### Mastery Checklist
- Check off subjects and individual key points as you study
- Progress persists across sessions (stored in localStorage per guide)
- Visual dimming and strikethrough on completed items
- "X/Y mastered" counter in the overview card with a Reset button

### Export
Export any guide in multiple formats:
- **Markdown** (`.md`) — clean, readable text version of the full guide
- **PDF** — formatted document with priority-colored subject sections
- **Anki Flashcards** (`.txt`) — tab-separated front/back cards importable directly into Anki; great for OA prep

### Regeneration Guard
Clicking Regenerate on an existing guide shows a confirmation dialog with "Last generated X ago" so you don't accidentally waste API credits.

### Multi-Provider AI
Works with xAI (Grok) and GitHub Models (GPT-4o, Claude, Gemini, and more). Choose any supported model per generation with a configurable default.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 6 |
| Routing | React Router v7 |
| Backend | Express.js |
| Database | SQLite + Drizzle ORM (`better-sqlite3`) |
| Styling | TailwindCSS v4 + OkLCh color tokens |
| Components | shadcn/ui |
| Forms | React Hook Form + Zod |
| Server state | TanStack Query v5 |
| AI | `openai` npm package with custom `baseURL` |
| Doc parsing | `pdf-parse`, `mammoth`, `youtube-transcript`, `cheerio` |
| File uploads | `multer` |
| PDF export | `jsPDF` |

---

## Getting Started

### Prerequisites

- Node.js 20+ (via [nvm](https://github.com/nvm-sh/nvm) recommended)
- An xAI API key **or** a GitHub Personal Access Token (for AI features)

### Installation

```bash
git clone https://github.com/Kyle9159/study_planner.git
cd study_planner
npm install
npm run db:migrate
npm run dev
```

The app will be available at `http://localhost:5173`. The Express API runs on port 3001 (proxied automatically by Vite).

---

## Configuration

Open **Settings** in the app to configure your AI provider:

### xAI (Grok models)

1. Get an API key from [x.ai](https://x.ai)
2. Paste it into the **xAI API Key** field in Settings

### WGU Course Pages (Session Cookie)

WGU's learning portal requires login with MFA, so automated login is not possible. Instead, the app uses your browser session cookie:

1. Log into WGU normally in your browser (with MFA as usual)
2. Open DevTools (`F12`) → **Application** tab → **Cookies** → `apps.cgp-oex.wgu.edu`
3. Copy the `sessionid` cookie value (or the full cookie string)
4. Paste it into the **WGU Session Cookie** field in Settings

Once configured, paste any WGU course page URL into the **WGU Course URL** input on the Materials tab. The app will fetch the page with your session cookie and extract the visible text content using `cheerio`.

> **Note:** The session cookie expires when you log out of WGU or after a long idle period. If extraction fails with a "session expired" error, update your cookie in Settings. Some JavaScript-rendered content may not be captured since the app uses server-rendered HTML only.



1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate a new token (classic) — no special scopes required
3. Paste it into the **GitHub Token** field in Settings

> GitHub Models provides free access to a wide range of models including GPT-4o, GPT-4o mini, Claude Sonnet, Gemini, and Grok through an OpenAI-compatible API.

---

## Supported Models

| Provider | Models |
|---|---|
| xAI | `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning` |
| GitHub Models | `gpt-4o`, `gpt-4o-mini`, `grok-4-1-fast-reasoning`, `grok-4-1-fast-non-reasoning`, `grok-code-fast-1`, `claude-sonnet-4-6`, `gpt-5.4`, `gemini-3-1-pro` |

---

## Usage

### Adding a Course

1. Click **New Course** on the dashboard
2. Fill in the course name, code, semester, year, and optionally instructor and description
3. Click **Create Course**

### Uploading Materials

On the course page, use the **Materials** tab to upload:
- Lecture notes, textbooks, or course guides (PDF, DOCX, TXT)
- YouTube lecture links (transcript is fetched automatically)

Use the **Rubric** tab to upload your project instructions and grading rubric.

### Generating a Study Guide

1. Go to the **Study Guide** tab on a course page
2. Optionally enable **Minimal Pass Mode** if you only need to hit competency requirements
3. Select a model from the dropdown
4. Click **Generate Study Guide**

The guide is broken down by subject with priority rankings, key points, material excerpts, and search links. Check off topics as you study — progress is saved automatically.

### Exporting a Guide

Once a guide is generated, click the **Export** button and choose:
- **Markdown** — save as a `.md` file for notes apps, Obsidian, etc.
- **PDF** — formatted document ready to print or share
- **Anki Flashcards** — import the `.txt` file into Anki (File → Import) to create flashcard decks from your key points

### Generating a Project Guide

Go to the **Project Guide** tab and click **Generate Project Guide**. The AI produces a step-by-step completion guide mapped to the rubric criteria, including common pitfalls and a suggested timeline.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both the Vite dev server and Express API |
| `npm run db:migrate` | Create/migrate the SQLite database |
| `npm run build:client` | Build the frontend for production |
| `npm start` | Run the production Express server |

---

## Project Structure

```
study_planner/
├── client/src/
│   ├── pages/             # DashboardPage, CoursePage, NewCoursePage, SettingsPage
│   ├── components/
│   │   ├── course/        # CourseCard, GuidePanel, StudyGuideRenderer, UploadZone,
│   │   │                  #   MaterialList, ModelSelector
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/queries/     # TanStack Query hooks
│   ├── lib/               # utils, export helpers, query client
│   └── api/client.ts      # Typed API client
├── server/
│   ├── api/routes/        # courses, materials, ai, settings
│   ├── db/                # Drizzle schema, migrations, connection
│   └── services/          # AI generation, text extraction
├── shared/types.ts        # Shared TypeScript types
└── data/                  # SQLite DB + uploaded files (local only, gitignored)
```

---

## Notes

- Uploaded files and the SQLite database are stored locally in `data/` and are not committed to the repository
- API keys are stored in the local database and never exposed — the settings API returns `"configured"` or `null`, never the actual key value
- Text is truncated before sending to the AI (8,000 chars per file, 60,000 chars total) to stay within model context limits
- Mastery checklist state is stored in the browser's `localStorage` and is not synced across devices
