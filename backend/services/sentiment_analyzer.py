from transformers import pipeline
import os
import time
from requests.exceptions import ReadTimeout, ConnectionError
from services.bangla_processor import BanglaProcessor

_bangla_proc = BanglaProcessor()

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
        if language == 'bn' or _bangla_proc.is_bangla_or_banglish(text):
            translated = _bangla_proc.get_model_input(text)
            model_input = translated if translated.strip() else text

        try:
            results = self.model(model_input[:512])[0]
            scores = {
                'positive': next((r['score'] for r in results if 'pos' in r['label'].lower()), 0),
                'neutral': next((r['score'] for r in results if 'neu' in r['label'].lower()), 0),
                'negative': next((r['score'] for r in results if 'neg' in r['label'].lower()), 0),
            }
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
