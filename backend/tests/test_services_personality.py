"""
Test Suite: PersonalityAnalyzer Service
========================================
Unit tests for the PersonalityAnalyzer service (OCEAN model).

Run:
    python manage.py test tests.test_services_personality --verbosity=2
"""

from django.test import TestCase
from services.personality_analyzer import PersonalityAnalyzer


class PersonalityAnalyzerOutputTests(TestCase):
    """Tests for PersonalityAnalyzer.analyze() output structure."""

    def setUp(self):
        self.analyzer = PersonalityAnalyzer()

    def test_output_contains_traits(self):
        """Result contains a 'traits' dict with all OCEAN keys."""
        result = self.analyzer.analyze('I love exploring new ideas')
        self.assertIn('traits', result)
        expected_keys = {
            'openness', 'conscientiousness', 'extraversion',
            'agreeableness', 'neuroticism'
        }
        self.assertEqual(set(result['traits'].keys()), expected_keys)

    def test_traits_are_floats(self):
        """All trait scores are floats."""
        result = self.analyzer.analyze('Test personality text')
        for trait, score in result['traits'].items():
            self.assertIsInstance(score, float)

    def test_traits_within_range(self):
        """All trait scores are between 0 and 1."""
        result = self.analyzer.analyze('This is a test of personality analysis')
        for trait, score in result['traits'].items():
            self.assertGreaterEqual(score, 0.0, f'{trait} below 0')
            self.assertLessEqual(score, 1.0, f'{trait} above 1')

    def test_empty_text_returns_defaults(self):
        """Empty text returns default trait values."""
        result = self.analyzer.analyze('')
        self.assertIn('traits', result)
        # Should return defaults, not crash
        for score in result['traits'].values():
            self.assertIsInstance(score, float)

    def test_none_text_returns_defaults(self):
        """None text returns defaults gracefully."""
        result = self.analyzer.analyze(None)
        self.assertIn('traits', result)


class PersonalityAnalyzerTraitDetectionTests(TestCase):
    """Tests for personality trait indicator detection accuracy."""

    def setUp(self):
        self.analyzer = PersonalityAnalyzer()

    def test_high_extraversion_for_social_text(self):
        """Social/enthusiastic text should score higher on extraversion."""
        result = self.analyzer.analyze(
            'I love parties, meeting friends, and having fun together! '
            'Amazing weekend with awesome people!',
            sentiment_score=0.8,
            emotions={'joy': 0.7, 'sadness': 0.05, 'anger': 0.05,
                      'fear': 0.05, 'surprise': 0.1, 'neutral': 0.05}
        )
        self.assertGreater(result['traits']['extraversion'], 0.5)

    def test_high_neuroticism_for_negative_text(self):
        """Negative/anxious text should score higher on neuroticism."""
        result = self.analyzer.analyze(
            'I am so stressed and worried. Everything is terrible and hopeless. '
            'I hate this disaster. Why me?',
            sentiment_score=-0.7,
            emotions={'joy': 0.05, 'sadness': 0.4, 'anger': 0.3,
                      'fear': 0.15, 'surprise': 0.05, 'neutral': 0.05}
        )
        self.assertGreater(result['traits']['neuroticism'], 0.5)

    def test_high_agreeableness_for_cooperative_text(self):
        """Cooperative/empathetic text should score higher on agreeableness."""
        result = self.analyzer.analyze(
            'Thank you so much for your help and support. I really appreciate '
            'your kindness and compassion. Please let me help you too.',
            sentiment_score=0.7,
            emotions={'joy': 0.5, 'sadness': 0.05, 'anger': 0.05,
                      'fear': 0.05, 'surprise': 0.05, 'neutral': 0.3}
        )
        self.assertGreater(result['traits']['agreeableness'], 0.5)

    def test_high_openness_for_creative_text(self):
        """Creative/abstract text should score higher on openness."""
        result = self.analyzer.analyze(
            'I wonder what if we could explore new possibilities and discover '
            'unique creative approaches? Perhaps something novel and interesting.',
            sentiment_score=0.5,
            emotions={'joy': 0.3, 'sadness': 0.05, 'anger': 0.05,
                      'fear': 0.05, 'surprise': 0.3, 'neutral': 0.25}
        )
        self.assertGreater(result['traits']['openness'], 0.5)

    def test_bangla_personality_indicators(self):
        """Bangla personality indicator words are detected."""
        result = self.analyzer.analyze(
            'ধন্যবাদ ভাই, তোমার সাহায্য অসাধারণ ছিলো',
            sentiment_score=0.7,
            emotions={'joy': 0.5, 'sadness': 0.05, 'anger': 0.05,
                      'fear': 0.05, 'surprise': 0.1, 'neutral': 0.25}
        )
        # Should detect agreeableness indicators
        self.assertIn('traits', result)

    def test_personality_with_sentiment_influence(self):
        """Sentiment score influences personality traits."""
        # Very positive sentiment should reduce neuroticism
        result_positive = self.analyzer.analyze(
            'Today is wonderful',
            sentiment_score=0.9,
            emotions={'joy': 0.8, 'sadness': 0.0, 'anger': 0.0,
                      'fear': 0.0, 'surprise': 0.1, 'neutral': 0.1}
        )
        result_negative = self.analyzer.analyze(
            'Today is terrible',
            sentiment_score=-0.9,
            emotions={'joy': 0.0, 'sadness': 0.5, 'anger': 0.3,
                      'fear': 0.1, 'surprise': 0.0, 'neutral': 0.1}
        )
        # Negative should have higher neuroticism
        self.assertGreater(
            result_negative['traits']['neuroticism'],
            result_positive['traits']['neuroticism']
        )
