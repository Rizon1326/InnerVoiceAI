"""
Bangla & Banglish Text Processor
---------------------------------
Handles:
  1. Unicode Bangla text normalisation
  2. Banglish (Bangla written in English/Roman script) → Bangla transliteration
  3. Context-aware social-media slang mapping (e.g. "kothin" → "very good")
  4. Language detection that accepts both Bangla and Banglish as supported
  5. English translation for downstream ML models (sentiment / emotion)
"""

import re
import unicodedata

# ---------------------------------------------------------------------------
# 1. Banglish → Bangla word mapping
#    Key  = lower-case Banglish spelling(s) used on Bangladeshi/Indian social media
#    Value = canonical Bangla Unicode form
# ---------------------------------------------------------------------------
BANGLISH_TO_BANGLA: dict[str, str] = {
    # Greetings / common phrases
    "assalamualaikum": "আসসালামুআলাইকুম",
    "assalamu alaikum": "আসসালামুআলাইকুম",
    "kemon acho": "কেমন আছো",
    "kemon achen": "কেমন আছেন",
    "valo achi": "ভালো আছি",
    "valo achhi": "ভালো আছি",
    "bhalo achi": "ভালো আছি",
    "ki koro": "কি করো",
    "ki koren": "কি করেন",
    "dhonnobad": "ধন্যবাদ",
    "shukriya": "শুক্রিয়া",
    "maaf koro": "মাফ করো",
    "maaf korun": "মাফ করুন",

    # Emotional / positive slang
    "kothin": "কঠিন",        # social media: "awesome / great"
    "kothin hoise": "কঠিন হইসে",
    "kothin hoyeche": "কঠিন হয়েছে",
    "onek valo": "অনেক ভালো",
    "onek bhalo": "অনেক ভালো",
    "onek sundor": "অনেক সুন্দর",
    "onek sundar": "অনেক সুন্দর",
    "darun": "দারুণ",
    "oshadharon": "অসাধারণ",
    "osadharon": "অসাধারণ",
    "oshadharan": "অসাধারণ",
    "fatafati": "ফাটাফাটি",   # social media: "awesome"
    "jhakkash": "ঝাক্কাস",
    "ekdom thik": "একদম ঠিক",
    "bilkul thik": "বিলকুল ঠিক",
    "perfect hoise": "পারফেক্ট হইসে",
    "perfect hoyeche": "পারফেক্ট হয়েছে",
    "moja lagse": "মজা লাগসে",
    "moja lagche": "মজা লাগছে",
    "valo lagse": "ভালো লাগসে",
    "valo lagche": "ভালো লাগছে",
    "bhalo lagse": "ভালো লাগসে",
    "bhalo lagche": "ভালো লাগছে",
    "valo lage": "ভালো লাগে",
    "bhalo lage": "ভালো লাগে",
    "khub valo": "খুব ভালো",
    "khub bhalo": "খুব ভালো",
    "boro valo": "বড় ভালো",
    "ei to jiboner mane": "এই তো জীবনের মানে",
    "joss": "জোস",            # social media: "excellent"
    "joshsh": "জোস",
    "masterpiece": "মাস্টারপিস",
    "amazing hoise": "আমেজিং হইসে",
    "amazing lagse": "আমেজিং লাগসে",

    # Negative / sad slang
    "kharap lagse": "খারাপ লাগসে",
    "kharap lagche": "খারাপ লাগছে",
    "kharap lage": "খারাপ লাগে",
    "kharap hoise": "খারাপ হইসে",
    "kharap hoyeche": "খারাপ হয়েছে",
    "kosto lagse": "কষ্ট লাগসে",
    "kosto lagche": "কষ্ট লাগছে",
    "kosto pachi": "কষ্ট পাচ্ছি",
    "mone kosto": "মনে কষ্ট",
    "kanna ashe": "কান্না আসে",
    "kanna pacchi": "কান্না পাচ্ছি",
    "dukkhito": "দুঃখিত",
    "dukkho": "দুঃখ",
    "betha": "ব্যথা",
    "byatha": "ব্যথা",
    "boro betha": "বড় ব্যথা",
    "mon kharap": "মন খারাপ",
    "monta kharap": "মনটা খারাপ",
    "boro kharap": "বড় খারাপ",
    "ekta bekar": "একটা বেকার",
    "bekar": "বেকার",
    "akela": "একা",

    # Anger / frustration
    "raga lagse": "রাগ লাগসে",
    "raga lagche": "রাগ লাগছে",
    "khub raga": "খুব রাগ",
    "pagol banaiche": "পাগল বানাইছে",
    "pagol banaise": "পাগল বানাইছে",
    "gha dile": "ঘা দিলে",
    "irritating": "বিরক্তিকর",
    "frustrated": "হতাশ",
    "fire gesi": "ফিরে গেসি",
    "gesi": "গেসি",

    # Fear / surprise
    "bhoy lagse": "ভয় লাগসে",
    "bhoy lagche": "ভয় লাগছে",
    "boro bhoy": "বড় ভয়",
    "shocked hoise": "শক্ড হইসে",
    "shocked lagse": "শক্ড লাগসে",
    "obbhoshot": "অভূতপূর্ব",
    "obak": "অবাক",
    "akta shocking": "একটা শকিং",

    # Pronouns / common words
    "ami": "আমি",
    "tumi": "তুমি",
    "apni": "আপনি",
    "se": "সে",
    "amra": "আমরা",
    "tomra": "তোমরা",
    "apnara": "আপনারা",
    "ei": "এই",
    "oi": "ওই",
    "shob": "সব",
    "kichu": "কিছু",
    "keno": "কেন",
    "kothay": "কোথায়",
    "kokhon": "কখন",
    "koto": "কতো",
    "boro": "বড়",
    "choto": "ছোট",
    "valo": "ভালো",
    "bhalo": "ভালো",
    "manda": "মন্দ",
    "shundor": "সুন্দর",
    "sundor": "সুন্দর",
    "sundar": "সুন্দর",
    "khushi": "খুশি",
    "bishonno": "বিষণ্ণ",
    "ekhon": "এখন",
    "age": "আগে",
    "pore": "পরে",
    "hoise": "হইসে",         # colloquial past tense of "হয়েছে"
    "hoyeche": "হয়েছে",
    "holo": "হলো",
    "korchi": "করছি",
    "korbo": "করবো",
    "korechi": "করেছি",
    "korechhi": "করেছি",
    "jacchi": "যাচ্ছি",
    "jabo": "যাবো",
    "gelam": "গেলাম",
    "ashchi": "আসছি",
    "ashbo": "আসবো",
    "elam": "এলাম",
    "ache": "আছে",
    "nei": "নেই",
    "na": "না",
    "hya": "হ্যাঁ",
    "ha": "হ্যাঁ",
    "aro": "আরো",
    "abar": "আবার",
    "tarpor": "তারপর",
    "kintu": "কিন্তু",
    "tai": "তাই",
    "tobuo": "তবুও",
    "jodi": "যদি",
    "tahole": "তাহলে",
    "naki": "নাকি",
    "ba": "বা",
    "ebong": "এবং",
    "r": "আর",
}

