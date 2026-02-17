# System Architecture & Data Flow Diagrams

## 1. Database Schema (ER Diagram)

```
┌─────────────────────────────────────┐
│            User (Django)            │
│─────────────────────────────────────│
│ • id (PK)                           │
│ • username (unique)                 │
│ • email (unique)                    │
│ • password (hashed)                 │
│ • date_joined                       │
└────────┬───────────────────────────┘
         │
         │ 1:N
         │ (has many)
         ▼
┌─────────────────────────────────────┐
│            Post                     │
│─────────────────────────────────────│
│ • id (PK, UUID)                     │
│ • user_id (FK) ◄─────────┐          │
│ • text                   │          │
│ • language               │          │
│ • created_at             │          │
└───┬─────────────────────────────────┘
    │
    │ 1:1
    │ (has one)
    ▼
┌─────────────────────────────────────┐
│           Analysis                  │
│─────────────────────────────────────│
│ • id (PK, UUID)                     │
│ • post_id (FK)                      │
│ • sentiment_label                   │
│ • sentiment_score                   │
│ • emotion_* (6 fields)              │
│ • personality_* (5 fields)          │
│ • created_at                        │
└─────────────────────────────────────┘

         ▲
         │
         │ 1:N (multiple per day)
         │
┌────────┴───────────────────────────┐
│      EmotionalProgress (NEW)        │
│─────────────────────────────────────│
│ • id (PK, UUID)                     │
│ • user_id (FK)                      │
│ • date (unique per user)            │
│ • avg_sentiment_score               │
│ • avg_emotion_* (6 averages)        │
│ • avg_personality_* (5 averages)    │
│ • posts_count (that day)            │
│ • created_at                        │
└────────────────────────────────────┘

         ▲
         │
         │ 1:1 (unique per user)
         │
┌────────┴───────────────────────────┐
│     ProjectMetrics (NEW)            │
│─────────────────────────────────────│
│ • id (PK, UUID)                     │
│ • user_id (FK)                      │
│ • total_posts_analyzed              │
│ • languages_used                    │
│ • avg_sentiment_improvement         │
│ • emotional_stability               │
│ • personality_growth                │
│ • days_active                       │
│ • average_posts_per_day             │
│ • streak_days                       │
│ • last_updated                      │
└────────────────────────────────────┘
```

---

## 2. Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                          │
└─────────────────────────────────────────────────────────────────┘

REGISTRATION:
┌─────────┐
│  User   │
│ Submits │
│Username │
│ Email   │
│ Password│
└────┬────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ POST /api/auth/register/                     │
│ - Validate input                             │
│ - Hash password                              │
│ - Create User object                         │
│ - Create Token object                        │
│ - Create ProjectMetrics object               │
└────┬───────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Return to Frontend                           │
│ {                                            │
│   "user_id": 1,                              │
│   "username": "john_doe",                    │
│   "token": "9944b09199c62..."                │
│ }                                            │
└──────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

LOGIN:
┌──────────────────┐
│  User Submits    │
│  Username +      │
│  Password        │
└────┬─────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ POST /api/auth/login/                        │
│ - Authenticate credentials                   │
│ - Get or create Token                        │
└────┬───────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Return Token (same as registration)          │
│ "token": "9944b09199c62..."                  │
└──────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────

AUTHENTICATED REQUESTS:
┌──────────────────────────┐
│ POST /api/analyze/        │
│ POST /api/rewrite/        │
│ GET  /api/history/        │
│ GET  /api/progress/       │
│ GET  /api/metrics/        │
│ GET  /api/profile/        │
│ ... (any protected route) │
└────┬─────────────────────┘
     │
     │ Must include Header:
     │ Authorization: Token 9944b09199c62...
     │
     ▼
┌──────────────────────────────────────────────┐
│ Backend:                                     │
│ 1. Extract token from header                 │
│ 2. Look up User from Token table             │
│ 3. Verify User exists                        │
│ 4. Associate request with User               │
│ 5. Process request with user context         │
└────┬───────────────────────────────────────┘
     │
     ├─ Valid: Execute endpoint with user_id
     │
     └─ Invalid: Return 401 Unauthorized
