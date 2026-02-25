# Dashboard Metrics — How & Why They Are Calculated

This document explains four key metrics displayed on the **DashboardPage**: **Growth Index**, **Sentiment Progress**, **Emotional Balance**, and **Writing Consistency**. All of them are computed in the backend inside `BehavioralAnalyticsEngine._summary_scores()` (`backend/services/behavioral_analytics.py`) and consumed on the frontend via the `useDashboard` hook.

---

## Overview

The dashboard displays a **Summary Scores Row** with three gauge cards (Sentiment Progress, Emotional Balance, Writing Consistency) and a **Growth Index** KPI stat card. They are all part of a single `summary_scores` object returned by the backend:

```json
{
  "communication_growth_index": 62.5,
  "sentiment_progress": 70.0,
  "emotional_balance": 80.0,
  "writing_consistency": 55.3
}
```

The **Growth Index** is a weighted combination of the other three.

---

## 1. Sentiment Progress (0–100)

### What it measures
How much the user's sentiment has been **improving** (trending upward) or **declining** (trending downward) over the selected period (default: 30 days).

### How it is calculated

1. **Collect daily sentiment data**: All `EmotionalProgress` records for the user within the period are fetched, ordered by date.
2. **Compute a linear regression slope** over the daily `avg_sentiment_score` values using `_linear_slope()`:
   ```
   slope = linear_regression_slope(daily_avg_sentiment_scores)
   ```
   This is a standard ordinary-least-squares slope: `Σ((x_i - x̄)(y_i - ȳ)) / Σ((x_i - x̄)²)`.
3. **Map slope to a 0–100 score**:
   ```python
   sent_score = 50 + (slope * 1000)
   sent_score = clamp(sent_score, 0, 100)
   ```
   - A slope of **0** (no change) → score of **50** (neutral baseline).
   - A positive slope (improving sentiment) → score **> 50**, up to 100.
   - A negative slope (declining sentiment) → score **< 50**, down to 0.
   - The `* 1000` factor is a normalisation constant because sentiment slopes are typically very small decimals (e.g., 0.005).

### Why this approach
- **Linear regression slope** captures the overall directional trend, filtering out day-to-day noise.
- Centring at 50 with 0–100 clamping gives an intuitive gauge: above 50 = improving, below 50 = declining.
- Multiplying by 1000 scales the tiny sentiment slope values into a human-readable range.

### Where it is displayed
- The **"Sentiment Progress"** `ScoreGauge` card (emerald color) in the Summary Scores Row.
- The value is `sentimentSummary.sentimentProgress` in the frontend.

---

## 2. Emotional Balance (0–100)

### What it measures
How emotionally **balanced** the user's writing is — specifically, how much negativity is present. A high score means the user's posts are **not dominated by negative sentiment**.

### How it is calculated

1. **Get the Emotional Tone Distribution**: The backend splits all analyses into positive/neutral/negative ratios by averaging `sentiment_positive`, `sentiment_neutral`, and `sentiment_negative` fields across all analyses in the period.
2. **Extract the negative ratio** from the "current" (second-half) distribution:
   ```python
   neg_ratio = tone['current'].get('negative', 0)
   ```
   This is a float between 0.0 (no negativity) and 1.0 (100% negativity).
3. **Map to a 0–100 score**:
   ```python
   balance_score = max(0, 100 - (neg_ratio * 200))
   balance_score = clamp(balance_score, 0, 100)
   ```
   - If `neg_ratio = 0` → score = **100** (perfectly balanced / no negativity).
   - If `neg_ratio = 0.25` → score = **50** (quarter of posts are negative).
   - If `neg_ratio ≥ 0.50` → score = **0** (half or more posts are negative).
   - The `* 200` factor means any negativity ratio above 50% floors the score to 0.

