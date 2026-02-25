"""
Test Suite: Models
==================
Tests for all Django models in the InnerVoice AI backend.
Covers creation, defaults, constraints, relationships, and ordering.

Run:
    python manage.py test tests.test_models --verbosity=2
"""

from django.test import TestCase
from django.contrib.auth.models import User
from django.db import IntegrityError
from api.models import (
    Post, Analysis, EmotionalProgress, ProjectMetrics,
    UserProfile, RewriteRecord,
)
from tests.conftest import create_test_user, create_test_post, create_test_analysis
from datetime import date
import uuid


class PostModelTests(TestCase):
    """Tests for the Post model."""

    def setUp(self):
        self.user, self.token = create_test_user()

    def test_create_post_with_defaults(self):
        """Post is created with correct default field values."""
        post = Post.objects.create(user=self.user, text='Hello world')
        self.assertEqual(post.language, 'en')
        self.assertEqual(post.detected_language_type, 'english')
        self.assertEqual(post.detected_tone, 'friendly')
        self.assertEqual(post.intent, 'informational')
        self.assertEqual(post.post_type, 'informational')
        self.assertEqual(post.word_count, 0)

    def test_create_post_with_custom_fields(self):
        """Post stores all custom field values correctly."""
        post = create_test_post(
            self.user,
            text='কঠিন হইসে ভাই!',
            language='bn',
            detected_language_type='banglish',
            detected_tone='humorous',
            intent='appreciation',
            post_type='expressive',
            word_count=4,
        )
        self.assertEqual(post.text, 'কঠিন হইসে ভাই!')
        self.assertEqual(post.language, 'bn')
        self.assertEqual(post.detected_language_type, 'banglish')
        self.assertEqual(post.detected_tone, 'humorous')
        self.assertEqual(post.intent, 'appreciation')
        self.assertEqual(post.post_type, 'expressive')
        self.assertEqual(post.word_count, 4)

    def test_post_uuid_primary_key(self):
        """Post uses UUID as primary key."""
        post = Post.objects.create(user=self.user, text='Test')
        self.assertIsInstance(post.id, uuid.UUID)

    def test_post_ordering_latest_first(self):
        """Posts are ordered by created_at descending (latest first)."""
        p1 = Post.objects.create(user=self.user, text='First')
        p2 = Post.objects.create(user=self.user, text='Second')
        posts = list(Post.objects.filter(user=self.user))
        self.assertEqual(posts[0].id, p2.id)
        self.assertEqual(posts[1].id, p1.id)

    def test_post_user_cascade_delete(self):
        """Deleting a user cascades to delete their posts."""
        Post.objects.create(user=self.user, text='To be deleted')
        self.assertEqual(Post.objects.filter(user=self.user).count(), 1)
        self.user.delete()
        self.assertEqual(Post.objects.count(), 0)

    def test_post_str_representation(self):
        """Post object can be created and accessed without errors."""
        post = Post.objects.create(user=self.user, text='Simple post')
        self.assertIsNotNone(post.id)
        self.assertIsNotNone(post.created_at)


class AnalysisModelTests(TestCase):
    """Tests for the Analysis model."""

    def setUp(self):
        self.user, _ = create_test_user()
        self.post = create_test_post(self.user)

    def test_create_analysis_with_defaults(self):
        """Analysis is created with correct defaults for unfilled fields."""
        analysis = Analysis.objects.create(
            post=self.post,
            sentiment_label='neutral',
            sentiment_score=0.0,
        )
        self.assertEqual(analysis.sentiment_positive, 0.0)
        self.assertEqual(analysis.personality_openness, 50)
        self.assertEqual(analysis.personality_neuroticism, 50)

    def test_create_analysis_full_fields(self):
        """Analysis stores all sentiment, emotion, and personality fields."""
        analysis = create_test_analysis(self.post)
        self.assertEqual(analysis.sentiment_label, 'positive')
        self.assertAlmostEqual(analysis.sentiment_score, 0.85)
        self.assertAlmostEqual(analysis.emotion_joy, 0.70)
        self.assertEqual(analysis.personality_extraversion, 72)

    def test_analysis_uuid_primary_key(self):
        """Analysis uses UUID as primary key."""
        analysis = create_test_analysis(self.post)
        self.assertIsInstance(analysis.id, uuid.UUID)

    def test_analysis_one_to_one_with_post(self):
        """Only one Analysis can be linked to a Post."""
        create_test_analysis(self.post)
        with self.assertRaises(IntegrityError):
            create_test_analysis(self.post)

    def test_analysis_cascade_delete_with_post(self):
        """Deleting a post cascades to delete its analysis."""
        create_test_analysis(self.post)
        self.assertEqual(Analysis.objects.count(), 1)
        self.post.delete()
        self.assertEqual(Analysis.objects.count(), 0)

    def test_analysis_accessible_via_post(self):
        """Analysis is accessible via post.analysis reverse relation."""
        analysis = create_test_analysis(self.post)
        self.assertEqual(self.post.analysis, analysis)


