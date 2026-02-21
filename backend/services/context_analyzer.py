"""
Context-Aware Bangla Post Analyzer
------------------------------------
Central engine that combines all analysis services to produce a single
structured output (Requirement §7) with:
  - detected_language / detected_language_type
  - normalised_text / normalized_text
  - detected_tone (friendly / family / serious / humorous / sarcastic)
  - emotion_label (appreciation / humor / sarcasm / neutral / …)
  - sentiment_score (-1 → 1)
  - rewrite_suggestion (optional, based on tone)
  - sentiment (polarity + score + scores)
  - emotion (label + scores)
  - intent (communicative intent classification)
  - reasoning (human-readable explanation)

Implements:
  §1 Multi-format language understanding
  §2 Banglish normalisation pipeline (delegated to BanglaProcessor)
  §3 Context-aware meaning interpretation (tone + emoji/punctuation)
  §4 Emotion + intent classification
  §5 Cultural awareness (indirect praise, exaggeration, irony, slang)
  §6 Fail-safe language handling (never reject Bangla/Banglish)
"""

from __future__ import annotations
import re
from services.bangla_processor import BanglaProcessor, compute_punctuation_intensity
from services.sentiment_analyzer import SentimentAnalyzer
from services.emotion_detector import EmotionDetector
from services.language_detector import LanguageDetector

# =====================================================================
#  TONE DETECTION  (§3 – context & tone detection)
# =====================================================================

# Tone keyword sets – checked in priority order
TONE_PATTERNS: dict[str, list[str]] = {
    'sarcastic': [
        # Bangla
        'নাকি', 'হাহাহা', 'বাহ বাহ', 'ওয়াও রে', 'কি আর বলব',
        'যত্ত সব', 'কি দারুণ', 'বাহ রে', 'চমৎকার তো',
        # Banglish
        'naki', 'hahaha', 'bah bah', 'wow re', 'ki ar bolbo',
        'joto shob', 'ki darun', 'bah re', 'chomotkar to',
        # English
        'yeah right', 'sure thing', 'oh great', 'how wonderful',
        'as if', 'totally', 'oh really',
    ],
    'humorous': [
        # Bangla
        'হাহা', 'লল', 'রোফল', 'খিক খিক', 'মজা', 'পাগলামি',
        'হাসি পায়', 'হাসতে হাসতে', 'কমেডি',
        # Banglish
        'haha', 'lol', 'rofl', 'lmao', 'khik khik', 'moja', 'paglami',
        'hashi pay', 'hashte hashte', 'comedy', 'hilarious',
        # English
        'haha', 'lol', 'rofl', 'lmao', 'funny', 'hilarious',
    ],
    'family': [
        # Bangla
        'আব্বা', 'আম্মা', 'বাবা', 'মা', 'দাদা', 'দিদি', 'দাদু', 'নানু',
        'মামা', 'কাকা', 'চাচা', 'ফুপু', 'খালা', 'পরিবার',
        'আপনি', 'আপনার', 'আপনাদের', 'করুন', 'করেন', 'আসেন', 'বলেন',
        # Banglish
        'abba', 'amma', 'baba', 'ma', 'dada', 'didi', 'dadu', 'nanu',
        'mama', 'kaka', 'chacha', 'fupu', 'khala', 'poribar',
        'apni', 'apnar', 'apnader', 'korun', 'koren', 'ashen', 'bolen',
        # English
        'family', 'mother', 'father', 'parents', 'grandma', 'grandpa',
        'uncle', 'aunt', 'sir', 'ma\'am', 'respect',
    ],
    'serious': [
        # Bangla
        'সমস্যা', 'গুরুত্বপূর্ণ', 'জরুরি', 'প্রয়োজন', 'দরকার',
        'বিবেচনা', 'সিদ্ধান্ত', 'কারণ', 'ফলে', 'তাই', 'সুতরাং',
        'প্রসঙ্গে', 'পরিস্থিতি', 'উচিত',
        # Banglish
        'somossa', 'guruttopurno', 'joruri', 'proyojon', 'dorkar',
        'bibechona', 'siddhanto', 'kaaron', 'fole', 'sutrang',
        'ucit', 'poristhiti',
        # English
        'important', 'serious', 'urgent', 'consider', 'decision',
        'issue', 'problem', 'therefore', 'consequently', 'significant',
        'professional', 'formal', 'regarding',
    ],
    'friendly': [
        # Bangla
        'ভাই', 'বন্ধু', 'রে', 'দোস্ত', 'আরে', 'ইয়ার',
        'খুশি', 'চলবে', 'হবে', 'কুল',
        # Banglish
        'bhai', 'bondhu', 'dost', 're', 'arey', 'yaar',
        'bro', 'buddy', 'dude', 'cool', 'chill',
        'khushi', 'cholbe', 'hobe', 'mast', 'masth',
        # English
        'friend', 'buddy', 'bro', 'sis', 'dude', 'mate',
        'hey', 'yo', 'cool', 'chill', 'awesome',
    ],
}