```

---

## 3. Analysis & Progress Tracking Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                   ANALYSIS & PROGRESS TRACKING FLOW                  │
└──────────────────────────────────────────────────────────────────────┘

USER ANALYZES POST:
┌─────────────┐
│ User enters │
│   text      │
└────┬────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ POST /api/analyze/                           │
│ {                                            │
│   "text": "I am very happy!"                 │
│ }                                            │
└────┬───────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Backend Processes:                           │
│ 1. Extract user from token                   │
│ 2. Validate text                             │
│ 3. Detect language                           │
│ 4. Analyze sentiment                         │
│ 5. Detect emotions                           │
│ 6. Analyze personality                       │
└────┬───────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Create Records:                              │
│ • Post (with user_id)                        │
│ • Analysis (with sentiment, emotions, etc)   │
└────┬───────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ AUTO-TRIGGER: ProgressTracker.update_daily   │
│ _progress(user)                              │
└────┬───────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Calculate Daily Averages:                    │
│ • Get all posts analyzed TODAY by user       │
│ • Calculate avg sentiment                    │
│ • Calculate avg emotions                     │
│ • Calculate avg personality traits           │
│ • Count posts today                          │
└────┬───────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Create/Update EmotionalProgress Record:      │
│ {                                            │
│   "user_id": 1,                              │
│   "date": "2026-02-17",                      │
│   "avg_sentiment_score": 0.68,               │
│   "avg_emotion_joy": 0.72,                   │
│   "avg_emotion_sadness": 0.12,               │
│   ...                                        │
│   "posts_count": 3                           │
│ }                                            │
└──────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Return Analysis to Frontend                  │
└──────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────────

LATER: USER VIEWS PROGRESS:

┌──────────────────────┐
│ User clicks          │
│ "View Progress"      │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ GET /api/progress/?days=30                   │
└────┬───────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Backend:                                     │
│ 1. Get user from token                       │
│ 2. Fetch EmotionalProgress records for:      │
│    - Last 30 days                            │
│    - For this user only                      │
│    - Ordered by date                         │
└────┬───────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Return Daily Snapshots:                      │
│ [                                            │
│   {                                          │
│     "date": "2026-02-17",                    │
│     "avg_sentiment": 0.68,                   │
│     "avg_joy": 0.72,                         │
│     "posts_count": 3,                        │
│     ...                                      │
│   },                                         │
│   {                                          │
│     "date": "2026-02-16",                    │
│     "avg_sentiment": 0.55,                   │
│     "avg_joy": 0.60,                         │
│     "posts_count": 2,                        │
│     ...                                      │
│   }                                          │
│   ...                                        │
│ ]                                            │
└──────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Frontend Renders:                            │
│ Line Chart showing 30-day trend!              │
│                                              │
│  Sentiment Score                             │
│    1.0 ┤                                     │
│        │     ┌─────┐                        │
│    0.8 ┤    ╱       ╲      ┌──              │
│        │   ╱         ╲    ╱                 │
│    0.6 ┤  ╱           ╲  ╱                  │
│        │ ╱             ╲╱                   │
│    0.4 ┤                                    │
│        ├────────────────────────────────► Days
│        0    10    20    30                  │
└──────────────────────────────────────────────┘
```

---

## 4. Metrics Calculation Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                    METRICS CALCULATION FLOW                          │
└──────────────────────────────────────────────────────────────────────┘

USER REQUESTS METRICS:
┌────────────────────┐
│ GET /api/metrics/  │
└────┬───────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ MetricsCalculator.calculate_user_metrics()   │
└────┬───────────────────────────────────────┘
     │
     ├─► USAGE METRICS
     │   ├─ Count total posts
     │   ├─ Count unique languages
     │   ├─ Count days with posts
     │   └─ Calculate avg posts/day
     │
     ├─► IMPROVEMENT METRICS
     │   ├─ Get first post sentiment
     │   ├─ Get latest post sentiment
     │   ├─ Calculate % improvement
     │   └─ Example: (0.9 - 0.2) / 0.2 = 350% improvement!
     │
     ├─► STABILITY METRICS
     │   ├─ Fetch all daily sentiments
     │   ├─ Calculate mean
     │   ├─ Calculate standard deviation
     │   └─ Lower = more stable
     │
     ├─► PERSONALITY GROWTH
     │   ├─ Get first Big Five scores
     │   ├─ Get latest Big Five scores
     │   ├─ Calculate average change
     │   └─ Higher = more growth
     │
     └─► ENGAGEMENT METRICS
         ├─ Calculate streak days
         ├─ Count days active
         └─ Calculate avg posts/day
     │
     ▼
