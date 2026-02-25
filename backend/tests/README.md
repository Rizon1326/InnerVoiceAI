# InnerVoice AI — Backend Test Suite

## Overview

This test suite provides **comprehensive, industry-standard** test coverage for the InnerVoice AI backend. It covers **models, serializers, API endpoints (views), authentication, services, and integration scenarios**.

---

## Test Structure

```
tests/
├── __init__.py
├── README.md                        # This file
├── conftest.py                      # Shared fixtures and test utilities
├── test_models.py                   # Model creation, validation, constraints
├── test_serializers.py              # Serializer output format and correctness
├── test_auth_views.py               # Registration, login, logout, profile, export, delete
├── test_analysis_views.py           # /api/analyze/ endpoint – full analysis pipeline
├── test_rewrite_views.py            # /api/rewrite/ endpoint
├── test_history_views.py            # /api/history/ endpoint
├── test_progress_views.py           # /api/progress/ and /api/progress/trends/
├── test_metrics_views.py            # /api/metrics/ and /api/statistics/
├── test_behavioral_analytics.py     # /api/progress/behavioral-analytics/
├── test_services_language.py        # LanguageDetector service unit tests
├── test_services_sentiment.py       # SentimentAnalyzer service unit tests
├── test_services_emotion.py         # EmotionDetector service unit tests
├── test_services_personality.py     # PersonalityAnalyzer service unit tests
├── test_services_bangla.py          # BanglaProcessor service unit tests
├── test_services_progress.py        # ProgressTracker & MetricsCalculator unit tests
└── test_integration.py              # End-to-end integration tests
```

---

## Prerequisites

Make sure you have the project dependencies installed:

```bash
cd /home/bs00717/Desktop/SPL-3/InnerVoiceAI/backend
pip install -r requirements.txt
```

---

## How to Run Tests

### Run ALL tests

```bash
cd /home/bs00717/Desktop/SPL-3/InnerVoiceAI/backend
python manage.py test tests --verbosity=2
```

### Run a specific test module

```bash
# Models only
python manage.py test tests.test_models --verbosity=2

# Authentication views only
python manage.py test tests.test_auth_views --verbosity=2

# Analysis endpoint only
python manage.py test tests.test_analysis_views --verbosity=2

# All service unit tests
python manage.py test tests.test_services_language tests.test_services_sentiment tests.test_services_emotion tests.test_services_personality tests.test_services_bangla --verbosity=2

# Integration tests only
python manage.py test tests.test_integration --verbosity=2
```

### Run a specific test class or method

```bash
# Single class
python manage.py test tests.test_auth_views.RegisterUserTests --verbosity=2

# Single test method
python manage.py test tests.test_auth_views.RegisterUserTests.test_register_success --verbosity=2
```

### Run with detailed output (failfast on first error)

```bash
python manage.py test tests --verbosity=2 --failfast
```

### Run with parallel execution (faster on multi-core)

```bash
python manage.py test tests --parallel
```

---

## Test Categories

| Category          | Module(s)                              | Tests | Description                                        |
|-------------------|----------------------------------------|-------|----------------------------------------------------|
| **Models**        | `test_models.py`                       | 25+   | Model creation, defaults, constraints, relations   |
| **Serializers**   | `test_serializers.py`                  | 15+   | Output structure, nested fields, computed fields   |
| **Auth API**      | `test_auth_views.py`                   | 30+   | Register, login, logout, profile CRUD, export, delete |
| **Analysis API**  | `test_analysis_views.py`               | 15+   | Text analysis endpoint with mocked services        |
| **Rewrite API**   | `test_rewrite_views.py`                | 12+   | Rewrite endpoint with various goals                |
| **History API**   | `test_history_views.py`                | 8+    | Post history retrieval and pagination              |
| **Progress API**  | `test_progress_views.py`               | 10+   | Emotional progress and trend tracking              |
| **Metrics API**   | `test_metrics_views.py`                | 8+    | User metrics and public statistics                 |
| **Behavioral**    | `test_behavioral_analytics.py`         | 8+    | Behavioral analytics engine                        |
| **Services**      | `test_services_*.py`                   | 40+   | Language, sentiment, emotion, personality, Bangla  |
| **Integration**   | `test_integration.py`                  | 10+   | End-to-end workflows                               |

**Total: 180+ test cases**

---

## Environment Variables

Tests use Django's test database (auto-created SQLite in-memory). You still need a `.env` file with at minimum:

```env
SECRET_KEY=test-secret-key-for-testing
DEBUG=True
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3
```

The test runner creates a temporary database automatically, so no production data is affected.

---

## Mocking Strategy

- **External API calls** (Gemini, Hugging Face models) are mocked using `unittest.mock.patch` to ensure tests are:
  - **Fast** — no network calls
  - **Deterministic** — same results every run
  - **Offline-capable** — no API key required for testing

- **Heavy ML models** (sentiment, emotion) are mocked in API view tests but tested with real models in service-level tests (when available).

---

## Coverage Report (Optional)

To generate a coverage report, install `coverage`:

```bash
pip install coverage

# Run with coverage
coverage run manage.py test tests --verbosity=2

# Generate report
coverage report -m

# HTML report
coverage html
open htmlcov/index.html
```

---

## Conventions

- **Naming**: `test_<action>_<condition>` — e.g., `test_register_duplicate_username`
- **Arrange-Act-Assert (AAA)** pattern used consistently
- **Each test is independent** — no shared mutable state between tests
- **Fixtures** defined in `conftest.py` and reused via helper methods
- **HTTP status codes** explicitly asserted for every API test
- **Response structure** (`success`, `data`, `error`) validated in every API test
