"""
User authentication and progress tracking views
"""
from rest_framework.decorators import api_view, authentication_classes, permission_classes, parser_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.http import JsonResponse
from api.models import Post, Analysis, EmotionalProgress, ProjectMetrics, UserProfile, RewriteRecord
from api.serializers import (
    PostSerializer, EmotionalProgressSerializer, 
    ProjectMetricsSerializer, UserSerializer
)
from services.progress_tracker import ProgressTracker, MetricsCalculator
from services.behavioral_analytics import BehavioralAnalyticsEngine
import json


# ============= AUTHENTICATION VIEWS =============

@api_view(['POST'])
def register_user(request):
    """Register a new user"""
    try:
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '').strip()
        
        if not all([username, email, password]):
            return Response({
                'success': False,
                'error': 'username, email, and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user exists
        if User.objects.filter(username=username).exists():
            return Response({
                'success': False,
                'error': 'Username already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({
                'success': False,
                'error': 'Email already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        # Create token
        token, created = Token.objects.get_or_create(user=user)
        
        # Create metrics and profile
        ProjectMetrics.objects.create(user=user)
        UserProfile.objects.create(user=user)
        
        return Response({
            'success': True,
            'message': 'User registered successfully',
            'data': {
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'token': token.key
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def login_user(request):
    """Login a user and return auth token"""
    try:
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()
        
        if not all([username, password]):
            return Response({
                'success': False,
                'error': 'username and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Authenticate
        user = authenticate(username=username, password=password)
        
        if not user:
            return Response({
                'success': False,
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get or create token
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'success': True,
            'message': 'Login successful',
            'data': {
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'token': token.key
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """Logout user by deleting token"""
    try:
        request.user.auth_token.delete()
        return Response({
            'success': True,
            'message': 'Logout successful'
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============= PROGRESS TRACKING VIEWS =============

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_user_progress(request):
    """Get emotional progress for authenticated user"""
    try:
        user = request.user
        days = int(request.query_params.get('days', 30))
        
        progress = ProgressTracker.get_user_progress(user, days)
        serializer = EmotionalProgressSerializer(progress, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_emotional_trends(request):
    """Get emotional trends and improvements"""
    try:
        user = request.user
        days = int(request.query_params.get('days', 30))
        
        metrics = {
            'sentiment_trend': ProgressTracker.calculate_trend(user, 'avg_sentiment_score', days),
            'joy_trend': ProgressTracker.calculate_trend(user, 'avg_emotion_joy', days),
            'sadness_trend': ProgressTracker.calculate_trend(user, 'avg_emotion_sadness', days),
            'anger_trend': ProgressTracker.calculate_trend(user, 'avg_emotion_anger', days),
            'neuroticism_trend': ProgressTracker.calculate_trend(user, 'avg_personality_neuroticism', days),
            'openness_trend': ProgressTracker.calculate_trend(user, 'avg_personality_openness', days),
        }
        
        return Response({
            'success': True,
            'data': metrics
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============= METRICS & EVALUATION VIEWS =============

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_user_metrics(request):
    """Get project effectiveness metrics for user"""
    try:
        user = request.user
        
        # Calculate fresh metrics
        metrics = MetricsCalculator.calculate_user_metrics(user)
        serializer = ProjectMetricsSerializer(metrics)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_project_statistics(request):
    """Get overall project statistics (no auth required for public dashboard)"""
    try:
        stats = MetricsCalculator.get_overall_project_stats()
        
        return Response({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """Get or update user profile"""
    try:
        user = request.user
        # Ensure profile exists
        UserProfile.objects.get_or_create(user=user)

        if request.method == 'PUT':
            username = request.data.get('username', '').strip()
            email = request.data.get('email', '').strip()

            if username and username != user.username:
                if User.objects.filter(username=username).exclude(pk=user.pk).exists():
                    return Response({
                        'success': False,
                        'error': 'Username already exists'
                    }, status=status.HTTP_400_BAD_REQUEST)
                user.username = username

            if email and email != user.email:
                if User.objects.filter(email=email).exclude(pk=user.pk).exists():
                    return Response({
                        'success': False,
                        'error': 'Email already exists'
                    }, status=status.HTTP_400_BAD_REQUEST)
                user.email = email

            user.save()

        serializer = UserSerializer(user, context={'request': request})
        
        return Response({
            'success': True,
            'data': serializer.data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============= HISTORY & RECORDS VIEWS =============

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_user_history(request):
    """Get all posts and analyses for authenticated user"""
    try:
        user = request.user
        limit = int(request.query_params.get('limit', 20))
        
        posts = Post.objects.filter(user=user)[:limit]
        serializer = PostSerializer(posts, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============= BEHAVIORAL ANALYTICS VIEWS =============

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_behavioral_analytics(request):
    """
    Compute and return full behavioral analytics for the authenticated user.
    Query params:
      - days: number of days to look back (default 30, max 365)
    """
    try:
        user = request.user
        days = min(int(request.query_params.get('days', 30)), 365)

        engine = BehavioralAnalyticsEngine(user, days=days)
        analytics = engine.compute()

        return Response({
            'success': True,
            'data': analytics,
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============= PROFILE AVATAR UPLOAD =============

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_avatar(request):
    """Upload or replace user avatar"""
    try:
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        avatar_file = request.FILES.get('avatar')
        if not avatar_file:
            return Response({
                'success': False,
                'error': 'No avatar file provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate file size (max 2 MB)
        if avatar_file.size > 2 * 1024 * 1024:
            return Response({
                'success': False,
                'error': 'File size exceeds 2 MB limit'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if avatar_file.content_type not in allowed_types:
            return Response({
                'success': False,
                'error': 'Invalid file type. Allowed: JPG, PNG, GIF, WebP'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Delete old avatar file if exists
        if profile.avatar:
            profile.avatar.delete(save=False)

        profile.avatar = avatar_file
        profile.save()

        avatar_url = request.build_absolute_uri(profile.avatar.url)

        return Response({
            'success': True,
            'message': 'Avatar uploaded successfully',
            'data': {'avatar_url': avatar_url}
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============= EXPORT USER DATA =============

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def export_user_data(request):
    """Export all user data as JSON"""
    try:
        user = request.user

        # Collect posts with analyses
        posts = Post.objects.filter(user=user).select_related('analysis')
        posts_data = []
        for post in posts:
            post_entry = {
                'id': str(post.id),
                'text': post.text,
                'language': post.language,
                'detected_language_type': post.detected_language_type,
                'detected_tone': post.detected_tone,
                'intent': post.intent,
                'post_type': post.post_type,
                'word_count': post.word_count,
                'created_at': post.created_at.isoformat(),
            }
            try:
                a = post.analysis
                post_entry['analysis'] = {
                    'sentiment_label': a.sentiment_label,
                    'sentiment_score': a.sentiment_score,
                    'emotions': {
                        'joy': a.emotion_joy,
                        'sadness': a.emotion_sadness,
                        'anger': a.emotion_anger,
                        'fear': a.emotion_fear,
                        'surprise': a.emotion_surprise,
                        'neutral': a.emotion_neutral,
                    },
                    'personality': {
                        'openness': a.personality_openness,
                        'conscientiousness': a.personality_conscientiousness,
                        'extraversion': a.personality_extraversion,
                        'agreeableness': a.personality_agreeableness,
                        'neuroticism': a.personality_neuroticism,
                    },
                }
            except Analysis.DoesNotExist:
                post_entry['analysis'] = None
            posts_data.append(post_entry)

        # Collect rewrites
        rewrites = RewriteRecord.objects.filter(user=user)
        rewrites_data = [
            {
                'id': str(r.id),
                'original_text': r.original_text,
                'rewritten_text': r.rewritten_text,
                'goal': r.goal,
                'source_language': r.source_language,
                'created_at': r.created_at.isoformat(),
            }
            for r in rewrites
        ]

        # Collect emotional progress
        progress = EmotionalProgress.objects.filter(user=user)
        progress_data = [
            {
                'date': str(p.date),
                'avg_sentiment_score': p.avg_sentiment_score,
                'posts_count': p.posts_count,
            }
            for p in progress
        ]

        export = {
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'date_joined': user.date_joined.isoformat(),
            },
            'posts': posts_data,
            'rewrites': rewrites_data,
            'emotional_progress': progress_data,
            'exported_at': __import__('django.utils.timezone', fromlist=['now']).now().isoformat(),
        }

        return Response({
            'success': True,
            'data': export
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============= DELETE ACCOUNT =============

@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """Permanently delete user account and all associated data"""
    try:
        user = request.user
        password = request.data.get('password', '').strip()

        if not password:
            return Response({
                'success': False,
                'error': 'Password is required to delete your account'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify password
        if not user.check_password(password):
            return Response({
                'success': False,
                'error': 'Incorrect password'
            }, status=status.HTTP_403_FORBIDDEN)

        # Delete avatar file if exists
        try:
            if hasattr(user, 'profile') and user.profile.avatar:
                user.profile.avatar.delete(save=False)
        except UserProfile.DoesNotExist:
            pass

        # Django CASCADE will delete: Posts, Analyses, EmotionalProgress,
        # ProjectMetrics, RewriteRecords, UserProfile, Token
        user.delete()

        return Response({
            'success': True,
            'message': 'Account deleted successfully'
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
