# Backend API Testing Guide

**Base URL:** `http://localhost:8000/api`

**Note:** Make sure your Django server is running before testing:
```bash
cd /Users/rizon/Desktop/InnerVoiceAI/backend
python manage.py runserver
```

---

## 🔓 PUBLIC ENDPOINTS (No Authentication Required)

### 1. Health Check
**Endpoint:** `GET /health/`

**Purpose:** Verify the API is running

**Request:**
```bash
curl -X GET http://localhost:8000/api/health/
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "message": "API running"
}
```

---

### 2. Register User
**Endpoint:** `POST /auth/register/`

**Purpose:** Create a new user account

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
}
```

**cURL Command:**
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected Response (201 Created):**
```json
{
    "success": true,
    "message": "User registered successfully",
    "data": {
        "user_id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
    }
}
```

**Error Response - Username Exists (400):**
```json
{
    "success": false,
    "error": "Username already exists"
}
```

**Error Response - Missing Fields (400):**
```json
{
    "success": false,
    "error": "username, email, and password are required"
}
```

---

### 3. Login User
**Endpoint:** `POST /auth/login/`

**Purpose:** Authenticate user and get API token

**Request Body:**
```json
{
    "username": "john_doe",
    "password": "SecurePass123!"
}
```

**cURL Command:**
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123!"
  }'
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user_id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
    }
}
```

**Error Response - Invalid Credentials (401):**
```json
{
    "success": false,
    "error": "Invalid credentials"
}
```

**Save the token for authenticated requests!**

---

### 4. Public Statistics
**Endpoint:** `GET /statistics/`

**Purpose:** Get overall project statistics (no authentication needed)

**Request:**
```bash
curl -X GET http://localhost:8000/api/statistics/
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "total_users": 5,
        "total_posts_analyzed": 42,
        "total_rewrites_generated": 18,
        "languages_used": 2,
        "avg_sentiment_score": 0.65,
        "most_common_emotion": "joy",
        "platform_stability_score": 85.5
    }
}
```

---

## 🔐 AUTHENTICATED ENDPOINTS

**All endpoints below require the token from login/register.**

**Headers for all authenticated requests:**
```
Authorization: Token YOUR_TOKEN_HERE
Content-Type: application/json
```

Replace `YOUR_TOKEN_HERE` with the token you received from login/register.

---

### 5. Logout User
**Endpoint:** `POST /auth/logout/`

**Purpose:** Invalidate user's authentication token

**Request:**
```bash
curl -X POST http://localhost:8000/api/auth/logout/ \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "message": "Logout successful"
}
```

---

### 6. Analyze Text
**Endpoint:** `POST /analyze/`

**Purpose:** Analyze text for sentiment, emotions, and personality

**Request Body:**
```json
{
    "text": "I am feeling wonderful today! The weather is amazing and I'm excited about the new project."
}
```

**cURL Command:**
```bash
curl -X POST http://localhost:8000/api/analyze/ \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I am feeling wonderful today! The weather is amazing and I'\''m excited about the new project."
  }'
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "text": "I am feeling wonderful today! The weather is amazing and I'm excited about the new project.",
        "language": "en",
        "created_at": "2026-02-17T14:30:45.123456Z",
        "analysis": {
            "id": "650e8400-e29b-41d4-a716-446655440001",
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
                "joy": 0.92,
                "sadness": 0.02,
                "anger": 0.01,
                "fear": 0.01,
                "surprise": 0.03,
                "neutral": 0.01
            },
            "personality": {
                "openness": 78,
                "conscientiousness": 72,
                "extraversion": 85,
                "agreeableness": 80,
                "neuroticism": 15
            },
            "created_at": "2026-02-17T14:30:45.123456Z"
        }
    }
}
```

**Error Response - Text Too Short (400):**
```json
{
    "success": false,
    "error": "Text too short"
}
```

**Error Response - Unsupported Language (400):**
```json
{
    "success": false,
    "error": "Unsupported language"
}
```

**Error Response - No Authentication (401):**
```json
{
    "detail": "Authentication credentials were not provided."
}
```

---

### 7. Get User History
**Endpoint:** `GET /history/?limit=10`

**Purpose:** Get all analyzed posts for the authenticated user

**Query Parameters:**
- `limit` (optional, default: 20) - Number of posts to retrieve

