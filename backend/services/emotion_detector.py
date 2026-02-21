from transformers import pipeline
from services.bangla_processor import BanglaProcessor, compute_punctuation_intensity

_bangla_proc = BanglaProcessor()

# ---------------------------------------------------------------------------
# Bangla/Banglish phrase → dominant emotion hint
# Used to post-process model output when clear cultural slang is present
# Expanded for §3 context-aware meaning + §5 cultural awareness
# ---------------------------------------------------------------------------
BANGLA_EMOTION_HINTS: dict[str, str] = {
    # joy
    "কঠিন হইসে": "joy", "কঠিন হয়েছে": "joy", "কঠিন": "joy",
    "ফাটাফাটি": "joy", "দারুণ": "joy", "অসাধারণ": "joy",
    "জোস": "joy", "ঝাক্কাস": "joy", "মজা লাগসে": "joy",
    "মজা লাগছে": "joy", "ভালো লাগসে": "joy", "ভালো লাগছে": "joy",
    "ভালো লাগে": "joy", "খুশি": "joy", "অনেক ভালো": "joy",
    "খুব ভালো": "joy", "পারফেক্ট হইসে": "joy",
    # Expanded joy – indirect praise / exaggeration (§5)
    "আগুন": "joy", "মারাত্মক": "joy", "ঝাকানাকা": "joy",
    "শানদার": "joy", "অপূর্ব": "joy", "অপরূপ": "joy",
    "হৃদয়স্পর্শী": "joy", "মাইন্ড ব্লোয়িং": "joy",
    "মজাদার": "joy", "বড় ভালো": "joy",
    "অতি সুন্দর": "joy", "ভীষণ সুন্দর": "joy",
    "আহা কি সুন্দর": "joy",
    # Banglish joy
    "kothin hoise": "joy", "kothin hoyeche": "joy", "kothin": "joy",
    "fatafati": "joy", "darun": "joy", "oshadharon": "joy",
    "osadharon": "joy", "joss": "joy", "jhakkash": "joy",
    "moja lagse": "joy", "moja lagche": "joy",
    "valo lagse": "joy", "bhalo lagse": "joy",
    "valo lagche": "joy", "bhalo lagche": "joy",
    "valo lage": "joy", "bhalo lage": "joy",
    "onek valo": "joy", "onek bhalo": "joy",
    "khub valo": "joy", "khub bhalo": "joy",
    "perfect hoise": "joy", "perfect hoyeche": "joy",
    "amazing hoise": "joy", "amazing lagse": "joy",
    "agun": "joy", "marattok": "joy", "jhakanaka": "joy",
    "shandaar": "joy", "opurbo": "joy", "oporup": "joy",
    "hridoysparshi": "joy", "mojadar": "joy",
    # sadness
    "কষ্ট লাগসে": "sadness", "কষ্ট লাগছে": "sadness",
    "কষ্ট পাচ্ছি": "sadness", "মনে কষ্ট": "sadness",
    "কান্না আসে": "sadness", "কান্না পাচ্ছি": "sadness",
    "মন খারাপ": "sadness", "মনটা খারাপ": "sadness",
    "দুঃখ": "sadness", "বিষণ্ণ": "sadness", "একা": "sadness",
    "ভালোবাসা নেই": "sadness", "কেউ নেই": "sadness",
    "সব শেষ": "sadness", "আর পারিনা": "sadness",
    "kosto lagse": "sadness", "kosto lagche": "sadness",
    "kanna ashe": "sadness", "kanna pacchi": "sadness",
    "mon kharap": "sadness", "monta kharap": "sadness",
    "dukkho": "sadness", "bishonno": "sadness", "akela": "sadness",
    "bhalobasha nei": "sadness", "keu nei": "sadness",
    "shob shesh": "sadness", "ar parina": "sadness",
    # anger
    "রাগ লাগসে": "anger", "রাগ লাগছে": "anger", "খুব রাগ": "anger",
    "পাগল বানাইছে": "anger", "হতাশ": "anger",
    "মাথা খারাপ": "anger", "চুপ কর": "anger",
    "বেশি বলোনা": "anger", "যতো সব": "anger",
    "raga lagse": "anger", "raga lagche": "anger",
    "khub raga": "anger", "pagol banaiche": "anger",
    "matha kharap": "anger", "chup kor": "anger",
    "beshi bolona": "anger", "joto shob": "anger",
    # fear
    "ভয় লাগসে": "fear", "ভয় লাগছে": "fear", "বড় ভয়": "fear",
    "সর্বনাশ": "fear",
    "bhoy lagse": "fear", "bhoy lagche": "fear", "boro bhoy": "fear",
    "sorbonash": "fear",
    # surprise
    "শক্ড হইসে": "surprise", "অবাক": "surprise",
    "কি হলো": "surprise",
    "shocked hoise": "surprise", "shocked lagse": "surprise",
    "obak": "surprise", "ki holo": "surprise",
}


