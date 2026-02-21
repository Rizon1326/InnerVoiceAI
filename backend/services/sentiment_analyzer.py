from transformers import pipeline
import os
import time
import re
from requests.exceptions import ReadTimeout, ConnectionError
from services.bangla_processor import BanglaProcessor, compute_punctuation_intensity

_bangla_proc = BanglaProcessor()

# =====================================================================
#  Context-aware sentiment hints  (Requirement §3, §5)
#  Words that have culturally inverted or context-dependent polarity
# =====================================================================
CONTEXT_POSITIVE_MARKERS: set[str] = {
    # Bangla
    'কঠিন', 'আগুন', 'মারাত্মক', 'ফাটাফাটি', 'ঝাকানাকা',
    'দারুণ', 'অসাধারণ', 'জোস', 'ঝাক্কাস', 'অপূর্ব', 'শানদার',
    'অপরূপ', 'হৃদয়স্পর্শী', 'মাইন্ড ব্লোয়িং', 'মাস্টারপিস',
    # Banglish
    'kothin', 'agun', 'marattok', 'fatafati', 'jhakanaka',
    'darun', 'oshadharon', 'joss', 'jhakkash', 'opurbo', 'shandaar',
    'oporup', 'hridoysparshi', 'mind blowing', 'masterpiece',
}

CONTEXT_NEGATIVE_MARKERS: set[str] = {
    'কষ্ট', 'দুঃখ', 'কান্না', 'ব্যথা', 'হতাশ', 'একা',
    'সব শেষ', 'আর পারিনা', 'ভালোবাসা নেই', 'কেউ নেই',
    'kosto', 'dukkho', 'kanna', 'betha', 'frustrated', 'akela',
    'shob shesh', 'ar parina', 'bhalobasha nei', 'keu nei',
}


class SentimentAnalyzer:
    def __init__(self):
        # Set environment variables for timeouts
        os.environ['HF_HUB_READ_TIMEOUT'] = '60'
        os.environ['HF_HUB_ETAG_TIMEOUT'] = '60'
        os.environ['HF_HUB_DOWNLOAD_TIMEOUT'] = '60'
        
        self.model = self._load_model_with_retry()
    
    def _load_model_with_retry(self, max_retries=3):
        """Load model with retry logic for timeout issues"""
        for attempt in range(max_retries):
            try:
                model = pipeline(
                    "sentiment-analysis",
                    model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
                    return_all_scores=True
                )
                return model
            except (ReadTimeout, ConnectionError, Exception) as e:
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt)  # Exponential backoff: 1s, 2s, 4s
                    print(f"Model loading failed (attempt {attempt + 1}/{max_retries}). Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print(f"Failed to load sentiment model after {max_retries} attempts")
                    return None
    
    def analyze(self, text, language='en'):
        if self.model is None:
            return {
                'label': 'neutral',
                'score': 0.0,
                'scores': {'positive': 0.33, 'neutral': 0.34, 'negative': 0.33}
            }

        # --- Bangla / Banglish: translate to English for the ML model ---
        model_input = text
        is_bangla = language == 'bn' or _bangla_proc.is_bangla_or_banglish(text)
        if is_bangla:
            translated = _bangla_proc.get_model_input(text)
            model_input = translated if translated.strip() else text

        try:
            results = self.model(model_input[:512])[0]
            scores = {
                'positive': next((r['score'] for r in results if 'pos' in r['label'].lower()), 0),
                'neutral': next((r['score'] for r in results if 'neu' in r['label'].lower()), 0),
                'negative': next((r['score'] for r in results if 'neg' in r['label'].lower()), 0),
            }

            # --- Context-aware adjustments (Requirement §3) ---
            scores = self._apply_cultural_context(text, scores, is_bangla)

            label = max(scores, key=scores.get)
            return {
                'label': label,
                'score': scores[label],
                'scores': scores
            }
        except Exception:
            return {
                'label': 'neutral',
                'score': 0.0,
                'scores': {'positive': 0.33, 'neutral': 0.34, 'negative': 0.33}
            }

    # ------------------------------------------------------------------
    def _apply_cultural_context(
        self, text: str, scores: dict, is_bangla: bool
    ) -> dict:
        """
        Adjust raw model scores using cultural context signals.
        Handles indirect praise, emoji/punctuation intensity, and
        Bangla social-media expression patterns.
        """
        if not is_bangla:
            return scores

        lower = text.lower()

        # 1. Detect cultural positive markers (indirect praise like "কঠিন", "আগুন")
        pos_hits = sum(1 for m in CONTEXT_POSITIVE_MARKERS if m in lower or m in text)
        neg_hits = sum(1 for m in CONTEXT_NEGATIVE_MARKERS if m in lower or m in text)

        if pos_hits > 0:
            boost = min(0.35, 0.15 * pos_hits)
            scores['positive'] = min(1.0, scores['positive'] + boost)
            scores['negative'] = max(0.0, scores['negative'] - boost * 0.5)

        if neg_hits > 0:
            boost = min(0.35, 0.15 * neg_hits)
            scores['negative'] = min(1.0, scores['negative'] + boost)
            scores['positive'] = max(0.0, scores['positive'] - boost * 0.5)

        # 2. Emoji / punctuation intensity
        pi = compute_punctuation_intensity(text)
        if pi.get('positive_emoji', 0) >= 2:
            scores['positive'] = min(1.0, scores['positive'] + 0.08)
        if pi.get('negative_emoji', 0) >= 2:
            scores['negative'] = min(1.0, scores['negative'] + 0.08)
        if pi.get('exclamations', 0) >= 3:
            dominant = max(scores, key=scores.get)
            scores[dominant] = min(1.0, scores[dominant] + 0.05)

        # 3. Re-normalise
        total = sum(scores.values())
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}

        return scores
