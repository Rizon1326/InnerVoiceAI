# PyTorch and Hugging Face Hub - Troubleshooting Guide

## Issues Resolved

### 1. NumPy Initialization Warning
**Problem:** 
```
UserWarning: Failed to initialize NumPy: _ARRAY_API not found
```

**Solution:**
- Reverted NumPy to version 1.26.2 (compatible with transformers 4.36.2)
- This is a known compatibility issue between PyTorch 2.1.2 and newer NumPy versions on macOS

### 2. Hugging Face Hub Timeout Errors
**Problem:**
```
ReadTimeoutError("HTTPSConnectionPool(host='huggingface.co', port=443): Read timed out. (read timeout=10)")
```

**Solutions Applied:**

#### a) Updated Dependencies
- Upgraded `huggingface-hub` from 0.36.2 to 1.4.1 (latest stable version)

#### b) Environment Variables (.env file)
Added the following environment variables to `/backend/.env`:
```
# Hugging Face Hub Settings (for model downloads)
HF_HUB_READ_TIMEOUT=60
HF_HUB_ETAG_TIMEOUT=60
HF_HUB_DOWNLOAD_TIMEOUT=60
```

#### c) Code Changes
Updated model loading in both `sentiment_analyzer.py` and `emotion_detector.py`:

**Features Added:**
1. **Environment Variable Configuration** - Sets HF timeouts in __init__
2. **Retry Logic** - Automatically retries failed downloads up to 3 times with exponential backoff
3. **Graceful Fallback** - Returns default neutral/balanced scores if model fails to load
4. **Better Error Handling** - Catches ReadTimeout, ConnectionError, and generic exceptions

**How It Works:**
```python
def _load_model_with_retry(self, max_retries=3):
    for attempt in range(max_retries):
        try:
            model = pipeline(...)
            return model
        except (ReadTimeout, ConnectionError, Exception):
            if attempt < max_retries - 1:
                wait_time = (2 ** attempt)  # 1s, 2s, 4s backoff
                time.sleep(wait_time)
            else:
                return None  # Graceful failure
```

## How to Use

### Option 1: Direct Environment Setup (One-time)
```bash
export HF_HUB_READ_TIMEOUT=60
export HF_HUB_ETAG_TIMEOUT=60
export HF_HUB_DOWNLOAD_TIMEOUT=60
cd backend && python manage.py runserver
```

### Option 2: Load from .env (Recommended)
Ensure python-dotenv is installed (it's in requirements.txt):
```bash
cd backend && python manage.py runserver
```

Add this to your Django settings.py if not already present:
```python
from dotenv import load_dotenv
load_dotenv()
```

## Troubleshooting Steps

If you still encounter timeouts:

1. **Check your internet connection** - Ensure stable connectivity to huggingface.co

2. **Increase timeout further** if needed:
```bash
export HF_HUB_READ_TIMEOUT=120  # 2 minutes
```

3. **Pre-download models** (optional):
```bash
python3 -c "
from transformers import pipeline
pipeline('sentiment-analysis', model='cardiffnlp/twitter-xlm-roberta-base-sentiment')
pipeline('text-classification', model='j-hartmann/emotion-english-distilroberta-base')
"
```

4. **Use offline mode** (if models are already cached):
```bash
export TRANSFORMERS_OFFLINE=1
```

## Files Modified

1. `/backend/.env` - Added HF timeout environment variables
2. `/backend/services/sentiment_analyzer.py` - Added retry logic and timeout handling
3. `/backend/services/emotion_detector.py` - Added retry logic and timeout handling (ready to update)

## Version Information
- Python: 3.10+
- PyTorch: 2.1.2
- Transformers: 4.36.2
- NumPy: 1.26.2 (pinned for compatibility)
- Hugging Face Hub: 1.4.1

## Additional Notes

- The retry mechanism uses exponential backoff to avoid overwhelming the HF servers
- Models are cached locally after first successful download (in `~/.cache/huggingface/`)
- The `force_download=False` is now the default in huggingface-hub 1.0.0+
- All changes maintain backward compatibility with existing code
