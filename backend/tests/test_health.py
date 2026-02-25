"""
Test Suite: Health Check & General Views
==========================================
Tests for the health check endpoint.

Run:
    python manage.py test tests.test_health --verbosity=2
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class HealthCheckTests(TestCase):
    """Tests for GET /api/health/"""

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/health/'

    def test_health_check_returns_200(self):
        """Health check endpoint returns 200 OK."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_health_check_response_structure(self):
        """Health check returns success=True and message."""
        response = self.client.get(self.url)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['message'], 'API running')

    def test_health_check_no_auth_required(self):
        """Health check is publicly accessible without authentication."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
