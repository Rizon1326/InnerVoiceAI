from rest_framework import serializers
from .models import Post, Analysis

class AnalysisSerializer(serializers.ModelSerializer):
    sentiment = serializers.SerializerMethodField()
    emotions = serializers.SerializerMethodField()
    personality = serializers.SerializerMethodField()
    
    class Meta:
        model = Analysis
        fields = ['id', 'sentiment', 'emotions', 'personality', 'created_at']
    
    def get_sentiment(self, obj):
        return {
            'label': obj.sentiment_label,
            'score': obj.sentiment_score,
            'scores': {
                'positive': obj.sentiment_positive,
                'neutral': obj.sentiment_neutral,
                'negative': obj.sentiment_negative,
            }
        }
    
    def get_emotions(self, obj):
        return {
            'joy': obj.emotion_joy,
            'sadness': obj.emotion_sadness,
            'anger': obj.emotion_anger,
            'fear': obj.emotion_fear,
            'surprise': obj.emotion_surprise,
            'neutral': obj.emotion_neutral,
        }
    
    def get_personality(self, obj):
        return {
            'openness': obj.personality_openness,
            'conscientiousness': obj.personality_conscientiousness,
            'extraversion': obj.personality_extraversion,
            'agreeableness': obj.personality_agreeableness,
            'neuroticism': obj.personality_neuroticism,
        }

class PostSerializer(serializers.ModelSerializer):
    analysis = AnalysisSerializer(read_only=True)
    
    class Meta:
        model = Post
        fields = ['id', 'text', 'language', 'created_at', 'analysis']