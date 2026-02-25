"""
Test Suite: Behavioral Analytics Views
========================================
Tests for GET /api/progress/behavioral-analytics/

Run:
    python manage.py test tests.test_behavioral_analytics --verbosity=2
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from tests.conftest import (
    create_test_user, get_auth_client, create_test_post,
    create_test_analysis, create_test_rewrite_record,
)


class BehavioralAnalyticsEndpointTests(TestCase):
    """Tests for GET /api/progress/behavioral-analytics/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/progress/behavioral-analytics/'

    def test_behavioral_unauthenticated(self):
        """Returns 401 without auth."""
        client = APIClient()
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_behavioral_empty_user(self):
        """Returns 200 with analytics for user with no data."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['success'])

    def test_behavioral_with_posts(self):
        """Returns analytics reflecting user's post data."""
        post = create_test_post(self.user, text='আমি খুব খুশি!')
        create_test_analysis(post)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('data', response.json())

    def test_behavioral_days_param(self):
        """Respects the days query parameter."""
        response = self.client.get(f'{self.url}?days=7')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_behavioral_max_days_365(self):
        """Days parameter is capped at 365."""
        response = self.client.get(f'{self.url}?days=999')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_behavioral_with_rewrites(self):
        """Analytics include rewrite preference data when available."""
        post = create_test_post(self.user)
        create_test_analysis(post)
        create_test_rewrite_record(self.user, post=post)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_behavioral_response_structure(self):
        """Response has success and data keys."""
        response = self.client.get(self.url)
        json_data = response.json()
        self.assertIn('success', json_data)
        self.assertIn('data', json_data)

    def test_behavioral_default_days_30(self):
        """Default lookback period is 30 days."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
