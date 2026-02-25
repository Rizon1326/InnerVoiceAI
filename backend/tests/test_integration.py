"""
Test Suite: End-to-End Integration Tests
==========================================
Full workflow integration tests that simulate real user journeys.
These tests use mocked external services but verify the complete
request → processing → database → response pipeline.

Run:
    python manage.py test tests.test_integration --verbosity=2
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from unittest.mock import patch
from django.contrib.auth.models import User
from api.models import Post, Analysis, RewriteRecord, EmotionalProgress, ProjectMetrics
from tests.conftest import (
    MOCK_CONTEXT_ANALYSIS, MOCK_PERSONALITY_RESULT,
    MOCK_REWRITE_RESULT, MOCK_POST_TYPE,
)


class UserRegistrationAndLoginFlow(TestCase):
    """Integration: Register → Login → Access protected endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_full_registration_login_flow(self):
        """User registers, logs in, and accesses their profile."""
        # Step 1: Register
        reg_response = self.client.post('/api/auth/register/', {
            'username': 'flowuser',
            'email': 'flow@example.com',
            'password': 'FlowPass123!'
        })
        self.assertEqual(reg_response.status_code, status.HTTP_201_CREATED)
        token = reg_response.json()['data']['token']

        # Step 2: Login
        login_response = self.client.post('/api/auth/login/', {
            'username': 'flowuser',
            'password': 'FlowPass123!'
        })
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        # Step 3: Access profile with token
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        profile_response = self.client.get('/api/profile/')
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.json()['data']['username'], 'flowuser')


class AnalyzeAndRewriteFlow(TestCase):
    """Integration: Analyze text → View history → Rewrite."""

    def setUp(self):
        self.client = APIClient()
        # Register and login
        reg = self.client.post('/api/auth/register/', {
            'username': 'analyzeuser',
            'email': 'analyze@example.com',
            'password': 'AnalyzePass123!'
        })
        self.token = reg.json()['data']['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    @patch('api.views.classify_post_type', return_value=MOCK_POST_TYPE)
    @patch('api.views.personality_analyzer')
    @patch('api.views.context_analyzer')
    @patch('api.views.ProgressTracker')
    def test_analyze_then_view_history(self, mock_progress, mock_ctx, mock_pers, mock_classify):
        """Analyze a post, then retrieve it from history."""
        mock_ctx.analyze.return_value = MOCK_CONTEXT_ANALYSIS
        mock_pers.analyze.return_value = MOCK_PERSONALITY_RESULT

        # Step 1: Analyze
        analyze_response = self.client.post('/api/analyze/', {
            'text': 'আমি খুব খুশি আজকে!'
        }, format='json')
        self.assertEqual(analyze_response.status_code, status.HTTP_200_OK)
        post_id = analyze_response.json()['data']['id']

        # Step 2: View history
        history_response = self.client.get('/api/history/')
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_response.json()['data']), 1)
        self.assertEqual(history_response.json()['data'][0]['id'], post_id)

    @patch('api.views.text_rewriter')
    @patch('api.views.classify_post_type', return_value=MOCK_POST_TYPE)
    @patch('api.views.personality_analyzer')
    @patch('api.views.context_analyzer')
    @patch('api.views.ProgressTracker')
    def test_analyze_then_rewrite(self, mock_progress, mock_ctx, mock_pers, mock_classify, mock_rewriter):
        """Analyze a post, then request a rewrite using the post_id."""
        mock_ctx.analyze.return_value = MOCK_CONTEXT_ANALYSIS
        mock_pers.analyze.return_value = MOCK_PERSONALITY_RESULT
        mock_rewriter.rewrite.return_value = MOCK_REWRITE_RESULT

        # Step 1: Analyze
        analyze_response = self.client.post('/api/analyze/', {
            'text': 'আমি খুব রাগান্বিত!'
        }, format='json')
        post_id = analyze_response.json()['data']['id']

        # Step 2: Rewrite
        rewrite_response = self.client.post('/api/rewrite/', {
            'text': 'আমি খুব রাগান্বিত!',
            'post_id': post_id,
            'goal': 'reduce_aggression',
        }, format='json')
        self.assertEqual(rewrite_response.status_code, status.HTTP_200_OK)
        self.assertTrue(rewrite_response.json()['success'])

        # Step 3: Verify rewrite record created
        self.assertEqual(RewriteRecord.objects.count(), 1)


