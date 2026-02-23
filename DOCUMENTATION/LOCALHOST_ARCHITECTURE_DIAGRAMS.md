# 🎯 Localhost Architecture — Visual Explanation

> **Simple diagrams showing how your extension talks to the backend on localhost**

---

## 1. The Basic Setup (Your Computer)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃        YOUR LAPTOP / DESKTOP           ┃
┃                                        ┃
┃  ┌────────────────────────────────┐   ┃
┃  │  Chrome Browser                │   ┃
┃  │  ┌──────────────────────────┐  │   ┃
┃  │  │  Extension Popup         │  │   ┃
┃  │  │  (400x600 window)        │  │   ┃
┃  │  │                          │  │   ┃
┃  │  │  [Paste text here]       │  │   ┃
┃  │  │  [Analyze] button        │  │   ┃
┃  │  └──────────────────────────┘  │   ┃
┃  └────────────────────────────────┘   ┃
┃                │                       ┃
┃                │ HTTP request to       ┃
┃                │ localhost:8000/api    ┃
┃                ▼                       ┃
┃  ┌────────────────────────────────┐   ┃
┃  │  Django Backend                │   ┃
┃  │  (Running in Terminal)         │   ┃
┃  │                                │   ┃
┃  │  POST /api/analyze/            │   ┃
┃  │  - Detects language            │   ┃
┃  │  - Analyzes sentiment          │   ┃
┃  │  - Detects emotions            │   ┃
┃  │  - Generates rewrite options   │   ┃
┃  │                                │   ┃
┃  │  Returns JSON response:        │   ┃
┃  │  { sentiment: positive,        │   ┃
┃  │    emotions: {...},            │   ┃
┃  │    tone: enthusiastic }        │   ┃
┃  └────────────────────────────────┘   ┃
┃                ▲                       ┃
┃                │ HTTP response         ┃
┃                │ (JSON data)           ┃
┃  ┌────────────────────────────────┐   ┃
┃  │  Extension receives & shows    │   ┃
┃  │  results to user               │   ┃
┃  └────────────────────────────────┘   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Internet: NOT NEEDED ✓ (everything is local)
```

---

## 2. Request/Response Flow

```
USER ACTION IN EXTENSION
        │
        │ 1. User clicks "Analyze" button
        ▼
EXTENSION POPUP
        │
        │ 2. Reads text from input box
        │    Creates HTTP request:
        │    POST http://localhost:8000/api/analyze/
        │    {
        │      "text": "This is awesome!",
        │      "language": "en"
        │    }
        ▼
NETWORK LAYER (localhost = local machine only)
        │
        │ 3. Request travels through:
        │    Your OS → localhost networking → same machine
        │
        │ (This is INSTANT — no internet involved)
        ▼
DJANGO BACKEND
        │
        │ 4. Backend receives request
        │    - Authenticates user (token)
        │    - Validates text input
        │    - Calls NLP models
        │    - Analyzes sentiment
        │    - Detects emotions
        │    - Returns results
        ▼
RESPONSE
        │
        │ 5. Backend sends back JSON:
        │    {
        │      "sentiment": {
        │        "label": "positive",
        │        "score": 0.92
        │      },
        │      "emotion": {
        │        "joy": 0.85,
        │        "surprise": 0.15,
        │        ...
        │      },
        │      "tone": "enthusiastic"
        │    }
        ▼
EXTENSION POPUP (Update UI)
        │
        │ 6. Extension receives JSON
        │    - Shows emotion pie chart
        │    - Shows sentiment badge
        │    - Shows tone
        │    - Shows rewrite options
        │
        ▼
USER SEES RESULTS
```

---

## 3. Localhost vs Internet Request

### ❌ Internet Request (Cloud Deployment)

```
Your Computer                    Internet                  Cloud Server
    │                               │                           │
    │  EXTENSION                    │                           │
    │  [Click Analyze]              │                           │
    │─────────────────────────────────────────────────────────>│
    │                               │                      DJANGO
    │                               │                      (Railway)
    │                               │
    │<─────────────────────────────────────────────────────────│
    │                               │                    Returns
    │  RESULTS SHOWN                │                    JSON
    │                               │

Time: Slow (100-500ms because of internet travel)
Required: Working internet + deployed server
Problem: Only works if server is running online
```

### ✅ Localhost Request (Your Case)

```
YOUR COMPUTER
    │
    ├─ EXTENSION
    │  [Click Analyze]
    │  
    │─────────────────────────────┐
    │                             │
    │  (localhost networking)     │  Super fast!
    │  (same machine)             │  < 10ms!
    │                             │
    ├─────────────────────────────┘
    │
    ├─ DJANGO BACKEND
    │  Returns JSON
    │
    ├─ EXTENSION
    │  Shows Results

Time: Super fast (< 10ms)
Required: Nothing, runs locally
Problem: Only you can access it
```

---

## 4. How to Start — Commands You'll Run

### Terminal Window 1 (Backend)

```bash
$ cd InnerVoiceAI/backend
$ python manage.py runserver