**Request:**
```bash
curl -X GET http://localhost:8000/api/history/?limit=10 \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "text": "I am feeling wonderful today!",
            "language": "en",
            "created_at": "2026-02-17T14:30:45.123456Z",
            "analysis": {
                "id": "650e8400-e29b-41d4-a716-446655440001",
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
                    "joy": 0.92,
                    "sadness": 0.02,
                    "anger": 0.01,
                    "fear": 0.01,
                    "surprise": 0.03,
                    "neutral": 0.01
                },
                "personality": {
                    "openness": 78,
                    "conscientiousness": 72,
                    "extraversion": 85,
                    "agreeableness": 80,
                    "neuroticism": 15
                },
                "created_at": "2026-02-17T14:30:45.123456Z"
            }
        },
        {
            "id": "550e8400-e29b-41d4-a716-446655440002",
            "text": "Today was a challenging day...",
            "language": "en",
            "created_at": "2026-02-17T13:15:30.654321Z",
            "analysis": {
                "id": "650e8400-e29b-41d4-a716-446655440003",
                "sentiment": {
                    "label": "negative",
                    "score": 0.25,
                    "scores": {
                        "positive": 0.10,
                        "neutral": 0.20,
                        "negative": 0.70
                    }
                },
                "emotions": {
                    "joy": 0.05,
                    "sadness": 0.70,
                    "anger": 0.15,
                    "fear": 0.05,
                    "surprise": 0.02,
                    "neutral": 0.03
                },
                "personality": {
                    "openness": 65,
                    "conscientiousness": 68,
                    "extraversion": 45,
                    "agreeableness": 72,
                    "neuroticism": 65
                },
                "created_at": "2026-02-17T13:15:30.654321Z"
            }
        }
    ]
}
```

**Error Response - Empty History (200 OK):**
```json
{
    "success": true,
    "data": []
}
```

---

### 8. Rewrite Text
**Endpoint:** `POST /rewrite/`

**Purpose:** Generate AI-improved version of text based on sentiment and personality

**Request Body (Option 1 - New Text):**
```json
{
    "text": "I hate this situation, everything is terrible."
}
```

**Request Body (Option 2 - Existing Post):**
```json
{
    "post_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**cURL Command (New Text):**
```bash
curl -X POST http://localhost:8000/api/rewrite/ \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I hate this situation, everything is terrible."
  }'
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "original_text": "I hate this situation, everything is terrible.",
        "rewritten_text": "I dislike this situation, there are some challenges to overcome.",
        "sentiment_before": {
            "label": "negative",
            "score": 0.15
        },
        "sentiment_after": {
            "label": "negative",
            "score": 0.45
        },
        "improvement_percentage": 200
    }
}
```

---

### 9. Get User Progress
**Endpoint:** `GET /progress/?days=30`

**Purpose:** Get daily emotional snapshots for the last N days

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to retrieve

**Request:**
```bash
curl -X GET http://localhost:8000/api/progress/?days=30 \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "data": [
        {
            "id": "750e8400-e29b-41d4-a716-446655440000",
            "date": "2026-02-17",
            "avg_sentiment_score": 0.72,
            "avg_emotion_joy": 0.68,
            "avg_emotion_sadness": 0.12,
            "avg_emotion_anger": 0.08,
            "avg_emotion_fear": 0.05,
            "avg_emotion_surprise": 0.07,
            "avg_personality_openness": 75.5,
            "avg_personality_conscientiousness": 70.0,
            "avg_personality_extraversion": 78.0,
            "avg_personality_agreeableness": 76.0,
            "avg_personality_neuroticism": 25.0,
            "posts_count": 3,
            "created_at": "2026-02-17T23:59:59.999999Z"
        },
        {
            "id": "750e8400-e29b-41d4-a716-446655440001",
            "date": "2026-02-16",
            "avg_sentiment_score": 0.65,
            "avg_emotion_joy": 0.58,
            "avg_emotion_sadness": 0.18,
            "avg_emotion_anger": 0.10,
            "avg_emotion_fear": 0.08,
            "avg_emotion_surprise": 0.06,
            "avg_personality_openness": 72.0,
            "avg_personality_conscientiousness": 68.0,
            "avg_personality_extraversion": 75.0,
            "avg_personality_agreeableness": 74.0,
            "avg_personality_neuroticism": 30.0,
            "posts_count": 2,
            "created_at": "2026-02-16T23:59:59.999999Z"
        }
    ]
}
```

---

### 10. Get Emotional Trends
**Endpoint:** `GET /progress/trends/?days=30`

**Purpose:** Get trend analysis showing emotional improvements over time

**Query Parameters:**
- `days` (optional, default: 30) - Number of days for trend calculation

**Request:**
```bash
curl -X GET http://localhost:8000/api/progress/trends/?days=30 \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "sentiment_trend": {
            "direction": "upward",
            "change_percentage": 15.5,
            "current_value": 0.75,
            "previous_value": 0.65
        },
        "joy_trend": {
            "direction": "upward",
            "change_percentage": 12.3,
            "current_value": 0.70,
            "previous_value": 0.62
        },
        "sadness_trend": {
            "direction": "downward",
            "change_percentage": -25.0,
            "current_value": 0.10,
            "previous_value": 0.13
        },
        "anger_trend": {
            "direction": "downward",
            "change_percentage": -20.0,
            "current_value": 0.08,
            "previous_value": 0.10
        },
        "neuroticism_trend": {
            "direction": "downward",
            "change_percentage": -18.5,
            "current_value": 25.0,
            "previous_value": 30.7
        },
        "openness_trend": {
            "direction": "upward",
            "change_percentage": 5.2,
            "current_value": 76.0,
            "previous_value": 72.3
        }
    }
}
```

---

### 11. Get User Metrics
**Endpoint:** `GET /metrics/`

**Purpose:** Get comprehensive effectiveness metrics for the user

**Request:**
```bash
curl -X GET http://localhost:8000/api/metrics/ \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "id": "850e8400-e29b-41d4-a716-446655440000",
        "total_posts_analyzed": 15,
        "total_rewrites_generated": 5,
        "languages_used": 1,
        "avg_sentiment_improvement": 25.5,
        "emotional_stability": 12.3,
        "personality_growth": 8.5,
        "avg_rewrite_sentiment_change": 18.2,
        "avg_rewrite_positivity_increase": 22.0,
        "days_active": 7,
        "average_posts_per_day": 2.14,
        "streak_days": 3,
        "last_updated": "2026-02-17T14:30:45.123456Z"
    }
}
```

**Metrics Explanation:**
- `total_posts_analyzed`: Number of texts you've analyzed
- `total_rewrites_generated`: Number of rewrites you've created
- `languages_used`: Count of different languages used
- `avg_sentiment_improvement`: % improvement in sentiment over time
- `emotional_stability`: Lower is better (0 = very stable)
- `personality_growth`: Change in Big Five traits
- `days_active`: Days with at least one post
- `average_posts_per_day`: Engagement metric
- `streak_days`: Consecutive days with posts

---

### 12. Get User Profile
**Endpoint:** `GET /profile/`

**Purpose:** Get complete user profile with all their data and metrics

**Request:**
```bash
curl -X GET http://localhost:8000/api/profile/ \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

