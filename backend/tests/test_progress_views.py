"""
Test Suite: Progress & Trends Views
=====================================
Tests for GET /api/progress/ and GET /api/progress/trends/

Run:
    python manage.py test tests.test_progress_views --verbosity=2
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from tests.conftest import (
    create_test_user, get_auth_client, create_test_emotional_progress,
)


class ProgressEndpointTests(TestCase):
    """Tests for GET /api/progress/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/progress/'

    def test_progress_unauthenticated(self):
        """Returns 401 without auth."""
        client = APIClient()
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_progress_empty(self):
        """Returns empty list for user with no progress records."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()['data']), 0)

    def test_progress_returns_records(self):
        """Returns progress records within the requested date range."""
        create_test_emotional_progress(self.user, days_ago=0)
        create_test_emotional_progress(self.user, days_ago=5)

        response = self.client.get(f'{self.url}?days=30')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()['data']), 2)

    def test_progress_default_30_days(self):
        """Default lookback is 30 days."""
        create_test_emotional_progress(self.user, days_ago=10)
        create_test_emotional_progress(self.user, days_ago=40)  # Outside window

        response = self.client.get(self.url)
        self.assertEqual(len(response.json()['data']), 1)

    def test_progress_record_fields(self):
        """Progress records contain expected fields."""
        create_test_emotional_progress(self.user)
        response = self.client.get(self.url)
        record = response.json()['data'][0]
        for field in ['date', 'avg_sentiment_score', 'avg_emotion_joy',
                       'avg_emotion_sadness', 'posts_count']:
            self.assertIn(field, record)


class EmotionalTrendsEndpointTests(TestCase):
    """Tests for GET /api/progress/trends/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/progress/trends/'

    def test_trends_unauthenticated(self):
        """Returns 401 without auth."""
        client = APIClient()
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_trends_no_data(self):
        """Returns 200 with null trends when no progress data exists."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()['data']
        # All trends should be None when no data
        self.assertIsNone(data['sentiment_trend'])

    def test_trends_with_data(self):
        """Returns trend metrics when progress data exists."""
        create_test_emotional_progress(self.user, days_ago=0, avg_sentiment_score=0.8)
        create_test_emotional_progress(self.user, days_ago=10, avg_sentiment_score=0.5)

        response = self.client.get(f'{self.url}?days=30')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()['data']
        self.assertIn('sentiment_trend', data)
        self.assertIn('joy_trend', data)
        self.assertIn('neuroticism_trend', data)

    def test_trends_includes_all_metrics(self):
        """Response includes sentiment, emotion, and personality trends."""
        create_test_emotional_progress(self.user, days_ago=0)
        create_test_emotional_progress(self.user, days_ago=15)

        response = self.client.get(self.url)
        data = response.json()['data']
        expected_keys = [
            'sentiment_trend', 'joy_trend', 'sadness_trend',
            'anger_trend', 'neuroticism_trend', 'openness_trend',
        ]
        for key in expected_keys:
            self.assertIn(key, data)
