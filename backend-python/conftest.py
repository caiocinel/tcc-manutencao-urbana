import uuid

import pytest
from rest_framework.test import APIClient


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def user_creds():
    uid = str(uuid.uuid4())[:8]
    return {
        'email': f'test-{uid}@example.com',
        'nome': f'Test User {uid}',
        'password': 'Test@123456',
    }


@pytest.fixture
def auth_client(client, user_creds):
    from django.urls import reverse
    data = {**user_creds, 'confirm_password': user_creds['password']}
    resp = client.post(reverse('auth-register'), data, format='json')
    assert resp.status_code == 201
    token = resp.data['access']
    new_client = APIClient()
    new_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return new_client


@pytest.fixture
def admin_client(auth_client, user_creds):
    from users.models import User
    user = User.objects.get(email=user_creds['email'])
    user.admin = 1
    user.save(update_fields=['admin'])
    return auth_client
