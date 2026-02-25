"""
Test Suite: Authentication Views
=================================
Tests for registration, login, logout, profile CRUD, data export,
and account deletion endpoints.

Run:
    python manage.py test tests.test_auth_views --verbosity=2
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from api.models import UserProfile, ProjectMetrics, Post, RewriteRecord
from tests.conftest import create_test_user, get_auth_client, create_test_post


# ====================================================================
#  REGISTRATION
# ====================================================================

class RegisterUserTests(TestCase):
    """Tests for POST /api/auth/register/"""

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/register/'

    def test_register_success(self):
        """Valid registration returns 201 with token."""
        response = self.client.post(self.url, {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'StrongPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('token', data['data'])
        self.assertEqual(data['data']['username'], 'newuser')

    def test_register_creates_profile_and_metrics(self):
        """Registration creates UserProfile and ProjectMetrics."""
        self.client.post(self.url, {
            'username': 'profileuser',
            'email': 'profile@example.com',
            'password': 'StrongPass123!'
        })
        user = User.objects.get(username='profileuser')
        self.assertTrue(UserProfile.objects.filter(user=user).exists())
        self.assertTrue(ProjectMetrics.objects.filter(user=user).exists())

    def test_register_missing_username(self):
        """Registration without username returns 400."""
        response = self.client.post(self.url, {
            'email': 'test@example.com',
            'password': 'StrongPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.json()['success'])

    def test_register_missing_email(self):
        """Registration without email returns 400."""
        response = self.client.post(self.url, {
            'username': 'testuser',
            'password': 'StrongPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_password(self):
        """Registration without password returns 400."""
        response = self.client.post(self.url, {
            'username': 'testuser',
            'email': 'test@example.com',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_empty_fields(self):
        """Registration with empty strings returns 400."""
        response = self.client.post(self.url, {
            'username': '',
            'email': '',
            'password': ''
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_username(self):
        """Registration with existing username returns 400."""
        create_test_user(username='existing')
        response = self.client.post(self.url, {
            'username': 'existing',
            'email': 'new@example.com',
            'password': 'StrongPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Username already exists', response.json()['error'])

    def test_register_duplicate_email(self):
        """Registration with existing email returns 400."""
        create_test_user(email='taken@example.com')
        response = self.client.post(self.url, {
            'username': 'newuser',
            'email': 'taken@example.com',
            'password': 'StrongPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Email already exists', response.json()['error'])


# ====================================================================
#  LOGIN
# ====================================================================

class LoginUserTests(TestCase):
    """Tests for POST /api/auth/login/"""

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/login/'
        self.user, self.token = create_test_user()

    def test_login_success(self):
        """Valid credentials return 200 with token."""
        response = self.client.post(self.url, {
            'username': 'testuser',
            'password': 'TestPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('token', data['data'])
        self.assertEqual(data['data']['username'], 'testuser')

    def test_login_wrong_password(self):
        """Wrong password returns 401."""
        response = self.client.post(self.url, {
            'username': 'testuser',
            'password': 'WrongPass!'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.json()['success'])

    def test_login_nonexistent_user(self):
        """Non-existent username returns 401."""
        response = self.client.post(self.url, {
            'username': 'ghost',
            'password': 'TestPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_fields(self):
        """Login without username/password returns 400."""
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_empty_username(self):
        """Login with empty username returns 400."""
        response = self.client.post(self.url, {
            'username': '',
            'password': 'TestPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ====================================================================
#  LOGOUT
# ====================================================================

class LogoutUserTests(TestCase):
    """Tests for POST /api/auth/logout/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/auth/logout/'

    def test_logout_success(self):
        """Authenticated logout deletes token and returns 200."""
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['success'])
        # Token should be deleted
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_logout_without_auth(self):
        """Unauthenticated logout returns 401."""
        client = APIClient()
        response = client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_invalidates_token(self):
        """After logout, using the same token returns 401."""
        self.client.post(self.url)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ====================================================================
#  PROFILE
# ====================================================================

class ProfileTests(TestCase):
    """Tests for GET/PUT /api/profile/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/profile/'

    def test_get_profile_success(self):
        """GET returns user profile with username, email, posts_count."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()['data']
        self.assertEqual(data['username'], 'testuser')
        self.assertEqual(data['email'], 'test@example.com')

    def test_update_username(self):
        """PUT updates username successfully."""
        response = self.client.put(self.url, {
            'username': 'updateduser'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'updateduser')

    def test_update_email(self):
        """PUT updates email successfully."""
        response = self.client.put(self.url, {
            'email': 'updated@example.com'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'updated@example.com')

    def test_update_duplicate_username(self):
        """PUT with taken username returns 400."""
        create_test_user(username='other', email='other@example.com')
        response = self.client.put(self.url, {
            'username': 'other'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_duplicate_email(self):
        """PUT with taken email returns 400."""
        create_test_user(username='other', email='other@example.com')
        response = self.client.put(self.url, {
            'email': 'other@example.com'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_unauthenticated(self):
        """GET profile without auth returns 401."""
        client = APIClient()
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ====================================================================
#  EXPORT USER DATA
# ====================================================================

class ExportUserDataTests(TestCase):
    """Tests for GET /api/profile/export/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/profile/export/'

    def test_export_empty_user(self):
        """Export for user with no data returns empty lists."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()['data']
        self.assertEqual(len(data['posts']), 0)
        self.assertEqual(len(data['rewrites']), 0)

    def test_export_with_posts(self):
        """Export includes posts with analysis data."""
        from tests.conftest import create_test_analysis
        post = create_test_post(self.user)
        create_test_analysis(post)
        response = self.client.get(self.url)
        data = response.json()['data']
        self.assertEqual(len(data['posts']), 1)
        self.assertIsNotNone(data['posts'][0]['analysis'])

    def test_export_includes_user_info(self):
        """Export contains user id, username, email."""
        response = self.client.get(self.url)
        user_data = response.json()['data']['user']
        self.assertEqual(user_data['username'], 'testuser')
        self.assertEqual(user_data['email'], 'test@example.com')

    def test_export_unauthenticated(self):
        """Export without auth returns 401."""
        client = APIClient()
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ====================================================================
#  DELETE ACCOUNT
# ====================================================================

class DeleteAccountTests(TestCase):
    """Tests for DELETE /api/profile/delete/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/profile/delete/'

    def test_delete_account_success(self):
        """Correct password deletes account and all data."""
        create_test_post(self.user)
        response = self.client.delete(self.url, {
            'password': 'TestPass123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['success'])
        self.assertFalse(User.objects.filter(username='testuser').exists())

    def test_delete_account_wrong_password(self):
        """Wrong password returns 403 and account persists."""
        response = self.client.delete(self.url, {
            'password': 'WrongPass!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(username='testuser').exists())

    def test_delete_account_missing_password(self):
        """Missing password returns 400."""
        response = self.client.delete(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_cascades_posts(self):
        """Deleting account removes all user's posts."""
        create_test_post(self.user)
        self.assertEqual(Post.objects.filter(user=self.user).count(), 1)
        self.client.delete(self.url, {
            'password': 'TestPass123!'
        }, format='json')
        self.assertEqual(Post.objects.count(), 0)

    def test_delete_unauthenticated(self):
        """Delete without auth returns 401."""
        client = APIClient()
        response = client.delete(self.url, {
            'password': 'TestPass123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
