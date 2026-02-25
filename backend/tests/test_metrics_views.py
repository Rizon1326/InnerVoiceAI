"""
Test Suite: Metrics Views
==========================
Tests for GET /api/metrics/

Run:
    python manage.py test tests.test_metrics_views --verbosity=2
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from tests.conftest import create_test_user, get_auth_client


class UserMetricsEndpointTests(TestCase):
    """Tests for GET /api/metrics/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/metrics/'

    def test_metrics_unauthenticated(self):
        """Returns 401 without auth."""
        client = APIClient()
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_metrics_success(self):
        """Returns 200 with metrics data for authenticated user."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['success'])
        self.assertIn('data', response.json())

    def test_metrics_fields(self):
        """Metrics response contains all expected fields."""
        response = self.client.get(self.url)
        data = response.json()['data']
        expected_fields = [
            'total_posts_analyzed', 'total_rewrites_generated',
            'days_active', 'streak_days', 'avg_sentiment_improvement',
        ]
        for field in expected_fields:
            self.assertIn(field, data)

    def test_metrics_initial_values_zero(self):
        """New user metrics start at zero."""
        response = self.client.get(self.url)
        data = response.json()['data']
        self.assertEqual(data['total_posts_analyzed'], 0)
        self.assertEqual(data['total_rewrites_generated'], 0)



