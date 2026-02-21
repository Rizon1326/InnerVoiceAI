"""
Context-Aware Bangla Post Analyzer
------------------------------------
Central engine that combines all analysis services to produce a single
structured output (Requirement §7) with:
  - detected_language_type
  - normalised_text
  - sentiment (polarity + score + scores)
  - emotion (label + scores)
  - intent (communicative intent classification)
  - reasoning (human-readable explanation)

Implements:
  §1 Multi-format language understanding
  §2 Banglish normalisation pipeline (delegated to BanglaProcessor)
  §3 Context-aware meaning interpretation
  §4 Emotion + intent classification
  §5 Cultural awareness (indirect praise, exaggeration, irony, slang)
  §6 Fail-safe language handling (never reject Bangla/Banglish)
"""

from __future__ import annotations
from services.bangla_processor import BanglaProcessor, compute_punctuation_intensity
from services.sentiment_analyzer import SentimentAnalyzer
from services.emotion_detector import EmotionDetector
from services.language_detector import LanguageDetector

# =====================================================================
#  INTENT CLASSIFICATION  (Requirement §4)
# =====================================================================

# Keyword/pattern → intent mapping
# Order matters: checked longest-first
INTENT_PATTERNS: dict[str, list[str]] = {
    'appreciation': [
        # Bangla
        'কঠিন', 'দারুণ', 'অসাধারণ', 'ফাটাফাটি', 'জোস', 'ঝাক্কাস',
        'আগুন', 'মারাত্মক', 'ঝাকানাকা', 'শানদার', 'অপূর্ব', 'অপরূপ',
        'হৃদয়স্পর্শী', 'মাইন্ড ব্লোয়িং', 'মাস্টারপিস',
        'অনেক ভালো', 'খুব ভালো', 'অনেক সুন্দর', 'ভীষণ সুন্দর',
        # Banglish
        'kothin', 'darun', 'oshadharon', 'fatafati', 'joss', 'jhakkash',
        'agun', 'marattok', 'jhakanaka', 'shandaar', 'opurbo', 'oporup',
        'hridoysparshi', 'mind blowing', 'masterpiece',
        'onek valo', 'khub valo', 'onek sundor',
        # English
        'amazing', 'wonderful', 'awesome', 'excellent', 'perfect', 'great',
        'love it', 'beautiful', 'fantastic', 'brilliant',
    ],
    'emotional_expression': [
        # Sadness
        'কষ্ট', 'দুঃখ', 'কান্না', 'মন খারাপ', 'একা', 'বিষণ্ণ',
        'kosto', 'dukkho', 'kanna', 'mon kharap', 'akela', 'bishonno',
        'ভালোবাসা নেই', 'কেউ নেই', 'সব শেষ', 'আর পারিনা',
        # Anger
        'রাগ', 'পাগল', 'মাথা খারাপ', 'হতাশ', 'বিরক্তিকর',
        'raga', 'pagol', 'matha kharap', 'frustrated',
        # Fear
        'ভয়', 'bhoy',
        # English
        'sad', 'angry', 'scared', 'depressed', 'lonely', 'hurt',
    ],
    'sharing_experience': [
        'লাগসে', 'লাগছে', 'হইসে', 'হয়েছে', 'পাচ্ছি', 'করছি',
        'lagse', 'lagche', 'hoise', 'hoyeche', 'pacchi', 'korchi',
        'feeling', 'felt', 'experienced', 'went through',
    ],
    'seeking_support': [
        'কি করবো', 'সাহায্য', 'কেউ নেই', 'আর পারিনা',
        'ki korbo', 'shahajjo', 'keu nei', 'ar parina',
        'help', 'support', 'advice', 'what should i do',
    ],
    'greeting': [
        'আসসালামুআলাইকুম', 'কেমন আছো', 'কেমন আছেন',
        'assalamualaikum', 'kemon acho', 'kemon achen',
        'hello', 'hi', 'hey', 'good morning', 'good evening',
    ],
    'gratitude': [
        'ধন্যবাদ', 'শুক্রিয়া', 'dhonnobad', 'shukriya',
        'thank', 'thanks', 'grateful',
    ],
    'informational': [],  # fallback
}


