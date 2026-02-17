# InnerVoiceAI: User Tracking & Evaluation Metrics Implementation

## Overview

This document explains how the expanded InnerVoiceAI system handles user authentication, emotional progress tracking, and project effectiveness evaluation.

---

## PART 1: User Authentication System

### Do Users Need to Log In?

**YES** - Each user must log in separately.

**Why?**
- ✅ Tracks individual emotional journeys
- ✅ Privacy: Users only see their own data
- ✅ Enables personal recommendations
- ✅ Supports multi-user analytics

---

## PART 2: Database Structure for User Data

### Tables & Relationships

#### Table 1: User (Django Built-in)
```
User
├── id (PK)
├── username (unique)
├── email (unique)
├── password (hashed)
└── date_joined
```

#### Table 2: Post
```
Post
├── id (UUID, PK)
├── user_id (FK) → User
├── text (TextField)
├── language (CharField)
└── created_at (DateTime)
```

**Key Point:** Each post has a `user_id` that links it to a specific user.

#### Table 3: Analysis
```
Analysis
├── id (UUID, PK)
├── post_id (FK) → Post
├── sentiment_label
├── sentiment_score
├── emotion_joy, sadness, anger, fear, surprise, neutral
├── personality_openness, conscientiousness, extraversion, agreeableness, neuroticism
└── created_at (DateTime)
```

#### Table 4: EmotionalProgress (NEW)
```
EmotionalProgress
├── id (UUID, PK)
├── user_id (FK) → User
├── date (DateField)
├── avg_sentiment_score (daily average)
├── avg_emotion_joy (daily average)
├── avg_emotion_sadness (daily average)
├── ... (other emotion & personality averages)
├── posts_count (# posts analyzed that day)
└── created_at (DateTime)
```

**Purpose:** Stores daily snapshots of emotional metrics for trend visualization.

#### Table 5: ProjectMetrics (NEW)
```
ProjectMetrics
├── id (UUID, PK)
├── user_id (FK) → User (one-to-one)
├── total_posts_analyzed
├── total_rewrites_generated
├── languages_used
├── avg_sentiment_improvement (%)
├── emotional_stability (0-100, lower = more stable)
├── personality_growth (change in Big Five traits)
├── avg_rewrite_sentiment_change
├── avg_rewrite_positivity_increase
├── days_active
├── average_posts_per_day
├── streak_days (consecutive days with posts)
└── last_updated (DateTime)
```

**Purpose:** Comprehensive evaluation metrics for measuring project effectiveness.

---

## PART 3: Data Processing Flow

### Step 1: User Registration
```
User submits: username, email, password
↓
Backend validates credentials
↓
Creates User object with hashed password
↓
Creates Token for API authentication
↓
Creates empty ProjectMetrics record
↓
Returns token to frontend (for subsequent API calls)
```

### Step 2: User Login
```
User submits: username, password
↓
Backend authenticates against User table
↓
Retrieves or creates Token
↓
Returns token (valid for all future requests)
```

### Step 3: Analyze Post (Authenticated)
```
Frontend: POST /api/analyze/ with token
{
  "text": "I am happy about this project!"
}
↓
Backend: Extracts user from token
↓
Backend: Analyzes sentiment, emotions, personality
↓
Backend: Creates Post object with user_id
↓
Backend: Creates Analysis object linked to Post
↓
Backend: Calls ProgressTracker.update_daily_progress(user)
  ├─ Calculates daily averages
  ├─ Updates or creates EmotionalProgress record
  └─ Returns the daily snapshot
↓
Returns analysis result to frontend
```

### Step 4: Generate Daily Emotional Progress
```
Automatically triggered after each analysis:

ProgressTracker.update_daily_progress(user):
  ├─ Get all posts analyzed today by user
  ├─ Calculate averages of all emotions
  ├─ Calculate averages of all personality traits
  ├─ Store as EmotionalProgress record (one per day)
  └─ Later: Frontend can fetch and visualize as a chart
```