# Output:
# Starting development server at http://127.0.0.1:8000/
# [timestamp] "POST /api/analyze/ HTTP/1.1" 200
# [timestamp] "POST /api/analyze/ HTTP/1.1" 200
```

### Meanwhile in Chrome Browser

```
1. Click Extension Icon
2. Paste text
3. Click "Analyze"
4. See results instantly
5. Click "Rewrite"
6. See AI-generated alternatives
7. Right-click on webpage text → "Analyze with InnerVoice"
```

**No other setup needed!**

---

## 5. Data Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                   YOUR LAPTOP                            │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │         CHROME BROWSER                          │    │
│  │                                                 │    │
│  │  ┌────────────────────────────────────────┐   │    │
│  │  │  EXTENSION POPUP                       │   │    │
│  │  │  Input: "This is amazing!"             │   │    │
│  │  │                                        │   │    │
│  │  │  [Analyze Button]                      │   │    │
│  │  │       │                                │   │    │
│  │  │       │ Creates: POST request          │   │    │
│  │  │       │ Headers: Authorization token  │   │    │
│  │  │       │ Body: { text, language }      │   │    │
│  │  │       ▼                                │   │    │
│  │  └────────────────────────────────────────┘   │    │
│  │                     │                         │    │
│  │  ┌──────────────────▼──────────────────┐    │    │
│  │  │  NETWORK LAYER (LOCALHOST)         │    │    │
│  │  │  Address: 127.0.0.1:8000           │    │    │
│  │  │  Protocol: HTTP (no HTTPS needed)  │    │    │
│  │  │  Speed: Instant (< 10ms)           │    │    │
│  │  └──────────────────┬──────────────────┘    │    │
│  │                     │                         │    │
│  │  ┌──────────────────▼──────────────────┐    │    │
│  │  │  DJANGO BACKEND                    │    │    │
│  │  │                                    │    │    │
│  │  │  1. Receives request               │    │    │
│  │  │  2. Checks authentication          │    │    │
│  │  │  3. Validates text length          │    │    │
│  │  │  4. Detects language               │    │    │
│  │  │  5. Calls sentiment_analyzer       │    │    │
│  │  │  6. Calls emotion_detector         │    │    │
│  │  │  7. Calls personality_analyzer     │    │    │
│  │  │  8. Packages JSON response         │    │    │
│  │  │  9. Sends back to extension        │    │    │
│  │  └──────────────────┬──────────────────┘    │    │
│  │                     │                         │    │
│  │  ┌──────────────────▼──────────────────┐    │    │
│  │  │  EXTENSION RECEIVES RESPONSE        │    │    │
│  │  │  { sentiment, emotions, tone }     │    │    │
│  │  │                                    │    │    │
│  │  │  Updates UI:                       │    │    │
│  │  │  - Emotion pie chart               │    │    │
│  │  │  - Sentiment badge                 │    │    │
│  │  │  - Tone indicator                  │    │    │
│  │  │  - Rewrite options                 │    │    │
│  │  └──────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  SQLite Database (same computer)            │    │
│  │  - Stores user info                         │    │
│  │  - Stores analysis history                  │    │
│  │  - Stores user preferences                  │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────────────────────────────────────┘

NO INTERNET REQUIRED ✓
Everything stays on your computer ✓
Fast and responsive ✓
Perfect for demo ✓
```

---

## 6. Demo Day Setup (Physical)

```
Your Laptop Screen
│
├─ Terminal (Running Django Backend)
│  $ python manage.py runserver
│  ✓ Server is ready
│
└─ Chrome Browser
   └─ Extension Popup (400x600)
      ├─ [Analyze Tab]
      │  Input: "This is amazing!"
      │  [Analyze Button]
      │  Shows: Emotions, Sentiment, Tone
      │
      ├─ [Rewrite Tab]
      │  Shows: 6 different AI rewrite options
      │
      ├─ [History Tab]
      │  Shows: Last 20 analyses with dates
      │
      └─ [Settings]
         Theme toggle, Logout, etc

PROJECTOR/MONITOR → Shows everything above to audience
```

---

## 7. Why This Works for Demo

✅ **Professional** — Works smoothly, no errors
✅ **Fast** — Instant responses, no waiting
✅ **Reliable** — No server downtime, no network issues
✅ **Real** — Shows actual AI analysis, actual rewriting
✅ **Impressive** — Audience won't know it's localhost vs cloud
✅ **Easy to Control** — Just restart terminal if needed

---

## 8. Only Time Internet Matters

| When | What | Example |
| --- | --- | --- |
| **Loading Bangla NLP model** | First time Django starts, downloads language model from HuggingFace | ~2 mins, only happens once |
| **Calling Gemini API** | Rewrite feature needs Google API key (your backend has it) | Built-in, no user internet needed |
| **Everything else** | All local | Instant |

---

## Summary

```
YOUR COMPUTER
├─ Chrome Extension (Frontend)
└─ Django Backend (API)
    └─ Connected via localhost:8000

✓ No internet needed
✓ No server deployment needed
✓ No costs
✓ Super fast
✓ Perfect for demo
✓ Perfect for course assignment
```

---

*Visual Guide — February 24, 2026*
