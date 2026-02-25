"""
Test Suite: History Views
==========================
Tests for GET /api/history/ — post history retrieval.

Run:
    python manage.py test tests.test_history_views --verbosity=2
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from tests.conftest import (
    create_test_user, get_auth_client, create_test_post, create_test_analysis,
)


class HistoryEndpointTests(TestCase):
    """Tests for GET /api/history/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/history/'

    def test_history_unauthenticated(self):
        """Returns 401 without auth."""
        client = APIClient()
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_history_empty(self):
        """Returns empty list for user with no posts."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['success'])
        self.assertEqual(len(response.json()['data']), 0)

    def test_history_returns_user_posts(self):
        """Returns only the authenticated user's posts."""
        create_test_post(self.user, text='Post 1')
        create_test_post(self.user, text='Post 2')

        # Another user's post
        other_user, _ = create_test_user(
            username='other', email='other@example.com'
        )
        create_test_post(other_user, text='Other post')

        response = self.client.get(self.url)
        data = response.json()['data']
        self.assertEqual(len(data), 2)

    def test_history_with_limit(self):
        """limit query param restricts the number of results."""
        for i in range(5):
            create_test_post(self.user, text=f'Post {i}')

        response = self.client.get(f'{self.url}?limit=3')
        self.assertEqual(len(response.json()['data']), 3)

    def test_history_default_limit_20(self):
        """Default limit is 20 posts."""
        for i in range(25):
            create_test_post(self.user, text=f'Post {i}')

        response = self.client.get(self.url)
        self.assertEqual(len(response.json()['data']), 20)

    def test_history_includes_analysis(self):
        """Posts with analysis include nested analysis data."""
        post = create_test_post(self.user)
        create_test_analysis(post)

        response = self.client.get(self.url)
        post_data = response.json()['data'][0]
        self.assertIsNotNone(post_data['analysis'])
        self.assertIn('sentiment', post_data['analysis'])

    def test_history_latest_first(self):
        """Posts are returned in reverse chronological order."""
        p1 = create_test_post(self.user, text='Older')
        p2 = create_test_post(self.user, text='Newer')

        response = self.client.get(self.url)
        data = response.json()['data']
        self.assertEqual(data[0]['text'], 'Newer')
        self.assertEqual(data[1]['text'], 'Older')

    def test_history_response_structure(self):
        """Response has correct top-level structure."""
        create_test_post(self.user)
        response = self.client.get(self.url)
        json_data = response.json()
        self.assertIn('success', json_data)
        self.assertIn('data', json_data)
        self.assertIsInstance(json_data['data'], list)
