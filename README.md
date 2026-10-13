# CineSense: Agentic Mood-Based Recommendation Engine & Cross-Platform Streaming Discovery

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-green.svg)](https://www.mongodb.com/)
[![TMDB API](https://img.shields.io/badge/TMDB-API%20v3-blue.svg)](https://www.themoviedb.org/documentation/api)
[![OAuth 2.0](https://img.shields.io/badge/Auth-Google%20OAuth%202.0%20%2B%20JWT-orange.svg)](#authentication--security)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

> **CineSense** solves cross-platform content fragmentation and recommendation paralysis. It unifies catalog discovery across 5 premier streaming platforms (*Netflix, Prime Video, Disney+ Hotstar, SonyLIV, and Zee5*), pairs a hybrid recommendation engine (semantic embeddings + weighted popularity/rating + user history re-ranking) with an agentic LLM layer capable of reasoning over natural language mood prompts and triggering real-time UI actions via WebSocket tool calls.

---

## 📌 Table of Contents
- [Executive Overview & Problem Statement](#-executive-overview--problem-statement)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
  - [1. Cross-Platform Unified Discovery Engine](#1-cross-platform-unified-discovery-engine)
  - [2. Hybrid Recommendation Pipeline](#2-hybrid-recommendation-pipeline)
  - [3. Agentic Mood-Based Interface Layer](#3-agentic-mood-based-interface-layer)
  - [4. Real-Time Interaction & User Hub State](#4-real-time-interaction--user-hub-state)
- [Authentication & Security Architecture](#-authentication--security-architecture)
- [Data Flow & API Specifications](#-data-flow--api-specifications)
- [Directory Structure](#-directory-structure)
- [Installation & Local Setup](#-installation--local-setup)
- [Environment Variables](#-environment-variables)
- [Roadmap & Ongoing Enhancements](#-roadmap--ongoing-enhancements)

---

## 🎯 Executive Overview & Problem Statement

Modern streaming consumers face two critical friction points:
1. **Catalog Fragmentation**: High-quality content is siloed across independent subscription services (Netflix, Disney+ Hotstar, Prime Video, Zee5, SonyLIV). Users spend an average of 11+ minutes bouncing between apps to find what to watch.
2. **Cold Mood Search Failure**: Traditional genre-based dropdowns fail to capture complex, contextual viewer states (e.g., *"give me an existential thriller with dark humor that isn't too gory"*).

**CineSense** bridges this gap:
- **Parallel Orchestration**: Concurrently queries streaming service providers with region-specific provider IDs (`watch_region=IN`).
- **Deterministic Deduplication**: Normalizes multi-platform cross-listings by canonical TMDB ID and media type.
- **Agentic Natural Language Reasoning**: Ingests unstructured mood and vibe queries, extracting structured filters and orchestrating real-time WebSocket events back to the client interface.

---

## 🏗️ System Architecture

```
                                  ┌───────────────────────────────┐
                                  │      Client Web App (UI)      │
                                  │   (Main, Movies, Series, Hub) │
                                  └───────▲───────────────┬───────┘
                                          │               │
                            HTTP / REST   │               │ WebSocket (Bi-directional)
                            State Sync    │               │ Real-Time Tool Actions
                                          │               │
                                  ┌───────▼───────────────▼───────┐
                                  │    CineSense Node/Express     │
                                  │        Backend Gateway        │
                                  └───────┬───────────────┬───────┘
                                          │               │
                    ┌─────────────────────┘               └──────────────────────┐
                    │                                                            │
         ┌──────────▼──────────┐                                      ┌──────────▼──────────┐
         │ Auth & State Store  │                                      │  Agentic & Rec Hub  │
         │   (MongoDB / JWT)   │                                      │  (Tool Orchestrator)│
         └──────────┬──────────┘                                      └──────────┬──────────┘
                    │                                                            │
    ┌───────────────┴───────────────┐                            ┌───────────────┴───────────────┐
    │ - User profiles & OAuth creds │                            │ - Hybrid Scoring Re-ranker    │
    │ - Watched & Interested history│                            │ - LLM Tool-Calling Engine     │
    │ - Session state management    │                            │ - Vector Embeddings / Similarity
    └───────────────────────────────┘                            └───────────────┬───────────────┘
                                                                                 │
                                                                 ┌───────────────▼───────────────┐
                                                                 │ Parallel External API Layer   │
                                                                 │  (TMDB Discovery across 5 OTT)│
                                                                 └───────────────────────────────┘
```

---

## 🚀 Key Features

### 1. Cross-Platform Unified Discovery Engine
- **Parallel Fetching**: Executes concurrent asynchronous requests via `Promise.all` across 5 designated provider nodes:
  - Netflix (`provider_id: 8`)
  - Amazon Prime Video (`provider_id: 119`)
  - Disney+ Hotstar (`provider_id: 122` / alias `315`)
  - SonyLIV (`provider_id: 237`)
  - Zee5 (`provider_id: 232`)
- **ID-Level Deduplication**: Enforces strict canonical key hashing (`media_type + '_' + id`) across blended result sets to prevent cross-catalog duplicates.
- **Dynamic View Layouts**: Seamlessly switches between an interactive Netflix-style horizontal carousel and a comprehensive responsive grid.

### 2. Hybrid Recommendation Pipeline
The CineSense recommendation algorithm balances semantic intent, crowd consensus, and user history:
$$\text{Score}(item) = w_1 \cdot \text{Sim}(\mathbf{e}_{item}, \mathbf{e}_{user}) + w_2 \cdot \hat{R}(item) + w_3 \cdot \log(\text{Popularity} + 1) - \mathcal{P}_{\text{watched}}$$

- **Content Embeddings**: Maps titles into semantic feature space based on plot overviews, tags, and genres.
- **Bayesian Rating Normalization**: Dampens volatile high ratings with low vote counts ($\text{vote\_count} \ge 5$ thresholding) to prioritize dependable quality.
- **User History Re-ranking**: Dynamically penalizes or filters out items flagged in `decider_watched_titles` while up-weighting candidate items conceptually adjacent to the user's `decider_interested_titles`.

### 3. Agentic Mood-Based Interface Layer
- **Natural Language Parsing**: Translates user mood expressions (e.g., *"I'm mentally exhausted, give me an upbeat comedy with no heavy drama"*) into structured constraints:
  - Included/Excluded Genre IDs (`with_genres`, `without_genres`)
  - Vote average floors ($\ge 7.0$)
  - Runtime bounds and release eras
- **Autonomous WebSocket Tool Calling**: The agent executes multi-step client mutations in real time:
  - `apply_filters(genres, platforms)`: Mutates active client filter toggles.
  - `trigger_decider_spin(mode, provider)`: Automates spotlight modal discovery.
  - `surface_recommendation_card(title_data)`: Renders tailored recommendation cards directly inside the conversation stream.

### 4. Real-Time Interaction & User Hub State
- **Decider Spotlight**: Provides an instant weighted-random decider with custom dice animations and quick trailer preview integration via YouTube embed resolvers.
- **Synchronized User Hub ("My Hub")**:
  - **Watched Shelf**: Tracks finished media with timestamped entries, rating summaries, and removal triggers.
  - **Interested Watchlist**: Instant bookmarking across movies and series.
  - Multi-tab persistence synchronizing client-side `localStorage` with server-side MongoDB profiles.

---

## 🔒 Authentication & Security Architecture

- **Dual-Stack Authentication**:
  - **Local Authentication**: Salted and hashed credentials stored via MongoDB Mongoose models.
  - **Google OAuth 2.0**: Implemented via Passport.js strategy, validating Google profile callbacks and exchanging tokens securely.
- **Stateless JWT Authorization**: Issues signed JSON Web Tokens containing user claims for API-protected endpoints, mitigating CSRF vulnerabilities while maintaining stateless scalability.
- **Route Guards**: Client-side navigation guards verify token presence before granting access to `/Main`, `/Movies`, and `/Series` dashboards, redirecting unauthenticated visitors to `/Login`.

---

## 📊 Data Flow & API Specifications

### Backend Endpoints (`/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user with email and hashed password | Public |
| `POST` | `/auth/login` | Authenticate user and issue JWT token | Public |
| `GET` | `/auth/google` | Trigger Google OAuth 2.0 flow | Public |
| `GET` | `/auth/google/callback` | Google OAuth callback; redirects with session token | Public |
| `GET` | `/auth/me` | Fetch authenticated user profile & watch stats | Protected (Bearer JWT) |

### Frontend TMDB Discovery Contracts
- **Discover Movies**: `/discover/movie?with_watch_providers={id}&watch_region=IN&sort_by=popularity.desc`
- **Discover Series**: `/discover/tv?with_watch_providers={id}&watch_region=IN&sort_by=popularity.desc`
- **Video Trailer Resolver**: `/{type}/{id}/videos` with fallback to YouTube query routing.

---

## 📁 Directory Structure

```
CineSense/
├── backend/
│   ├── config/
│   │   └── passport.js          # Google OAuth 2.0 Passport configuration
│   ├── controllers/
│   │   └── auth.controller.js   # Registration, Login, Token generation logic
│   ├── middleware/
│   │   └── auth.middleware.js   # JWT token verification middleware
│   ├── models/
│   │   └── User.model.js        # Mongoose User schema (OAuth ID, email, password)
│   ├── routes/
│   │   └── auth.routes.js       # Express authentication route declarations
│   ├── server.js                # Server entry point, DB connection, middleware
│   ├── package.json
│   └── .env.example
├── Main/
│   ├── index.html               # Main discovery dashboard & Decider hub
│   ├── integ.js                 # Unified TMDB integration, Hub state, UI controllers
│   └── style.css                # Dark-mode aesthetic design system
├── Movies/
│   ├── index.html               # Dedicated Movie catalog view
│   ├── script.js                # Multi-platform movie filtering & carousels
│   └── movies.css
├── Series/
│   ├── index.html               # Dedicated TV Series catalog view
│   ├── script.js                # TV multi-platform query pipeline
│   └── series.css
├── Login/
│   ├── login.html               # Dual sign-in / registration interface
│   ├── script.js                # Auth submission, JWT storage, redirect handlers
│   └── login.css
├── public/                      # Static assets, platform badges, icons
├── package.json                 # Project root package configuration
└── README.md                    # System documentation
```

---

## 🛠️ Installation & Local Setup

### Prerequisites
- Node.js (v18.x or higher)
- MongoDB (Local instance or MongoDB Atlas URI)
- TMDB API Key ([Register free on TMDB](https://www.themoviedb.org/documentation/api))
- Google Cloud Console OAuth Credentials (for Google Sign-In)

### 1. Clone the Repository
```bash
git clone https://github.com/Harshith-Pataneni/CineSense.git
cd CineSense
```

### 2. Configure Backend
```bash
cd backend
npm install
cp .env.example .env
```
Fill in the configuration details in `.env` (see below).

### 3. Run Backend Server
```bash
npm run dev
# Server boots up on http://localhost:5000
```

### 4. Serve Frontend
You can serve the root directory using any local development server (e.g., Live Server or `npx serve`):
```bash
# In the CineSense root directory
npx serve .
# Open http://localhost:3000 in your browser
```

---

## ⚙️ Environment Variables

Create a `backend/.env` file with the following variables:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/cinesense?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
CALLBACK_URL=http://localhost:5000/auth/google/callback
FRONTEND_URL=http://localhost:3000
TMDB_API_KEY=your_tmdb_api_key_here
```

---

## 🔮 Roadmap & Ongoing Enhancements

- [x] Parallel TMDB multi-provider pipeline for 5 major Indian OTT platforms.
- [x] Resilient ID-based deduplication and carousel/grid multi-layout rendering.
- [x] Dual-mode authentication (Email/Password + Google OAuth 2.0 with JWT).
- [x] Persistent Watched & Interested media hub.
- [ ] Embedding-based semantic movie vector search using pgvector/Pinecone.
- [ ] Direct LangChain / LlamaIndex agentic loop with tool calls for autonomous UI navigation.
- [ ] Collaborative filtering integration across user community watch histories.

---

## 👨‍💻 Author
**Srinivasa Harshith Pataneni**  
Computer Science & Engineering, BITS Pilani (Goa Campus)  
- LinkedIn: [in/srinivasa-harshith-pataneni](https://www.linkedin.com/in/srinivasa-harshith-pataneni/)  
- GitHub: [@Harshith-Pataneni](https://github.com/Harshith-Pataneni)