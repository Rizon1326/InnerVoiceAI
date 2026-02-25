"""
Test Suite: Text Analysis Views
================================
Tests for POST /api/analyze/ — the core analysis endpoint.
External services (ContextAnalyzer, PersonalityAnalyzer) are mocked.

Run:
    python manage.py test tests.test_analysis_views --verbosity=2
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from api.models import Post, Analysis
from tests.conftest import (
    create_test_user, get_auth_client,
    MOCK_CONTEXT_ANALYSIS, MOCK_PERSONALITY_RESULT, MOCK_POST_TYPE,
)


class AnalyzeTextEndpointTests(TestCase):
    """Tests for POST /api/analyze/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/analyze/'

    # --- Authentication ---

    def test_analyze_unauthenticated(self):
        """Returns 401 without authentication token."""
        client = APIClient()
        response = client.post(self.url, {'text': 'Hello'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- Validation ---

    def test_analyze_empty_text(self):
        """Returns 400 for empty text."""
        response = self.client.post(self.url, {'text': ''}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.json()['success'])

    def test_analyze_text_too_short(self):
        """Returns 400 for text shorter than 3 characters."""
        response = self.client.post(self.url, {'text': 'ab'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('too short', response.json()['error'].lower())

    def test_analyze_missing_text_field(self):
        """Returns 400 when text field is missing."""
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_analyze_whitespace_only(self):
        """Returns 400 for whitespace-only text."""
        response = self.client.post(self.url, {'text': '   '}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Successful Analysis (mocked services) ---

    @patch('api.views.classify_post_type', return_value=MOCK_POST_TYPE)
    @patch('api.views.personality_analyzer')
    @patch('api.views.context_analyzer')
    @patch('api.views.ProgressTracker')
    def test_analyze_success_bangla(self, mock_progress, mock_ctx, mock_pers, mock_classify):
        """Successful analysis of Bangla text returns 200 with structured data."""
        mock_ctx.analyze.return_value = MOCK_CONTEXT_ANALYSIS
        mock_pers.analyze.return_value = MOCK_PERSONALITY_RESULT

        response = self.client.post(self.url, {
            'text': 'আমি খুব খুশি আজকে!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('data', data)
        self.assertIn('context_analysis', data)

    @patch('api.views.classify_post_type', return_value=MOCK_POST_TYPE)
    @patch('api.views.personality_analyzer')
    @patch('api.views.context_analyzer')
    @patch('api.views.ProgressTracker')
    def test_analyze_creates_post_record(self, mock_progress, mock_ctx, mock_pers, mock_classify):
        """Analysis creates a Post record in the database."""
        mock_ctx.analyze.return_value = MOCK_CONTEXT_ANALYSIS
        mock_pers.analyze.return_value = MOCK_PERSONALITY_RESULT

        self.assertEqual(Post.objects.count(), 0)
        self.client.post(self.url, {'text': 'কঠিন হইসে!'}, format='json')
        self.assertEqual(Post.objects.count(), 1)

        post = Post.objects.first()
        self.assertEqual(post.user, self.user)
        self.assertEqual(post.language, 'bn')

    @patch('api.views.classify_post_type', return_value=MOCK_POST_TYPE)
    @patch('api.views.personality_analyzer')
    @patch('api.views.context_analyzer')
    @patch('api.views.ProgressTracker')
    def test_analyze_creates_analysis_record(self, mock_progress, mock_ctx, mock_pers, mock_classify):
        """Analysis creates an Analysis record linked to the Post."""
        mock_ctx.analyze.return_value = MOCK_CONTEXT_ANALYSIS
        mock_pers.analyze.return_value = MOCK_PERSONALITY_RESULT

        self.client.post(self.url, {'text': 'আমি খুব খুশি আজকে!'}, format='json')
        self.assertEqual(Analysis.objects.count(), 1)

        analysis = Analysis.objects.first()
        self.assertEqual(analysis.sentiment_label, 'positive')
        self.assertAlmostEqual(analysis.sentiment_score, 0.85)

    @patch('api.views.classify_post_type', return_value=MOCK_POST_TYPE)
    @patch('api.views.personality_analyzer')
    @patch('api.views.context_analyzer')
    @patch('api.views.ProgressTracker')
    def test_analyze_response_structure(self, mock_progress, mock_ctx, mock_pers, mock_classify):
        """Response contains correct top-level keys and nested context_analysis fields."""
        mock_ctx.analyze.return_value = MOCK_CONTEXT_ANALYSIS
        mock_pers.analyze.return_value = MOCK_PERSONALITY_RESULT

        response = self.client.post(self.url, {'text': 'টেস্ট পোস্ট'}, format='json')
        ctx = response.json()['context_analysis']

        # Check all expected keys in context_analysis
        expected_keys = [
            'detected_language', 'normalized_text', 'detected_tone',
            'emotion_label', 'sentiment_score', 'rewrite_suggestion',
            'detected_language_type', 'normalised_text', 'translated_text',
            'sentiment', 'emotion', 'intent', 'reasoning',
            'context_hint', 'punctuation_intensity', 'detected_slang',
        ]
        for key in expected_keys:
            self.assertIn(key, ctx, f"Missing key: {key}")

    @patch('api.views.classify_post_type', return_value=MOCK_POST_TYPE)
    @patch('api.views.personality_analyzer')
    @patch('api.views.context_analyzer')
    @patch('api.views.ProgressTracker')
    def test_analyze_updates_daily_progress(self, mock_progress, mock_ctx, mock_pers, mock_classify):
        """Analysis triggers ProgressTracker.update_daily_progress."""
        mock_ctx.analyze.return_value = MOCK_CONTEXT_ANALYSIS
        mock_pers.analyze.return_value = MOCK_PERSONALITY_RESULT

        self.client.post(self.url, {'text': 'প্রগতি ট্র্যাকিং টেস্ট'}, format='json')
        mock_progress.update_daily_progress.assert_called_once_with(self.user)

    @patch('api.views.classify_post_type', return_value=MOCK_POST_TYPE)
    @patch('api.views.personality_analyzer')
    @patch('api.views.context_analyzer')
    @patch('api.views.ProgressTracker')
    def test_analyze_english_text(self, mock_progress, mock_ctx, mock_pers, mock_classify):
        """English text analysis sets language to 'en'."""
        en_ctx = {**MOCK_CONTEXT_ANALYSIS, 'detected_language_type': 'english'}
        mock_ctx.analyze.return_value = en_ctx
        mock_pers.analyze.return_value = MOCK_PERSONALITY_RESULT

        self.client.post(self.url, {'text': 'I am very happy today!'}, format='json')
        post = Post.objects.first()
        self.assertEqual(post.language, 'en')

    @patch('api.views.classify_post_type', return_value=MOCK_POST_TYPE)
    @patch('api.views.personality_analyzer')
    @patch('api.views.context_analyzer')
    @patch('api.views.ProgressTracker')
    def test_analyze_stores_personality_scores(self, mock_progress, mock_ctx, mock_pers, mock_classify):
        """Personality OCEAN scores are stored as integers (0-100)."""
        mock_ctx.analyze.return_value = MOCK_CONTEXT_ANALYSIS
        mock_pers.analyze.return_value = MOCK_PERSONALITY_RESULT

        self.client.post(self.url, {'text': 'পার্সোনালিটি টেস্ট'}, format='json')
        analysis = Analysis.objects.first()
        self.assertEqual(analysis.personality_openness, 65)
        self.assertEqual(analysis.personality_extraversion, 72)

    # --- Error Handling ---

    @patch('api.views.context_analyzer')
    def test_analyze_service_error_returns_500(self, mock_ctx):
        """If analysis service raises, endpoint returns 500."""
        mock_ctx.analyze.side_effect = Exception('Model loading failed')

        response = self.client.post(self.url, {'text': 'Error test text'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertFalse(response.json()['success'])
        self.assertIn('error', response.json())