# ---------------------------------------------------------------------------
# 2. Context-aware social-media slang → English meaning
#    Used for ML model input (models are English-trained)
# ---------------------------------------------------------------------------
BANGLA_SLANG_TO_ENGLISH: dict[str, str] = {
    # Positive slang
    "কঠিন": "awesome great excellent",           # "tough" → socially means "amazing"
    "কঠিন হইসে": "this turned out awesome",
    "কঠিন হয়েছে": "this turned out awesome",
    "অসাধারণ": "extraordinary wonderful",
    "দারুণ": "wonderful excellent",
    "ফাটাফাটি": "amazing awesome incredible",
    "ঝাক্কাস": "fabulous awesome",
    "জোস": "excellent awesome",
    "পারফেক্ট হইসে": "came out perfect",
    "পারফেক্ট হয়েছে": "came out perfect",
    "মজা লাগসে": "feeling fun enjoying",
    "মজা লাগছে": "feeling fun enjoying",
    "ভালো লাগসে": "feeling good happy pleased",
    "ভালো লাগছে": "feeling good happy pleased",
    "ভালো লাগে": "feels good like it",
    "অনেক ভালো": "very good",
    "অনেক সুন্দর": "very beautiful",
    "খুব ভালো": "very good excellent",
    "খুশি": "happy joyful",
    "সুন্দর": "beautiful nice",
    "মাস্টারপিস": "masterpiece perfect",

    # Negative slang
    "খারাপ লাগসে": "feeling bad sad",
    "খারাপ লাগছে": "feeling bad sad",
    "খারাপ লাগে": "feels bad dislike",
    "খারাপ হইসে": "turned out bad disappointing",
    "খারাপ হয়েছে": "turned out bad disappointing",
    "কষ্ট লাগসে": "feeling pain suffering",
    "কষ্ট লাগছে": "feeling pain suffering",
    "কষ্ট পাচ্ছি": "in pain suffering",
    "মনে কষ্ট": "heart pain sorrow",
    "কান্না আসে": "feel like crying tearful",
    "কান্না পাচ্ছি": "crying tearful sad",
    "দুঃখিত": "sorry apologize",
    "দুঃখ": "sadness grief sorrow",
    "ব্যথা": "pain hurt",
    "মন খারাপ": "sad feeling down",
    "মনটা খারাপ": "feeling sad heart is heavy",
    "বেকার": "useless pointless",
    "একা": "alone lonely",
    "বিষণ্ণ": "depressed melancholy",

    # Anger slang
    "রাগ লাগসে": "feeling angry irritated",
    "রাগ লাগছে": "feeling angry irritated",
    "খুব রাগ": "very angry",
    "পাগল বানাইছে": "driving me crazy infuriating",
    "বিরক্তিকর": "annoying irritating",
    "হতাশ": "frustrated disappointed",

    # Fear / surprise
    "ভয় লাগসে": "feeling scared afraid",
    "ভয় লাগছে": "feeling scared afraid",
    "বড় ভয়": "very scared frightened",
    "শক্ড হইসে": "shocked surprised",
    "অবাক": "surprised astonished",
    "অভূতপূর্ব": "unprecedented amazing shocking",

    # Neutral / misc
    "ধন্যবাদ": "thank you grateful",
    "ভালো আছি": "doing well good",
    "কেমন আছো": "how are you",
    "কেমন আছেন": "how are you",
}

