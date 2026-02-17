"""
Service for tracking emotional progress and calculating project effectiveness metrics
"""
from datetime import datetime, timedelta
from django.db.models import Avg, Count, Q
from api.models import Post, Analysis, EmotionalProgress, ProjectMetrics
from django.contrib.auth.models import User


class ProgressTracker:
    """Tracks user emotional progress over time"""
    
    @staticmethod
    def update_daily_progress(user):
        """
        Calculate and store daily emotional averages for a user.
        Should be called after each analysis.
        """
        today = datetime.now().date()
        
        # Get all posts analyzed today by this user
        today_posts = Post.objects.filter(
            user=user,
            created_at__date=today
        ).select_related('analysis')
        
        if not today_posts.exists():
            return None
        
        # Calculate averages
        analyses = [post.analysis for post in today_posts if hasattr(post, 'analysis')]
        
        if not analyses:
            return None
        
        avg_sentiment = sum(a.sentiment_score for a in analyses) / len(analyses)
        avg_joy = sum(a.emotion_joy for a in analyses) / len(analyses)
        avg_sadness = sum(a.emotion_sadness for a in analyses) / len(analyses)
        avg_anger = sum(a.emotion_anger for a in analyses) / len(analyses)
        avg_fear = sum(a.emotion_fear for a in analyses) / len(analyses)
        avg_surprise = sum(a.emotion_surprise for a in analyses) / len(analyses)
        
        avg_openness = sum(a.personality_openness for a in analyses) / len(analyses)
        avg_conscientiousness = sum(a.personality_conscientiousness for a in analyses) / len(analyses)
        avg_extraversion = sum(a.personality_extraversion for a in analyses) / len(analyses)
        avg_agreeableness = sum(a.personality_agreeableness for a in analyses) / len(analyses)
        avg_neuroticism = sum(a.personality_neuroticism for a in analyses) / len(analyses)
        
        # Create or update progress record
        progress, created = EmotionalProgress.objects.update_or_create(
            user=user,
            date=today,
            defaults={
                'avg_sentiment_score': avg_sentiment,
                'avg_emotion_joy': avg_joy,
                'avg_emotion_sadness': avg_sadness,
                'avg_emotion_anger': avg_anger,
                'avg_emotion_fear': avg_fear,
                'avg_emotion_surprise': avg_surprise,
                'avg_personality_openness': avg_openness,
                'avg_personality_conscientiousness': avg_conscientiousness,
                'avg_personality_extraversion': avg_extraversion,
                'avg_personality_agreeableness': avg_agreeableness,
                'avg_personality_neuroticism': avg_neuroticism,
                'posts_count': len(analyses),
            }
        )
        
        return progress
    
    @staticmethod
    def get_user_progress(user, days=30):
        """Get emotional progress for user over last N days"""
        start_date = (datetime.now() - timedelta(days=days)).date()
        
        progress = EmotionalProgress.objects.filter(
            user=user,
            date__gte=start_date
        ).order_by('date')
        
        return progress
    
    @staticmethod
    def calculate_trend(user, metric_name='avg_sentiment_score', days=30):
        """
        Calculate trend for a metric over time.
        Returns: {'current': float, 'previous': float, 'trend': float, 'improvement': str}
        """
        progress = ProgressTracker.get_user_progress(user, days)
        
        if not progress.exists():
            return None
        
        progress_list = list(progress)
        
        if len(progress_list) < 2:
            return {
                'current': getattr(progress_list[0], metric_name),
                'previous': None,
                'trend': 0,
                'improvement': 'insufficient_data'
            }
        
        current = getattr(progress_list[-1], metric_name)
        previous = getattr(progress_list[0], metric_name)
        
        trend = current - previous
        
        # Determine improvement direction based on metric
        if metric_name in ['avg_sentiment_score', 'avg_emotion_joy', 'avg_personality_openness']:
            improvement = 'positive' if trend > 0 else 'negative' if trend < 0 else 'stable'
        elif metric_name in ['avg_emotion_sadness', 'avg_emotion_anger', 'avg_personality_neuroticism']:
            improvement = 'positive' if trend < 0 else 'negative' if trend > 0 else 'stable'
        else:
            improvement = 'stable'
        
        return {
            'current': current,
            'previous': previous,
            'trend': trend,
            'improvement': improvement
        }


