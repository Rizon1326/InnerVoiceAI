# InnerVoice AI - Complete Project Workflow

## Project Overview
InnerVoice AI is an AI-powered emotion and personality analyzer for Facebook posts in both English and Bangla. It detects sentiment, emotions, personality traits (OCEAN model), and provides AI-driven rewriting suggestions. The application runs as both a Chrome extension and a web application.

**Tech Stack:**
- Backend: Django REST Framework
- Frontend: React.js
- Extension: Chrome Extension API
- AI Integration: Google Gemini API
- Database: PostgreSQL
- Environment: Python 3.10+, Node.js 18+

---

## Project Architecture

### Backend (Django)
```
backend/
├── manage.py
├── requirements.txt
├── .env
├── core/
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── api/
│   ├── views.py (sentiment, emotion, personality endpoints)
│   ├── serializers.py
│   ├── urls.py
│   └── middleware.py (CORS, authentication)
├── services/
│   ├── gemini_service.py (Gemini API integration)
│   ├── sentiment_analyzer.py (NLP models)
│   ├── emotion_detector.py (Emotion recognition)
│   ├── personality_analyzer.py (OCEAN model)
│   └── text_rewriter.py (AI rewriting suggestions)
├── models.py (User, Post, Analysis, History)
└── utils/
    ├── validators.py
    └── helpers.py
```

### Frontend (React + Vite + Chrome Extension)
```
frontend/
├── package.json
├── .env
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── pages/
│   │   ├── Dashboard.js
│   │   ├── Analysis.js
│   │   ├── History.js
│   │   └── Settings.js
│   ├── components/
│   │   ├── PostAnalyzer.js
│   │   ├── SentimentCard.js
│   │   ├── EmotionDisplay.js
│   │   ├── PersonalityCard.js
│   │   ├── RewriteSuggestion.js
│   │   └── HighlightedText.js
│   ├── services/
│   │   ├── api.js (Backend API calls)
│   │   └── geminiService.js (Direct Gemini calls if needed)
│   ├── hooks/
│   │   ├── useAnalysis.js
│   │   └── useUser.js
│   ├── styles/
│   │   └── App.css
│   └── utils/
│       ├── constants.js
│       └── helpers.js
└── extension/
    ├── manifest.json
    ├── background.js
    ├── content.js
    ├── popup.html
    ├── popup.js
    ├── popup.css
    └── icons/
        ├── icon-16.png
        ├── icon-48.png
        ├── icon-128.png
```

---

## Step-by-Step Implementation Phases

**Priority Order:** Core Features → Enhancement → Security

### PHASE 1: Project Setup & Infrastructure (Checkpoint 1)
**Objective:** Initialize Django backend and React frontend with proper structure.

**Tasks:**
1. Create Django project with virtual environment
2. Set up PostgreSQL database
3. Install required packages (djangorestframework, django-cors-headers, google-generativeai, python-dotenv)
4. Create React app with necessary dependencies
5. Set up environment variables (.env files for both backend and frontend)
6. Configure Django settings (CORS, database, static files)
7. Create basic API structure and serializers

**Checkpoint 1 Verification:**
- Backend runs on `http://localhost:8000`
- Frontend runs on `http://localhost:3000`
- Database connection successful
- CORS configured properly
- `.env` files created and secured

**Commands to Execute (in order):**
```bash
# 1. Backend setup
cd /Users/rizon/Desktop/InnerVoiceAI
python3 -m venv venv
source venv/bin/activate
mkdir backend && cd backend
pip install Django==4.2 djangorestframework django-cors-headers python-dotenv google-generativeai psycopg2-binary python-decouple pillow
django-admin startproject core .
python manage.py startapp api
cd ..

# 2. Frontend setup
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install axios react-router-dom
cd ..

# 3. Create .env files (don't commit these)
# Backend: backend/.env
# Frontend: frontend/.env
```

---

### PHASE 2: NLP & Sentiment Analysis Integration (Checkpoint 2)
**Objective:** Integrate sentiment and emotion detection models.

**Tasks:**
1. Install transformers library: `pip install transformers torch`
2. Create sentiment_analyzer.py service
3. Create emotion_detector.py service
4. Integrate multilingual support (English + Bangla)
5. Create endpoints: `/api/analyze/sentiment/` and `/api/analyze/emotion/`
6. Implement text preprocessing for both languages
7. Cache model outputs for performance

**Models to Use:**
- **Sentiment:** `distilbert-base-multilingual-cased` (or `xlm-roberta-base`)
- **Emotion:** `emotion-english` (Hugging Face) + `bangla-bert` for Bangla
- **Alternative:** Use Gemini API for more accurate results

**Checkpoint 2 Verification:**
- Sentiment analysis working for English & Bangla
- Emotion detection returning 6 emotions (joy, sadness, anger, fear, surprise, neutral)
- Response time < 2 seconds per request
- Test with sample posts in both languages

