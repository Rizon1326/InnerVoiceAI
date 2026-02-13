from django.db import models
import uuid

class Post(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    language = models.CharField(max_length=10, default='en')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']

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