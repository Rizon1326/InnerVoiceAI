import google.generativeai as genai
from decouple import config
import json
import re

class TextRewriter:
    # Goal-specific instructions for rewriting
    GOAL_INSTRUCTIONS = {
        'custom': {
            'instruction': 'Rewrite the text based on the user\'s custom instruction provided below. Follow their intent precisely.',
            'focus': 'user-defined transformation'
        },
        'increase_openness': {
            'instruction': 'Make the text more creative, open-minded, and imaginative. Use more expressive language and explore multiple perspectives.',
            'focus': 'creativity and open-mindedness'
        },
        'decrease_openness': {
            'instruction': 'Make the text more focused, conventional, and direct. Use straightforward language and stick to the main point.',
            'focus': 'focus and clarity'
        },
        'reduce_aggression': {
            'instruction': 'Soften aggressive, confrontational, or harsh language. Replace strong negative words with diplomatic alternatives.',
            'focus': 'diplomatic and peaceful tone'
        },
        'reduce_sadness': {
            'instruction': 'Transform melancholic, sad, or depressing tone to hopeful and optimistic. Replace sad expressions with uplifting alternatives.',
            'focus': 'hopeful and uplifting tone'
        },
        'more_positive': {
            'instruction': 'Increase overall positivity and optimism. Replace negative expressions with positive alternatives while maintaining the core message.',
            'focus': 'positivity and optimism'
        },
        'more_professional': {
            'instruction': 'Polish the text for business or formal contexts. Use professional vocabulary, proper structure, and formal tone.',
            'focus': 'professional and formal tone'
        }
    }

    # Negative words database with alternatives for different goals
    NEGATIVE_WORDS_DB = {
        'hate': {
            'alternatives': ['dislike', 'am not fond of', 'prefer not to', 'find challenging'],
            'category': 'aggression',
            'reason': 'Strong negative emotion'
        },
        'stupid': {
            'alternatives': ['unclear', 'confusing', 'needs improvement', 'could be better'],
            'category': 'aggression',
            'reason': 'Harsh judgment'
        },
        'terrible': {
            'alternatives': ['challenging', 'difficult', 'needs attention', 'could improve'],
            'category': 'negativity',
            'reason': 'Extreme negative adjective'
        },
        'awful': {
            'alternatives': ['disappointing', 'not ideal', 'less than expected', 'needs work'],
            'category': 'negativity',
            'reason': 'Extreme negative adjective'
        },
        'horrible': {
            'alternatives': ['difficult', 'unfortunate', 'problematic', 'concerning'],
            'category': 'negativity',
            'reason': 'Extreme negative adjective'
        },
        'angry': {
            'alternatives': ['frustrated', 'concerned', 'disappointed', 'upset'],
            'category': 'aggression',
            'reason': 'Aggressive emotion'
        },
        'furious': {
            'alternatives': ['very frustrated', 'strongly disappointed', 'deeply concerned'],
            'category': 'aggression',
            'reason': 'Intense aggressive emotion'
        },
        'sad': {
            'alternatives': ['reflective', 'thoughtful', 'contemplating', 'processing'],
            'category': 'sadness',
            'reason': 'Sad emotion'
        },
        'depressed': {
            'alternatives': ['going through a tough time', 'feeling low', 'in a reflective mood'],
            'category': 'sadness',
            'reason': 'Strong sad emotion'
        },
        'hopeless': {
            'alternatives': ['facing challenges', 'working through difficulties', 'seeking solutions'],
            'category': 'sadness',
            'reason': 'Extreme sad emotion'
        },
        'miserable': {
            'alternatives': ['uncomfortable', 'not at my best', 'facing difficulties'],
            'category': 'sadness',
            'reason': 'Strong negative state'
        },
        'scared': {
            'alternatives': ['cautious', 'careful', 'mindful', 'aware'],
            'category': 'fear',
            'reason': 'Fear emotion'
        },
        'terrified': {
            'alternatives': ['very concerned', 'highly cautious', 'extremely mindful'],
            'category': 'fear',
            'reason': 'Intense fear emotion'
        },
        'worried': {
            'alternatives': ['thoughtful about', 'considering', 'paying attention to'],
            'category': 'fear',
            'reason': 'Anxious emotion'
        },
        'anxious': {
            'alternatives': ['eager', 'anticipating', 'thoughtful', 'mindful'],
            'category': 'fear',
            'reason': 'Anxiety emotion'
        },
        'failed': {
            'alternatives': ['learned from', 'experienced setbacks with', 'encountered challenges in'],
            'category': 'negativity',
            'reason': 'Negative outcome'
        },
        'useless': {
            'alternatives': ['not yet effective', 'needs refinement', 'has potential'],
            'category': 'aggression',
            'reason': 'Harsh dismissal'
        },
        'pathetic': {
            'alternatives': ['disappointing', 'underwhelming', 'needs improvement'],
            'category': 'aggression',
            'reason': 'Harsh judgment'
        },
        'ridiculous': {
            'alternatives': ['unusual', 'unexpected', 'unconventional', 'surprising'],
            'category': 'aggression',
            'reason': 'Dismissive language'
        },
        'annoyed': {
            'alternatives': ['concerned', 'noting', 'aware of', 'recognizing'],
            'category': 'aggression',
            'reason': 'Mild aggression'
        },
        'frustrated': {
            'alternatives': ['working through', 'addressing', 'managing', 'handling'],
            'category': 'aggression',
            'reason': 'Stress emotion'
        },
        'never': {
            'alternatives': ['rarely', 'seldom', 'not often', 'in few cases'],
            'category': 'negativity',
            'reason': 'Absolute negative'
        },
        'always': {
            'alternatives': ['often', 'usually', 'frequently', 'in most cases'],
            'category': 'exaggeration',
            'reason': 'Absolute statement'
        },
        'impossible': {
            'alternatives': ['challenging', 'difficult', 'requires effort', 'takes time'],
            'category': 'negativity',
            'reason': 'Limiting belief'
        },
        'worst': {
            'alternatives': ['most challenging', 'most difficult', 'hardest'],
            'category': 'negativity',
            'reason': 'Extreme negative superlative'
        },
        'bad': {
            'alternatives': ['not ideal', 'challenging', 'needs attention', 'suboptimal'],
            'category': 'negativity',
            'reason': 'Negative adjective'
        },
        'wrong': {
            'alternatives': ['different', 'not aligned', 'needing adjustment', 'alternative'],
            'category': 'negativity',
            'reason': 'Negative judgment'
        },
        'problem': {
            'alternatives': ['challenge', 'opportunity', 'situation', 'matter'],
            'category': 'negativity',
            'reason': 'Negative framing'
        },
        'cant': {
            'alternatives': ['am working on', 'am learning to', 'am developing'],
            'category': 'negativity',
            'reason': 'Limiting statement'
        },
        "can't": {
            'alternatives': ['am working on', 'am learning to', 'am developing'],
            'category': 'negativity',
            'reason': 'Limiting statement'
        },
        'cannot': {
            'alternatives': ['am working on', 'am learning to', 'am developing'],
            'category': 'negativity',
            'reason': 'Limiting statement'
        }
    }

    def __init__(self):
        api_key = config('GEMINI_API_KEY', default='')
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None
    
    def detect_negative_words(self, text):
        """Detect negative, awkward, or inappropriate words in text with alternatives"""
        detected = []
        text_lower = text.lower()
        
        for word, info in self.NEGATIVE_WORDS_DB.items():
            # Use word boundary regex to find whole words
            pattern = r'\b' + re.escape(word) + r'\b'
            matches = list(re.finditer(pattern, text_lower, re.IGNORECASE))
            
            for match in matches:
                detected.append({
                    'word': text[match.start():match.end()],  # Preserve original case
                    'start': match.start(),
                    'end': match.end(),
                    'reason': info['reason'],
                    'category': info['category'],
                    'alternatives': info['alternatives']
                })
        
        # Sort by position
        detected.sort(key=lambda x: x['start'])
        return detected
    
    def rewrite(self, text, analysis_data, language='en', goal='more_positive', custom_instruction=''):
        """Rewrite text based on the specified improvement goal and optional custom instruction"""
        
        # Detect negative words first
        detected_words = self.detect_negative_words(text)
        
        if not self.model:
            return self._get_fallback_response(text, goal, detected_words)
        
        try:
            sentiment = analysis_data.get('sentiment', {'label': 'neutral', 'score': 0.5})
            personality = analysis_data.get('personality', {'neuroticism': 50, 'agreeableness': 50})
            
            # Get goal-specific instructions
            goal_info = self.GOAL_INSTRUCTIONS.get(goal, self.GOAL_INSTRUCTIONS['more_positive'])
            
            # Build custom instruction block if provided
            custom_instruction_block = ''
            if custom_instruction:
                if goal == 'custom':
                    custom_instruction_block = f"""
            
            PRIMARY USER INSTRUCTION (this is the main goal — follow it precisely):
            "{custom_instruction}"
            The user may write instructions in English, Bangla, or Banglish (romanized Bangla).
            Understand and apply their intent regardless of the language they used.
            """
                else:
                    custom_instruction_block = f"""
            
            ADDITIONAL USER INSTRUCTION (apply this on top of the goal):
            "{custom_instruction}"
            The user may write instructions in English, Bangla, or Banglish (romanized Bangla).
            Understand and apply their intent regardless of the language they used.
            """
            
            prompt = f"""
            You are an expert text rewriter. Rewrite this {language} text with the following specific goal:
            
            GOAL: {goal_info['instruction']}
            FOCUS: {goal_info['focus']}
            {custom_instruction_block}
            
            Original text: "{text}"
            
            Current analysis:
            - Sentiment: {sentiment.get('label', 'neutral')} (score: {sentiment.get('score', 0.5):.2f})
            - Neuroticism level: {personality.get('neuroticism', 50)}%
            - Agreeableness level: {personality.get('agreeableness', 50)}%
            
            IMPORTANT RULES:
            1. The rewritten text MUST be DIFFERENT from the original
            2. Apply the goal transformation clearly and noticeably
            3. Maintain the core meaning while changing the tone/style
            4. Keep the same language ({language})
            5. Identify problematic words that should be highlighted
            6. Provide alternative suggestions for each problematic word
            
            Respond ONLY with valid JSON (no markdown, no explanation):
            {{
                "rewritten": "The completely rewritten text here",
                "highlighted_words": [
                    {{"word": "problematic_word", "reason": "Why it's flagged", "alternatives": ["better1", "better2", "better3"]}}
                ],
                "improvements": [
                    "Specific improvement made 1",
                    "Specific improvement made 2"
                ],
                "changes_summary": "Brief summary of what was changed"
            }}
            """
            
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean up response (remove markdown code blocks if present)
            if response_text.startswith('```'):
                response_text = re.sub(r'^```json?\s*', '', response_text)
                response_text = re.sub(r'\s*```$', '', response_text)
            
            result = json.loads(response_text)
            
            # Merge detected words with AI-generated highlighted words
            all_highlighted = detected_words.copy()
            ai_highlighted = result.get('highlighted_words', [])
            
            # Add AI-detected words that aren't already in our list
            existing_words = {w['word'].lower() for w in all_highlighted}
            for ai_word in ai_highlighted:
                if ai_word.get('word', '').lower() not in existing_words:
                    all_highlighted.append({
                        'word': ai_word.get('word', ''),
                        'reason': ai_word.get('reason', 'Flagged for review'),
                        'alternatives': ai_word.get('alternatives', []),
                        'category': 'ai_detected'
                    })
            
            return {
                'original': text,
                'rewritten': result.get('rewritten', text),
                'highlighted_words': all_highlighted,
                'improvements': result.get('improvements', []),
                'changes_summary': result.get('changes_summary', ''),
                'goal_applied': goal,
                'success': True
            }
            
        except json.JSONDecodeError as e:
            return self._get_fallback_response(text, goal, detected_words, f'JSON parse error: {str(e)}')
        except Exception as e:
            return self._get_fallback_response(text, goal, detected_words, str(e))
    
    def _get_fallback_response(self, text, goal='more_positive', detected_words=None, error=''):
        """Rule-based fallback when Gemini API fails"""
        if detected_words is None:
            detected_words = self.detect_negative_words(text)
        
        # Apply goal-specific transformations
        rewritten = text
        improvements = []
        
        goal_info = self.GOAL_INSTRUCTIONS.get(goal, self.GOAL_INSTRUCTIONS['more_positive'])
        
        # Apply word replacements based on detected words
        for word_info in detected_words:
            original_word = word_info['word']
            if word_info['alternatives']:
                # Choose first alternative
                replacement = word_info['alternatives'][0]
                # Preserve case
                if original_word.isupper():
                    replacement = replacement.upper()
                elif original_word[0].isupper():
                    replacement = replacement.capitalize()
                
                rewritten = re.sub(
                    r'\b' + re.escape(original_word) + r'\b',
                    replacement,
                    rewritten,
                    count=1,
                    flags=re.IGNORECASE
                )
                improvements.append(f'Replaced "{original_word}" with "{replacement}"')
        
        # Goal-specific additional transformations
        if goal == 'more_positive' or goal == 'reduce_sadness':
            # Add encouraging phrases if text is short
            if len(rewritten) < 100 and not rewritten.endswith(('!', '.')):
                rewritten += '.'
        elif goal == 'more_professional':
            # Capitalize first letter and ensure proper punctuation
            if rewritten:
                rewritten = rewritten[0].upper() + rewritten[1:]
                if not rewritten.endswith(('.', '!', '?')):
                    rewritten += '.'
        
        return {
            'original': text,
            'rewritten': rewritten,
            'highlighted_words': detected_words,
            'improvements': improvements if improvements else ['Applied tone adjustments'],
            'changes_summary': f'Applied {goal_info["focus"]} transformations',
            'goal_applied': goal,
            'success': False,
            'error': error or 'Using fallback rewriting (Gemini API unavailable)'
        }