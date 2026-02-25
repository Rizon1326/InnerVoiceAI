"""
Shared test fixtures and utilities for InnerVoice AI backend tests.
====================================================================

Provides:
- Authenticated test client helpers
- Factory functions for creating test data (Users, Posts, Analyses, etc.)
- Common mock return values for external services
"""

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from api.models import (
    Post, Analysis, EmotionalProgress, ProjectMetrics,
    UserProfile, RewriteRecord,
)
from datetime import date, timedelta
import uuid


# ====================================================================
#  USER & AUTH HELPERS
# ====================================================================

def create_test_user(username='testuser', email='test@example.com',
                     password='TestPass123!'):
    """Create a user with token, profile, and metrics."""
    user = User.objects.create_user(
        username=username, email=email, password=password
    )
    token, _ = Token.objects.get_or_create(user=user)
    ProjectMetrics.objects.get_or_create(user=user)
    UserProfile.objects.get_or_create(user=user)
    return user, token


def get_auth_client(token):
    """Return an APIClient with Token authentication header set."""
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return client


# ====================================================================
#  DATA FACTORY FUNCTIONS
# ====================================================================

def create_test_post(user, text='আমি খুব খুশি আজকে!', language='bn', **kwargs):
    """Create a Post instance for testing."""
    defaults = {
        'user': user,
        'text': text,
        'language': language,
        'detected_language_type': kwargs.pop('detected_language_type', 'bangla'),
        'detected_tone': kwargs.pop('detected_tone', 'friendly'),
        'intent': kwargs.pop('intent', 'emotional_expression'),
        'post_type': kwargs.pop('post_type', 'expressive'),
        'word_count': kwargs.pop('word_count', len(text.split())),
    }
    defaults.update(kwargs)
    return Post.objects.create(**defaults)


def create_test_analysis(post, **kwargs):
    """Create an Analysis instance linked to a Post."""
    defaults = {
        'post': post,
        'sentiment_label': 'positive',
        'sentiment_score': 0.85,
        'sentiment_positive': 0.85,
        'sentiment_neutral': 0.10,
        'sentiment_negative': 0.05,
        'emotion_joy': 0.70,
        'emotion_sadness': 0.05,
        'emotion_anger': 0.03,
        'emotion_fear': 0.02,
        'emotion_surprise': 0.10,
        'emotion_neutral': 0.10,
        'personality_openness': 65,
        'personality_conscientiousness': 55,
        'personality_extraversion': 72,
        'personality_agreeableness': 68,
        'personality_neuroticism': 30,
    }
    defaults.update(kwargs)
    return Analysis.objects.create(**defaults)


def create_test_emotional_progress(user, days_ago=0, **kwargs):
    """Create an EmotionalProgress snapshot for a given date."""
    target_date = date.today() - timedelta(days=days_ago)
    defaults = {
        'user': user,
        'date': target_date,
        'avg_sentiment_score': 0.6,
        'avg_emotion_joy': 0.5,
        'avg_emotion_sadness': 0.1,
        'avg_emotion_anger': 0.05,
        'avg_emotion_fear': 0.05,
        'avg_emotion_surprise': 0.1,
        'avg_personality_openness': 60.0,
        'avg_personality_conscientiousness': 55.0,
        'avg_personality_extraversion': 65.0,
        'avg_personality_agreeableness': 60.0,
        'avg_personality_neuroticism': 35.0,
        'posts_count': 3,
    }
    defaults.update(kwargs)
    return EmotionalProgress.objects.create(**defaults)


def create_test_rewrite_record(user, post=None, **kwargs):
    """Create a RewriteRecord instance."""
    defaults = {
        'user': user,
        'post': post,
        'original_text': 'I hate everything today',
        'rewritten_text': 'I am having a challenging day today',
        'goal': 'more_positive',
        'source_language': 'en',
    }
    defaults.update(kwargs)
    return RewriteRecord.objects.create(**defaults)


# ====================================================================
#  MOCK RETURN VALUES
# ====================================================================

MOCK_CONTEXT_ANALYSIS = {
    'detected_language': 'bn',
    'detected_language_type': 'bangla',
    'normalized_text': 'আমি খুব খুশি আজকে!',
    'normalised_text': 'আমি খুব খুশি আজকে!',
    'translated_text': 'I am very happy today!',
    'detected_tone': 'friendly',
    'emotion_label': 'joy',
    'sentiment_score': 0.85,
    'rewrite_suggestion': None,
    'sentiment': {
        'label': 'positive',
        'score': 0.85,
        'scores': {'positive': 0.85, 'neutral': 0.10, 'negative': 0.05},
    },
    'emotion': {
        'label': 'joy',
        'scores': {
            'joy': 0.70, 'sadness': 0.05, 'anger': 0.03,
            'fear': 0.02, 'surprise': 0.10, 'neutral': 0.10,
        },
    },
    'intent': 'emotional_expression',
    'reasoning': 'The post expresses happiness.',
    'context_hint': 'positive informal greeting',
    'punctuation_intensity': {
        'exclamations': 1, 'questions': 0,
        'positive_emoji': 0, 'negative_emoji': 0, 'total_emoji': 0,
    },
    'detected_slang': [],
}

MOCK_PERSONALITY_RESULT = {
    'traits': {
        'openness': 0.65,
        'conscientiousness': 0.55,
        'extraversion': 0.72,
        'agreeableness': 0.68,
        'neuroticism': 0.30,
    },
    'dominant_trait': 'extraversion',
    'insights': ['Expressive and socially oriented language'],
}

MOCK_REWRITE_RESULT = {
    'rewritten_text': 'Today has been a reflective day for me.',
    'goal': 'more_positive',
    'changes': ['Replaced negative phrasing with neutral alternatives'],
    'negative_words_found': [
        {'word': 'hate', 'replacement': 'find challenging', 'reason': 'Strong negative emotion'}
    ],
}

MOCK_POST_TYPE = 'expressive'