class EmotionDetector:
    EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral']

    def __init__(self):
        self.model = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            return_all_scores=True
        )

    def detect(self, text, language='en'):
        try:
            # --- Bangla / Banglish: translate before running the model ---
            model_input = text
            hint_emotion = None
            is_bangla = language == 'bn' or _bangla_proc.is_bangla_or_banglish(text)
            if is_bangla:
                translated = _bangla_proc.get_model_input(text)
                model_input = translated if translated.strip() else text
                hint_emotion = self._get_hint_emotion(text)

            results = self.model(model_input[:512])[0]
            emotions = {e: 0.0 for e in self.EMOTIONS}

            for result in results:
                label = result['label'].lower()
                if label in emotions:
                    emotions[label] = result['score']

            # Boost hint emotion if cultural slang was detected
            if hint_emotion and hint_emotion in emotions:
                boost = 0.35
                emotions[hint_emotion] = min(1.0, emotions[hint_emotion] + boost)
                # Proportionally reduce others
                others = [e for e in emotions if e != hint_emotion]
                remaining = 1.0 - emotions[hint_emotion]
                others_total = sum(emotions[e] for e in others)
                if others_total > 0:
                    for e in others:
                        emotions[e] = emotions[e] / others_total * remaining

            # --- Punctuation / emoji intensity adjustments (§3) ---
            if is_bangla:
                emotions = self._apply_punctuation_context(text, emotions)

            # Normalise
            total = sum(emotions.values())
            if total > 0:
                emotions = {k: v / total for k, v in emotions.items()}

            return emotions
        except Exception:
            return {e: 1.0 / len(self.EMOTIONS) for e in self.EMOTIONS}

    @staticmethod
    def _get_hint_emotion(text: str) -> str | None:
        """Return the hinted emotion if a known Bangla/Banglish phrase is found."""
        lower = text.lower()
        # Longest phrase first to avoid partial matches
        for phrase in sorted(BANGLA_EMOTION_HINTS, key=len, reverse=True):
            if phrase in lower or phrase in text:
                return BANGLA_EMOTION_HINTS[phrase]
        return None

    @staticmethod
    def _apply_punctuation_context(text: str, emotions: dict) -> dict:
        """Adjust emotion scores based on punctuation / emoji intensity."""
        pi = compute_punctuation_intensity(text)

        if pi.get('positive_emoji', 0) >= 2:
            emotions['joy'] = min(1.0, emotions.get('joy', 0) + 0.1)
        if pi.get('negative_emoji', 0) >= 2:
            emotions['sadness'] = min(1.0, emotions.get('sadness', 0) + 0.1)
        if pi.get('exclamations', 0) >= 3:
            # Amplify the dominant emotion
            dominant = max(emotions, key=emotions.get)
            emotions[dominant] = min(1.0, emotions[dominant] + 0.08)

        return emotions