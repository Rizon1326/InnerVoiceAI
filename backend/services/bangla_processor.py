"""
Bangla & Banglish Text Processor
---------------------------------
Handles:
  1. Unicode Bangla text normalisation
  2. Banglish (Bangla written in English/Roman script) → Bangla transliteration
  3. Context-aware social-media slang mapping (e.g. "kothin" → "very good")
  4. Language detection that accepts both Bangla and Banglish as supported
  5. English translation for downstream ML models (sentiment / emotion)
  6. **Banglish normalisation pipeline**: phonetic conversion, slang dictionary,
     spelling-variation handling, repeated-character reduction
  7. **Punctuation / emoji intensity scoring** for context signals
  8. **Multi-format language understanding**: Unicode Bangla, Banglish,
     mixed Bangla-English, informal social-media language
"""

import re
import unicodedata

# =====================================================================
#  BANGLISH NORMALISATION PIPELINE  (Requirement §2)
# =====================================================================

# 2a. Spelling-variation map  (common misspellings → canonical Banglish)
SPELLING_VARIATIONS: dict[str, str] = {
    # vowel swaps
    "valobashi": "valobashi", "bhalobashi": "valobashi",
    "bhalobasa": "valobasha", "valobasa": "valobasha",
    "vlo": "valo", "bhlo": "bhalo",
    "vlg": "valo lage", "bhlg": "bhalo lage",
    "onek sundor": "onek sundor", "onek shundor": "onek sundor",
    "onek sundr": "onek sundor", "onek shundr": "onek sundor",
    "osthadharon": "oshadharon", "ostadharon": "oshadharon",
    "ossadharon": "oshadharon", "osadaron": "oshadharon",
    "kotin": "kothin", "kothn": "kothin", "kothiin": "kothin",
    "fataafati": "fatafati", "phataaphati": "fatafati", "fataphati": "fatafati",
    "jakkash": "jhakkash", "jhakas": "jhakkash", "jhakkas": "jhakkash",
    "josss": "joss", "josh": "joss", "joshh": "joss",
    "darunn": "darun", "daroon": "darun", "daruun": "darun",
    "betha": "betha", "bytha": "betha", "byetha": "betha",
    "dukkho": "dukkho", "dukho": "dukkho", "dukhho": "dukkho",
    "raga": "raga", "raag": "raga", "raaga": "raga",
    "pagol": "pagol", "paagol": "pagol", "pagal": "pagol",
    "kosto": "kosto", "koshto": "kosto", "koshtu": "kosto",
    "shundor": "sundor", "shundr": "sundor", "shondor": "sundor",
    "khushi": "khushi", "kushi": "khushi", "khusi": "khushi",
    "ashche": "ashchi", "asche": "ashchi",
    "kharap": "kharap", "kharab": "kharap", "kharrap": "kharap",
    "osadharan": "oshadharon", "oshadaron": "oshadharon",
    # common typo merges
    "achha": "accha", "acha": "accha",
    "vai": "bhai", "bai": "bhai",
    "apa": "apu", "appu": "apu",
    "maaraf": "maaf", "maph": "maaf",
}

# 2b. Repeated-character reduction regex
#     e.g. "daruuuuun" → "darun",  "jossssss" → "joss"
_REPEATED_CHAR_RE = re.compile(r'(.)\1{2,}')

def _reduce_repeated_chars(text: str) -> str:
    """Collapse 3+ consecutive identical chars to 2 (preserves 'ss', 'tt', etc.)."""
    return _REPEATED_CHAR_RE.sub(r'\1\1', text)


def _normalise_banglish(text: str) -> str:
    """
    Full Banglish normalisation pipeline (Requirement §2):
      1. lower-case
      2. reduce repeated characters  (e.g. "kothinnn" → "kothinn" → matches)
      3. apply spelling-variation map
      4. (phonetic conversion handled by BANGLISH_TO_BANGLA below)
    """
    text = text.lower()
    text = _reduce_repeated_chars(text)
    words = text.split()
    normalised = []
    for w in words:
        clean = re.sub(r'[^\w]', '', w)
        normalised.append(SPELLING_VARIATIONS.get(clean, w))
    return ' '.join(normalised)


# =====================================================================
#  PUNCTUATION & EMOJI INTENSITY  (Requirement §3 – context signals)
# =====================================================================