# Banglish slang → direct English meaning (bypass transliteration)
BANGLISH_SLANG_TO_ENGLISH: dict[str, str] = {
    "kothin hoise": "turned out amazing awesome",
    "kothin hoyeche": "turned out amazing awesome",
    "kothin": "amazing awesome great",           # context: social media positivity
    "fatafati": "absolutely amazing incredible",
    "oshadharon": "extraordinary wonderful amazing",
    "osadharon": "extraordinary wonderful amazing",
    "oshadharan": "extraordinary wonderful amazing",
    "jhakkash": "fabulous awesome",
    "joss": "excellent awesome cool",
    "darun": "wonderful excellent great",
    "valo lagse": "feeling good happy",
    "bhalo lagse": "feeling good happy",
    "valo lagche": "feeling good happy",
    "bhalo lagche": "feeling good happy",
    "valo lage": "feels good like it",
    "bhalo lage": "feels good like it",
    "onek sundor": "very beautiful wonderful",
    "onek valo": "very good excellent",
    "onek bhalo": "very good excellent",
    "khub valo": "very good excellent",
    "khub bhalo": "very good excellent",
    "moja lagse": "feeling fun enjoying",
    "moja lagche": "feeling fun enjoying",
    "perfect hoise": "turned out perfect excellent",
    "perfect hoyeche": "turned out perfect excellent",
    "amazing hoise": "turned out amazing",
    "amazing lagse": "feels amazing",
    # Negative
    "kharap lagse": "feeling bad sad",
    "kharap lagche": "feeling bad sad",
    "kharap hoise": "turned out bad disappointing",
    "mon kharap": "feeling sad heart is heavy",
    "monta kharap": "feeling sad heart is heavy",
    "kosto lagse": "feeling pain suffering",
    "kosto lagche": "feeling pain suffering",
    "kosto pachi": "in pain suffering",
    "kanna ashe": "feel like crying",
    "kanna pacchi": "crying tearful",
    "dukkhito": "sorry apologize",
    "dukkho": "sadness grief sorrow",
    "betha": "pain hurt",
    "byatha": "pain hurt",
    "bishonno": "depressed melancholy sad",
    "akela": "alone lonely",
    "bekar": "useless pointless waste",
    # Anger
    "raga lagse": "feeling angry irritated",
    "raga lagche": "feeling angry irritated",
    "khub raga": "very angry",
    "pagol banaiche": "driving crazy infuriating",
    "pagol banaise": "driving crazy infuriating",
    "frustrated": "frustrated disappointed",
    # Fear / surprise
    "bhoy lagse": "feeling scared afraid",
    "bhoy lagche": "feeling scared afraid",
    "boro bhoy": "very scared frightened",
    "shocked hoise": "shocked surprised astonished",
    "shocked lagse": "shocked surprised",
    "obak": "surprised astonished",
}

