"""
Test Suite: ProgressTracker & MetricsCalculator Services
=========================================================
Unit tests for the progress tracking and metrics calculation services.

Run:
    python manage.py test tests.test_services_progress --verbosity=2
"""

from django.test import TestCase
from django.contrib.auth.models import User
from api.models import Post, Analysis, EmotionalProgress, ProjectMetrics
from services.progress_tracker import ProgressTracker
from tests.conftest import (
    create_test_user, create_test_post, create_test_analysis,
    create_test_emotional_progress,
)
from datetime import date, timedelta


class ProgressTrackerUpdateTests(TestCase):
    """Tests for ProgressTracker.update_daily_progress()."""

    def setUp(self):
        self.user, _ = create_test_user()

    def test_update_creates_progress_record(self):
        """update_daily_progress creates an EmotionalProgress record."""
        post = create_test_post(self.user)
        create_test_analysis(post)

        result = ProgressTracker.update_daily_progress(self.user)
        self.assertIsNotNone(result)
        self.assertIsInstance(result, EmotionalProgress)

    def test_update_calculates_averages(self):
        """Averages are calculated correctly from analyses."""
        p1 = create_test_post(self.user, text='Post 1')
        create_test_analysis(p1, sentiment_score=0.8, emotion_joy=0.7)
        p2 = create_test_post(self.user, text='Post 2')
        create_test_analysis(p2, sentiment_score=0.6, emotion_joy=0.5)

        result = ProgressTracker.update_daily_progress(self.user)
        self.assertAlmostEqual(result.avg_sentiment_score, 0.7, places=1)
        self.assertAlmostEqual(result.avg_emotion_joy, 0.6, places=1)

    def test_update_sets_posts_count(self):
        """posts_count reflects the number of posts analyzed today."""
        for i in range(3):
            post = create_test_post(self.user, text=f'Post {i}')
            create_test_analysis(post)

        result = ProgressTracker.update_daily_progress(self.user)
        self.assertEqual(result.posts_count, 3)

    def test_update_idempotent_upsert(self):
        """Calling update twice on same day updates existing record."""
        post = create_test_post(self.user)
        create_test_analysis(post)

        result1 = ProgressTracker.update_daily_progress(self.user)
        result2 = ProgressTracker.update_daily_progress(self.user)
        self.assertEqual(result1.id, result2.id)

    def test_update_no_posts_returns_none(self):
        """Returns None when user has no posts today."""
        result = ProgressTracker.update_daily_progress(self.user)
        self.assertIsNone(result)


class ProgressTrackerRetrievalTests(TestCase):
    """Tests for ProgressTracker.get_user_progress()."""

    def setUp(self):
        self.user, _ = create_test_user()

    def test_get_progress_empty(self):
        """Returns empty queryset for user with no progress."""
        progress = ProgressTracker.get_user_progress(self.user)
        self.assertEqual(progress.count(), 0)

    def test_get_progress_within_range(self):
        """Returns records within the specified date range."""
        create_test_emotional_progress(self.user, days_ago=5)
        create_test_emotional_progress(self.user, days_ago=10)
        create_test_emotional_progress(self.user, days_ago=40)

        progress = ProgressTracker.get_user_progress(self.user, days=30)
        self.assertEqual(progress.count(), 2)

    def test_get_progress_ordered_by_date(self):
        """Results are ordered by date ascending."""
        create_test_emotional_progress(self.user, days_ago=10)
        create_test_emotional_progress(self.user, days_ago=5)

        progress = list(ProgressTracker.get_user_progress(self.user, days=30))
        self.assertTrue(progress[0].date <= progress[1].date)


class ProgressTrackerTrendTests(TestCase):
    """Tests for ProgressTracker.calculate_trend()."""

    def setUp(self):
        self.user, _ = create_test_user()

    def test_trend_no_data(self):
        """Returns None when no progress data exists."""
        result = ProgressTracker.calculate_trend(self.user)
        self.assertIsNone(result)

    def test_trend_single_record(self):
        """With single record, trend is 0 and previous is None."""
        create_test_emotional_progress(
            self.user, days_ago=0, avg_sentiment_score=0.7
        )
        result = ProgressTracker.calculate_trend(self.user)
        self.assertIsNotNone(result)
        self.assertIsNone(result['previous'])
        self.assertEqual(result['trend'], 0)

    def test_trend_improvement(self):
        """Detects improvement when sentiment increases over time."""
        create_test_emotional_progress(
            self.user, days_ago=20, avg_sentiment_score=0.3
        )
        create_test_emotional_progress(
            self.user, days_ago=0, avg_sentiment_score=0.8
        )
        result = ProgressTracker.calculate_trend(self.user)
        self.assertIsNotNone(result)
        # Trend should be positive (improvement)
        self.assertGreater(result['trend'], 0)