# Sarcasm signals from punctuation / emoji
_SARCASM_EMOJI_RE = re.compile(r'[🙄😏😒🤡💅]')
_LAUGHING_EMOJI_RE = re.compile(r'[😂🤣😆😹]')


def _detect_tone(text: str, punctuation: dict, sentiment_label: str) -> str:
    """
    Detect the conversational tone of the message.
    Returns one of: friendly, family, serious, humorous, sarcastic
    """
    lower = text.lower()

    # Score each tone
    scores: dict[str, float] = {k: 0.0 for k in TONE_PATTERNS}

    for tone, keywords in TONE_PATTERNS.items():
        for kw in keywords:
            if kw in lower or kw in text:
                scores[tone] += 1.0

    # Sarcasm boost from emojis + negative sentiment with positive words
    sarcasm_emoji_count = len(_SARCASM_EMOJI_RE.findall(text))
    if sarcasm_emoji_count:
        scores['sarcastic'] += sarcasm_emoji_count * 1.5

    # Heuristic: positive words + negative sentiment = likely sarcasm
    if sentiment_label == 'negative' and scores.get('friendly', 0) > 0:
        scores['sarcastic'] += 1.0

    # Humor boost from laughing emojis
    laughing_emoji_count = len(_LAUGHING_EMOJI_RE.findall(text))
    if laughing_emoji_count:
        scores['humorous'] += laughing_emoji_count * 1.2

    # Exclamation marks boost friendliness / humor
    excl = punctuation.get('exclamations', 0)
    if excl >= 3:
        scores['friendly'] += 0.5
        scores['humorous'] += 0.3

    # Repeated characters (e.g. "daaaaarun") → playful / friendly
    if re.search(r'(.)\1{3,}', lower):
        scores['friendly'] += 0.5
        scores['humorous'] += 0.5

    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else 'friendly'  # default to friendly


# =====================================================================
#  EMOTION LABEL MAPPING  (enhanced output – emotion_label)
# =====================================================================

def _map_emotion_label(
    dominant_emotion: str,
    intent: str,
    tone: str,
    sentiment_label: str,
) -> str:
    """
    Map the raw dominant_emotion + intent + tone into a user-facing
    emotion label such as: appreciation, humor, sarcasm, neutral,
    joy, sadness, anger, fear, surprise.
    """
    # Sarcastic tone overrides
    if tone == 'sarcastic':
        return 'sarcasm'

    # Humorous tone
    if tone == 'humorous':
        return 'humor'

    # Appreciation: positive + joy + appreciation intent
    if intent == 'appreciation' or (
        sentiment_label == 'positive' and dominant_emotion == 'joy'
    ):
        return 'appreciation'

    # Gratitude
    if intent == 'gratitude':
        return 'gratitude'

    # Direct emotion pass-through for strong negatives
    if dominant_emotion in ('sadness', 'anger', 'fear', 'surprise'):
        return dominant_emotion

    # Neutral fallback
    if dominant_emotion == 'neutral' and sentiment_label == 'neutral':
        return 'neutral'

    # Default: use the dominant emotion name
    return dominant_emotion


# =====================================================================
#  SENTIMENT SCORE → NORMALISED -1 … 1  (enhanced output)
# =====================================================================

