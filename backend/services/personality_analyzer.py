import re
from collections import Counter

class PersonalityAnalyzer:
    """
    Analyzes text to infer personality traits using the OCEAN (Big Five) model.
    - O (Openness): Creative language, unique words, abstract concepts
    - C (Conscientiousness): Organized, planning language, specificity
    - E (Extraversion): Social words, enthusiasm, positive emotional language
    - A (Agreeableness): Cooperative, empathetic, helpful language
    - N (Neuroticism): Negative emotions, anxiety, complaints
    """
    
    # Trait indicators for each OCEAN dimension
    OPENNESS_INDICATORS = {
        'words': ['imagine', 'creative', 'novel', 'unique', 'interesting', 'curious', 
                  'explore', 'discover', 'different', 'art', 'philosophy', 'abstract',
                  'innovative', 'think', 'perhaps', 'maybe', 'could', 'would', 'possibility'],
        'patterns': [r'\bwhat\s+if\b', r'\bi\s+wonder\b', r'\bi\s+think\b'],
    }
    
    CONSCIENTIOUSNESS_INDICATORS = {
        'words': ['plan', 'organize', 'schedule', 'detail', 'specific', 'precise',
                  'responsible', 'careful', 'systematic', 'goal', 'accomplish',
                  'deadline', 'efficient', 'structure', 'should', 'must', 'required'],
        'patterns': [r'\bshould\s+have\b', r'\bmust\s+be\b'],
    }
    
    EXTRAVERSION_INDICATORS = {
        'words': ['party', 'social', 'meeting', 'chat', 'talk', 'friend', 'group',
                  'together', 'fun', 'exciting', 'energetic', 'outgoing', 'love',
                  'awesome', 'amazing', 'wonderful', 'great', 'fantastic'],
        'patterns': [r'!{2,}', r'\blove\s+to\b', r'\bcan\'t\s+wait\b'],
    }
    
    AGREEABLENESS_INDICATORS = {
        'words': ['help', 'support', 'understand', 'empathy', 'grateful', 'thank',
                  'cooperate', 'together', 'kind', 'friendly', 'apologize', 'sorry',
                  'agree', 'care', 'love', 'compassion', 'share', 'respect'],
        'patterns': [r'\bplease\b', r'\bthank\s+you\b'],
    }
    
    NEUROTICISM_INDICATORS = {
        'words': ['sad', 'angry', 'frustrated', 'anxious', 'worried', 'stressed',
                  'depressed', 'hate', 'terrible', 'awful', 'horrible', 'disaster',
                  'fail', 'lost', 'pain', 'suffer', 'angry', 'mad', 'upset'],
        'patterns': [r'!!!+', r'\bi\s+hate\b', r'\bwhy\s+me\b'],
    }
    
    def __init__(self):
        self.traits = {
            'openness': 0.0,
            'conscientiousness': 0.0,
            'extraversion': 0.0,
            'agreeableness': 0.0,
            'neuroticism': 0.0
        }
    
    def analyze(self, text, sentiment_score=0.5, emotions=None):
        """
        Analyze text and sentiment/emotions to determine personality traits.
        
        Args:
            text (str): The text to analyze
            sentiment_score (float): Sentiment score (0-1, where 1 is most positive)
            emotions (dict): Emotion scores {emotion_name: score}
        
        Returns:
            dict: OCEAN trait scores (0-1 for each trait)
        """
        if not text:
            return self._default_traits()
        
        text_lower = text.lower()
        
        # Calculate trait scores based on text indicators
        openness_score = self._score_openness(text_lower)
        conscientiousness_score = self._score_conscientiousness(text_lower)
        extraversion_score = self._score_extraversion(text_lower, sentiment_score, emotions)
        agreeableness_score = self._score_agreeableness(text_lower, sentiment_score)
        neuroticism_score = self._score_neuroticism(text_lower, sentiment_score, emotions)
        
        # Normalize scores
        scores = {
            'openness': min(1.0, max(0.0, openness_score)),
            'conscientiousness': min(1.0, max(0.0, conscientiousness_score)),
            'extraversion': min(1.0, max(0.0, extraversion_score)),
            'agreeableness': min(1.0, max(0.0, agreeableness_score)),
            'neuroticism': min(1.0, max(0.0, neuroticism_score))
        }
        
        return {
            'traits': scores,
            'dominant_trait': max(scores, key=scores.get),
            'trait_description': self._get_trait_description(scores)
        }
    
    def _score_openness(self, text):
        """Score openness based on creative and abstract language."""
        score = 0.0
        
        # Check for openness indicator words
        word_count = sum(1 for word in self.OPENNESS_INDICATORS['words'] 
                        if f' {word} ' in f' {text} ')
        score += word_count * 0.08
        
        # Check for patterns
        pattern_matches = sum(1 for pattern in self.OPENNESS_INDICATORS['patterns']
                            if re.search(pattern, text))
        score += pattern_matches * 0.1
        
        # Unique vocabulary (vocabulary diversity)
        words = text.split()
        if len(words) > 0:
            unique_ratio = len(set(words)) / len(words)
            score += unique_ratio * 0.3
        
        return score
    
    def _score_conscientiousness(self, text):
        """Score conscientiousness based on organized and specific language."""
        score = 0.0
        
        # Check for conscientiousness indicator words
        word_count = sum(1 for word in self.CONSCIENTIOUSNESS_INDICATORS['words']
                        if f' {word} ' in f' {text} ')
        score += word_count * 0.1
        
        # Check for patterns
        pattern_matches = sum(1 for pattern in self.CONSCIENTIOUSNESS_INDICATORS['patterns']
                            if re.search(pattern, text))
        score += pattern_matches * 0.1
        
        # Sentence structure (more periods = more organized)
        period_count = text.count('.')
        words = len(text.split())
        if words > 0:
            sentence_structure = min(0.3, period_count / (words / 10))
            score += sentence_structure
        
        return score
    
    def _score_extraversion(self, text, sentiment_score=0.5, emotions=None):
        """Score extraversion based on social and enthusiastic language."""
        score = 0.0
        
        # Check for extraversion indicator words
        word_count = sum(1 for word in self.EXTRAVERSION_INDICATORS['words']
                        if f' {word} ' in f' {text} ')
        score += word_count * 0.1
        
        # Check for patterns (exclamation marks, enthusiasm)
        pattern_matches = sum(1 for pattern in self.EXTRAVERSION_INDICATORS['patterns']
                            if re.search(pattern, text))
        score += pattern_matches * 0.15
        
        # Positive sentiment and emotions
        score += sentiment_score * 0.2
        
        if emotions:
            joy_score = emotions.get('joy', 0.0) if isinstance(emotions, dict) else 0.0
            score += joy_score * 0.2
        
        return score
    
    def _score_agreeableness(self, text, sentiment_score=0.5):
        """Score agreeableness based on cooperative and empathetic language."""
        score = 0.0
        
        # Check for agreeableness indicator words
        word_count = sum(1 for word in self.AGREEABLENESS_INDICATORS['words']
                        if f' {word} ' in f' {text} ')
        score += word_count * 0.1
        
        # Check for patterns
        pattern_matches = sum(1 for pattern in self.AGREEABLENESS_INDICATORS['patterns']
                            if re.search(pattern, text))
        score += pattern_matches * 0.1
        
        # Positive sentiment correlates with agreeableness
        score += sentiment_score * 0.3
        
        return score
    
    def _score_neuroticism(self, text, sentiment_score=0.5, emotions=None):
        """Score neuroticism based on negative emotions and anxiety language."""
        score = 0.0
        
        # Check for neuroticism indicator words
        word_count = sum(1 for word in self.NEUROTICISM_INDICATORS['words']
                        if f' {word} ' in f' {text} ')
        score += word_count * 0.1
        
        # Check for patterns
        pattern_matches = sum(1 for pattern in self.NEUROTICISM_INDICATORS['patterns']
                            if re.search(pattern, text))
        score += pattern_matches * 0.15
        
        # Inverse sentiment (negative sentiment = high neuroticism)
        score += (1.0 - sentiment_score) * 0.25
        
        if emotions:
            # Negative emotions correlate with neuroticism
            negative_emotions = emotions.get('sadness', 0.0) + emotions.get('anger', 0.0) + emotions.get('fear', 0.0)
            if isinstance(emotions, dict):
                score += negative_emotions * 0.2
        
        return score
    
    def _get_trait_description(self, traits):
        """Generate a human-readable description of the dominant trait."""
        descriptions = {
            'openness': 'Creative and imaginative thinker who values new experiences',
            'conscientiousness': 'Organized and goal-oriented individual with strong planning skills',
            'extraversion': 'Social and energetic person who enjoys interaction and stimulation',
            'agreeableness': 'Cooperative and empathetic individual who values harmony and compassion',
            'neuroticism': 'Sensitive to stress and emotions, prone to worry and anxiety'
        }
        
        dominant = max(traits, key=traits.get)
        return descriptions.get(dominant, 'Balanced personality')
    
    def _default_traits(self):
        """Return default/neutral trait scores."""
        return {
            'traits': {
                'openness': 0.5,
                'conscientiousness': 0.5,
                'extraversion': 0.5,
                'agreeableness': 0.5,
                'neuroticism': 0.5
            },
            'dominant_trait': 'balanced',
            'trait_description': 'Balanced personality'
        }
