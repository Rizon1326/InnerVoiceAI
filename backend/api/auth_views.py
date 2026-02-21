"""
User authentication and progress tracking views
"""
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from api.models import Post, Analysis, EmotionalProgress, ProjectMetrics
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
        
        # Create metrics
        ProjectMetrics.objects.create(user=user)
        
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


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """Get user profile with all their data"""
    try:
        user = request.user
        serializer = UserSerializer(user)
        
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