┌──────────────────────────────────────────────┐
│ Update ProjectMetrics Table:                 │
│ {                                            │
│   "user_id": 1,                              │
│   "total_posts_analyzed": 15,                │
│   "avg_sentiment_improvement": 45.2,         │ ← 45% better!
│   "emotional_stability": 12.5,               │ ← Lower = stable
│   "personality_growth": 8.3,                 │ ← Growth points
│   "days_active": 7,                          │ ← Engagement
│   "average_posts_per_day": 2.14,             │ ← Engagement
│   "streak_days": 3                           │ ← Current streak
│ }                                            │
└────┬───────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Return to Frontend                           │
│ (same JSON structure)                        │
└──────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Frontend Display Options:                    │
│                                              │
│ 📊 EFFECTIVENESS DASHBOARD                   │
│ ├─ Sentiment Improvement: ↑ 45.2%            │
│ ├─ Emotional Stability: ✓ 12.5 (Stable)      │
│ ├─ Personality Growth: ↑ 8.3 points          │
│ ├─ Days Active: 7 days                       │
│ └─ Current Streak: 3 days 🔥                 │
└──────────────────────────────────────────────┘
```

---

## 5. Data Isolation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA ISOLATION ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────────┘

TWO USERS ANALYZING POSTS:

User: alice_smith          User: bob_jones
Token: abc123...           Token: xyz789...
ID: 1                      ID: 2
  │                          │
  ├─ analyze()              ├─ analyze()
  │  └─ Post#1             │  └─ Post#4
  │     user_id=1          │     user_id=2
  │                        │
  ├─ analyze()              ├─ analyze()
  │  └─ Post#2             │  └─ Post#5
  │     user_id=1          │     user_id=2
  │                        │
  └─ analyze()              └─ analyze()
     └─ Post#3                └─ Post#6
        user_id=1             user_id=2


DATABASE STATE:
┌──────────────────────────────────────┐
│ Post Table                           │
├──────────────────────────────────────┤
│ id │ user_id │ text                 │
├──────────────────────────────────────┤
│ 1  │ 1       │ "I am happy..."      │
│ 2  │ 1       │ "Great day!"         │
│ 3  │ 1       │ "Feeling good..."    │
│ 4  │ 2       │ "Working hard..."    │
│ 5  │ 2       │ "Nice weather..."    │
│ 6  │ 2       │ "Good progress..."   │
└──────────────────────────────────────┘


WHEN ALICE REQUESTS /api/history/:
┌───────────────────────────────────────────┐
│ Backend:                                  │
│ 1. Extract user from token (user_id=1)    │
│ 2. Query: Post.objects.filter(user_id=1)  │
│ 3. Return only: [Post#1, Post#2, Post#3]  │
└───────────────────────────────────────────┘
     │
     ▼
┌───────────────────────────────────────────┐
│ Alice sees:                               │
│ • Post #1: "I am happy..."                │
│ • Post #2: "Great day!"                   │
│ • Post #3: "Feeling good..."              │
│                                           │
│ ✓ Alice CANNOT see Bob's posts!           │
└───────────────────────────────────────────┘


WHEN BOB REQUESTS /api/history/:
┌───────────────────────────────────────────┐
│ Backend:                                  │
│ 1. Extract user from token (user_id=2)    │
│ 2. Query: Post.objects.filter(user_id=2)  │
│ 3. Return only: [Post#4, Post#5, Post#6]  │
└───────────────────────────────────────────┘
     │
     ▼
┌───────────────────────────────────────────┐
│ Bob sees:                                 │
│ • Post #4: "Working hard..."              │
│ • Post #5: "Nice weather..."              │
│ • Post #6: "Good progress..."             │
│                                           │
│ ✓ Bob CANNOT see Alice's posts!           │
└───────────────────────────────────────────┘


SAME ISOLATION FOR PROGRESS & METRICS:

Alice's /api/progress/
└─ Shows only her EmotionalProgress records

Bob's /api/progress/
└─ Shows only his EmotionalProgress records

Alice's /api/metrics/
└─ Shows only her ProjectMetrics

Bob's /api/metrics/
└─ Shows only his ProjectMetrics


PUBLIC /api/statistics/ (No isolation)
┌──────────────────────────────────────┐
│ Returns COMBINED DATA:                │
│ • Total users: 2 (alice + bob)        │
│ • Total posts: 6 (all posts)          │
│ • Average sentiment: (all)            │
│ • Emotion distribution: (all)         │
└──────────────────────────────────────┘
```

