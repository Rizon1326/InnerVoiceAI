from django.db import models
from django.contrib.auth.models import User
import uuid

class Post(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    text = models.TextField()
    language = models.CharField(max_length=10, default='en')
    # New behavioral analytics fields
    detected_language_type = models.CharField(max_length=20, default='english')  # bangla/banglish/mixed/english
    detected_tone = models.CharField(max_length=20, default='friendly')  # friendly/family/serious/humorous/sarcastic
    intent = models.CharField(max_length=40, default='informational')  # appreciation/emotional_expression/sharing_experience/etc.
    post_type = models.CharField(max_length=30, default='informational')  # expressive/informative/persuasive/reflective/conversational
    word_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'post_type']),
            models.Index(fields=['user', 'detected_language_type']),
        ]

class Analysis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.OneToOneField(Post, on_delete=models.CASCADE, related_name='analysis')
    
    # Sentiment
    sentiment_label = models.CharField(max_length=20)
    sentiment_score = models.FloatField()
    sentiment_positive = models.FloatField(default=0.0)
    sentiment_neutral = models.FloatField(default=0.0)
    sentiment_negative = models.FloatField(default=0.0)
    
    # Emotions
    emotion_joy = models.FloatField(default=0.0)
    emotion_sadness = models.FloatField(default=0.0)
    emotion_anger = models.FloatField(default=0.0)
    emotion_fear = models.FloatField(default=0.0)
    emotion_surprise = models.FloatField(default=0.0)
    emotion_neutral = models.FloatField(default=0.0)
    
    # Personality (filled in Phase 3)
    personality_openness = models.IntegerField(default=50)
    personality_conscientiousness = models.IntegerField(default=50)
    personality_extraversion = models.IntegerField(default=50)
    personality_agreeableness = models.IntegerField(default=50)
    personality_neuroticism = models.IntegerField(default=50)
    
    created_at = models.DateTimeField(auto_now_add=True)


class EmotionalProgress(models.Model):
    """Track daily/weekly emotional trends for each user"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='emotional_progress')
    date = models.DateField(auto_now=False)  # Daily snapshot
    
    # Daily averages
    avg_sentiment_score = models.FloatField(default=0.0)
    avg_emotion_joy = models.FloatField(default=0.0)
    avg_emotion_sadness = models.FloatField(default=0.0)
    avg_emotion_anger = models.FloatField(default=0.0)
    avg_emotion_fear = models.FloatField(default=0.0)
    avg_emotion_surprise = models.FloatField(default=0.0)
    
    # Personality averages
    avg_personality_openness = models.FloatField(default=0.0)
    avg_personality_conscientiousness = models.FloatField(default=0.0)
    avg_personality_extraversion = models.FloatField(default=0.0)
    avg_personality_agreeableness = models.FloatField(default=0.0)
    avg_personality_neuroticism = models.FloatField(default=0.0)
    
    # Count of posts analyzed that day
    posts_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
        unique_together = ('user', 'date')
        indexes = [
            models.Index(fields=['user', '-date']),
        ]


class ProjectMetrics(models.Model):
    """Evaluation metrics to measure project effectiveness"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='metrics')
    
    # Usage metrics
    total_posts_analyzed = models.IntegerField(default=0)
    total_rewrites_generated = models.IntegerField(default=0)
    languages_used = models.IntegerField(default=0)  # Count of unique languages
    
    # Effectiveness metrics
    avg_sentiment_improvement = models.FloatField(default=0.0)  # How much sentiment improved over time
    emotional_stability = models.FloatField(default=0.0)  # Lower = more stable
    personality_growth = models.FloatField(default=0.0)  # How much personality traits improved
    
    # Rewrite effectiveness
    avg_rewrite_sentiment_change = models.FloatField(default=0.0)
    avg_rewrite_positivity_increase = models.FloatField(default=0.0)
    
    # User engagement
    days_active = models.IntegerField(default=0)
    average_posts_per_day = models.FloatField(default=0.0)
    streak_days = models.IntegerField(default=0)  # Consecutive days with posts
    
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Project Metrics"


class RewriteRecord(models.Model):
    """Track every rewrite request for preference learning"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rewrite_records')
    post = models.ForeignKey(Post, on_delete=models.SET_NULL, null=True, blank=True, related_name='rewrites')
    original_text = models.TextField()
    rewritten_text = models.TextField(default='')
    goal = models.CharField(max_length=40, default='more_positive')  # rewrite goal used
    source_language = models.CharField(max_length=20, default='en')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'goal']),
        ]