class MultipleAnalysesProgressFlow(TestCase):
    """Integration: Multiple analyses → progress tracking."""

    def setUp(self):
        self.client = APIClient()
        reg = self.client.post('/api/auth/register/', {
            'username': 'progressuser',
            'email': 'progress@example.com',
            'password': 'ProgressPass123!'
        })
        self.token = reg.json()['data']['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    @patch('api.views.classify_post_type', return_value=MOCK_POST_TYPE)
    @patch('api.views.personality_analyzer')
    @patch('api.views.context_analyzer')
    def test_multiple_analyses_create_records(self, mock_ctx, mock_pers, mock_classify):
        """Multiple analyses create multiple Post and Analysis records."""
        mock_ctx.analyze.return_value = MOCK_CONTEXT_ANALYSIS
        mock_pers.analyze.return_value = MOCK_PERSONALITY_RESULT

        for i in range(3):
            response = self.client.post('/api/analyze/', {
                'text': f'পোস্ট নম্বর {i + 1} বেশ ভালো!'
            }, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        user = User.objects.get(username='progressuser')
        self.assertEqual(Post.objects.filter(user=user).count(), 3)
        self.assertEqual(Analysis.objects.count(), 3)


class UserDataIsolationTests(TestCase):
    """Integration: Ensure data isolation between users."""

    def setUp(self):
        self.client = APIClient()

    def test_users_cannot_see_each_other_posts(self):
        """User A's posts are not visible to User B."""
        # Register User A
        reg_a = self.client.post('/api/auth/register/', {
            'username': 'userA',
            'email': 'a@example.com',
            'password': 'PassA123!'
        })
        token_a = reg_a.json()['data']['token']

        # Register User B
        reg_b = self.client.post('/api/auth/register/', {
            'username': 'userB',
            'email': 'b@example.com',
            'password': 'PassB123!'
        })
        token_b = reg_b.json()['data']['token']

        # User A creates a post directly in DB
        user_a = User.objects.get(username='userA')
        Post.objects.create(user=user_a, text='Secret post from A')

        # User B checks history — should be empty
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token_b}')
        response = self.client.get('/api/history/')
        self.assertEqual(len(response.json()['data']), 0)


class AccountDeletionCascadeFlow(TestCase):
    """Integration: Create data → delete account → verify cleanup."""

    def setUp(self):
        self.client = APIClient()
        reg = self.client.post('/api/auth/register/', {
            'username': 'deleteuser',
            'email': 'delete@example.com',
            'password': 'DeletePass123!'
        })
        self.token = reg.json()['data']['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_delete_cleans_all_data(self):
        """Deleting account removes user, posts, and all related data."""
        # Create some data
        user = User.objects.get(username='deleteuser')
        post = Post.objects.create(user=user, text='To be deleted')
        Analysis.objects.create(
            post=post, sentiment_label='neutral', sentiment_score=0.0
        )
        RewriteRecord.objects.create(
            user=user, original_text='original', rewritten_text='rewritten'
        )

        # Delete account
        response = self.client.delete('/api/profile/delete/', {
            'password': 'DeletePass123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify everything is gone
        self.assertFalse(User.objects.filter(username='deleteuser').exists())
        self.assertEqual(Post.objects.count(), 0)
        self.assertEqual(Analysis.objects.count(), 0)
        self.assertEqual(RewriteRecord.objects.filter(user_id=user.id).count(), 0)


class LogoutAndTokenInvalidationFlow(TestCase):
    """Integration: Login → Logout → Verify token invalid."""

    def test_token_invalid_after_logout(self):
        """Token is invalid after logout, subsequent requests return 401."""
        client = APIClient()

        # Register
        reg = client.post('/api/auth/register/', {
            'username': 'logoutuser',
            'email': 'logout@example.com',
            'password': 'LogoutPass123!'
        })
        token = reg.json()['data']['token']

        # Access profile (should work)
        client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        profile = client.get('/api/profile/')
        self.assertEqual(profile.status_code, status.HTTP_200_OK)

        # Logout
        logout = client.post('/api/auth/logout/')
        self.assertEqual(logout.status_code, status.HTTP_200_OK)

        # Try to access profile again (should fail)
        profile_again = client.get('/api/profile/')
        self.assertEqual(profile_again.status_code, status.HTTP_401_UNAUTHORIZED)
