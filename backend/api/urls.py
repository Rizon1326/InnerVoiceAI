from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check),
    path('analyze/', views.analyze_text),
    path('rewrite/', views.rewrite_text),
    path('history/', views.get_history),
]
