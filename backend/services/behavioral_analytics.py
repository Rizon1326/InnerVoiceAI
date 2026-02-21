"""
Behavioral Analytics Engine
----------------------------
Computes six core behavioral intelligence metrics from user session data,
analysis outputs, and rewrite preference metadata.

Metrics
-------
1. Sentiment Trend      – improvement / decline / stability over time
2. Emotional Tone Dist. – positive / neutral / negative distribution changes
3. Post Type Frequency  – expressive / informative / persuasive / reflective / conversational
4. Rewrite Preferences  – which goals the user selects most often
5. Language Evolution    – Bangla / Banglish / English usage over time
6. Writing Consistency  – style stability vs. frequent shifts (0-100 score)
"""

from __future__ import annotations

import math
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any

from django.db.models import Avg, Count, F, Q, StdDev, Sum
from django.db.models.functions import TruncDate, TruncWeek

from api.models import Analysis, EmotionalProgress, Post, ProjectMetrics, RewriteRecord


# =====================================================================
#  Post-type classification heuristic
# =====================================================================

_PERSUASIVE_CUES = {
    'should', 'must', 'need to', 'have to', 'important', 'consider',
    'recommend', 'suggest', 'please', 'let us', "let's",
    'উচিত', 'দরকার', 'প্রয়োজন', 'করুন', 'করো', 'korun', 'koro',
    'ucit', 'dorkar', 'proyojon',
}

_REFLECTIVE_CUES = {
    'i think', 'i feel', 'i wonder', 'i realize', 'looking back',
    'in retrospect', 'i believe', 'it seems', 'maybe',
    'মনে হয়', 'আমার মনে হচ্ছে', 'বুঝতে পারছি', 'ভাবছি',
    'mone hoy', 'bujhte parchi', 'vabchi', 'ami mone kori',
}

_EXPRESSIVE_CUES = {
    '!', '❤', '😍', '😭', '😡', '😢', '🥰', '💔', '😂', '🤣',
    'love', 'hate', 'miss', 'cry', 'laugh', 'amazing', 'awful',
    'ভালোবাসা', 'কষ্ট', 'ভালোবাসি', 'মিস', 'কান্না',
    'valobasha', 'valobashi', 'kosto', 'miss', 'kanna',
}


def classify_post_type(text: str, intent: str, tone: str) -> str:
    """
    Classify a post into one of: expressive, informative, persuasive,
    reflective, conversational.
    """
    lower = text.lower()

    scores: dict[str, float] = {
        'expressive': 0.0,
        'informative': 0.0,
        'persuasive': 0.0,
        'reflective': 0.0,
        'conversational': 0.0,
    }

    # Keyword cues
    for cue in _PERSUASIVE_CUES:
        if cue in lower:
            scores['persuasive'] += 1.0
    for cue in _REFLECTIVE_CUES:
        if cue in lower:
            scores['reflective'] += 1.0
    for cue in _EXPRESSIVE_CUES:
        if cue in lower or cue in text:
            scores['expressive'] += 1.0

    # Intent-based boosts
    if intent in ('appreciation', 'emotional_expression'):
        scores['expressive'] += 2.0
    elif intent in ('informational', 'sharing_experience'):
        scores['informative'] += 1.5
    elif intent == 'seeking_support':
        scores['reflective'] += 1.5
    elif intent == 'greeting':
        scores['conversational'] += 2.0
    elif intent == 'gratitude':
        scores['expressive'] += 1.0

    # Tone boosts
    if tone in ('friendly', 'humorous'):
        scores['conversational'] += 1.0
    elif tone == 'serious':
        scores['informative'] += 0.5
        scores['persuasive'] += 0.5
    elif tone == 'sarcastic':
        scores['expressive'] += 1.0

    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else 'informational'


# =====================================================================
#  Main Analytics Class
# =====================================================================

