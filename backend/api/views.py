from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Post, Analysis, RewriteRecord
from .serializers import PostSerializer
from services.language_detector import LanguageDetector
from services.sentiment_analyzer import SentimentAnalyzer
from services.emotion_detector import EmotionDetector
from services.personality_analyzer import PersonalityAnalyzer
from services.gemini_service import GeminiService
from services.text_rewriter import TextRewriter
from services.progress_tracker import ProgressTracker
from services.bangla_processor import BanglaProcessor
from services.context_analyzer import ContextAnalyzer
from services.behavioral_analytics import classify_post_type


# Initialize services
sentiment_analyzer = SentimentAnalyzer()
emotion_detector = EmotionDetector()
language_detector = LanguageDetector()
personality_analyzer = PersonalityAnalyzer()
gemini_service = GeminiService()
text_rewriter = TextRewriter()
bangla_processor = BanglaProcessor()
context_analyzer = ContextAnalyzer(
    bangla_processor=bangla_processor,
    sentiment_analyzer=sentiment_analyzer,
    emotion_detector=emotion_detector,
)


@api_view(['GET'])
def health_check(request):
    return Response({'success': True, 'message': 'API running'})

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def analyze_text(request):
    try:
        user = request.user
        text = request.data.get('text', '').strip()
        
        if not text or len(text) < 3:
            return Response({
                'success': False,
                'error': 'Text too short'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # --- Full context-aware analysis (§1-§7) ---
        ctx = context_analyzer.analyze(text)

        # Detect language — Bangla (Unicode) and Banglish both resolve to 'bn'
        language = 'bn' if ctx['detected_language_type'] in ('bangla', 'banglish', 'mixed') else 'en'

        # Use context-aware sentiment & emotion from the analyzer
        sentiment = ctx['sentiment']
        emotions = ctx['emotion']['scores']
        
        # Analyze personality
        personality_result = personality_analyzer.analyze(
            text,
            sentiment['score'],
            emotions
        )
        personality = personality_result['traits']

        # Classify post type for behavioral analytics
        post_type = classify_post_type(text, ctx['intent'], ctx['detected_tone'])
        
        # Create records with user association
        post = Post.objects.create(
            user=user,
            text=text,
            language=language,
            detected_language_type=ctx['detected_language_type'],
            detected_tone=ctx['detected_tone'],
            intent=ctx['intent'],
            post_type=post_type,
            word_count=len(text.split()),
        )
        analysis = Analysis.objects.create(
            post=post,
            sentiment_label=sentiment['label'],
            sentiment_score=sentiment['score'],
            sentiment_positive=sentiment['scores']['positive'],
            sentiment_neutral=sentiment['scores']['neutral'],
            sentiment_negative=sentiment['scores']['negative'],
            emotion_joy=emotions['joy'],
            emotion_sadness=emotions['sadness'],
            emotion_anger=emotions['anger'],
            emotion_fear=emotions['fear'],
            emotion_surprise=emotions['surprise'],
            emotion_neutral=emotions['neutral'],
            personality_openness=int(personality['openness'] * 100),
            personality_conscientiousness=int(personality['conscientiousness'] * 100),
            personality_extraversion=int(personality['extraversion'] * 100),
            personality_agreeableness=int(personality['agreeableness'] * 100),
            personality_neuroticism=int(personality['neuroticism'] * 100),
        )
        
        # Update daily progress
        ProgressTracker.update_daily_progress(user)

        serializer = PostSerializer(post)

        # Build the structured output (Requirement §7)
        structured_analysis = {
            # Enhanced fields (new)
            'detected_language': ctx['detected_language'],
            'normalized_text': ctx['normalized_text'],
            'detected_tone': ctx['detected_tone'],
            'emotion_label': ctx['emotion_label'],
            'sentiment_score': ctx['sentiment_score'],
            'rewrite_suggestion': ctx['rewrite_suggestion'],

            # Existing fields
            'detected_language_type': ctx['detected_language_type'],
            'normalised_text': ctx['normalised_text'],
            'translated_text': ctx['translated_text'],
            'sentiment': ctx['sentiment'],
            'emotion': ctx['emotion'],
            'intent': ctx['intent'],
            'reasoning': ctx['reasoning'],
            'context_hint': ctx['context_hint'],
            'punctuation_intensity': ctx['punctuation_intensity'],
            'detected_slang': ctx['detected_slang'],
        }

        return Response({
            'success': True,
            'data': serializer.data,
            'context_analysis': structured_analysis,
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_history(request):
    user = request.user
    limit = int(request.query_params.get('limit', 20))
    
    posts = Post.objects.filter(user=user)[:limit]
    serializer = PostSerializer(posts, many=True)
    return Response({
        'success': True,
        'data': serializer.data
    })

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def rewrite_text(request):
    try:
        user = request.user
        text = request.data.get('text', '').strip()
        post_id = request.data.get('post_id')
        goal = request.data.get('goal', request.data.get('style', 'more_positive'))  # Accept both goal and style
        custom_instruction = request.data.get('custom_instruction', '').strip()
        
        if not text:
            return Response({
                'success': False,
                'error': 'Text required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get language and detect if needed
        language = language_detector.detect_language(text)
        
        # Get or create analysis
        if post_id:
            try:
                post = Post.objects.get(id=post_id, user=user)
                analysis = post.analysis
            except:
                return Response({
                    'success': False,
                    'error': 'Post not found'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            # Analyze first
            sentiment = sentiment_analyzer.analyze(text, language)
            emotions = emotion_detector.detect(text, language)
            personality_result = personality_analyzer.analyze(text, sentiment['score'], emotions)
            
            # Create post and analysis
            post = Post.objects.create(user=user, text=text, language=language)
            analysis = Analysis.objects.create(
                post=post,
                sentiment_label=sentiment['label'],
                sentiment_score=sentiment['score'],
                sentiment_positive=sentiment['scores']['positive'],
                sentiment_neutral=sentiment['scores']['neutral'],
                sentiment_negative=sentiment['scores']['negative'],
                emotion_joy=emotions['joy'],
                emotion_sadness=emotions['sadness'],
                emotion_anger=emotions['anger'],
                emotion_fear=emotions['fear'],
                emotion_surprise=emotions['surprise'],
                emotion_neutral=emotions['neutral'],
                personality_openness=int(personality_result['traits']['openness'] * 100),
                personality_conscientiousness=int(personality_result['traits']['conscientiousness'] * 100),
                personality_extraversion=int(personality_result['traits']['extraversion'] * 100),
                personality_agreeableness=int(personality_result['traits']['agreeableness'] * 100),
                personality_neuroticism=int(personality_result['traits']['neuroticism'] * 100),
            )
        
        # Rewrite text using TextRewriter with goal
        result = text_rewriter.rewrite(text, {
            'sentiment': {
                'label': analysis.sentiment_label,
                'score': analysis.sentiment_score
            },
            'personality': {
                'neuroticism': analysis.personality_neuroticism,
                'agreeableness': analysis.personality_agreeableness
            }
        }, language, goal, custom_instruction=custom_instruction)

        # Track rewrite for behavioral analytics
        RewriteRecord.objects.create(
            user=user,
            post=post,
            original_text=text,
            rewritten_text=result.get('rewritten_text', result.get('text', '')),
            goal=goal,
            source_language=language,
        )
        
        return Response({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)