def _classify_intent(text: str, sentiment_label: str, dominant_emotion: str) -> str:
    """
    Classify the communicative intent of a message.
    Uses keyword matching + sentiment/emotion context.
    """
    lower = text.lower()

    # Check patterns (longest match first within each category)
    scores: dict[str, int] = {k: 0 for k in INTENT_PATTERNS}
    for intent, keywords in INTENT_PATTERNS.items():
        for kw in keywords:
            if kw in lower or kw in text:
                scores[intent] += 1

    best_intent = max(scores, key=scores.get)
    if scores[best_intent] > 0:
        return best_intent

    # Fallback heuristics from sentiment/emotion
    if sentiment_label == 'positive' and dominant_emotion in ('joy',):
        return 'appreciation'
    if dominant_emotion in ('sadness', 'fear'):
        return 'emotional_expression'
    if dominant_emotion == 'anger':
        return 'emotional_expression'
    if sentiment_label == 'neutral':
        return 'informational'
    return 'sharing_experience'


# =====================================================================
#  REASONING GENERATOR  (Requirement §7 – reasoning summary)
# =====================================================================

def _generate_reasoning(
    proc_result,
    sentiment: dict,
    emotions: dict,
    intent: str,
    punctuation: dict,
) -> str:
    """
    Build a human-readable reasoning summary explaining the analysis.
    """
    parts = []

    # Language
    script_label = {
        'bangla': 'Unicode Bangla',
        'banglish': 'Banglish (Roman-script Bangla)',
        'mixed': 'Mixed Bangla-English',
        'english': 'English',
    }.get(proc_result.script, proc_result.script)
    parts.append(f"Detected language type: {script_label}.")

    # Slang detection
    if proc_result.detected_slang:
        slang_list = ', '.join(f"'{s}'" for s in proc_result.detected_slang[:5])
        parts.append(f"Cultural slang detected: {slang_list}.")

    # Sentiment
    sent_label = sentiment.get('label', 'neutral')
    sent_score = sentiment.get('score', 0)
    parts.append(f"Sentiment: {sent_label} (confidence {sent_score:.2f}).")

    # Emotion
    dominant = max(emotions, key=emotions.get)
    dom_score = emotions[dominant]
    parts.append(f"Dominant emotion: {dominant} ({dom_score:.2f}).")

    # Intent
    intent_label = intent.replace('_', ' ').title()
    parts.append(f"Communicative intent: {intent_label}.")

    # Context signals
    if punctuation.get('exclamations', 0) >= 2:
        parts.append("High exclamation usage indicates strong emotional intensity.")
    if punctuation.get('positive_emoji', 0) >= 1:
        parts.append("Positive emojis reinforce positive tone.")
    if punctuation.get('negative_emoji', 0) >= 1:
        parts.append("Negative emojis reinforce negative tone.")

    # Cultural context
    indirect_praise = {'কঠিন', 'আগুন', 'মারাত্মক', 'kothin', 'agun', 'marattok'}
    if any(s in indirect_praise for s in proc_result.detected_slang):
        parts.append(
            "Note: Words like 'kothin'/'agun'/'marattok' are culturally used as "
            "indirect praise in Bangla social media — their literal negative meaning "
            "should NOT be taken at face value."
        )

    return ' '.join(parts)


# =====================================================================
#  CONTEXT ANALYZER  (main public API)
# =====================================================================

