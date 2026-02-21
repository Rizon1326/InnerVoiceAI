from langdetect import detect
from services.bangla_processor import BanglaProcessor

_bangla_proc = BanglaProcessor()

class LanguageDetector:
    SUPPORTED = ['en', 'bn']

    @staticmethod
    def detect_language(text):
        """
        Detect language of text.
        Bangla (Unicode) and Banglish (Roman-script Bangla) both return 'bn'.
        Falls back to langdetect for everything else.
        """
        # 1. Bangla Unicode or Banglish → always 'bn'
        if _bangla_proc.is_bangla_or_banglish(text):
            return 'bn'
        # 2. Pure English / other script → use langdetect
        try:
            lang = detect(text)
            return lang if lang in LanguageDetector.SUPPORTED else 'en'
        except Exception:
            return 'en'

    @staticmethod
    def is_supported(text):
        """All non-empty text is considered supported (never reject Bangla/Banglish)."""
        return bool(text and text.strip())