class BehavioralAnalyticsEngine:
    """
    Computes a full behavioral analytics payload for a given user.
    All computations are read-only aggregate queries over existing data.
    """

    def __init__(self, user, days: int = 30):
        self.user = user
        self.days = days
        self.start_date = (datetime.now() - timedelta(days=days)).date()

    # ------------------------------------------------------------------
    #  PUBLIC API
    # ------------------------------------------------------------------

    def compute(self) -> dict[str, Any]:
        """Return complete behavioral analytics payload."""
        return {
            'period_days': self.days,
            'computed_at': datetime.now().isoformat(),
            'sentiment_trend': self._sentiment_trend(),
            'emotional_tone_distribution': self._emotional_tone_distribution(),
            'post_type_frequency': self._post_type_frequency(),
            'rewrite_preferences': self._rewrite_preferences(),
            'language_evolution': self._language_evolution(),
            'writing_consistency': self._writing_consistency(),
            'summary_scores': self._summary_scores(),
            'engagement': self._engagement_stats(),
        }

    # ------------------------------------------------------------------
    #  1. SENTIMENT TREND
    # ------------------------------------------------------------------

    def _sentiment_trend(self) -> dict:
        """
        Computes sentiment improvement/decline/stability over the period.
        Returns daily data points + trend direction + slope.
        """
        progress = list(
            EmotionalProgress.objects.filter(
                user=self.user, date__gte=self.start_date
            ).order_by('date').values('date', 'avg_sentiment_score', 'posts_count')
        )

        if len(progress) < 2:
            direction = 'insufficient_data'
            slope = 0.0
        else:
            scores = [p['avg_sentiment_score'] for p in progress]
            slope = self._linear_slope(scores)
            if slope > 0.01:
                direction = 'improving'
            elif slope < -0.01:
                direction = 'declining'
            else:
                direction = 'stable'

        # Per-day data points for the chart
        data_points = [
            {
                'date': p['date'].isoformat(),
                'sentiment': round(p['avg_sentiment_score'], 4),
                'posts': p['posts_count'],
            }
            for p in progress
        ]

        # Overall stats
        all_scores = [p['avg_sentiment_score'] for p in progress] if progress else [0]
        return {
            'direction': direction,
            'slope': round(slope, 6),
            'current_avg': round(all_scores[-1], 4) if all_scores else 0,
            'period_avg': round(sum(all_scores) / len(all_scores), 4),
            'period_min': round(min(all_scores), 4),
            'period_max': round(max(all_scores), 4),
            'data_points': data_points,
        }

    # ------------------------------------------------------------------
    #  2. EMOTIONAL TONE DISTRIBUTION
    # ------------------------------------------------------------------

    def _emotional_tone_distribution(self) -> dict:
        """
        Aggregates positive/neutral/negative tone ratios and how they
        shifted between the first half and second half of the period.
        """
        analyses = Analysis.objects.filter(
            post__user=self.user,
            post__created_at__date__gte=self.start_date,
        ).order_by('post__created_at')

        if not analyses.exists():
            return {
                'current': {'positive': 0, 'neutral': 0, 'negative': 0},
                'previous': {'positive': 0, 'neutral': 0, 'negative': 0},
                'shift': {'positive': 0, 'neutral': 0, 'negative': 0},
                'dominant_tone': 'neutral',
                'per_emotion_avg': {},
            }

        all_list = list(analyses.values(
            'sentiment_positive', 'sentiment_neutral', 'sentiment_negative',
            'emotion_joy', 'emotion_sadness', 'emotion_anger',
            'emotion_fear', 'emotion_surprise', 'emotion_neutral',
        ))

        mid = len(all_list) // 2 if len(all_list) >= 4 else 0
        first_half = all_list[:mid] if mid > 0 else all_list
        second_half = all_list[mid:] if mid > 0 else all_list

        def _avg_tone(items):
            n = len(items) or 1
            return {
                'positive': round(sum(i['sentiment_positive'] for i in items) / n, 4),
                'neutral': round(sum(i['sentiment_neutral'] for i in items) / n, 4),
                'negative': round(sum(i['sentiment_negative'] for i in items) / n, 4),
            }

        prev = _avg_tone(first_half)
        curr = _avg_tone(second_half)
        shift = {k: round(curr[k] - prev[k], 4) for k in curr}

        dominant = max(curr, key=curr.get)

        # Per-emotion averages
        n = len(all_list) or 1
        per_emotion = {
            'joy': round(sum(i['emotion_joy'] for i in all_list) / n, 4),
            'sadness': round(sum(i['emotion_sadness'] for i in all_list) / n, 4),
            'anger': round(sum(i['emotion_anger'] for i in all_list) / n, 4),
            'fear': round(sum(i['emotion_fear'] for i in all_list) / n, 4),
            'surprise': round(sum(i['emotion_surprise'] for i in all_list) / n, 4),
            'neutral': round(sum(i['emotion_neutral'] for i in all_list) / n, 4),
        }

        return {
            'current': curr,
            'previous': prev,
            'shift': shift,
            'dominant_tone': dominant,
            'per_emotion_avg': per_emotion,
        }

    # ------------------------------------------------------------------
    #  3. POST TYPE FREQUENCY
    # ------------------------------------------------------------------

    def _post_type_frequency(self) -> dict:
        """
        Distribution of post types (expressive/informative/persuasive/
        reflective/conversational).
        """
        counts = dict(
            Post.objects.filter(
                user=self.user,
                created_at__date__gte=self.start_date,
            ).values('post_type').annotate(count=Count('id')).values_list('post_type', 'count')
        )

        total = sum(counts.values()) or 1
        distribution = {k: round(v / total, 4) for k, v in counts.items()}
        dominant = max(counts, key=counts.get) if counts else 'informational'

        return {
            'counts': counts,
            'distribution': distribution,
            'dominant_type': dominant,
            'total_posts': total,
        }

    # ------------------------------------------------------------------
    #  4. REWRITE PREFERENCES
    # ------------------------------------------------------------------

    def _rewrite_preferences(self) -> dict:
        """
        Which rewrite goals the user selects most often.
        """
        records = RewriteRecord.objects.filter(
            user=self.user,
            created_at__date__gte=self.start_date,
        )

        total = records.count()
        if total == 0:
            return {
                'total_rewrites': 0,
                'goal_counts': {},
                'goal_distribution': {},
                'preferred_goal': None,
            }

        goal_counts = dict(
            records.values('goal').annotate(count=Count('id')).values_list('goal', 'count')
        )

        distribution = {k: round(v / total, 4) for k, v in goal_counts.items()}
        preferred = max(goal_counts, key=goal_counts.get) if goal_counts else None

        return {
            'total_rewrites': total,
            'goal_counts': goal_counts,
            'goal_distribution': distribution,
            'preferred_goal': preferred,
        }

    # ------------------------------------------------------------------
    #  5. LANGUAGE EVOLUTION
    # ------------------------------------------------------------------

    def _language_evolution(self) -> dict:
        """
        Tracks Bangla / Banglish / English / Mixed usage over time
        and how it's shifting.
        """
        posts = Post.objects.filter(
            user=self.user,
            created_at__date__gte=self.start_date,
        )

        total = posts.count() or 1

        lang_counts = dict(
            posts.values('detected_language_type')
                 .annotate(count=Count('id'))
                 .values_list('detected_language_type', 'count')
        )

        distribution = {k: round(v / total, 4) for k, v in lang_counts.items()}
        primary = max(lang_counts, key=lang_counts.get) if lang_counts else 'english'

        # Weekly breakdown for trend chart
        weekly = list(
            posts.annotate(week=TruncWeek('created_at'))
                 .values('week', 'detected_language_type')
                 .annotate(count=Count('id'))
                 .order_by('week')
        )

        weekly_data: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for entry in weekly:
            wk = entry['week'].isoformat() if entry['week'] else 'unknown'
            weekly_data[wk][entry['detected_language_type']] = entry['count']

        weekly_series = [
            {'week': wk, **langs}
            for wk, langs in sorted(weekly_data.items())
        ]

        return {
            'counts': lang_counts,
            'distribution': distribution,
            'primary_language': primary,
            'weekly_series': weekly_series,
        }

    # ------------------------------------------------------------------
    #  6. WRITING CONSISTENCY SCORE
    # ------------------------------------------------------------------

    def _writing_consistency(self) -> dict:
        """
        Measures how stable the user's writing style is across dimensions:
        - Sentiment variance (lower = more consistent)
        - Emotion profile variance
        - Tone stability
        - Post-type stability
        - Language consistency

        Returns a 0-100 score where 100 = perfectly consistent.
        """
        posts = Post.objects.filter(
            user=self.user,
            created_at__date__gte=self.start_date,
        )
        count = posts.count()
        if count < 3:
            return {
                'score': 50,
                'label': 'insufficient_data',
                'components': {},
            }

        # -- Sentiment variance (from daily progress) --
        sentiments = list(
            EmotionalProgress.objects.filter(
                user=self.user, date__gte=self.start_date
            ).values_list('avg_sentiment_score', flat=True)
        )
        sentiment_consistency = self._variance_to_consistency(sentiments) if len(sentiments) >= 2 else 50

        # -- Tone stability (entropy of tone distribution) --
        tones = list(posts.values_list('detected_tone', flat=True))
        tone_consistency = self._distribution_consistency(tones)

        # -- Post-type stability --
        types = list(posts.values_list('post_type', flat=True))
        type_consistency = self._distribution_consistency(types)

        # -- Language consistency --
        langs = list(posts.values_list('detected_language_type', flat=True))
        lang_consistency = self._distribution_consistency(langs)

        # -- Word count variance --
        word_counts = list(posts.values_list('word_count', flat=True))
        wc_consistency = self._variance_to_consistency(word_counts) if len(word_counts) >= 2 else 50

        # Weighted composite
        weights = {
            'sentiment': 0.25,
            'tone': 0.20,
            'post_type': 0.20,
            'language': 0.15,
            'word_count': 0.20,
        }
        components = {
            'sentiment': round(sentiment_consistency, 1),
            'tone': round(tone_consistency, 1),
            'post_type': round(type_consistency, 1),
            'language': round(lang_consistency, 1),
            'word_count': round(wc_consistency, 1),
        }
        composite = sum(components[k] * weights[k] for k in weights)
        composite = round(min(max(composite, 0), 100), 1)

        if composite >= 75:
            label = 'very_consistent'
        elif composite >= 55:
            label = 'consistent'
        elif composite >= 35:
            label = 'variable'
        else:
            label = 'highly_variable'

        return {
            'score': composite,
            'label': label,
            'components': components,
        }

    # ------------------------------------------------------------------
    #  SUMMARY SCORES – high-level behavioral intelligence metrics
    # ------------------------------------------------------------------

    def _summary_scores(self) -> dict:
        """
        Composite scores that summarise overall progress.
        """
        sentiment = self._sentiment_trend()
        tone = self._emotional_tone_distribution()
        consistency = self._writing_consistency()

        # Communication Evolution Score (0-100)
        # Based on: sentiment improvement + emotional balance + consistency
        sent_score = 50 + (sentiment['slope'] * 1000)  # slope normalised
        sent_score = min(max(sent_score, 0), 100)

        # Emotional Balance Score – penalise extreme negativity
        neg_ratio = tone['current'].get('negative', 0)
        balance_score = max(0, 100 - (neg_ratio * 200))
        balance_score = min(balance_score, 100)

        consistency_score = consistency['score']

        # Overall Communication Growth Index
        growth_index = round(
            0.35 * sent_score + 0.30 * balance_score + 0.35 * consistency_score, 1
        )

        return {
            'communication_growth_index': growth_index,
            'sentiment_progress': round(sent_score, 1),
            'emotional_balance': round(balance_score, 1),
            'writing_consistency': round(consistency_score, 1),
        }

    # ------------------------------------------------------------------
    #  ENGAGEMENT STATS
    # ------------------------------------------------------------------

    def _engagement_stats(self) -> dict:
        """Basic engagement numbers."""
        posts = Post.objects.filter(
            user=self.user,
            created_at__date__gte=self.start_date,
        )
        total_posts = posts.count()
        days_active = posts.dates('created_at', 'day').count()
        rewrites = RewriteRecord.objects.filter(
            user=self.user,
            created_at__date__gte=self.start_date,
        ).count()

        return {
            'total_posts': total_posts,
            'total_rewrites': rewrites,
            'days_active': days_active,
            'avg_posts_per_day': round(total_posts / max(days_active, 1), 2),
            'streak': self._calculate_streak(),
        }

    # ------------------------------------------------------------------
    #  UTILITY HELPERS
    # ------------------------------------------------------------------

    @staticmethod
    def _linear_slope(values: list[float]) -> float:
        """Compute linear regression slope for a list of values."""
        n = len(values)
        if n < 2:
            return 0.0
        x_mean = (n - 1) / 2.0
        y_mean = sum(values) / n
        numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        return numerator / denominator if denominator != 0 else 0.0

    @staticmethod
    def _variance_to_consistency(values: list[float]) -> float:
        """
        Convert a list of numeric values into a 0-100 consistency score.
        Lower variance → higher consistency.
        """
        if len(values) < 2:
            return 50.0
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        std = math.sqrt(variance)
        # Normalise: std of ~0 → 100, std of ~1 → 0
        # Using sigmoid-like mapping
        consistency = 100 * math.exp(-2 * std)
        return min(max(consistency, 0), 100)

    @staticmethod
    def _distribution_consistency(items: list[str]) -> float:
        """
        Measure how concentrated a categorical distribution is.
        Perfect concentration (one category) → 100.
        Uniform spread → low score.
        Uses 1 - normalised entropy.
        """
        if not items:
            return 50.0
        counts = Counter(items)
        total = len(items)
        n_categories = len(counts)
        if n_categories <= 1:
            return 100.0

        # Shannon entropy
        entropy = -sum(
            (c / total) * math.log2(c / total)
            for c in counts.values()
            if c > 0
        )
        max_entropy = math.log2(n_categories)
        normalised = entropy / max_entropy if max_entropy > 0 else 0

        # Invert: low entropy (concentrated) = high consistency
        return round((1 - normalised) * 100, 1)

    def _calculate_streak(self) -> int:
        """Current streak of consecutive days with posts."""
        daily = (
            Post.objects.filter(user=self.user)
            .values('created_at__date')
            .distinct()
            .order_by('-created_at__date')
        )
        if not daily.exists():
            return 0
        streak = 0
        today = datetime.now().date()
        for entry in daily:
            d = entry['created_at__date']
            if (today - d).days == streak:
                streak += 1
            else:
                break
        return streak