---

### PHASE 3: Personality Analysis (OCEAN Model) (Checkpoint 3)
**Objective:** Implement OCEAN personality trait mapping.

**Tasks:**
1. Create personality_analyzer.py service
2. Define personality trait indicators for text patterns
3. Implement scoring algorithm for Big Five traits:
   - **O** (Openness): Unique words, creative language, abstract concepts
   - **C** (Conscientiousness): Organization, planning language, specificity
   - **E** (Extraversion): Social words, exclamation marks, positive emotional language
   - **A** (Agreeableness): Cooperative language, empathy, praise
   - **N** (Neuroticism): Negative emotions, anxiety indicators, complaints
4. Create `/api/analyze/personality/` endpoint
5. Use Gemini API for advanced personality inference

**Checkpoint 3 Verification:**
- OCEAN scores calculated for each post
- Scores normalized to 0-100 scale
- Visual representation in React (star rating or percentage bars)
- Personality tracking over time functional

---

### PHASE 4: AI Text Rewriting Service (Checkpoint 4)
**Objective:** Implement AI-powered text rewriting suggestions.

**Tasks:**
1. Create text_rewriter.py service using Gemini API
2. Implement smart prompt engineering for Gemini
3. Generate rewriting suggestions based on:
   - Low sentiment scores → increase positivity
   - High neuroticism → reduce anxiety language
   - Low agreeableness → add empathy
4. Highlight problematic words/sentences in red
5. Create `/api/rewrite/` endpoint
6. Return comparison: original vs suggested version
7. Calculate score improvement metrics

**Prompt Strategy for Gemini:**
```
"Analyze this [LANGUAGE] text and rewrite it to be more [TRAIT]-focused. 
Original: [TEXT]
Current scores: Sentiment=[X], Neuroticism=[Y], Agreeableness=[Z]
Provide a rewritten version that improves these scores while maintaining the original meaning."
```

**Checkpoint 4 Verification:**
- Rewriting suggestions generated within 3 seconds
- Suggestions improve personality scores
- Highlighted problematic words displayed correctly
- Multiple suggestion options available

---

### PHASE 5: Frontend UI/UX Development (Checkpoint 5)
**Objective:** Build responsive React interface with all features.

**Tasks:**
1. Create Dashboard page with post input interface
2. Build Analysis Results page showing:
   - Sentiment gauge (positive/neutral/negative)
   - Emotion breakdown (pie/bar chart)
   - OCEAN personality radar chart
   - Rewrite suggestions with highlight
3. Create History page with past analyses
4. Implement responsive design (mobile-friendly)
5. Add Grammarly-like highlighting component
6. Create Settings page (language preference, notification settings)
7. Add loading states and error handling

**Key React Components:**
- `PostAnalyzer`: Input field with submit
- `SentimentCard`: Display sentiment with gauge
- `EmotionDisplay`: Show emotion percentages
- `PersonalityCard`: OCEAN scores with radar chart
- `RewriteSuggestion`: Side-by-side comparison with highlights
- `HighlightedText`: Render text with color-coded problematic words

**Libraries to Add:**
```bash
npm install recharts react-icons lucide-react
```

**Checkpoint 5 Verification:**
- Web app fully functional at `localhost:5173` (Vite default)
- All pages accessible and responsive
- Charts and visualizations working
- Real-time analysis with backend
- Error states handled gracefully

---

### PHASE 6: Chrome Extension Development (Checkpoint 6)
**Objective:** Package application as Chrome extension with content script injection.

**Tasks:**
1. Create Chrome extension manifest.json
2. Build content script to detect Facebook post inputs
3. Create extension popup interface (simplified UI)
4. Implement background script for API communication
5. Add extension icons (16x16, 48x48, 128x128)
6. Set up communication between content script and popup
7. Store user authentication tokens securely
8. Implement right-click context menu for analysis

**Chrome Extension Flow:**
```
1. User writes post on Facebook
2. Extension detects Facebook post input
3. "Analyze with InnerVoice" button appears
4. Click → popup shows mini analysis
5. Click "Full Analysis" → opens web app
```

**Checkpoint 6 Verification:**
- Extension loads without errors in Chrome
- Detects Facebook post inputs
- Popup shows analysis results
- Communication with backend working
- Data persisted correctly

---

### PHASE 7: Database Models & Data Persistence (Checkpoint 7)
**Objective:** Add database layer for saving analyses and user preferences (WITHOUT authentication).

**Tasks:**
1. Create Django models: Post, Analysis, AnalysisHistory
2. Create database migrations
3. Create API serializers for models
4. Create basic API endpoints (no auth yet):
   - `POST /api/analyze/` - save analysis results
   - `GET /api/history/` - get past analyses (by session/cookie)
   - `POST /api/rewrite/` - save rewrite suggestions