### Why this approach
- **Negative-dominant communication** is the clearest sign of emotional imbalance in writing.
- The "current" half (second half of the period) is used so the score reflects the **recent** emotional state, not older posts.
- The aggressive `* 200` penalty makes the metric sensitive — even moderate negativity significantly lowers the score, encouraging the user to write more balanced posts.

### Where it is displayed
- The **"Emotional Balance"** `ScoreGauge` card (blue color) in the Summary Scores Row.
- The value is `sentimentSummary.emotionalBalance` in the frontend.

---

## 3. Writing Consistency (0–100)

### What it measures
How **stable and consistent** the user's writing style is across multiple dimensions. A high score means the user writes in a predictable, uniform style; a low score means their style shifts frequently.

### How it is calculated

The Writing Consistency score is a **weighted composite** of five sub-dimensions:

| Dimension | Weight | Source | Method |
|---|---|---|---|
| **Sentiment stability** | 25% | Daily `avg_sentiment_score` from `EmotionalProgress` | Variance → Consistency |
| **Tone consistency** | 20% | `detected_tone` field on each Post | Distribution entropy |
| **Post-type stability** | 20% | `post_type` field on each Post | Distribution entropy |
| **Language consistency** | 15% | `detected_language_type` on each Post | Distribution entropy |
| **Word-count regularity** | 20% | `word_count` field on each Post | Variance → Consistency |

#### Sub-methods:

**`_variance_to_consistency(values)` — for numeric dimensions (sentiment, word count):**
```python
std = sqrt(variance(values))
consistency = 100 * exp(-2 * std)
```
- Uses a **sigmoid-like exponential decay**: low standard deviation → score near 100; high standard deviation → score near 0.
- This means if the user's sentiment scores (or word counts) are all very similar, consistency is high.

**`_distribution_consistency(items)` — for categorical dimensions (tone, post-type, language):**
```python
entropy = -Σ (p_i * log2(p_i))  # Shannon entropy
normalised_entropy = entropy / log2(n_categories)
consistency = (1 - normalised_entropy) * 100
```
- Uses **normalised Shannon entropy**: if the user always writes in one category (e.g., always "expressive"), entropy = 0 → consistency = 100.
- If the user spreads evenly across all categories, entropy is maximised → consistency → 0.

**Final composite:**
```python
composite = 0.25*sentiment + 0.20*tone + 0.20*post_type + 0.15*language + 0.20*word_count
score = clamp(composite, 0, 100)
```

**Labels:**
| Score Range | Label |
|---|---|
| ≥ 75 | `very_consistent` |
| 55–74 | `consistent` |
| 35–54 | `variable` |
| < 35 | `highly_variable` |

### Why this approach
- **Multi-dimensional consistency** gives a holistic view — it's not just about one aspect of writing.
- **Entropy-based measurement** is a well-established information theory technique for measuring distribution concentration.
- **Exponential decay** for numeric variance creates a natural, smooth mapping from "very similar values" to "wildly varying values".
- The **weighted composite** prioritises sentiment stability (25%) as the most meaningful dimension, while language consistency (15%) has the lowest weight since multilingual users shouldn't be overly penalised.

### Where it is displayed
- The **"Writing Consistency"** `ScoreGauge` card (violet color) in the Summary Scores Row.
- Also displayed as a separate **Writing Consistency** card with a **Radar Chart** showing the five sub-dimension scores.
- The value is `sentimentSummary.writingConsistency` in the frontend (gauge) and `writingConsistency.score` (radar card).

---

## 4. Growth Index (Communication Growth Index)

### What it measures
A single **composite score** that summarises the user's overall communication growth and progress. It answers: *"How well is this user's communication evolving overall?"*

### How it is calculated

It is a **weighted average** of the three scores above:

```python
growth_index = round(
    0.35 * sentiment_progress +
    0.30 * emotional_balance +
    0.35 * writing_consistency,
    1
)
```