### Step 5: Calculate User Metrics
```
Triggered on-demand when user views dashboard:

MetricsCalculator.calculate_user_metrics(user):
  ├─ Count total posts
  ├─ Count unique languages used
  ├─ Calculate sentiment improvement (first post vs latest)
  ├─ Calculate emotional stability (standard deviation)
  ├─ Calculate personality growth (Big Five changes)
  ├─ Calculate streak (consecutive days with posts)
  ├─ Store in ProjectMetrics table
  └─ Return metrics to frontend
```

---

## PART 4: Evaluation Metrics (For Your Teacher)

### Effectiveness Metrics

#### 1. **Usage Metrics**
```
- Total posts analyzed per user
- Total rewrites generated per user
- Number of languages supported
- Days active (how many days user has used the app)
- Average posts per day (engagement metric)
```

#### 2. **Emotional Improvement Metrics**
```
Sentiment Improvement = (Final Sentiment - Initial Sentiment) / Initial Sentiment × 100

Example:
- First post sentiment: 0.3 (negative)
- Last post sentiment: 0.7 (positive)
- Improvement: (0.7 - 0.3) / 0.3 × 100 = 133% improvement
```

#### 3. **Emotional Stability**
```
Emotional Stability = Standard Deviation of daily sentiment scores
- Lower value = more emotionally stable
- Higher value = more volatile emotions

Example:
User A: Daily sentiments [0.5, 0.6, 0.55, 0.58] → Std Dev = 0.04 (STABLE)
User B: Daily sentiments [0.2, 0.8, 0.3, 0.9] → Std Dev = 0.35 (VOLATILE)
```

#### 4. **Personality Growth**
```
Personality Growth = Average change in Big Five traits over time

Example:
- Initial: Openness=50, Extraversion=45
- Final: Openness=65, Extraversion=60
- Growth = ((65-50) + (60-45)) / 2 = 15 points average improvement
```

#### 5. **Rewrite Effectiveness**
```
Rewrite Success Rate = (Posts with positive sentiment after rewrite) / (Total rewrites)
Sentiment Change = Average sentiment increase after rewrite

Example:
- Original: "I hate my life" (0.1 sentiment)
- Rewritten: "I'm looking for new opportunities" (0.6 sentiment)
- Change: +0.5 sentiment improvement
```

#### 6. **User Engagement**
```
Streak Days = Consecutive days with at least 1 post analyzed
Example: 7-day streak = user engaged for 7 consecutive days

Average Posts/Day = Total Posts / Days Active
Example: 100 posts / 20 days = 5 posts per day
```

---

## PART 5: API Endpoints

### Authentication Endpoints

#### Register User
```
POST /api/auth/register/

Request:
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123"
}

Response:
{
  "success": true,
  "data": {
    "user_id": 1,
    "username": "john_doe",
    "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
  }
}
```

#### Login User
```
POST /api/auth/login/

Request:
{
  "username": "john_doe",
  "password": "securepassword123"
}

Response:
{
  "success": true,
  "data": {
    "user_id": 1,
    "username": "john_doe",
    "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
  }
}
```

### Analysis Endpoints (Require Token)

#### Analyze Post
```
POST /api/analyze/
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b

Request:
{
  "text": "I am very happy about this amazing project!"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid...",
    "text": "I am very happy about this amazing project!",
    "language": "en",
    "created_at": "2026-02-17T10:30:00",
    "analysis": {
      "sentiment": {
        "label": "positive",
        "score": 0.95,
        "scores": {"positive": 0.95, "neutral": 0.04, "negative": 0.01}
      },
      "emotions": {
        "joy": 0.98,
        "sadness": 0.001,
        "anger": 0.001,
        "fear": 0.0007,
        "surprise": 0.01,
        "neutral": 0.002
      },
      "personality": {
        "openness": 70,
        "conscientiousness": 65,
        "extraversion": 80,
        "agreeableness": 75,
        "neuroticism": 25
      }
    }
  }
}
```

### Progress Tracking Endpoints