5. Implement simple session-based data tracking (via cookies or localStorage)
6. Store data locally in browser (localStorage) for MVP

**Checkpoint 7 Verification:**
- Can save analysis results
- Can retrieve past analyses
- Data persists between sessions (localStorage)
- Database models created
- No authentication required yet

---

### PHASE 8: Testing & Optimization (Checkpoint 8)
**Objective:** Ensure quality and performance.

**Tasks:**
1. Unit tests for all services (sentiment, emotion, personality)
2. Integration tests for API endpoints
3. Frontend component tests (Jest + React Testing Library)
4. Performance optimization:
   - Model caching
   - API response caching
   - Lazy loading in React
5. Load testing with multiple concurrent requests
6. User acceptance testing
7. Fix bugs and edge cases

**Testing Commands:**
```bash
# Backend tests
python manage.py test

# Frontend tests
npm test

# Coverage report
coverage run --source='.' manage.py test
coverage report
```

**Checkpoint 8 Verification:**
- > 80% test coverage
- All critical paths tested
- No console errors
- Page load time < 3 seconds
- API response time < 1 second

---

### PHASE 9: Authentication & Security (Checkpoint 9)
**Objective:** Implement secure user authentication and data protection (AFTER core features work).

**Tasks:**
1. Implement JWT authentication in Django
2. Create login/register API endpoints
3. Add password hashing and validation
4. Implement refresh token mechanism
5. Add API rate limiting
6. Secure API keys in environment variables
7. Implement HTTPS for production
8. Add user data encryption for sensitive fields
9. Link existing localStorage data to user accounts
10. Implement user session management

**Backend Setup:**
```bash
pip install djangorestframework-simplejwt PyJWT
```

**Checkpoint 9 Verification:**
- Login/Register functional
- JWT tokens properly generated
- Token expiration working
- API keys not exposed
- Rate limiting preventing abuse
- Existing data migrated to user accounts

---

### PHASE 10: Deployment & Documentation (Checkpoint 10)
**Objective:** Deploy to production and document everything.

**Tasks:**
1. Backend deployment (Heroku, AWS, or DigitalOcean)
2. Frontend deployment (Vercel or Netlify)
3. Database migration to production
4. Set up environment variables in production
5. Configure domain and SSL certificates
6. Deploy extension to Chrome Web Store (optional)
7. Create user documentation
8. Create API documentation (Swagger/OpenAPI)
9. Set up monitoring and logging
10. Create deployment guide for team

**Deployment Checklist:**
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Static files collected
- [ ] CORS configured correctly
- [ ] Error logging enabled
- [ ] Backup system in place
- [ ] SSL certificate installed
- [ ] Extension manifest updated

**Checkpoint 10 Verification:**
- Production URLs accessible
- Extension installable from Web Store
- All features working in production
- Documentation complete
- Monitoring dashboard active

---

## Environment Variables Setup

### Backend (.env)
```
# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=innervoice_ai
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Django
SECRET_KEY=your-very-long-random-secret-key
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRY=3600
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
VITE_GEMINI_API_KEY=your_gemini_api_key (only if direct calls needed)
```

### Chrome Extension (manifest.json)
```json
{
  "manifest_version": 3,
  "name": "InnerVoice AI",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["https://www.facebook.com/*"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://www.facebook.com/*"],
      "js": ["content.js"]
    }
  ]
}
```

---

## Key Implementation Guidelines

### 1. **API Response Format (Consistent)**
```json
{
  "success": true,
  "data": {
    "sentiment": {
      "label": "positive",
      "score": 0.85
    },
    "emotions": {
      "joy": 0.8,
      "sadness": 0.1,
      "anger": 0.05,
      "fear": 0.02,
      "surprise": 0.02,
      "neutral": 0.01
    },
    "personality": {
      "openness": 72,
      "conscientiousness": 65,
      "extraversion": 78,
      "agreeableness": 81,
      "neuroticism": 35
    },
    "rewrite_suggestion": {
      "original": "I hate this stupid post",
      "suggested": "I have concerns about this post and would like to discuss them",
      "score_improvement": {
        "sentiment": "+0.15",
        "neuroticism": "-0.20",
        "agreeableness": "+0.18"
      },
      "highlighted_words": [
        {"word": "hate", "color": "red", "reason": "Negative emotion"},
        {"word": "stupid", "color": "red", "reason": "Rude language"}
      ]
    }
  },
  "timestamp": "2026-02-10T10:30:00Z"
}
```

### 2. **Error Handling**
All API errors should return:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2026-02-10T10:30:00Z"
}
```

### 3. **Gemini API Integration**
```python
# Example in gemini_service.py
import google.generativeai as genai

