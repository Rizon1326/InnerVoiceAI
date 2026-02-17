from rest_framework import serializers
from .models import Post, Analysis, EmotionalProgress, ProjectMetrics
from django.contrib.auth.models import User

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


class EmotionalProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmotionalProgress
        fields = [
            'id', 'date', 'avg_sentiment_score',
            'avg_emotion_joy', 'avg_emotion_sadness', 'avg_emotion_anger',
            'avg_emotion_fear', 'avg_emotion_surprise',
            'avg_personality_openness', 'avg_personality_conscientiousness',
            'avg_personality_extraversion', 'avg_personality_agreeableness',
            'avg_personality_neuroticism', 'posts_count', 'created_at'
        ]


class ProjectMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMetrics
        fields = [
            'id', 'total_posts_analyzed', 'total_rewrites_generated',
            'languages_used', 'avg_sentiment_improvement',
            'emotional_stability', 'personality_growth',
            'avg_rewrite_sentiment_change', 'avg_rewrite_positivity_increase',
            'days_active', 'average_posts_per_day', 'streak_days', 'last_updated'
        ]


class UserSerializer(serializers.ModelSerializer):
    posts_count = serializers.SerializerMethodField()
    metrics = ProjectMetricsSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'posts_count', 'metrics', 'date_joined']
    
    def get_posts_count(self, obj):
        return obj.posts.count()