| Component | Weight | Rationale |
|---|---|---|
| Sentiment Progress | **35%** | Improving sentiment is the primary goal of the app |
| Emotional Balance | **30%** | Balanced emotions indicate healthy communication |
| Writing Consistency | **35%** | Stable writing patterns show sustainable growth |

### Why this approach
- A **single composite number** gives users an at-a-glance understanding of their overall progress without needing to interpret three separate metrics.
- **Equal-ish weighting** (35/30/35) means no single dimension dominates — a user needs progress in all three areas to score well.
- Sentiment progress and writing consistency are weighted slightly higher (35% each vs 30% for balance) because they represent active improvement, while balance is more of a current-state indicator.

### Where it is displayed
- The **"Growth Index"** `StatCard` (violet gradient, Zap icon) in the KPI Stat Cards row at the top of the dashboard.
- The subtitle shows the overall trend direction (📈 Improving / 📉 Declining / ➡️ Stable).
- The value is `sentimentSummary.communicationGrowth` in the frontend.
- It is only shown when the value is > 0; otherwise displays "N/A".

---

## 5. Sentiment Trend Chart (Area Chart)

### What it shows

The **Sentiment Trend** area chart plots **one data point per day** — each point is the **average sentiment score** of all texts the user analyzed on that specific date. The Y-axis shows the sentiment score and the X-axis shows dates (e.g., Feb 19, Feb 20, …).

Above the chart a **TrendBadge** shows the overall direction (Improving / Declining / Stable) and the **period average** (e.g., `avg: 0.655`).

### Why Feb 22 is the highest point

Looking at your screenshot, Feb 22 has the highest sentiment value (~0.8708). This is **not** a cumulative or running-average value — it is the **simple average of all sentiment scores from posts you analyzed on Feb 22 specifically**.

Here is exactly what happens:

#### Step 1: You analyze one or more texts on a given day

Every time you hit `POST /api/analyze/`, the backend:
1. Runs the text through the **SentimentAnalyzer** (a `cardiffnlp/twitter-xlm-roberta-base-sentiment` transformer model).
2. The model returns three probabilities: `positive`, `neutral`, `negative` (summing to ~1.0).
3. For Bangla/Banglish text, cultural-context adjustments are applied (boosting positive score for words like "দারুণ", "ফাটাফাটি", etc.).
4. The final **sentiment score** stored in the `Analysis` record is the probability of the dominant label (e.g., if positive=0.87, neutral=0.10, negative=0.03 → `sentiment_score = 0.87`, `sentiment_label = "positive"`).

#### Step 2: Daily progress is updated (`ProgressTracker.update_daily_progress`)

After each analysis, the backend recalculates the **daily average** for that user:

```python
# Get ALL posts analyzed TODAY by this user
today_posts = Post.objects.filter(user=user, created_at__date=today)
analyses = [post.analysis for post in today_posts]

# Average sentiment across all today's posts
avg_sentiment = sum(a.sentiment_score for a in analyses) / len(analyses)
```

This creates/updates an `EmotionalProgress` record for today:
```python
EmotionalProgress.objects.update_or_create(
    user=user,
    date=today,
    defaults={
        'avg_sentiment_score': avg_sentiment,
        'posts_count': len(analyses),
        ...
    }
)
```

**So if on Feb 22 you analyzed 3 texts with sentiment scores of 0.92, 0.85, and 0.83, the daily average stored would be `(0.92 + 0.85 + 0.83) / 3 = 0.8667`.**

#### Step 3: The chart is built from daily records

The `_sentiment_trend()` method fetches all `EmotionalProgress` records in the period and returns them as `data_points`:

```python
data_points = [
    {
        'date': '2026-02-19',
        'sentiment': 0.0001,   # avg_sentiment_score for that day
        'posts': 2,            # how many posts that day
    },
    {
        'date': '2026-02-22',
        'sentiment': 0.8708,   # ← highest day
        'posts': 3,
    },
    ...
]
```

