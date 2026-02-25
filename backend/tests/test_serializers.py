"""
Test Suite: Serializers
========================
Tests for all DRF serializers — output structure, nested fields, computed fields.

Run:
    python manage.py test tests.test_serializers --verbosity=2
"""

from django.test import TestCase, RequestFactory
from django.contrib.auth.models import User
from api.serializers import (
    AnalysisSerializer, PostSerializer, EmotionalProgressSerializer,
    ProjectMetricsSerializer, UserSerializer, UserProfileSerializer,
)
from api.models import Post, Analysis, EmotionalProgress, ProjectMetrics, UserProfile
from tests.conftest import (
    create_test_user, create_test_post, create_test_analysis,
    create_test_emotional_progress,
)
from datetime import date


class AnalysisSerializerTests(TestCase):
    """Tests for AnalysisSerializer output format."""

    def setUp(self):
        self.user, _ = create_test_user()
        self.post = create_test_post(self.user)
        self.analysis = create_test_analysis(self.post)

    def test_sentiment_nested_structure(self):
        """Sentiment field returns nested dict with label, score, scores."""
        data = AnalysisSerializer(self.analysis).data
        self.assertIn('sentiment', data)
        sentiment = data['sentiment']
        self.assertEqual(sentiment['label'], 'positive')
        self.assertAlmostEqual(sentiment['score'], 0.85)
        self.assertIn('positive', sentiment['scores'])
        self.assertIn('neutral', sentiment['scores'])
        self.assertIn('negative', sentiment['scores'])

    def test_emotions_nested_structure(self):
        """Emotions field returns dict with all six emotion scores."""
        data = AnalysisSerializer(self.analysis).data
        emotions = data['emotions']
        expected_keys = {'joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral'}
        self.assertEqual(set(emotions.keys()), expected_keys)
        self.assertAlmostEqual(emotions['joy'], 0.70)

    def test_personality_nested_structure(self):
        """Personality field returns OCEAN scores."""
        data = AnalysisSerializer(self.analysis).data
        personality = data['personality']
        expected_keys = {
            'openness', 'conscientiousness', 'extraversion',
            'agreeableness', 'neuroticism'
        }
        self.assertEqual(set(personality.keys()), expected_keys)
        self.assertEqual(personality['openness'], 65)

    def test_serializer_fields_present(self):
        """All declared fields are present in serialized output."""
        data = AnalysisSerializer(self.analysis).data
        self.assertIn('id', data)
        self.assertIn('created_at', data)
        self.assertIn('sentiment', data)
        self.assertIn('emotions', data)
        self.assertIn('personality', data)


class PostSerializerTests(TestCase):
    """Tests for PostSerializer output format."""

    def setUp(self):
        self.user, _ = create_test_user()
        self.post = create_test_post(self.user)

    def test_post_fields_present(self):
        """PostSerializer includes id, text, language, created_at, analysis."""
        data = PostSerializer(self.post).data
        for field in ['id', 'text', 'language', 'created_at', 'analysis']:
            self.assertIn(field, data)

    def test_post_without_analysis(self):
        """Post without an analysis returns analysis=None."""
        data = PostSerializer(self.post).data
        self.assertIsNone(data['analysis'])

    def test_post_with_analysis_nested(self):
        """Post with analysis includes nested analysis data."""
        create_test_analysis(self.post)
        data = PostSerializer(self.post).data
        self.assertIsNotNone(data['analysis'])
        self.assertIn('sentiment', data['analysis'])
        self.assertIn('emotions', data['analysis'])
        self.assertIn('personality', data['analysis'])

    def test_multiple_posts_serialized(self):
        """Serializing multiple posts returns a list."""
        p2 = create_test_post(self.user, text='Second post')
        posts = Post.objects.filter(user=self.user)
        data = PostSerializer(posts, many=True).data
        self.assertEqual(len(data), 2)


class EmotionalProgressSerializerTests(TestCase):
    """Tests for EmotionalProgressSerializer."""

    def setUp(self):
        self.user, _ = create_test_user()

    def test_progress_fields(self):
        """EmotionalProgressSerializer includes all required fields."""
        progress = create_test_emotional_progress(self.user)
        data = EmotionalProgressSerializer(progress).data
        expected_fields = {
            'id', 'date', 'avg_sentiment_score',
            'avg_emotion_joy', 'avg_emotion_sadness', 'avg_emotion_anger',
            'avg_emotion_fear', 'avg_emotion_surprise',
            'avg_personality_openness', 'avg_personality_conscientiousness',
            'avg_personality_extraversion', 'avg_personality_agreeableness',
            'avg_personality_neuroticism', 'posts_count', 'created_at',
        }
        self.assertTrue(expected_fields.issubset(set(data.keys())))


class ProjectMetricsSerializerTests(TestCase):
    """Tests for ProjectMetricsSerializer."""

    def setUp(self):
        self.user, _ = create_test_user()

    def test_metrics_fields(self):
        """ProjectMetricsSerializer includes all metric fields."""
        # Metrics created by conftest helper
        metrics = ProjectMetrics.objects.get(user=self.user)
        data = ProjectMetricsSerializer(metrics).data
        for field in ['total_posts_analyzed', 'total_rewrites_generated',
                      'days_active', 'streak_days', 'last_updated']:
            self.assertIn(field, data)


class UserSerializerTests(TestCase):
    """Tests for UserSerializer."""

    def setUp(self):
        self.user, _ = create_test_user()
        self.factory = RequestFactory()

    def test_user_fields(self):
        """UserSerializer includes id, username, email, posts_count, metrics."""
        request = self.factory.get('/')
        data = UserSerializer(self.user, context={'request': request}).data
        for field in ['id', 'username', 'email', 'posts_count', 'date_joined']:
            self.assertIn(field, data)

    def test_posts_count_computed(self):
        """posts_count is computed from actual post count."""
        create_test_post(self.user, text='Post 1')
        create_test_post(self.user, text='Post 2')
        request = self.factory.get('/')
        data = UserSerializer(self.user, context={'request': request}).data
        self.assertEqual(data['posts_count'], 2)

    def test_avatar_url_none_by_default(self):
        """avatar_url is None when no avatar uploaded."""
        request = self.factory.get('/')
        data = UserSerializer(self.user, context={'request': request}).data
        self.assertIsNone(data['avatar_url'])
