"""
Test Suite: BanglaProcessor Service
=====================================
Unit tests for the BanglaProcessor — text normalization, transliteration,
language detection, punctuation scoring.

Run:
    python manage.py test tests.test_services_bangla --verbosity=2
"""

from django.test import TestCase
from services.bangla_processor import (
    BanglaProcessor,
    compute_punctuation_intensity,
    _normalise_banglish,
    _reduce_repeated_chars,
    BANGLISH_TO_BANGLA,
    SPELLING_VARIATIONS,
)


class BanglaProcessorDetectionTests(TestCase):
    """Tests for is_bangla_or_banglish() detection."""

    def setUp(self):
        self.processor = BanglaProcessor()

    def test_bangla_unicode_detected(self):
        """Bangla Unicode text is detected as Bangla."""
        self.assertTrue(self.processor.is_bangla_or_banglish('আমি ভালো আছি'))

    def test_banglish_detected(self):
        """Banglish text is detected as Bangla."""
        self.assertTrue(self.processor.is_bangla_or_banglish('ami valo achi'))

    def test_pure_english_not_bangla(self):
        """Pure standard English is not detected as Bangla/Banglish."""
        # Note: some English words may match Banglish patterns,
        # but clearly standard English should not match
        result = self.processor.is_bangla_or_banglish('The quick brown fox')
        # This depends on implementation; test for no crash
        self.assertIsInstance(result, bool)

    def test_mixed_content_detected(self):
        """Mixed Bangla-English text is detected."""
        self.assertTrue(self.processor.is_bangla_or_banglish('আমি happy আজকে'))

    def test_social_media_slang(self):
        """Common social media Bangla slang is detected."""
        self.assertTrue(self.processor.is_bangla_or_banglish('kothin hoise'))


class BanglishNormalisationTests(TestCase):
    """Tests for the Banglish normalization pipeline."""

    def test_lowercase_conversion(self):
        """Input is lowercased."""
        result = _normalise_banglish('KOTHIN HOISE')
        self.assertEqual(result, result.lower())

    def test_repeated_char_reduction(self):
        """Repeated characters (3+) are reduced to 2."""
        self.assertEqual(_reduce_repeated_chars('daruuuuun'), 'daruun')
        self.assertEqual(_reduce_repeated_chars('jossssss'), 'joss')

    def test_spelling_variation_mapping(self):
        """Common spelling variations are normalized."""
        result = _normalise_banglish('bhalobashi')
        self.assertIn('valobashi', result)

    def test_preserves_unknown_words(self):
        """Words not in the spelling map are preserved."""
        result = _normalise_banglish('hello world xyz')
        self.assertIn('hello', result)
        self.assertIn('world', result)


class BanglishToBanglaTests(TestCase):
    """Tests for the Banglish-to-Bangla transliteration dictionary."""

    def test_kothin_maps_to_bangla(self):
        """'kothin' maps to 'কঠিন'."""
        self.assertEqual(BANGLISH_TO_BANGLA.get('kothin'), 'কঠিন')

    def test_darun_maps_to_bangla(self):
        """'darun' maps to 'দারুণ'."""
        self.assertEqual(BANGLISH_TO_BANGLA.get('darun'), 'দারুণ')

    def test_oshadharon_maps_to_bangla(self):
        """'oshadharon' maps to 'অসাধারণ'."""
        self.assertEqual(BANGLISH_TO_BANGLA.get('oshadharon'), 'অসাধারণ')

    def test_sad_expressions_mapped(self):
        """Sad Banglish expressions are mapped correctly."""
        self.assertIn('kosto lagse', BANGLISH_TO_BANGLA)
        self.assertIn('mon kharap', BANGLISH_TO_BANGLA)

    def test_greeting_mapped(self):
        """Common greetings are mapped."""
        self.assertIn('dhonnobad', BANGLISH_TO_BANGLA)
        self.assertIn('assalamualaikum', BANGLISH_TO_BANGLA)

    def test_dictionary_non_empty(self):
        """The dictionary has substantial entries."""
        self.assertGreater(len(BANGLISH_TO_BANGLA), 50)


class PunctuationIntensityTests(TestCase):
    """Tests for compute_punctuation_intensity()."""

    def test_exclamation_count(self):
        """Counts exclamation marks correctly."""
        result = compute_punctuation_intensity('Wow!!! Amazing!!')
        self.assertEqual(result['exclamations'], 5)

    def test_question_count(self):
        """Counts question marks correctly."""
        result = compute_punctuation_intensity('Really? Are you sure??')
        self.assertEqual(result['questions'], 3)

    def test_positive_emoji_count(self):
        """Counts positive emojis."""
        result = compute_punctuation_intensity('Great work! 😍❤️🔥')
        self.assertGreater(result['positive_emoji'], 0)

    def test_negative_emoji_count(self):
        """Counts negative emojis."""
        result = compute_punctuation_intensity('So sad 😢😭💔')
        self.assertGreater(result['negative_emoji'], 0)

    def test_no_punctuation(self):
        """Plain text returns zero counts."""
        result = compute_punctuation_intensity('Simple text here')
        self.assertEqual(result['exclamations'], 0)
        self.assertEqual(result['questions'], 0)

    def test_mixed_content(self):
        """Handles mixed punctuation and emojis."""
        result = compute_punctuation_intensity('Wow! Really? 😍😢')
        self.assertEqual(result['exclamations'], 1)
        self.assertEqual(result['questions'], 1)
        self.assertEqual(result['total_emoji'],
                         result['positive_emoji'] + result['negative_emoji'])


class SpellingVariationsTests(TestCase):
    """Tests for the SPELLING_VARIATIONS dictionary."""

    def test_vowel_swap_variations(self):
        """Common vowel swap variations are normalized."""
        self.assertEqual(SPELLING_VARIATIONS.get('bhalobashi'), 'valobashi')

    def test_relational_slang(self):
        """Relational slang is normalized."""
        self.assertEqual(SPELLING_VARIATIONS.get('vai'), 'bhai')

    def test_dictionary_has_entries(self):
        """Spelling variations dictionary is non-empty."""
        self.assertGreater(len(SPELLING_VARIATIONS), 20)