class MetricsCalculator:
    """Calculate project effectiveness metrics"""
    
    @staticmethod
    def calculate_user_metrics(user):
        """Calculate comprehensive metrics for a user"""
        
        # Get all posts
        user_posts = Post.objects.filter(user=user)
        total_posts = user_posts.count()
        
        # Language diversity
        languages = user_posts.values('language').distinct().count()
        
        # Get all analyses
        analyses = Analysis.objects.filter(post__user=user)
        
        # Sentiment improvement
        if analyses.count() > 1:
            first_sentiment = analyses.earliest('created_at').sentiment_score
            last_sentiment = analyses.latest('created_at').sentiment_score
            avg_sentiment_improvement = (last_sentiment - first_sentiment) / abs(first_sentiment) * 100 if first_sentiment != 0 else 0
        else:
            avg_sentiment_improvement = 0
        
        # Emotional stability (standard deviation of daily sentiment)
        emotional_stability = MetricsCalculator._calculate_emotional_stability(user)
        
        # Personality growth (changes in Big Five over time)
        personality_growth = MetricsCalculator._calculate_personality_growth(user)
        
        # Days active
        days_active = user_posts.values('created_at__date').distinct().count()
        
        # Average posts per day
        avg_posts_per_day = total_posts / days_active if days_active > 0 else 0
        
        # Streak (consecutive days with posts)
        streak_days = MetricsCalculator._calculate_streak(user)
        
        # Create or update metrics
        metrics, created = ProjectMetrics.objects.update_or_create(
            user=user,
            defaults={
                'total_posts_analyzed': total_posts,
                'total_rewrites_generated': 0,  # Will be updated when rewrite feature works
                'languages_used': languages,
                'avg_sentiment_improvement': avg_sentiment_improvement,
                'emotional_stability': emotional_stability,
                'personality_growth': personality_growth,
                'days_active': days_active,
                'average_posts_per_day': avg_posts_per_day,
                'streak_days': streak_days,
            }
        )
        
        return metrics
    
    @staticmethod
    def _calculate_emotional_stability(user):
        """
        Lower value = more stable emotions
        Uses standard deviation of daily sentiment scores
        """
        daily_sentiments = EmotionalProgress.objects.filter(user=user)
        
        if not daily_sentiments.exists():
            return 0.0
        
        sentiments = list(daily_sentiments.values_list('avg_sentiment_score', flat=True))
        
        if len(sentiments) < 2:
            return 0.0
        
        mean = sum(sentiments) / len(sentiments)
        variance = sum((x - mean) ** 2 for x in sentiments) / len(sentiments)
        std_dev = variance ** 0.5
        
        # Normalize to 0-100 scale (0 = very stable, 100 = very unstable)
        stability = min(std_dev * 100, 100)
        
        return stability
    
    @staticmethod
    def _calculate_personality_growth(user):
        """
        Calculate how much personality traits have improved
        Openness, Extraversion, Agreeableness increase = positive
        Neuroticism decrease = positive
        """
        daily_progress = EmotionalProgress.objects.filter(user=user).order_by('date')
        
        if daily_progress.count() < 2:
            return 0.0
        
        first = daily_progress.first()
        last = daily_progress.last()
        
        # Positive traits (higher is better)
        positive_traits_change = (
            (last.avg_personality_openness - first.avg_personality_openness) +
            (last.avg_personality_extraversion - first.avg_personality_extraversion) +
            (last.avg_personality_agreeableness - first.avg_personality_agreeableness)
        ) / 3
        
        # Negative traits (lower is better)
        neuroticism_improvement = first.avg_personality_neuroticism - last.avg_personality_neuroticism
        
        growth = (positive_traits_change + neuroticism_improvement) / 2
        
        return growth
    
    @staticmethod
    def _calculate_streak(user):
        """Calculate current streak of consecutive days with posts"""
        daily_posts = Post.objects.filter(user=user).values('created_at__date').distinct().order_by('-created_at__date')
        
        if not daily_posts.exists():
            return 0
        
        streak = 0
        current_date = datetime.now().date()
        
        for post in daily_posts:
            post_date = post['created_at__date']
            
            if (current_date - post_date).days == streak:
                streak += 1
            else:
                break
        
        return streak
    
    @staticmethod
    def get_overall_project_stats():
        """Get overall statistics for the entire project"""
        total_users = User.objects.filter(posts__isnull=False).distinct().count()
        total_posts = Post.objects.count()
        total_analyses = Analysis.objects.count()
        
        # Average sentiment across all users
        avg_overall_sentiment = Analysis.objects.aggregate(
            avg=Avg('sentiment_score')
        )['avg'] or 0.0
        
        # Most common emotion
        emotions = {
            'joy': Analysis.objects.aggregate(avg=Avg('emotion_joy'))['avg'],
            'sadness': Analysis.objects.aggregate(avg=Avg('emotion_sadness'))['avg'],
            'anger': Analysis.objects.aggregate(avg=Avg('emotion_anger'))['avg'],
            'fear': Analysis.objects.aggregate(avg=Avg('emotion_fear'))['avg'],
            'surprise': Analysis.objects.aggregate(avg=Avg('emotion_surprise'))['avg'],
        }
        
        most_common_emotion = max(emotions, key=emotions.get)
        
        return {
            'total_active_users': total_users,
            'total_posts_analyzed': total_posts,
            'total_analyses': total_analyses,
            'average_sentiment': avg_overall_sentiment,
            'most_common_emotion': most_common_emotion,
            'emotion_distribution': emotions,
        }
