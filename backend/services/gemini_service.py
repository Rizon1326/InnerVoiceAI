import google.generativeai as genai
from decouple import config
import json

class GeminiService:
    def __init__(self):
        api_key = config('GEMINI_API_KEY', default='')
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None
    
    def enhance_personality(self, text, base_scores, language='en'):
        if not self.model:
            return base_scores
        
        try:
            prompt = f"""
            Analyze this {language} text for Big Five personality:
            "{text}"
            
            Current scores: {base_scores}
            
            Provide refined OCEAN scores (0-100) in JSON:
            {{
                "openness": 75,
                "conscientiousness": 65,
                "extraversion": 80,
                "agreeableness": 70,
                "neuroticism": 40
            }}
            """
            
            response = self.model.generate_content(prompt)
            enhanced = json.loads(response.text.strip())
            
            # Validate and normalize
            for trait in base_scores:
                if trait in enhanced:
                    enhanced[trait] = max(0, min(100, enhanced[trait]))
                else:
                    enhanced[trait] = base_scores[trait]
            
            return enhanced
        except:
            return base_scores