# Common social-media emojis grouped by sentiment direction
_POSITIVE_EMOJI_RE = re.compile(
    r'[😀😁😂🤣😃😄😅😆😊😍🥰😘🤩🥳💪🔥❤️💕💖💯🎉🎊👏👍✨💥😻🙌💗💞🌟⭐🏆🫶🤗😎😇🥹]'
)
_NEGATIVE_EMOJI_RE = re.compile(
    r'[😢😭😞😔😟😩😫😖😣😤😠😡🤬💔😿😾🥺😰😥😓☹️🙁😶‍🌫️💀👎🤮🤢😵]'
)

def _count_exclamation(text: str) -> int:
    return text.count('!')

def _count_question(text: str) -> int:
    return text.count('?')

def _count_emoji_sentiment(text: str) -> dict:
    pos = len(_POSITIVE_EMOJI_RE.findall(text))
    neg = len(_NEGATIVE_EMOJI_RE.findall(text))
    return {'positive_emoji': pos, 'negative_emoji': neg, 'total_emoji': pos + neg}

def compute_punctuation_intensity(text: str) -> dict:
    """Return dict with exclamation, question, emoji counts – used as context signals."""
    return {
        'exclamations': _count_exclamation(text),
        'questions': _count_question(text),
        **_count_emoji_sentiment(text),
    }


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

    # Positive expressions – expanded
    "agun": "আগুন",          # social media: "fire / amazing"
    "marattok": "মারাত্মক",   # social media: "deadly = awesome"
    "jhakanaka": "ঝাকানাকা",
    "shandaar": "শানদার",
    "mojadar": "মজাদার",
    "opurbo": "অপূর্ব",
    "bhishon sundor": "ভীষণ সুন্দর",
    "khub sundor": "খুব সুন্দর",
    "aha ki sundor": "আহা কি সুন্দর",
    "oporup": "অপরূপ",
    "ati sundor": "অতি সুন্দর",
    "mind blowing": "মাইন্ড ব্লোয়িং",
    "hridoysparshi": "হৃদয়স্পর্শী",

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
    "bhalobasha nei": "ভালোবাসা নেই",
    "keu nei": "কেউ নেই",
    "shob shesh": "সব শেষ",
    "ar parina": "আর পারিনা",

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
    "chup kor": "চুপ কর",
    "beshi bolona": "বেশি বলোনা",
    "joto shob": "যতো সব",
    "matha kharap": "মাথা খারাপ",

    # Fear / surprise
    "bhoy lagse": "ভয় লাগসে",
    "bhoy lagche": "ভয় লাগছে",
    "boro bhoy": "বড় ভয়",
    "shocked hoise": "শক্ড হইসে",
    "shocked lagse": "শক্ড লাগসে",
    "obbhoshot": "অভূতপূর্ব",
    "obak": "অবাক",
    "akta shocking": "একটা শকিং",
    "ki holo": "কি হলো",
    "sorbonash": "সর্বনাশ",

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
    "bhai": "ভাই",
    "apu": "আপু",
    "accha": "আচ্ছা",
    "re": "রে",
    "nah": "না",
    "hmm": "হুমম",
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
    # Expanded positive
    "আগুন": "fire amazing incredible awesome",   # social media: "fire = lit"
    "মারাত্মক": "deadly awesome amazing incredible",  # social media: "lethal = great"
    "ঝাকানাকা": "dazzling amazing wonderful",
    "শানদার": "splendid magnificent",
    "মজাদার": "entertaining fun enjoyable",
    "অপূর্ব": "exquisite beautiful wonderful",
    "ভীষণ সুন্দর": "extremely beautiful gorgeous",
    "খুব সুন্দর": "very beautiful lovely",
    "আহা কি সুন্দর": "oh how beautiful gorgeous amazing",
    "অপরূপ": "stunning breathtaking beautiful",
    "অতি সুন্দর": "very beautiful lovely",
    "মাইন্ড ব্লোয়িং": "mind blowing incredible",
    "হৃদয়স্পর্শী": "heartwarming touching moving",
    "বড় ভালো": "very good great",

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
    "চুপ কর": "shut up be quiet angry",
    "বেশি বলোনা": "stop talking annoyed",
    "যতো সব": "all this nonsense frustrated",
    "মাথা খারাপ": "crazy insane angry",

    # Fear / surprise
    "ভয় লাগসে": "feeling scared afraid",
    "ভয় লাগছে": "feeling scared afraid",
    "বড় ভয়": "very scared frightened",
    "শক্ড হইসে": "shocked surprised",
    "অবাক": "surprised astonished",
    "অভূতপূর্ব": "unprecedented amazing shocking",
    "কি হলো": "what happened shocked",
    "সর্বনাশ": "disaster ruined oh no",

    # Neutral / misc
    "ধন্যবাদ": "thank you grateful",
    "ভালো আছি": "doing well good",
    "কেমন আছো": "how are you",
    "কেমন আছেন": "how are you",

    # Expanded negative
    "ভালোবাসা নেই": "no love unloved lonely",
    "কেউ নেই": "nobody is here alone lonely",
    "সব শেষ": "everything is over hopeless finished",
    "আর পারিনা": "cannot take it anymore exhausted overwhelmed",
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
    # Expanded positive
    "agun": "fire amazing incredible lit awesome",
    "marattok": "deadly awesome amazing incredible praise",
    "jhakanaka": "dazzling amazing wonderful",
    "shandaar": "splendid magnificent",
    "mojadar": "entertaining fun enjoyable",
    "opurbo": "exquisite beautiful wonderful",
    "bhishon sundor": "extremely beautiful gorgeous",
    "khub sundor": "very beautiful lovely",
    "aha ki sundor": "oh how beautiful gorgeous amazing",
    "oporup": "stunning breathtaking",
    "ati sundor": "very beautiful lovely",
    "mind blowing": "mind blowing incredible",
    "hridoysparshi": "heartwarming touching moving",
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
    # Expanded
    "bhalobasha nei": "no love unloved lonely",
    "keu nei": "nobody is here alone lonely",
    "shob shesh": "everything is over hopeless finished",
    "ar parina": "cannot take it anymore exhausted overwhelmed",
    "chup kor": "shut up be quiet angry",
    "beshi bolona": "stop talking annoyed",
    "joto shob": "all this nonsense frustrated",
    "matha kharap": "crazy insane angry",
    "ki holo": "what happened shocked",
    "sorbonash": "disaster ruined oh no",
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
    Also applies the normalisation pipeline before checking.
    """
    if _contains_bangla(text):
        return False
    lower = _normalise_banglish(text)
    # Check if any known Banglish phrase is in the text
    for key in BANGLISH_TO_BANGLA:
        if key in lower:
            return True
    # Also check the spelling-variation-normalised form
    for key in BANGLISH_SLANG_TO_ENGLISH:
        if key in lower:
            return True
    # Phoneme heuristic: common Bangla romanisation digraphs
    bangla_digraphs = [
        r'\bkh', r'\bbh', r'\bgh', r'\bch', r'\bsh', r'\bth',
        r'hoise\b', r'lagse\b', r'lagche\b', r'achhi\b', r'achi\b',
        r'korchi\b', r'jacchi\b', r'ashchi\b', r'hoyeche\b',
        r'\bvalo\b', r'\bbhalo\b', r'\bamar\b', r'\btomar\b',
        r'\bkothin\b', r'\bdarun\b', r'\bjoss\b',
    ]
    if any(re.search(p, lower) for p in bangla_digraphs):
        return True
    return False


def _banglish_to_english(text: str) -> str:
    """
    Translate Banglish text to English using the slang→English map first,
    then falling back to word-level transliteration description.
    Applies the Banglish normalisation pipeline first.
    """
    lower = _normalise_banglish(text)

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
    # result.script        → 'banglish'
    # result.bangla_text   → 'কঠিন হইসে ভাই!'
    # result.english_text  → 'turned out amazing awesome bhai!'
    # result.is_supported  → True
    # result.normalised_text → 'kothin hoise bhai!'
    # result.punctuation_intensity → {'exclamations': 1, ...}
    """

    class ProcessResult:
        __slots__ = (
            'original', 'script', 'bangla_text',
            'english_text', 'is_supported', 'detected_slang',
            'normalised_text', 'punctuation_intensity',
        )

        def __init__(self):
            self.original: str = ''
            self.script: str = 'unknown'          # 'bangla' | 'banglish' | 'mixed' | 'english' | 'unknown'
            self.bangla_text: str = ''
            self.english_text: str = ''
            self.is_supported: bool = False
            self.detected_slang: list[str] = []
            self.normalised_text: str = ''
            self.punctuation_intensity: dict = {}

    # ------------------------------------------------------------------
    def process(self, text: str) -> 'BanglaProcessor.ProcessResult':
        res = self.ProcessResult()
        res.original = text
        res.punctuation_intensity = compute_punctuation_intensity(text)

        if not text or not text.strip():
            return res

        # --- Detect script ---
        has_bangla = _contains_bangla(text)
        has_latin = bool(re.search(r'[a-zA-Z]', text))

        if has_bangla and has_latin:
            # Mixed Bangla-English text
            res.script = 'mixed'
            res.is_supported = True
            res.bangla_text = _normalise_bangla_unicode(text)
            res.normalised_text = res.bangla_text
            res.english_text = _bangla_to_english(res.bangla_text)
            res.detected_slang = self._find_slang(res.bangla_text, BANGLA_SLANG_TO_ENGLISH)
        elif has_bangla:
            res.script = 'bangla'
            res.is_supported = True
            res.bangla_text = _normalise_bangla_unicode(text)
            res.normalised_text = res.bangla_text
            res.english_text = _bangla_to_english(res.bangla_text)
            res.detected_slang = self._find_slang(res.bangla_text, BANGLA_SLANG_TO_ENGLISH)
        elif _is_banglish(text):
            res.script = 'banglish'
            res.is_supported = True
            normalised = _normalise_banglish(text)
            res.normalised_text = normalised
            res.bangla_text = self._transliterate_to_bangla(normalised)
            res.english_text = _banglish_to_english(normalised)
            res.detected_slang = self._find_slang(normalised, BANGLISH_SLANG_TO_ENGLISH)
        else:
            # Pure English or other script – mark as supported (let caller decide)
            res.script = 'english'
            res.is_supported = True
            res.normalised_text = text
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
        Covers indirect praise, exaggeration, irony, and expressive slang
        patterns common in Bangla social media (Requirement §5).
        """
        res = self.process(text)
        hints = []
        if res.script == 'banglish':
            hints.append("Text is Banglish (Bangla written in Roman script).")
        elif res.script == 'bangla':
            hints.append("Text is written in Bangla (Unicode).")
        elif res.script == 'mixed':
            hints.append("Text is mixed Bangla-English.")

        # Slang context hints
        positive_slang = {
            "কঠিন", "কঠিন হইসে", "কঠিন হয়েছে",
            "ফাটাফাটি", "জোস", "দারুণ", "অসাধারণ",
            "আগুন", "মারাত্মক", "ঝাকানাকা", "শানদার",
            "অপূর্ব", "অপরূপ", "হৃদয়স্পর্শী",
            "kothin", "kothin hoise", "kothin hoyeche",
            "fatafati", "joss", "darun", "oshadharon",
            "agun", "marattok", "jhakanaka", "shandaar",
            "opurbo", "oporup", "hridoysparshi",
        }
        negative_slang = {
            "মন খারাপ", "কষ্ট লাগসে", "কান্না আসে",
            "ভালোবাসা নেই", "কেউ নেই", "সব শেষ", "আর পারিনা",
            "mon kharap", "kosto lagse", "kanna ashe",
            "bhalobasha nei", "keu nei", "shob shesh", "ar parina",
        }
        anger_slang = {
            "রাগ লাগসে", "পাগল বানাইছে", "মাথা খারাপ", "চুপ কর",
            "raga lagse", "pagol banaiche", "matha kharap", "chup kor",
        }
        surprise_slang = {
            "অবাক", "শক্ড হইসে", "সর্বনাশ", "কি হলো",
            "obak", "shocked hoise", "sorbonash", "ki holo",
        }

        # Cultural context annotations
        indirect_praise_words = {"কঠিন", "আগুন", "মারাত্মক", "kothin", "agun", "marattok"}
        exaggeration_words = {"ফাটাফাটি", "fatafati", "অসাধারণ", "oshadharon", "ঝাকানাকা", "jhakanaka"}

        for slang in res.detected_slang:
            if slang in indirect_praise_words:
                hints.append(
                    f"'{slang}' is indirect Bangla praise — literal meaning is negative/intense "
                    f"but in social media context it means 'awesome/amazing' (cultural exaggeration)."
                )
            elif slang in exaggeration_words:
                hints.append(
                    f"'{slang}' is Bangla social-media exaggeration expressing strong positive enthusiasm."
                )
            elif slang in positive_slang:
                hints.append(
                    f"'{slang}' is a positive Bangla social-media expression meaning 'awesome/great'."
                )
            elif slang in anger_slang:
                hints.append(
                    f"'{slang}' is a Bangla expression of anger or frustration."
                )
            elif slang in surprise_slang:
                hints.append(
                    f"'{slang}' is a Bangla expression of surprise or shock."
                )
            elif slang in negative_slang:
                hints.append(
                    f"'{slang}' is a Bangla expression expressing sadness or emotional pain."
                )

        # Punctuation intensity hints
        pi = res.punctuation_intensity
        if pi.get('exclamations', 0) >= 3:
            hints.append("Heavy exclamation marks suggest strong emotional intensity.")
        if pi.get('positive_emoji', 0) >= 2:
            hints.append("Multiple positive emojis reinforce positive sentiment.")
        if pi.get('negative_emoji', 0) >= 2:
            hints.append("Multiple negative emojis reinforce negative sentiment.")

        return ' '.join(hints) if hints else ''
