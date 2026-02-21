from langdetect import detect
from services.bangla_processor import BanglaProcessor

_bangla_proc = BanglaProcessor()

class LanguageDetector:
    SUPPORTED = ['en', 'bn']

    @staticmethod
    def detect_language(text):
        """
        Detect language of text.
        Bangla (Unicode), Banglish (Roman-script Bangla), and mixed Bangla-English
        all return 'bn'. Never returns 'unsupported' for Bangla-related text (§6).
        Falls back to langdetect for everything else.
        """
        # 1. Bangla Unicode, Banglish, or mixed → always 'bn'
        if _bangla_proc.is_bangla_or_banglish(text):
            return 'bn'
        # 2. Check for mixed content via process()
        proc = _bangla_proc.process(text)
        if proc.script in ('bangla', 'banglish', 'mixed'):
            return 'bn'
        # 3. Pure English / other script → use langdetect
        try:
            lang = detect(text)
            return lang if lang in LanguageDetector.SUPPORTED else 'en'
        except Exception:
            return 'en'

    @staticmethod
    def is_supported(text):
        """
        All non-empty text is considered supported (§6 – never reject Bangla/Banglish).
        Unknown words should be inferred using context, not rejected.
        """
        return bool(text and text.strip())

    @staticmethod
    def get_detailed_language(text) -> dict:
        """
        Return a detailed language detection result with script type.
        Useful for the structured output (§7).
        """
        proc = _bangla_proc.process(text)
        return {
            'language_code': 'bn' if proc.script in ('bangla', 'banglish', 'mixed') else 'en',
            'script_type': proc.script,  # 'bangla' | 'banglish' | 'mixed' | 'english'
            'is_supported': True,  # Always true (§6)
        }