The frontend maps these directly to the chart:
```javascript
sentimentChartData = data_points.map(p => ({
    date: shortDate(p.date),  // "Feb 22"
    sentiment: p.sentiment,   // 0.8708
    posts: p.posts,           // 3
}))
```

#### Why Feb 22 is higher than the days around it

| Date | What likely happened | Result |
|---|---|---|
| **Feb 19–20** | You analyzed texts that were mostly neutral or mildly positive | Low avg (~0.0001) |
| **Feb 21** | You analyzed more positive texts | Score rises |
| **Feb 22** | You analyzed texts that were **very positive** (happy, enthusiastic, praise-filled) → the ML model returned high positive probabilities | **Peak at ~0.8708** |
| **Feb 23–24** | You analyzed texts with more mixed/neutral sentiment | Score drops back |
| **Feb 25** | More neutral or mildly negative texts | Score falls further |

The chart shape is entirely driven by **what text you fed the system each day**. Feb 22 simply had the most positive texts on average.

### How the overall direction ("Improving") is determined

Despite the visible decline after Feb 22, the badge says **"Improving"** because it uses **linear regression** across ALL data points in the period:

```python
scores = [0.0001, -0.0006, 0.0001, 0.8708, 0.05, -0.0001, 0.0007]  # example
slope = linear_regression_slope(scores)
# If slope > 0.01 → "improving"
# If slope < -0.01 → "declining"
# Otherwise → "stable"
```

Linear regression fits a **best-fit straight line** through all points. Even though the end (Feb 25) is lower than the peak (Feb 22), the overall slope from Feb 19 → Feb 25 may still be positive because the early days (Feb 19–20) had very low scores. The best-fit line still trends upward overall.

**Visual intuition:**
```
        ●  (Feb 22 peak)
       / \
      /   \  ●
     /     ●  \
    /           ● (Feb 25)
●  ●
(Feb 19-20)

Best-fit line: ────────────── (still slopes upward)
```

The line from bottom-left (low early values) to the right side (moderate values) still has a positive slope, even though the last few days declined from the peak.

### Key insight

> **Each point on the Sentiment Trend chart = the average `sentiment_score` of all texts you analyzed that day.** It is NOT a running/cumulative average. A high point means you analyzed happier texts that day; a low point means more neutral or negative texts.

---

## Data Flow Summary

```
Backend (Django)                              Frontend (React)
─────────────────                             ────────────────

BehavioralAnalyticsEngine                     useDashboard() hook
  ├── _sentiment_trend()                        │
  │     → slope (linear regression)             │
  │                                             │
  ├── _emotional_tone_distribution()            │
  │     → neg_ratio from current period         │
  │                                             │
  ├── _writing_consistency()                    │
  │     → composite score (5 sub-dims)          │
  │                                             │
  └── _summary_scores()                         │
        ├── sentiment_progress = 50 + slope*1000│
        ├── emotional_balance = 100 - neg*200   ├── sentimentSummary.sentimentProgress
        ├── writing_consistency = composite      ├── sentimentSummary.emotionalBalance
        └── communication_growth_index           ├── sentimentSummary.writingConsistency
              = 0.35*SP + 0.30*EB + 0.35*WC     └── sentimentSummary.communicationGrowth
                                                        │
                                          DashboardPage.jsx
                                            ├── StatCard "Growth Index"
                                            ├── ScoreGauge "Sentiment Progress"
                                            ├── ScoreGauge "Emotional Balance"
                                            └── ScoreGauge "Writing Consistency"
```

---

## Key Files

| File | Role |
|---|---|
| `backend/services/behavioral_analytics.py` | `BehavioralAnalyticsEngine` — computes all metrics |
| `frontend/src/hooks/useDashboard.js` | `useDashboard()` — fetches & normalises backend data |
| `frontend/src/pages/web/DashboardPage.jsx` | Renders the KPI cards & gauge cards |
| `backend/api/auth_views.py` | API endpoint that invokes the analytics engine |