# ---------------------------------------------------------------------------
# 3. Bangla-script unicode block range
# ---------------------------------------------------------------------------
BANGLA_UNICODE_RANGE = re.compile(r'[\u0980-\u09FF]')

# ---------------------------------------------------------------------------
# 4. Helpers
# ---------------------------------------------------------------------------

def _normalise_bangla_unicode(text: str) -> str:
    """NFC-normalise and strip zero-width characters from Bangla text."""
    text = unicodedata.normalize('NFC', text)
    # Remove zero-width non-joiner/joiner that sometimes corrupt text
    text = text.replace('\u200c', '').replace('\u200d', '')
    return text.strip()


def _contains_bangla(text: str) -> bool:
    """Return True if text contains at least one Bangla Unicode codepoint."""
    return bool(BANGLA_UNICODE_RANGE.search(text))


def _is_banglish(text: str) -> bool:
    """
    Heuristic: text is Banglish if it has NO Bangla codepoints but contains
    words found in the Banglish lexicon, OR if common Banglish phoneme
    patterns are present (e.g. 'kh', 'bh', 'gh', 'ch' digraphs common in
    Bangla romanisation).
    """
    if _contains_bangla(text):
        return False
    lower = text.lower()
    # Check if any known Banglish phrase is in the text
    for key in BANGLISH_TO_BANGLA:
        if key in lower:
            return True
    # Phoneme heuristic: common Bangla romanisation digraphs
    bangla_digraphs = [
        r'\bkh', r'\bbh', r'\bgh', r'\bch', r'\bsh', r'\bth',
        r'hoise\b', r'lagse\b', r'lagche\b', r'achhi\b', r'achi\b',
        r'korchi\b', r'jacchi\b', r'ashchi\b', r'hoyeche\b',
    ]
    if any(re.search(p, lower) for p in bangla_digraphs):
        return True
    return False


def _banglish_to_english(text: str) -> str:
    """
    Translate Banglish text to English using the slang→English map first,
    then falling back to word-level transliteration description.
    """
    lower = text.lower().strip()

    # 1. Try full-phrase slang match (longest first)
    for phrase in sorted(BANGLISH_SLANG_TO_ENGLISH, key=len, reverse=True):
        if phrase in lower:
            lower = lower.replace(phrase, BANGLISH_SLANG_TO_ENGLISH[phrase])

    # 2. Word-level Banglish → Bangla → English description fallback
    #    (for words not in the slang map, convert to Bangla word then look up)
    words = lower.split()
    translated_words = []
    for word in words:
        # clean punctuation
        clean_word = re.sub(r'[^\w]', '', word)
        if clean_word in BANGLISH_TO_BANGLA:
            bangla_word = BANGLISH_TO_BANGLA[clean_word]
            # check if we have English meaning for Bangla word
            if bangla_word in BANGLA_SLANG_TO_ENGLISH:
                translated_words.append(BANGLA_SLANG_TO_ENGLISH[bangla_word])
            else:
                # keep the Banglish word as-is (will still help the multilingual model)
                translated_words.append(word)
        else:
            translated_words.append(word)

    return ' '.join(translated_words)


def _bangla_to_english(text: str) -> str:
    """
    Translate Bangla Unicode text to English using the slang→English map.
    Unrecognised words are left as-is (multilingual models can handle them).
    """
    # Longest-first phrase match
    for phrase in sorted(BANGLA_SLANG_TO_ENGLISH, key=len, reverse=True):
        if phrase in text:
            text = text.replace(phrase, BANGLA_SLANG_TO_ENGLISH[phrase])
    return text


# ---------------------------------------------------------------------------
# 5. Public API
# ---------------------------------------------------------------------------

