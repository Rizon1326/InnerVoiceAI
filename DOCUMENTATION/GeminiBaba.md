# GeminiBaba — Gemini API Role & Impact in InnerVoiceAI

This document explains which API key is used for what, how the system works when Gemini is unavailable, and exactly which features are impacted.

---

## API Keys in the Project

There are **two** Gemini API keys in the project, but only **one** is actually used:

| Key | Location | Value | Status |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | `backend/.env` | `AIzaSyCMKIsmN-TvVCUVs7omCX3qqMLm6qMjHjU` | ✅ **Used** — powers rewriting & personality refinement |
| `VITE_GEMINI_API_KEY` | `frontend/.env` | `AIzaSyCXWjj7VNjNJz6uYgx3Pfrq1687Ekmbicc` | ❌ **Unused** — not referenced anywhere in frontend source code |

The backend key is consumed via `python-decouple`'s `config('GEMINI_API_KEY', default='')` in two services:

- **`gemini_service.py`** — uses it to refine personality (Big Five) scores
- **`text_rewriter.py`** — uses it for AI-powered text rewriting

---

## How Analysis Works (No Gemini Needed)

The main analysis flow (`POST /api/analyze/`) does **NOT** require Gemini. Here's the full pipeline:

```
User submits text
    │
    ▼
ContextAnalyzer.analyze(text)
    ├── LanguageDetector        → Bangla / Banglish / English    [Rule-based Python]
    ├── BanglaProcessor         → Normalisation, transliteration  [Rule-based Python]
    ├── SentimentAnalyzer       → Positive / Neutral / Negative   [HuggingFace ML model]
    │     └── Model: cardiffnlp/twitter-xlm-roberta-base-sentiment
    │     └── Cultural context adjustments for Bangla (pure Python)
    ├── EmotionDetector         → Joy, Sadness, Anger, Fear, etc. [HuggingFace ML model]
    ├── Tone Detection          → Friendly / Serious / Humorous   [Keyword-based Python]
    └── Intent Classification   → Communicative intent            [Rule-based Python]
    │
    ▼
PersonalityAnalyzer.analyze(text)
    └── Big Five (OCEAN) scores                                   [Rule-based Python]
    │
    ▼
GeminiService.enhance_personality(text, scores)
    └── If API key valid  → Gemini refines OCEAN scores           [Gemini API]
    └── If API key missing → Returns original scores unchanged    [Fallback]
    │
    ▼
Save Post + Analysis to database
ProgressTracker.update_daily_progress(user)
```

**Key point**: Even if Gemini is completely dead, analysis completes successfully. You just get rule-based personality scores instead of Gemini-refined ones.

---

## How Rewriting Works (Gemini Optional)

The rewrite flow (`POST /api/rewrite/`) has two paths:

### Path A: With Gemini (full AI rewrite)

```
User submits text + goal (e.g., "more_positive")
    │
    ▼
TextRewriter.rewrite(text, goal)
    ├── detect_negative_words(text)    → Scans hardcoded dictionary
    ├── Build prompt with goal instructions + analysis data
    ├── Send to Gemini 2.5 Flash
    └── Parse JSON response
    │
    ▼
Returns:
  - Fully rewritten text (context-aware, sentence-level changes)
  - Highlighted problematic words + alternatives
  - List of specific improvements made
  - Changes summary
  - success: true
```

**Example**: "I hate this terrible situation, everything is awful"
→ *"I find this situation challenging, but I'm working through it and things will improve."*

### Path B: Without Gemini (fallback word replacement)

```
User submits text + goal
    │
    ▼
TextRewriter.rewrite(text, goal)
    ├── detect_negative_words(text)    → Scans hardcoded dictionary
    ├── self.model is None → calls _get_fallback_response()
    └── Replaces words from NEGATIVE_WORDS_DB dictionary
    │
    ▼
Returns:
  - Word-substituted text (no sentence restructuring)
  - Detected negative words + alternatives
  - Basic improvements list
  - success: false
  - error: "Using fallback rewriting (Gemini API unavailable)"
```

**Example**: "I hate this terrible situation, everything is awful"
→ *"I dislike this difficult situation, everything is challenging."*

### The fallback dictionary