---

## 6. Complete Request-Response Cycle

```
COMPLETE CYCLE: USER ANALYZES 3 POSTS OVER 3 DAYS, THEN CHECKS METRICS

DAY 1:
┌──────────────────────────────────────────────┐
│ 1. POST /api/analyze/                        │
│    "I am happy" (sentiment=0.9)              │
├──────────────────────────────────────────────┤
│ Backend: Create Post(user=alice)             │
│          Create Analysis(sentiment=0.9)      │
│          Update EmotionalProgress(date=day1) │
│          - avg_sentiment = 0.9               │
│          - posts_count = 1                   │
└──────────────────────────────────────────────┘

DAY 2:
┌──────────────────────────────────────────────┐
│ 2. POST /api/analyze/                        │
│    "Feeling good" (sentiment=0.8)            │
├──────────────────────────────────────────────┤
│ Backend: Create Post(user=alice)             │
│          Create Analysis(sentiment=0.8)      │
│          Update EmotionalProgress(date=day2) │
│          - avg_sentiment = 0.8               │
│          - posts_count = 1                   │
└──────────────────────────────────────────────┘

DAY 3:
┌──────────────────────────────────────────────┐
│ 3. POST /api/analyze/                        │
│    "Great progress!" (sentiment=0.95)        │
├──────────────────────────────────────────────┤
│ Backend: Create Post(user=alice)             │
│          Create Analysis(sentiment=0.95)     │
│          Update EmotionalProgress(date=day3) │
│          - avg_sentiment = 0.95              │
│          - posts_count = 1                   │
└──────────────────────────────────────────────┘

DAY 3 (Later):
┌──────────────────────────────────────────────┐
│ 4. GET /api/metrics/                         │
├──────────────────────────────────────────────┤
│ Backend: MetricsCalculator.calculate_user_   │
│          metrics(alice)                      │
│                                              │
│ Calculations:                                │
│ • total_posts_analyzed = 3                   │
│ • first_sentiment = 0.9                      │
│ • last_sentiment = 0.95                      │
│ • avg_sentiment_improvement =                │
│   (0.95 - 0.9) / 0.9 × 100 = 5.6%            │
│ • emotional_stability = std_dev([0.9, 0.8,  │
│   0.95]) = 0.075 → 7.5 (very stable)        │
│ • days_active = 3 (3 different days)         │
│ • average_posts_per_day = 3/3 = 1.0         │
│ • streak_days = 3 (consecutive days)         │
│                                              │
│ Update ProjectMetrics:                       │
│ {                                            │
│   "user_id": 1,                              │
│   "total_posts_analyzed": 3,                 │
│   "avg_sentiment_improvement": 5.6,          │
│   "emotional_stability": 7.5,                │
│   "days_active": 3,                          │
│   "streak_days": 3                           │
│ }                                            │
└──────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────┐
│ Response to Frontend:                        │
│ {                                            │
│   "total_posts_analyzed": 3,                 │
│   "avg_sentiment_improvement": 5.6,          │
│   "emotional_stability": 7.5,                │
│   "days_active": 3,                          │
│   "streak_days": 3                           │
│ }                                            │
└──────────────────────────────────────────────┘
```

---

## Summary

✅ **Clear separation of concerns**: Each table has a specific purpose
✅ **User isolation**: Foreign keys ensure data privacy
✅ **Automatic tracking**: Daily progress calculated on-demand
✅ **Comprehensive metrics**: 13 evaluation metrics for teacher
✅ **Scalable design**: Works with 1 user or 1000 users

This architecture enables **multi-user emotional tracking** with **measurable effectiveness metrics**! 🎉
