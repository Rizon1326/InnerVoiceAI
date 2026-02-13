from langdetect import detect

class LanguageDetector:
    SUPPORTED = ['en', 'bn']
    
    @staticmethod
    def detect_language(text):
        try:
            lang = detect(text)
            return lang if lang in LanguageDetector.SUPPORTED else 'unknown'
        except:
            return 'unknown'
    
    @staticmethod
    def is_supported(text):
        return LanguageDetector.detect_language(text) in LanguageDetector.SUPPORTED