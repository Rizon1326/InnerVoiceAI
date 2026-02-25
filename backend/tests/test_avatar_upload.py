"""
Test Suite: Avatar Upload Views
================================
Tests for POST /api/profile/avatar/ — file upload endpoint.

Run:
    python manage.py test tests.test_avatar_upload --verbosity=2
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from tests.conftest import create_test_user, get_auth_client
from io import BytesIO
from PIL import Image


def create_test_image(name='test.png', size=(100, 100), format='PNG'):
    """Create a small in-memory image for upload testing."""
    img = Image.new('RGB', size, color='red')
    buffer = BytesIO()
    img.save(buffer, format=format)
    buffer.seek(0)
    content_type = f'image/{format.lower()}'
    if format == 'JPEG':
        content_type = 'image/jpeg'
    return SimpleUploadedFile(
        name=name,
        content=buffer.read(),
        content_type=content_type,
    )


class AvatarUploadTests(TestCase):
    """Tests for POST /api/profile/avatar/"""

    def setUp(self):
        self.user, self.token = create_test_user()
        self.client = get_auth_client(self.token)
        self.url = '/api/profile/avatar/'

    def test_upload_unauthenticated(self):
        """Returns 401 without auth."""
        client = APIClient()
        response = client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_no_file(self):
        """Returns 400 when no avatar file is provided."""
        response = self.client.post(self.url, {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No avatar file', response.json()['error'])

    def test_upload_valid_png(self):
        """Uploads a valid PNG image successfully."""
        image = create_test_image('avatar.png', format='PNG')
        response = self.client.post(self.url, {'avatar': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()['success'])
        self.assertIn('avatar_url', response.json()['data'])

    def test_upload_valid_jpeg(self):
        """Uploads a valid JPEG image successfully."""
        image = create_test_image('avatar.jpg', format='JPEG')
        response = self.client.post(self.url, {'avatar': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_upload_invalid_file_type(self):
        """Returns 400 for unsupported file types."""
        fake_file = SimpleUploadedFile(
            name='avatar.txt',
            content=b'not an image',
            content_type='text/plain',
        )
        response = self.client.post(self.url, {'avatar': fake_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid file type', response.json()['error'])

    def test_upload_file_too_large(self):
        """Returns 400 for files exceeding 2MB."""
        # Create a large fake file (> 2MB)
        large_content = b'x' * (3 * 1024 * 1024)  # 3MB
        large_file = SimpleUploadedFile(
            name='large.png',
            content=large_content,
            content_type='image/png',
        )
        response = self.client.post(self.url, {'avatar': large_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('2 MB', response.json()['error'])

    def test_upload_replaces_previous_avatar(self):
        """Uploading a new avatar replaces the previous one."""
        img1 = create_test_image('first.png')
        self.client.post(self.url, {'avatar': img1}, format='multipart')

        img2 = create_test_image('second.png')
        response = self.client.post(self.url, {'avatar': img2}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
