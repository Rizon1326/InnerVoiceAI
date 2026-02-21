from django.urls import path
from . import views, auth_views

urlpatterns = [
    # Health check
    path('health/', views.health_check),
    
    # Authentication
    path('auth/register/', auth_views.register_user),
    path('auth/login/', auth_views.login_user),
    path('auth/logout/', auth_views.logout_user),
    
    # Analysis endpoints (require authentication)
    path('analyze/', views.analyze_text),
    path('rewrite/', views.rewrite_text),
    path('history/', views.get_history),
    
    # Progress tracking (require authentication)
    path('progress/', auth_views.get_user_progress),
    path('progress/trends/', auth_views.get_emotional_trends),
    path('progress/behavioral-analytics/', auth_views.get_behavioral_analytics),
    
    # Metrics and evaluation (require authentication)
    path('metrics/', auth_views.get_user_metrics),
    path('profile/', auth_views.get_user_profile),
    
    # Public statistics
    path('statistics/', auth_views.get_project_statistics),
]