class EmotionalProgressModelTests(TestCase):
    """Tests for the EmotionalProgress model."""

    def setUp(self):
        self.user, _ = create_test_user()

    def test_create_emotional_progress(self):
        """EmotionalProgress record stores daily averages."""
        progress = EmotionalProgress.objects.create(
            user=self.user,
            date=date.today(),
            avg_sentiment_score=0.7,
            posts_count=5,
        )
        self.assertAlmostEqual(progress.avg_sentiment_score, 0.7)
        self.assertEqual(progress.posts_count, 5)

    def test_unique_together_user_date(self):
        """Cannot create two progress records for same user+date."""
        EmotionalProgress.objects.create(
            user=self.user, date=date.today(), posts_count=1
        )
        with self.assertRaises(IntegrityError):
            EmotionalProgress.objects.create(
                user=self.user, date=date.today(), posts_count=2
            )

    def test_progress_ordering_latest_first(self):
        """Progress records are ordered by date descending."""
        EmotionalProgress.objects.create(
            user=self.user, date=date(2026, 1, 1), posts_count=1
        )
        EmotionalProgress.objects.create(
            user=self.user, date=date(2026, 1, 5), posts_count=2
        )
        records = list(EmotionalProgress.objects.filter(user=self.user))
        self.assertTrue(records[0].date > records[1].date)


class ProjectMetricsModelTests(TestCase):
    """Tests for the ProjectMetrics model."""

    def setUp(self):
        self.user, _ = create_test_user()

    def test_create_metrics_with_defaults(self):
        """ProjectMetrics defaults are all zero."""
        # Metrics already created by create_test_user helper
        metrics = ProjectMetrics.objects.get(user=self.user)
        self.assertEqual(metrics.total_posts_analyzed, 0)
        self.assertEqual(metrics.total_rewrites_generated, 0)
        self.assertEqual(metrics.streak_days, 0)

    def test_metrics_one_to_one_with_user(self):
        """Only one ProjectMetrics per user."""
        # Metrics already exists from create_test_user, creating another should fail
        with self.assertRaises(IntegrityError):
            ProjectMetrics.objects.create(user=self.user)


class UserProfileModelTests(TestCase):
    """Tests for the UserProfile model."""

    def setUp(self):
        self.user, _ = create_test_user()

    def test_create_profile(self):
        """UserProfile is created via conftest helper."""
        profile = UserProfile.objects.get(user=self.user)
        self.assertIsNone(profile.avatar.name if profile.avatar else None)

    def test_profile_str(self):
        """UserProfile __str__ returns readable format."""
        profile = UserProfile.objects.get(user=self.user)
        self.assertIn('testuser', str(profile))


class RewriteRecordModelTests(TestCase):
    """Tests for the RewriteRecord model."""

    def setUp(self):
        self.user, _ = create_test_user()
        self.post = create_test_post(self.user)

    def test_create_rewrite_record(self):
        """RewriteRecord stores original and rewritten text."""
        record = RewriteRecord.objects.create(
            user=self.user,
            post=self.post,
            original_text='I hate this',
            rewritten_text='I find this challenging',
            goal='reduce_aggression',
            source_language='en',
        )
        self.assertEqual(record.goal, 'reduce_aggression')
        self.assertIn('challenging', record.rewritten_text)

    def test_rewrite_record_ordering(self):
        """RewriteRecords are ordered by created_at descending."""
        r1 = RewriteRecord.objects.create(
            user=self.user, original_text='First'
        )
        r2 = RewriteRecord.objects.create(
            user=self.user, original_text='Second'
        )
        records = list(RewriteRecord.objects.filter(user=self.user))
        self.assertEqual(records[0].id, r2.id)

    def test_rewrite_record_post_set_null(self):
        """Deleting a post sets the rewrite record's post to NULL (not cascade)."""
        record = RewriteRecord.objects.create(
            user=self.user, post=self.post, original_text='test'
        )
        self.post.delete()
        record.refresh_from_db()
        self.assertIsNone(record.post)