**Expected Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "posts_count": 15,
        "metrics": {
            "id": "850e8400-e29b-41d4-a716-446655440000",
            "total_posts_analyzed": 15,
            "total_rewrites_generated": 5,
            "languages_used": 1,
            "avg_sentiment_improvement": 25.5,
            "emotional_stability": 12.3,
            "personality_growth": 8.5,
            "avg_rewrite_sentiment_change": 18.2,
            "avg_rewrite_positivity_increase": 22.0,
            "days_active": 7,
            "average_posts_per_day": 2.14,
            "streak_days": 3,
            "last_updated": "2026-02-17T14:30:45.123456Z"
        }
    }
}
```

---

## 📋 Quick Testing Checklist

Use this checklist to verify all endpoints are working:

### Setup
- [ ] Backend server is running (`python manage.py runserver`)
- [ ] Database migrations are applied (`python manage.py migrate`)

### Public Endpoints
- [ ] `GET /health/` - Returns success message
- [ ] `POST /auth/register/` - Creates new user with token
- [ ] `POST /auth/login/` - Returns existing user with token
- [ ] `GET /statistics/` - Returns project statistics

### Authenticated Endpoints (use token from login)
- [ ] `POST /auth/logout/` - Invalidates token
- [ ] `POST /analyze/` - Analyzes text and returns sentiment/emotions/personality
- [ ] `GET /history/` - Returns user's analyzed posts
- [ ] `POST /rewrite/` - Returns improved text version
- [ ] `GET /progress/` - Returns daily emotional snapshots
- [ ] `GET /progress/trends/` - Returns trend analysis
- [ ] `GET /metrics/` - Returns user effectiveness metrics
- [ ] `GET /profile/` - Returns complete user profile

### Multi-User Testing
- [ ] Register User A and User B with different credentials
- [ ] User A analyzes text and verifies only their post appears in `/history/`
- [ ] User B analyzes different text
- [ ] User B's `/history/` shows only their post (not User A's)
- [ ] User B's `/metrics/` shows only their metrics

---

## 🛠️ Testing Tools Recommendations

### Option 1: Postman (GUI - Easiest)
1. Download Postman: https://www.postman.com/downloads/
2. Create a new collection
3. Add each endpoint from this guide
4. Use the "Token" variable for authenticated requests

### Option 2: cURL (Terminal)
Use the cURL commands provided in this guide

### Option 3: VS Code REST Client Extension
Create a file `.http` or `.rest` with requests:

```http
### Register
POST http://localhost:8000/api/auth/register/
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

### Login (save token from response)
POST http://localhost:8000/api/auth/login/
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePass123!"
}

### Analyze Text
POST http://localhost:8000/api/analyze/
Authorization: Token YOUR_TOKEN_HERE
Content-Type: application/json

{
  "text": "I am feeling wonderful today!"
}

### Get History
GET http://localhost:8000/api/history/
Authorization: Token YOUR_TOKEN_HERE
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Authentication credentials were not provided"
**Solution:** Make sure you're including the `Authorization: Token XXX` header

### Issue: "Invalid credentials"
**Solution:** Double-check your username and password are correct

### Issue: "Unsupported language"
**Solution:** Currently supported: English (en) and Bengali (bn)

### Issue: "Text too short"
**Solution:** Minimum text length is 3 characters

### Issue: CORS Error in Frontend
**Solution:** Backend CORS is configured, but verify `CORS_ALLOWED_ORIGINS` in `/backend/core/settings.py` includes your frontend URL

---

## 📊 Expected Performance

- Register/Login: < 500ms
- Analyze Text: 2-5 seconds (ML models processing)
- Get History: < 200ms
- Get Trends/Metrics: < 500ms

