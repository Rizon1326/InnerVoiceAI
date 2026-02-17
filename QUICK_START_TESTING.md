# Quick Start Guide: Testing User Tracking & Evaluation Metrics

## Prerequisites
- Backend running on `http://localhost:8000`
- Postman installed

---

## Step 1: Apply Database Migrations

```bash
cd /Users/rizon/Desktop/InnerVoiceAI/backend

# Create migrations for new models
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

---

## Step 2: Test in Postman

### Test 1: Register a New User

**Method:** POST  
**URL:** `http://localhost:8000/api/auth/register/`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure_password_123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
  }
}
```

**⚠️ SAVE THIS TOKEN** - You'll need it for all other requests!

---

### Test 2: Login User

**Method:** POST  
**URL:** `http://localhost:8000/api/auth/login/`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "username": "john_doe",
  "password": "secure_password_123"
}
```

**Expected Response:** (Same as registration)
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "username": "john_doe",
    "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b"
  }
}
```

---

### Test 3: Analyze Text (With Authentication)

**Method:** POST  
**URL:** `http://localhost:8000/api/analyze/`

**Headers:**
```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "text": "I am very happy and excited about this amazing project!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "827e3af3-6521-495d-9539-25d79735d63d",
    "text": "I am very happy and excited about this amazing project!",
    "language": "en",
    "created_at": "2026-02-17T10:30:00",
    "analysis": {
      "sentiment": {
        "label": "positive",
        "score": 0.95,
        "scores": {
          "positive": 0.95,
          "neutral": 0.04,
          "negative": 0.01
        }
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

**✅ Key Point:** After this, EmotionalProgress for today is automatically created!

---

### Test 4: Analyze More Posts (To Build Trends)

Send the analyze request **multiple times** with different texts:

```json
{
  "text": "I felt sad yesterday but today is better!"
}
```

```json
{
  "text": "Things are looking up! I am becoming more positive."
}
```

---

### Test 5: Get User's Emotional Progress

**Method:** GET  
**URL:** `http://localhost:8000/api/progress/?days=30`

**Headers:**
```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

**Expected Response:**
```json
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
      "avg_personality_openness": 68,
      "avg_personality_conscientiousness": 65,
      "avg_personality_extraversion": 75,
      "avg_personality_agreeableness": 72,
      "avg_personality_neuroticism": 28,
      "posts_count": 3,
      "created_at": "2026-02-17T23:59:59"
    }
  ]
}
```

**📊 This is your daily snapshot!** Shows daily averages of all emotions and personality traits.

---

### Test 6: Get Emotional Trends

**Method:** GET  
**URL:** `http://localhost:8000/api/progress/trends/?days=30`

**Headers:**
```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

**Expected Response:**
```json
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
    "anger_trend": {
      "current": 0.05,
      "previous": 0.20,
      "trend": -0.15,
      "improvement": "positive"
    },
    "neuroticism_trend": {
      "current": 28,
      "previous": 45,
      "trend": -17,
      "improvement": "positive"
    },
    "openness_trend": {
      "current": 68,
      "previous": 52,
      "trend": 16,
      "improvement": "positive"
    }
  }
}
```

**✨ This shows improvements over the last N days!**

---

### Test 7: Get User Effectiveness Metrics

**Method:** GET  
**URL:** `http://localhost:8000/api/metrics/`

**Headers:**
```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid...",
    "total_posts_analyzed": 5,
    "total_rewrites_generated": 0,
    "languages_used": 1,
    "avg_sentiment_improvement": 45.2,
    "emotional_stability": 12.5,
    "personality_growth": 8.3,
    "avg_rewrite_sentiment_change": 0.0,
    "avg_rewrite_positivity_increase": 0.0,
    "days_active": 1,
    "average_posts_per_day": 5.0,
    "streak_days": 1,
    "last_updated": "2026-02-17T10:35:00"
  }
}
```

**📈 These are your EVALUATION METRICS for the teacher:**
- `total_posts_analyzed`: 5 posts
- `avg_sentiment_improvement`: 45.2% improvement!
- `emotional_stability`: 12.5 (lower = more stable) ✓
- `personality_growth`: 8.3 points improvement
- `days_active`: 1 day (would increase with repeated usage)
- `average_posts_per_day`: 5 posts/day (engagement metric)

---

### Test 8: Get User Profile

**Method:** GET  
**URL:** `http://localhost:8000/api/profile/`

**Headers:**
```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "posts_count": 5,
    "date_joined": "2026-02-17T10:20:00",
    "metrics": {
      "id": "uuid...",
      "total_posts_analyzed": 5,
      "total_rewrites_generated": 0,
      "languages_used": 1,
      "avg_sentiment_improvement": 45.2,
      "emotional_stability": 12.5,
      "personality_growth": 8.3,
      "days_active": 1,
      "average_posts_per_day": 5.0,
      "streak_days": 1,
      "last_updated": "2026-02-17T10:35:00"
    }
  }
}
```

---

### Test 9: Get Public Project Statistics

**Method:** GET  
**URL:** `http://localhost:8000/api/statistics/`

**Headers:** (No authentication needed)
```
Content-Type: application/json
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "total_active_users": 1,
    "total_posts_analyzed": 5,
    "total_analyses": 5,
    "average_sentiment": 0.68,
    "most_common_emotion": "joy",
    "emotion_distribution": {
      "joy": 0.72,
      "sadness": 0.12,
      "anger": 0.08,
      "fear": 0.05,
      "surprise": 0.15
    }
  }
}
```

**🌍 This is public data about all users combined!**

---

## Step 3: Postman Collection Setup (Optional)

Create environment variables in Postman:

1. Click **"Environments"** (top left)
2. Create new environment: `InnerVoiceAI`
3. Add variables:
   - `base_url` = `http://localhost:8000/api`
   - `token` = `9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b`

Then use in requests:
- URL: `{{base_url}}/analyze/`
- Header: `Authorization: Token {{token}}`

---

## Summary: What Each Endpoint Does

| Endpoint | Purpose | Auth? |
|----------|---------|-------|
| `/auth/register/` | Create new user account | ❌ |
| `/auth/login/` | Login and get token | ❌ |
| `/analyze/` | Analyze a post | ✅ Token |
| `/history/` | Get user's past posts | ✅ Token |
| `/progress/` | Get daily emotional progress | ✅ Token |
| `/progress/trends/` | Get emotional improvement trends | ✅ Token |
| `/metrics/` | Get effectiveness metrics (for teacher) | ✅ Token |
| `/profile/` | Get user profile with all data | ✅ Token |
| `/statistics/` | Get project-wide stats | ❌ |

---

## Next Steps

1. **Run migrations** to create new tables
2. **Test each endpoint** in Postman following the above examples
3. **Create multiple users** and analyze posts to see how data is isolated
4. **Check trends** after analyzing multiple posts to see progress tracking
5. **Show metrics** to your teacher as proof of project effectiveness measurement

---

## Troubleshooting

**Problem:** Getting "403 Forbidden" or "401 Unauthorized"
- **Solution:** Check your token in the Authorization header is correct

**Problem:** EmotionalProgress not updating
- **Solution:** Make sure you're calling `/analyze/` with valid posts; progress is auto-updated

**Problem:** Metrics showing zeros
- **Solution:** Analyze at least 2 posts to see trends (needs comparison data)

---

Good luck! Your system now supports **multi-user tracking** with **comprehensive evaluation metrics**! 🎉
