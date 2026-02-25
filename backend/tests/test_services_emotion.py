"""
Test Suite: EmotionDetector Service
====================================
Unit tests for the EmotionDetector service.
Tests emotion detection for English and Bangla/Banglish texts.

Run:
    python manage.py test tests.test_services_emotion --verbosity=2
"""

from django.test import TestCase


class EmotionDetectorOutputTests(TestCase):
    """Tests for EmotionDetector.detect() output structure and correctness."""

    @classmethod
    def setUpClass(cls):
        """Load emotion detector once for all tests."""
        super().setUpClass()
        try:
            from services.emotion_detector import EmotionDetector
            cls.detector = EmotionDetector()
        except Exception:
            cls.detector = None

    def test_detector_loaded(self):
        """Emotion detector model loads successfully."""
        self.assertIsNotNone(self.detector)

    def test_output_contains_all_emotions(self):
        """Result contains all six emotion keys."""
        if not self.detector:
            self.skipTest('Detector not loaded')
        result = self.detector.detect('I am very happy today')
        expected_emotions = {'joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral'}
        self.assertTrue(expected_emotions.issubset(set(result.keys())))

    def test_emotion_scores_are_floats(self):
        """All emotion scores are floats."""
        if not self.detector:
            self.skipTest('Detector not loaded')
        result = self.detector.detect('Test sentence')
        for emotion, score in result.items():
            if emotion in ('joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral'):
                self.assertIsInstance(score, float)

    def test_joy_detected_for_happy_text(self):
        """Joy should be the dominant emotion for clearly happy text."""
        if not self.detector:
            self.skipTest('Detector not loaded')
        result = self.detector.detect('I am so incredibly happy and excited!')
        self.assertGreater(result['joy'], result['sadness'])

    def test_sadness_detected_for_sad_text(self):
        """Sadness should be high for clearly sad text."""
        if not self.detector:
            self.skipTest('Detector not loaded')
        result = self.detector.detect('I feel so sad and heartbroken today')
        self.assertGreater(result['sadness'], 0.1)

    def test_anger_detected_for_angry_text(self):
        """Anger should be high for clearly angry text."""
        if not self.detector:
            self.skipTest('Detector not loaded')
        result = self.detector.detect('I am furious and extremely angry!')
        self.assertGreater(result['anger'], 0.1)

    def test_bangla_text_emotion_detection(self):
        """Bangla text returns valid emotion scores."""
        if not self.detector:
            self.skipTest('Detector not loaded')
        result = self.detector.detect('আমি খুব কষ্ট পাচ্ছি', language='bn')
        expected_emotions = {'joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral'}
        self.assertTrue(expected_emotions.issubset(set(result.keys())))

    def test_banglish_joy_hint(self):
        """Banglish joy expression should boost joy score."""
        if not self.detector:
            self.skipTest('Detector not loaded')
        result = self.detector.detect('kothin hoise bhai, fatafati!', language='bn')
        # Should have higher joy than sadness due to cultural hints
        self.assertGreaterEqual(result['joy'], result['sadness'])

    def test_emotions_non_negative(self):
        """All emotion scores should be non-negative."""
        if not self.detector:
            self.skipTest('Detector not loaded')
        result = self.detector.detect('Random test text here')
        for emotion, score in result.items():
            if isinstance(score, (int, float)):
                self.assertGreaterEqual(score, 0.0)