The `NEGATIVE_WORDS_DB` contains entries like:

| Word | Alternatives | Category |
| --- | --- | --- |
| hate | dislike, am not fond of, prefer not to | aggression |
| stupid | unclear, confusing, needs improvement | aggression |
| terrible | challenging, difficult, tough | negativity |
| awful | not ideal, suboptimal, needs work | negativity |
| wrong | different, not aligned, needing adjustment | negativity |
| can't | am working on, am learning to | negativity |
| problem | challenge, opportunity, situation | negativity |

Only the **first alternative** is used in fallback mode.

---

## Impact Summary When Gemini Key Is Invalid / Expired / Quota Exhausted

### ❌ Impacted (degrades to fallback)

| Feature | With Gemini | Without Gemini | Quality Loss |
| --- | --- | --- | --- |
| **Text Rewriting** | Full AI rewrite — sentence restructuring, tone transformation, contextual improvements | Simple word substitution from dictionary only | **High** |
| **Personality Refinement** | Gemini refines Big Five scores with deeper text understanding | Raw rule-based keyword scores | **Low–Medium** |

### ✅ NOT Impacted (zero Gemini dependency)

| Feature | How it works | Technology |
| --- | --- | --- |
| Sentiment Analysis | ML classification (positive/neutral/negative) | HuggingFace transformer |
| Emotion Detection | ML scoring (joy, sadness, anger, fear, surprise) | HuggingFace transformer |
| Language Detection | Bangla / Banglish / English classification | Rule-based Python |
| Tone Detection | Friendly / serious / humorous / sarcastic | Keyword-based Python |
| Intent Classification | Communicative intent | Rule-based Python |
| Bangla/Banglish Processing | Normalisation, transliteration, slang detection | Rule-based Python |
| Cultural Context Adjustments | Boosts for expressions like "দারুণ", "ফাটাফাটি" | Rule-based Python |
| Dashboard & All Charts | Sentiment trend, emotion profile, writing style, etc. | Database queries |
| Progress Tracking | Daily averages, streaks, growth index | Database queries |
| Writing Consistency | 5-dimension radar score | Database queries |
| Key Metric Trends | Sentiment, joy, sadness, anger, openness, neuroticism | Database queries |
| User Authentication | Register, login, logout, token management | Django auth |

### Bottom Line

> **~90% of InnerVoiceAI works perfectly without Gemini.** The only significant loss is the quality of text rewriting — it drops from intelligent AI-powered rewrites to basic word swaps. Analysis, dashboard, charts, trends, emotions, sentiment — all completely untouched.

---

## How the Fallback Mechanism Works (Code Level)

Both services follow the exact same pattern:

```python
class TextRewriter:  # (same pattern in GeminiService)
    def __init__(self):
        api_key = config('GEMINI_API_KEY', default='')
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None  # ← no crash, just None

    def rewrite(self, text, ...):
        if not self.model:
            return self._get_fallback_response(text, ...)  # ← graceful fallback
        try:
            response = self.model.generate_content(prompt)
            # ... parse response ...
        except Exception:
            return self._get_fallback_response(text, ...)  # ← also catches runtime errors
```

This means:
- **Key missing/empty** → `self.model = None` → fallback used immediately
- **Key invalid/expired** → `self.model` is created but `generate_content()` throws an exception → caught by `except` → fallback used
- **Quota exhausted** → same as above, API returns an error → caught → fallback used

The app **never crashes** due to Gemini issues.

---

## File References

| File | Role |
| --- | --- |
| `backend/.env` | Stores the active `GEMINI_API_KEY` |
| `frontend/.env` | Stores unused `VITE_GEMINI_API_KEY` |
| `backend/services/gemini_service.py` | Gemini personality refinement (optional) |
| `backend/services/text_rewriter.py` | Gemini rewriting + fallback word replacement |
| `backend/services/sentiment_analyzer.py` | HuggingFace sentiment (no Gemini) |
| `backend/services/emotion_detector.py` | HuggingFace emotion (no Gemini) |
| `backend/services/context_analyzer.py` | Central analysis engine (no Gemini) |
| `backend/services/personality_analyzer.py` | Rule-based Big Five scoring (no Gemini) |