#### Get Emotional Progress
```
GET /api/progress/?days=30
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid...",
      "date": "2026-02-17",
      "avg_sentiment_score": 0.68,
      "avg_emotion_joy": 0.72,
      "avg_emotion_sadness": 0.12,
      "avg_emotion_anger": 0.08,
      "avg_emotion_fear": 0.05,
      "avg_emotion_surprise": 0.15,
      "avg_personality_openness": 65,
      "avg_personality_conscientiousness": 60,
      "avg_personality_extraversion": 70,
      "avg_personality_agreeableness": 68,
      "avg_personality_neuroticism": 35,
      "posts_count": 5,
      "created_at": "2026-02-17T23:59:59"
    },
    // ... more days
  ]
}
```

#### Get Emotional Trends
```
GET /api/progress/trends/?days=30
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b

Response:
{
  "success": true,
  "data": {
    "sentiment_trend": {
      "current": 0.72,
      "previous": 0.45,
      "trend": 0.27,
      "improvement": "positive"
    },
    "joy_trend": {
      "current": 0.80,
      "previous": 0.50,
      "trend": 0.30,
      "improvement": "positive"
    },
    "sadness_trend": {
      "current": 0.08,
      "previous": 0.35,
      "trend": -0.27,
      "improvement": "positive"
    },
    // ... more trends
  }
}
```

### Metrics & Evaluation Endpoints

#### Get User Metrics
```
GET /api/metrics/
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b

Response:
{
  "success": true,
  "data": {
    "id": "uuid...",
    "total_posts_analyzed": 45,
    "total_rewrites_generated": 12,
    "languages_used": 2,
    "avg_sentiment_improvement": 45.2,
    "emotional_stability": 15.3,
    "personality_growth": 8.5,
    "avg_rewrite_sentiment_change": 0.18,
    "avg_rewrite_positivity_increase": 22.3,
    "days_active": 15,
    "average_posts_per_day": 3.0,
    "streak_days": 5,
    "last_updated": "2026-02-17T10:30:00"
  }
}
```

#### Get Project Statistics (Public)
```
GET /api/statistics/

Response:
{
  "success": true,
  "data": {
    "total_active_users": 24,
    "total_posts_analyzed": 1250,
    "total_analyses": 1250,
    "average_sentiment": 0.62,
    "most_common_emotion": "joy",
    "emotion_distribution": {
      "joy": 0.68,
      "sadness": 0.12,
      "anger": 0.08,
      "fear": 0.05,
      "surprise": 0.15
    }
  }
}
```

#### Get User Profile
```
GET /api/profile/
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "posts_count": 45,
    "date_joined": "2026-02-01",
    "metrics": {
      "id": "uuid...",
      "total_posts_analyzed": 45,
      // ... (full metrics)
    }
  }
}
```

---

## PART 6: Implementation Steps (To Apply)

### Step 1: Create Migration
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Step 2: Test Authentication
```bash
# Register
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# You'll get a token like: "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

### Step 3: Test Analysis (With Token)
```bash
curl -X POST http://localhost:8000/api/analyze/ \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b" \
  -H "Content-Type: application/json" \
  -d '{"text":"I am very happy about this project!"}'
```

### Step 4: Check Progress
```bash
curl -X GET http://localhost:8000/api/progress/?days=30 \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

### Step 5: Check Metrics
```bash
curl -X GET http://localhost:8000/api/metrics/ \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
```

---

## Summary

| Feature | How It Works |
|---------|-------------|
| **User Login** | Username + Password → Token → All requests require token |
| **Data Isolation** | Each user's posts linked via user_id foreign key |
| **Daily Progress** | Auto-calculated after each analysis, stored in EmotionalProgress |
| **Metrics** | Calculated on-demand, shows sentiment improvement, stability, growth |
| **Trends** | Shows current vs previous metrics, indicates if improvement/decline |
| **Evaluation** | Teachers can see total_posts, sentiment improvement, engagement metrics |

This expanded system now supports **multi-user tracking** with **comprehensive evaluation metrics** for measuring project effectiveness! 🎉