def _compute_sentiment_score_normalized(scores: dict) -> float:
    """
    Convert the three-class sentiment scores {positive, neutral, negative}
    into a single float in [-1, 1].
    Formula: positive - negative  (neutral acts as dampener).
    """
    pos = scores.get('positive', 0.0)
    neg = scores.get('negative', 0.0)
    return round(pos - neg, 4)


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
        detected_language, detected_language_type, normalized_text,
        normalised_text, detected_tone, emotion_label, sentiment_score,
        rewrite_suggestion, sentiment, emotion, intent, reasoning,
        context_hint, punctuation_intensity
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
        dict  – structured output with enhanced fields:
            detected_language, normalized_text, detected_tone,
            emotion_label, sentiment_score, rewrite_suggestion, …
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

        # 10. Tone detection (friendly / family / serious / humorous / sarcastic)
        detected_tone = _detect_tone(text, punctuation, sentiment['label'])

        # 11. Emotion label (appreciation / humor / sarcasm / neutral / …)
        emotion_label = _map_emotion_label(
            dominant_emotion, intent, detected_tone, sentiment['label']
        )

        # 12. Normalised sentiment score in [-1, 1]
        sentiment_score = _compute_sentiment_score_normalized(sentiment['scores'])

        # 13. Reasoning summary
        reasoning = _generate_reasoning(proc, sentiment, emotions, intent, punctuation)

        # 14. Context hint
        context_hint = self.bp.get_context_hint(text)

        # 15. Human-readable detected language label
        detected_language = {
            'bangla': 'Bangla',
            'banglish': 'Banglish',
            'mixed': 'Mixed',
            'english': 'English',
        }.get(proc.script, proc.script.title())

        # 16. Build normalized text for display
        #     For Banglish, prefer Bangla transliteration; else use proc result
        normalized_text = proc.bangla_text if proc.script == 'banglish' else (
            proc.normalised_text or proc.original
        )

        # 17. Rewrite suggestions (tone-based, optional)
        rewrite_suggestion = self._generate_rewrite_suggestions(
            text, proc, detected_tone, sentiment_score, language
        )

        return {
            # ---- Enhanced output fields (new) ----
            'detected_language': detected_language,
            'normalized_text': normalized_text,
            'detected_tone': detected_tone,
            'emotion_label': emotion_label,
            'sentiment_score': sentiment_score,
            'rewrite_suggestion': rewrite_suggestion,

            # ---- Existing fields (backward-compatible) ----
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
    def _generate_rewrite_suggestions(
        self,
        original_text: str,
        proc,
        detected_tone: str,
        sentiment_score: float,
        language: str,
    ) -> list[str]:
        """
        Generate optional tone-based rewrite suggestions.

        Rules:
        - If original is Banglish  → build the suggestion in Bangla first
          (normalize), then transliterate the whole suggestion back to
          Banglish so the output stays in the same script as the input.
        - If original is Bangla / Mixed → keep suggestions in Bangla Unicode.
        - English input → no suggestions generated here.

        Returns up to 2 suggestions.
        """
        suggestions: list[str] = []

        # Only generate suggestions for Bangla-family input
        if proc.script == 'english':
            return suggestions

        is_banglish = proc.script == 'banglish'

        # The normalised Bangla form used as the body of each suggestion.
        # For Banglish input proc.bangla_text holds the transliterated Bangla.
        bangla_body = proc.bangla_text or ''
        if not bangla_body:
            return suggestions

        # ------------------------------------------------------------------
        # Build a reverse map: Bangla Unicode → canonical Banglish spelling.
        # We use BANGLISH_TO_BANGLA (Banglish → Bangla) and invert it.
        # Longest Bangla phrase is matched first during replacement.
        # ------------------------------------------------------------------
        from services.bangla_processor import BANGLISH_TO_BANGLA

        _bangla_to_banglish: dict[str, str] = {}
        for bl_key, bn_val in BANGLISH_TO_BANGLA.items():
            # Keep only the first (most canonical) Banglish form per Bangla value
            if bn_val not in _bangla_to_banglish:
                _bangla_to_banglish[bn_val] = bl_key

        def _to_banglish(text: str) -> str:
            """Replace Bangla Unicode tokens with their Banglish equivalents."""
            result = text
            for bn_val in sorted(_bangla_to_banglish, key=len, reverse=True):
                if bn_val in result:
                    result = result.replace(bn_val, _bangla_to_banglish[bn_val])
            return result

        def _make(bangla_suggestion: str) -> str:
            """Return suggestion in the correct script (Banglish or Bangla)."""
            if is_banglish:
                return _to_banglish(bangla_suggestion)
            return bangla_suggestion

        # ------------------------------------------------------------------
        # Tone-aware Bangla templates → converted to target script via _make()
        # ------------------------------------------------------------------
        if detected_tone == 'friendly' and sentiment_score > 0.3:
            suggestions.append(_make(f"সত্যিই দারুণ! {bangla_body}"))
            suggestions.append(_make(f"বাহ! {bangla_body}"))
        elif detected_tone == 'sarcastic':
            suggestions.append(_make(f"আমি সত্যিই মনে করি — {bangla_body}"))
        elif detected_tone == 'humorous':
            suggestions.append(_make(f"😄 {bangla_body}"))
        elif detected_tone == 'serious' and sentiment_score < -0.2:
            suggestions.append(_make(f"আমি বুঝতে পারছি। {bangla_body}"))
            suggestions.append(_make(f"এটা নিয়ে আমরা কথা বলতে পারি — {bangla_body}"))
        elif detected_tone == 'family':
            suggestions.append(_make(f"আদরের সাথে — {bangla_body}"))
        elif sentiment_score > 0.3:
            # Generic positive fallback
            suggestions.append(_make(f"সত্যিই ভালো লাগলো! {bangla_body}"))

        return suggestions[:2]  # Max 2

    # ------------------------------------------------------------------
    @staticmethod
    def _empty_result() -> dict:
        return {
            # Enhanced fields
            'detected_language': 'Unknown',
            'normalized_text': '',
            'detected_tone': 'neutral',
            'emotion_label': 'neutral',
            'sentiment_score': 0.0,
            'rewrite_suggestion': [],

            # Existing fields
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