def rewrite_text(text, personality_scores, sentiment_score):
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
    model = genai.GenerativeModel('gemini-pro')
    
    prompt = f"""
    Rewrite this {language} text to improve personality and emotional tone:
    Original: {text}
    Current sentiment score: {sentiment_score}
    Current neuroticism: {personality_scores['neuroticism']}
    
    Provide:
    1. Rewritten version
    2. Words/phrases that reduce score (highlight in RED)
    3. Why the rewrite improves the message
    """
    
    response = model.generate_content(prompt)
    return response.text
```

### 4. **Language Support Strategy**
- Use Google Translate API for language detection
- Store language preference in user profile
- Use language-specific models when needed
- Default to multilingual models for efficiency

### 5. **Frontend State Management**
Consider Redux or Context API for:
- User authentication state
- Analysis results cache
- History data
- User preferences

---

## Testing Strategy

### Backend Testing
```
- Test sentiment analysis with 50+ sample texts
- Test emotion detection accuracy
- Test personality calculation algorithm
- Test API endpoint response times
- Test authentication flow
```

### Frontend Testing
```
- Component rendering tests
- API integration tests
- User interaction tests
- Responsive design tests
- Accessibility tests
```

### Chrome Extension Testing
```
- Content script injection
- Popup functionality
- Background script communication
- Data persistence
- Cross-origin requests
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| API Response Time | < 1.5 seconds |
| Frontend Load Time | < 2 seconds |
| Model Inference Time | < 1 second |
| Database Query Time | < 100ms |
| Chrome Extension Popup Load | < 500ms |
| Monthly Active Users Capacity | 10,000+ |

---

## Security Checklist

- [ ] All credentials in `.env` files (never in code)
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] Password hashing implemented (bcrypt/argon2)
- [ ] JWT tokens with short expiry
- [ ] Rate limiting on sensitive endpoints
- [ ] SQL injection prevention (use ORM)
- [ ] XSS protection in React
- [ ] CSRF tokens for forms
- [ ] API key rotation mechanism
- [ ] Data encryption for sensitive fields
- [ ] Regular security audits

---

## Workflow Command Guide

Follow these phases in order. For each phase:

1. **Read the checkpoint verification section** to know what to test
2. **Run the provided commands** in your terminal
3. **Create the files and code** as described
4. **Test the checkpoint** before moving to the next phase
5. **Commit to git** after each successful checkpoint

**Do not skip phases** - each builds on the previous one.

---

## Expected Project Timeline (UPDATED)

| Phase | Estimated Time |
|-------|-----------------|
| Phase 1 | 2-3 hours |
| Phase 2 | 4-5 hours |
| Phase 3 | 3-4 hours |
| Phase 4 | 4-5 hours |
| Phase 5 | 5-6 hours |
| Phase 6 | 3-4 hours |
| Phase 7 | 2-3 hours |
| Phase 8 | 4-5 hours |
| Phase 9 | 2-3 hours (Authentication - Lower Priority) |
| Phase 10 | 3-4 hours |
| **Total** | **33-42 hours** |

---

## Phase Dependency Flow

```
Phase 1 (Setup) 
    ↓
Phase 2 (Sentiment & Emotion) ← CORE FEATURE
    ↓
Phase 3 (Personality/OCEAN) ← CORE FEATURE
    ↓
Phase 4 (AI Rewriting) ← CORE FEATURE
    ↓
Phase 5 (Frontend UI) ← CORE FEATURE
    ↓
Phase 6 (Chrome Extension) ← CORE FEATURE
    ↓
Phase 7 (Data Persistence) - Optional for MVP
    ↓
Phase 8 (Testing) - Optional for MVP
    ↓
Phase 9 (Authentication) - LOW PRIORITY (add later)
    ↓
Phase 10 (Deployment)
```

**MVP (Minimum Viable Product) = Phases 1-6**
Can be deployed and used without Phases 7-9

---

## Support & Resources

- Django Docs: https://docs.djangoproject.com/
- React Docs: https://react.dev/
- Gemini API: https://ai.google.dev/
- Chrome Extension API: https://developer.chrome.com/docs/extensions/
- Transformers Library: https://huggingface.co/transformers/
- PostgreSQL: https://www.postgresql.org/docs/

---

## Git Workflow

```bash
# Initialize repository
git init
git add .
git commit -m "Phase 1: Project setup"

# Create branches for each phase
git checkout -b phase-2-database
git checkout -b phase-3-nlp
# ... and so on
```

---

## Notes

- This document is your complete roadmap. Follow it step by step.
- After each checkpoint, verify functionality before proceeding.
- Keep `.env` files out of version control (add to `.gitignore`).
- Gemini API requires a valid API key from Google AI Studio.
- PostgreSQL must be running for backend to function.
- Node.js 18+ required for React app.
- Python 3.10+ required for Django backend.

---

**Last Updated:** February 10, 2026
**Version:** 1.0
**Status:** Ready for Implementation
