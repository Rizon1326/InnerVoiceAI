from transformers import pipeline

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
            results = self.model(text[:512])[0]
            emotions = {e: 0.0 for e in self.EMOTIONS}
            
            for result in results:
                label = result['label'].lower()
                if label in emotions:
                    emotions[label] = result['score']
            
            # Normalize
            total = sum(emotions.values())
            if total > 0:
                emotions = {k: v/total for k, v in emotions.items()}
            
            return emotions
        except:
            return {e: 1.0/len(self.EMOTIONS) for e in self.EMOTIONS}