import google.generativeai as genai
from decouple import config
import json
import re

class TextRewriter:
    def __init__(self):
        api_key = config('GEMINI_API_KEY', default='')
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None
    
    def rewrite(self, text, analysis_data, language='en'):
        if not self.model:
            return self._get_fallback_response(text)
        
        try:
            sentiment = analysis_data['sentiment']
            personality = analysis_data['personality']
            
            prompt = f"""
            Rewrite this {language} text to improve emotional tone and personality scores:
            
            Original: "{text}"
            
            Current scores:
            - Sentiment: {sentiment['label']} ({sentiment['score']:.2f})
            - Neuroticism: {personality['neuroticism']}
            - Agreeableness: {personality['agreeableness']}
            
            Provide:
            1. Rewritten version (more positive, empathetic, balanced)
            2. Problematic words/phrases to highlight in RED
            3. Reason for each highlight
            4. Score improvements
            
            Respond in JSON:
            {{
                "rewritten": "improved text here",
                "highlighted_words": [
                    {{"word": "hate", "reason": "Negative emotion", "position": [0, 4]}},
                    {{"word": "stupid", "reason": "Harsh language", "position": [15, 21]}}
                ],
                "improvements": {{
                    "sentiment": "+0.15",
                    "neuroticism": "-20",
                    "agreeableness": "+15"
                }}
            }}
            """
            
            response = self.model.generate_content(prompt)
            result = json.loads(response.text.strip())
            
            return {
                'original': text,
                'rewritten': result.get('rewritten', text),
                'highlighted_words': result.get('highlighted_words', []),
                'improvements': result.get('improvements', {}),
                'success': True
            }
            
        except Exception as e:
            return self._get_fallback_response(text, str(e))
    
    def _get_fallback_response(self, text, error=''):
        # Simple rule-based rewriting
        rewritten = text.replace('hate', 'dislike')
        rewritten = rewritten.replace('stupid', 'unclear')
        rewritten = rewritten.replace('terrible', 'challenging')
        
        return {
            'original': text,
            'rewritten': rewritten,
            'highlighted_words': [],
            'improvements': {},
            'success': False,
            'error': error
        }