class ContextAnalyzer:
    """
    High-level analyzer that produces a fully structured result combining
    language detection, normalisation, sentiment, emotion, intent, and
    reasoning for Bangla social-media posts.

    Returns
    -------
    dict with keys:
        detected_language_type, normalised_text, sentiment, emotion,
        intent, reasoning, context_hint, punctuation_intensity
    """

    def __init__(
        self,
        bangla_processor: BanglaProcessor | None = None,
        sentiment_analyzer: SentimentAnalyzer | None = None,
        emotion_detector: EmotionDetector | None = None,
    ):
        self.bp = bangla_processor or BanglaProcessor()
        self.sa = sentiment_analyzer or SentimentAnalyzer()
        self.ed = emotion_detector or EmotionDetector()

    # ------------------------------------------------------------------
    def analyze(self, text: str) -> dict:
        """
        Full context-aware analysis pipeline.

        Parameters
        ----------
        text : str
            Raw user input (any format: Bangla / Banglish / mixed / English).

        Returns
        -------
        dict  – structured output per Requirement §7.
        """
        if not text or not text.strip():
            return self._empty_result()

        # 1. Process text through BanglaProcessor (normalisation, translation, slang)
        proc = self.bp.process(text)

        # 2. Determine language code for downstream services
        language = 'bn' if proc.script in ('bangla', 'banglish', 'mixed') else 'en'

        # 3. Sentiment analysis (context-aware via BanglaProcessor translation)
        sentiment = self.sa.analyze(text, language)

        # 4. Emotion detection (with cultural hint boosting)
        emotions = self.ed.detect(text, language)

        # 5. Dominant emotion
        dominant_emotion = max(emotions, key=emotions.get)

        # 6. Intent classification
        intent = _classify_intent(text, sentiment['label'], dominant_emotion)

        # 7. Punctuation intensity
        punctuation = proc.punctuation_intensity

        # 8. Context-aware adjustments
        sentiment, emotions = self._apply_context_adjustments(
            proc, sentiment, emotions, punctuation
        )

        # 9. Re-determine dominant emotion after adjustments
        dominant_emotion = max(emotions, key=emotions.get)

        # 10. Reasoning summary
        reasoning = _generate_reasoning(proc, sentiment, emotions, intent, punctuation)

        # 11. Context hint
        context_hint = self.bp.get_context_hint(text)

        return {
            'detected_language_type': proc.script,  # bangla | banglish | mixed | english
            'normalised_text': proc.normalised_text or proc.original,
            'translated_text': proc.english_text,
            'sentiment': {
                'label': sentiment['label'],
                'score': sentiment['score'],
                'scores': sentiment['scores'],
            },
            'emotion': {
                'label': dominant_emotion,
                'score': emotions[dominant_emotion],
                'scores': emotions,
            },
            'intent': intent,
            'reasoning': reasoning,
            'context_hint': context_hint,
            'punctuation_intensity': punctuation,
            'detected_slang': proc.detected_slang,
        }

    # ------------------------------------------------------------------
    def _apply_context_adjustments(
        self,
        proc,
        sentiment: dict,
        emotions: dict,
        punctuation: dict,
    ) -> tuple[dict, dict]:
        """
        Apply context-aware adjustments based on:
        - Cultural indirect praise (§3, §5)
        - Punctuation / emoji intensity (§3)
        - Exaggeration patterns (§5)
        """
        scores = dict(sentiment['scores'])
        emo = dict(emotions)

        # --- Indirect praise: words like কঠিন, আগুন, মারাত্মক ---
        indirect_praise = {'কঠিন', 'আগুন', 'মারাত্মক', 'kothin', 'agun', 'marattok'}
        detected_indirect = [s for s in proc.detected_slang if s in indirect_praise]
        if detected_indirect:
            # These are POSITIVE despite sounding negative literally
            boost = 0.25 * len(detected_indirect)
            scores['positive'] = min(1.0, scores.get('positive', 0) + boost)
            scores['negative'] = max(0.0, scores.get('negative', 0) - boost * 0.5)
            emo['joy'] = min(1.0, emo.get('joy', 0) + boost)

        # --- Emoji intensity adjustment ---
        pos_emoji = punctuation.get('positive_emoji', 0)
        neg_emoji = punctuation.get('negative_emoji', 0)
        if pos_emoji >= 2:
            scores['positive'] = min(1.0, scores.get('positive', 0) + 0.1)
            emo['joy'] = min(1.0, emo.get('joy', 0) + 0.1)
        if neg_emoji >= 2:
            scores['negative'] = min(1.0, scores.get('negative', 0) + 0.1)
            emo['sadness'] = min(1.0, emo.get('sadness', 0) + 0.1)

        # --- Exclamation intensity → amplify dominant direction ---
        excl = punctuation.get('exclamations', 0)
        if excl >= 3:
            # Amplify the current dominant polarity
            dominant_pol = max(scores, key=scores.get)
            scores[dominant_pol] = min(1.0, scores[dominant_pol] + 0.08)

        # --- Re-normalise sentiment scores ---
        total_s = sum(scores.values())
        if total_s > 0:
            scores = {k: v / total_s for k, v in scores.items()}

        # --- Re-normalise emotion scores ---
        total_e = sum(emo.values())
        if total_e > 0:
            emo = {k: v / total_e for k, v in emo.items()}

        # Recompute sentiment label
        label = max(scores, key=scores.get)

        adjusted_sentiment = {
            'label': label,
            'score': scores[label],
            'scores': scores,
        }

        return adjusted_sentiment, emo

    # ------------------------------------------------------------------
    @staticmethod
    def _empty_result() -> dict:
        return {
            'detected_language_type': 'unknown',
            'normalised_text': '',
            'translated_text': '',
            'sentiment': {
                'label': 'neutral',
                'score': 0.0,
                'scores': {'positive': 0.33, 'neutral': 0.34, 'negative': 0.33},
            },
            'emotion': {
                'label': 'neutral',
                'score': 1.0,
                'scores': {
                    'joy': 0.0, 'sadness': 0.0, 'anger': 0.0,
                    'fear': 0.0, 'surprise': 0.0, 'neutral': 1.0,
                },
            },
            'intent': 'informational',
            'reasoning': 'Empty or whitespace-only input.',
            'context_hint': '',
            'punctuation_intensity': {},
            'detected_slang': [],
        }
