"""
Test Suite: Rewrite Text Views
===============================
Tests for POST /api/rewrite/ — the AI rewriting endpoint.
External services (TextRewriter, etc.) are mocked.

Run:
    python manage.py test tests.test_rewrite_views --verbosity=2
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from api.models import Post, Analysis, RewriteRecord
from tests.conftest import (
    create_test_user, get_auth_client, create_test_post,
    create_test_analysis, MOCK_REWRITE_RESULT,
)


class RewriteTextEndpointTests(TestCase):
    """Tests for POST /api/rewrite/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/rewrite/'

    # --- Authentication ---

    def test_rewrite_unauthenticated(self):
        """Returns 401 without authentication."""
        client = APIClient()
        response = client.post(self.url, {'text': 'Test text'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Validation ---

    def test_rewrite_empty_text(self):
        """Returns 400 when text is empty."""
        response = self.client.post(self.url, {'text': ''}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('required', response.json()['error'].lower())

    def test_rewrite_missing_text(self):
        """Returns 400 when text field is missing."""
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- With existing post_id ---

    @patch('api.views.text_rewriter')
    def test_rewrite_with_valid_post_id(self, mock_rewriter):
        """Rewrite with valid post_id uses existing analysis."""
        mock_rewriter.rewrite.return_value = MOCK_REWRITE_RESULT

        post = create_test_post(self.user, text='I hate everything')
        create_test_analysis(post, sentiment_label='negative', sentiment_score=-0.7)

        response = self.client.post(self.url, {
            'text': 'I hate everything',
            'post_id': str(post.id),
            'goal': 'more_positive',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['success'])

    def test_rewrite_with_invalid_post_id(self):
        """Returns 404 for non-existent post_id."""
        response = self.client.post(self.url, {
            'text': 'Some text',
            'post_id': '00000000-0000-0000-0000-000000000000',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Without post_id (new analysis + rewrite) ---

    @patch('api.views.text_rewriter')
    @patch('api.views.personality_analyzer')
    @patch('api.views.emotion_detector')
    @patch('api.views.sentiment_analyzer')
    @patch('api.views.language_detector')
    def test_rewrite_without_post_id_creates_records(
        self, mock_lang, mock_sent, mock_emo, mock_pers, mock_rewriter
    ):
        """Rewrite without post_id creates Post, Analysis, and RewriteRecord."""
        mock_lang.detect_language.return_value = 'en'
        mock_sent.analyze.return_value = {
            'label': 'negative', 'score': -0.6,
            'scores': {'positive': 0.1, 'neutral': 0.2, 'negative': 0.7}
        }
        mock_emo.detect.return_value = {
            'joy': 0.05, 'sadness': 0.3, 'anger': 0.4,
            'fear': 0.1, 'surprise': 0.05, 'neutral': 0.1
        }
        mock_pers.analyze.return_value = {
            'traits': {
                'openness': 0.5, 'conscientiousness': 0.5,
                'extraversion': 0.4, 'agreeableness': 0.3, 'neuroticism': 0.7
            }
        }
        mock_rewriter.rewrite.return_value = MOCK_REWRITE_RESULT

        initial_posts = Post.objects.count()
        response = self.client.post(self.url, {
            'text': 'I hate this terrible day',
            'goal': 'more_positive',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Post.objects.count(), initial_posts + 1)
        self.assertEqual(RewriteRecord.objects.count(), 1)

    # --- Goal / Style parameter ---

    @patch('api.views.text_rewriter')
    def test_rewrite_accepts_goal_parameter(self, mock_rewriter):
        """Rewrite accepts 'goal' parameter."""
        mock_rewriter.rewrite.return_value = MOCK_REWRITE_RESULT
        post = create_test_post(self.user)
        create_test_analysis(post)

        response = self.client.post(self.url, {
            'text': post.text,
            'post_id': str(post.id),
            'goal': 'reduce_aggression',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('api.views.text_rewriter')
    def test_rewrite_accepts_style_as_goal(self, mock_rewriter):
        """Rewrite accepts 'style' parameter as alias for 'goal'."""
        mock_rewriter.rewrite.return_value = MOCK_REWRITE_RESULT
        post = create_test_post(self.user)
        create_test_analysis(post)

        response = self.client.post(self.url, {
            'text': post.text,
            'post_id': str(post.id),
            'style': 'more_professional',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('api.views.text_rewriter')
    def test_rewrite_creates_rewrite_record(self, mock_rewriter):
        """Rewrite creates a RewriteRecord with goal and texts."""
        mock_rewriter.rewrite.return_value = MOCK_REWRITE_RESULT
        post = create_test_post(self.user)
        create_test_analysis(post)

        self.client.post(self.url, {
            'text': post.text,
            'post_id': str(post.id),
            'goal': 'reduce_sadness',
        }, format='json')

        record = RewriteRecord.objects.first()
        self.assertIsNotNone(record)
        self.assertEqual(record.goal, 'reduce_sadness')
        self.assertEqual(record.user, self.user)

    # --- Error Handling ---

    @patch('api.views.text_rewriter')
    def test_rewrite_service_error(self, mock_rewriter):
        """Service error returns 500."""
        mock_rewriter.rewrite.side_effect = Exception('Gemini API timeout')
        post = create_test_post(self.user)
        create_test_analysis(post)

        response = self.client.post(self.url, {
            'text': post.text,
            'post_id': str(post.id),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
