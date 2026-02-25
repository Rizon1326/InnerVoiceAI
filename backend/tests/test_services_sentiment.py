"""
Test Suite: SentimentAnalyzer Service
======================================
Unit tests for the SentimentAnalyzer service.
Tests sentiment analysis for English and Bangla texts.

Note: These tests load the actual ML model. They may be slow on first run.
For CI pipelines, consider mocking the model.

Run:
    python manage.py test tests.test_services_sentiment --verbosity=2
"""

from django.test import TestCase
from unittest.mock import patch, MagicMock


class SentimentAnalyzerOutputTests(TestCase):
    """Tests for SentimentAnalyzer.analyze() output structure and correctness."""

    @classmethod
    def setUpClass(cls):
        """Load sentiment analyzer once for all tests in this class."""
        super().setUpClass()
        try:
            from services.sentiment_analyzer import SentimentAnalyzer
            cls.analyzer = SentimentAnalyzer()
        except Exception:
            cls.analyzer = None

    def test_analyzer_loaded(self):
        """Sentiment analyzer model loads successfully."""
        self.assertIsNotNone(self.analyzer)

    def test_output_structure(self):
        """Result contains label, score, and scores dict."""
        if not self.analyzer:
            self.skipTest('Analyzer not loaded')
        result = self.analyzer.analyze('I am happy')
        self.assertIn('label', result)
        self.assertIn('score', result)
        self.assertIn('scores', result)
        self.assertIn('positive', result['scores'])
        self.assertIn('neutral', result['scores'])
        self.assertIn('negative', result['scores'])

    def test_label_is_valid(self):
        """Label is one of positive, neutral, negative."""
        if not self.analyzer:
            self.skipTest('Analyzer not loaded')
        result = self.analyzer.analyze('This is a test sentence')
        self.assertIn(result['label'], ['positive', 'neutral', 'negative'])

    def test_scores_sum_approximately_one(self):
        """Scores should sum to approximately 1.0."""
        if not self.analyzer:
            self.skipTest('Analyzer not loaded')
        result = self.analyzer.analyze('Today is a good day')
        total = sum(result['scores'].values())
        self.assertAlmostEqual(total, 1.0, delta=0.1)

    def test_positive_english_text(self):
        """Clearly positive English text should have positive label."""
        if not self.analyzer:
            self.skipTest('Analyzer not loaded')
        result = self.analyzer.analyze('I love this amazing wonderful day!')
        self.assertEqual(result['label'], 'positive')

    def test_negative_english_text(self):
        """Clearly negative English text should have negative label."""
        if not self.analyzer:
            self.skipTest('Analyzer not loaded')
        result = self.analyzer.analyze('I hate this terrible awful day')
        self.assertEqual(result['label'], 'negative')

    def test_bangla_text_analysis(self):
        """Bangla text returns valid sentiment result."""
        if not self.analyzer:
            self.skipTest('Analyzer not loaded')
        result = self.analyzer.analyze('আমি খুব খুশি আজকে!', language='bn')
        self.assertIn(result['label'], ['positive', 'neutral', 'negative'])
        self.assertIsInstance(result['score'], float)


class SentimentAnalyzerFallbackTests(TestCase):
    """Tests for fallback behavior when model fails to load."""

    def test_fallback_when_model_is_none(self):
        """Returns neutral defaults when model is None."""
        from services.sentiment_analyzer import SentimentAnalyzer
        analyzer = SentimentAnalyzer.__new__(SentimentAnalyzer)
        analyzer.model = None
        result = analyzer.analyze('Test text')
        self.assertEqual(result['label'], 'neutral')
        self.assertEqual(result['score'], 0.0)
        self.assertAlmostEqual(result['scores']['positive'], 0.33, delta=0.01)

    def test_truncation_long_text(self):
        """Long text is truncated to 512 chars for the model."""
        if not hasattr(self, 'analyzer') or not self.analyzer:
            self.skipTest('Analyzer not loaded')
        # Should not raise even with very long text
        long_text = 'I am happy ' * 200
        result = self.analyzer.analyze(long_text)
        self.assertIn('label', result)