class BanglaProcessor:
    """
    Central processor for Bangla & Banglish text.

    Usage
    -----
    processor = BanglaProcessor()
    result = processor.process("kothin hoise bhai!")
    # result.script      → 'banglish'
    # result.bangla_text → 'কঠিন হইসে bhai!'
    # result.english_text→ 'turned out amazing awesome bhai!'
    # result.is_supported→ True
    """

    class ProcessResult:
        __slots__ = (
            'original', 'script', 'bangla_text',
            'english_text', 'is_supported', 'detected_slang',
        )

        def __init__(self):
            self.original: str = ''
            self.script: str = 'unknown'          # 'bangla' | 'banglish' | 'english' | 'unknown'
            self.bangla_text: str = ''
            self.english_text: str = ''
            self.is_supported: bool = False
            self.detected_slang: list[str] = []

    # ------------------------------------------------------------------
    def process(self, text: str) -> 'BanglaProcessor.ProcessResult':
        res = self.ProcessResult()
        res.original = text

        if not text or not text.strip():
            return res

        # --- Detect script ---
        if _contains_bangla(text):
            res.script = 'bangla'
            res.is_supported = True
            res.bangla_text = _normalise_bangla_unicode(text)
            res.english_text = _bangla_to_english(res.bangla_text)
            res.detected_slang = self._find_slang(res.bangla_text, BANGLA_SLANG_TO_ENGLISH)
        elif _is_banglish(text):
            res.script = 'banglish'
            res.is_supported = True
            res.bangla_text = self._transliterate_to_bangla(text)
            res.english_text = _banglish_to_english(text)
            res.detected_slang = self._find_slang(text.lower(), BANGLISH_SLANG_TO_ENGLISH)
        else:
            # Pure English or other script – mark as supported (let caller decide)
            res.script = 'english'
            res.is_supported = True
            res.english_text = text
            res.bangla_text = text

        return res

    # ------------------------------------------------------------------
    def is_bangla_or_banglish(self, text: str) -> bool:
        """Return True if text is Bangla or Banglish (not pure English/unknown)."""
        return _contains_bangla(text) or _is_banglish(text)

    # ------------------------------------------------------------------
    def get_model_input(self, text: str) -> str:
        """
        Return the best string to feed into the English-trained ML models.
        For Bangla/Banglish it returns the translated English string.
        For English text it returns the original.
        """
        res = self.process(text)
        if res.script in ('bangla', 'banglish'):
            # Prefer the translated English; fall back to original if empty
            return res.english_text if res.english_text.strip() else text
        return text

    # ------------------------------------------------------------------
    def get_display_language(self, text: str) -> str:
        """Return 'bn' for Bangla/Banglish, 'en' for English, 'unknown' otherwise."""
        if _contains_bangla(text):
            return 'bn'
        if _is_banglish(text):
            return 'bn'  # treat Banglish as Bangla for language tag
        return 'en'

    # ------------------------------------------------------------------
    @staticmethod
    def _transliterate_to_bangla(text: str) -> str:
        """Convert Banglish words to Bangla Unicode where mappings exist."""
        lower = text.lower()
        # Longest-phrase match first
        for phrase in sorted(BANGLISH_TO_BANGLA, key=len, reverse=True):
            if phrase in lower:
                lower = lower.replace(phrase, BANGLISH_TO_BANGLA[phrase])
        return lower

    @staticmethod
    def _find_slang(text: str, slang_map: dict) -> list:
        found = []
        for phrase in slang_map:
            if phrase in text:
                found.append(phrase)
        return found

    # ------------------------------------------------------------------
    def get_context_hint(self, text: str) -> str:
        """
        Return a plain-English context hint about detected cultural/slang usage.
        Useful for display or for prompting LLMs.
        """
        res = self.process(text)
        hints = []
        if res.script == 'banglish':
            hints.append("Text is Banglish (Bangla written in Roman script).")
        elif res.script == 'bangla':
            hints.append("Text is written in Bangla (Unicode).")

        # Slang context hints
        positive_slang = {
            "কঠিন", "কঠিন হইসে", "কঠিন হয়েছে",
            "ফাটাফাটি", "জোস", "দারুণ", "অসাধারণ",
            "kothin", "kothin hoise", "kothin hoyeche",
            "fatafati", "joss", "darun", "oshadharon",
        }
        negative_slang = {
            "মন খারাপ", "কষ্ট লাগসে", "কান্না আসে",
            "mon kharap", "kosto lagse", "kanna ashe",
        }
        for slang in res.detected_slang:
            if slang in positive_slang:
                hints.append(
                    f"'{slang}' is a positive Bangla social-media expression meaning 'awesome/great'."
                )
            elif slang in negative_slang:
                hints.append(
                    f"'{slang}' is a Bangla expression expressing sadness or emotional pain."
                )

        return ' '.join(hints) if hints else ''
