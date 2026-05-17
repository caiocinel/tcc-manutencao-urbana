import uuid

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db(transaction=True)


class TestHealth:
    def test_health_check(self, client):
        resp = client.get(reverse('health-check'))
        assert resp.status_code == 200
        assert 'message' in resp.data


class TestRegister:
    URL = 'auth-register'

    def test_success(self, client, user_creds):
        data = {**user_creds, 'confirm_password': user_creds['password']}
        resp = client.post(reverse(self.URL), data, format='json')
        assert resp.status_code == 201
        assert 'access' in resp.data
        assert 'refresh' in resp.data
        assert resp.data['user']['email'] == user_creds['email']
        assert resp.data['user']['nome'] == user_creds['nome']
        assert 'senha' not in resp.data['user']

    def test_missing_fields(self, client):
        resp = client.post(reverse(self.URL), {}, format='json')
        assert resp.status_code == 400

    def test_password_mismatch(self, client, user_creds):
        data = {**user_creds, 'confirm_password': 'different'}
        resp = client.post(reverse(self.URL), data, format='json')
        assert resp.status_code == 400

    def test_duplicate_email(self, client, user_creds):
        data = {**user_creds, 'confirm_password': user_creds['password']}
        resp1 = client.post(reverse(self.URL), data, format='json')
        assert resp1.status_code == 201
        resp2 = client.post(reverse(self.URL), data, format='json')
        assert resp2.status_code == 400


class TestLogin:

    LOGIN_URL = 'auth-login'

    def test_success(self, client, user_creds):
        reg_data = {**user_creds, 'confirm_password': user_creds['password']}
        client.post(reverse('auth-register'), reg_data, format='json')

        resp = client.post(reverse(self.LOGIN_URL), {
            'email': user_creds['email'],
            'password': user_creds['password'],
        }, format='json')
        assert resp.status_code == 200
        assert 'access' in resp.data
        assert 'refresh' in resp.data

    def test_invalid_password(self, client, user_creds):
        reg_data = {**user_creds, 'confirm_password': user_creds['password']}
        client.post(reverse('auth-register'), reg_data, format='json')

        resp = client.post(reverse(self.LOGIN_URL), {
            'email': user_creds['email'],
            'password': 'wrong',
        }, format='json')
        assert resp.status_code == 401

    def test_nonexistent_user(self, client):
        resp = client.post(reverse(self.LOGIN_URL), {
            'email': 'nobody@example.com',
            'password': 'anything',
        }, format='json')
        assert resp.status_code == 401

    def test_register_then_login_then_refresh(self, client, user_creds):
        reg_data = {**user_creds, 'confirm_password': user_creds['password']}
        reg_resp = client.post(reverse('auth-register'), reg_data, format='json')
        assert reg_resp.status_code == 201
        orig_refresh = reg_resp.data['refresh']

        login_resp = client.post(reverse('auth-login'), {
            'email': user_creds['email'],
            'password': user_creds['password'],
        }, format='json')
        assert login_resp.status_code == 200

        refresh_resp = client.post(reverse('auth-refresh'), {
            'refresh': orig_refresh,
        }, format='json')
        assert refresh_resp.status_code == 200
        assert 'access' in refresh_resp.data


class TestProfile:

    URL = 'auth-profile'

    def test_get(self, auth_client):
        resp = auth_client.get(reverse(self.URL))
        assert resp.status_code == 200
        assert 'email' in resp.data
        assert 'nome' in resp.data
        assert 'id' in resp.data

    def test_update(self, auth_client):
        resp = auth_client.patch(reverse(self.URL), {'nome': 'Updated Name'}, format='json')
        assert resp.status_code == 200
        assert resp.data['nome'] == 'Updated Name'

    def test_unauthenticated(self, client):
        resp = client.get(reverse(self.URL))
        assert resp.status_code == 401


class TestChangePassword:

    URL = 'auth-change-password'

    def test_success(self, auth_client, user_creds):
        resp = auth_client.patch(reverse(self.URL), {
            'senha_atual': user_creds['password'],
            'nova_senha': 'NewPass123!',
        }, format='json')
        assert resp.status_code == 200
        assert 'message' in resp.data

    def test_wrong_current_password(self, auth_client):
        resp = auth_client.patch(reverse(self.URL), {
            'senha_atual': 'wrongpass',
            'nova_senha': 'NewPass123!',
        }, format='json')
        assert resp.status_code == 400

    def test_missing_fields(self, auth_client):
        resp = auth_client.patch(reverse(self.URL), {}, format='json')
        assert resp.status_code == 400

    def test_short_password(self, auth_client, user_creds):
        resp = auth_client.patch(reverse(self.URL), {
            'senha_atual': user_creds['password'],
            'nova_senha': '12345',
        }, format='json')
        assert resp.status_code == 400

    def test_unauthenticated(self, client):
        resp = client.patch(reverse(self.URL), {}, format='json')
        assert resp.status_code == 401

    def test_login_with_new_password(self, client, user_creds):
        reg_data = {**user_creds, 'confirm_password': user_creds['password']}
        reg_resp = client.post(reverse('auth-register'), reg_data, format='json')
        assert reg_resp.status_code == 201
        token = reg_resp.data['access']
        api_client = client.__class__()
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        api_client.patch(reverse(self.URL), {
            'senha_atual': user_creds['password'],
            'nova_senha': 'NewPass123!',
        }, format='json')

        login_resp = client.post(reverse('auth-login'), {
            'email': user_creds['email'],
            'password': 'NewPass123!',
        }, format='json')
        assert login_resp.status_code == 200

        old_pass_resp = client.post(reverse('auth-login'), {
            'email': user_creds['email'],
            'password': user_creds['password'],
        }, format='json')
        assert old_pass_resp.status_code == 401


class TestVerifyEmail:

    URL = 'auth-verify-email'

    def test_success(self, auth_client, user_creds):
        from users.models import User
        user = User.objects.get(email=user_creds['email'])
        resp = auth_client.post(reverse(self.URL), {'codigo': user.codigo_2fa}, format='json')
        assert resp.status_code == 200

    def test_wrong_code(self, auth_client):
        resp = auth_client.post(reverse(self.URL), {'codigo': '000000'}, format='json')
        assert resp.status_code == 400

    def test_missing_code(self, auth_client):
        resp = auth_client.post(reverse(self.URL), {}, format='json')
        assert resp.status_code == 400

    def test_unauthenticated(self, client):
        resp = client.post(reverse(self.URL), {'codigo': '123456'}, format='json')
        assert resp.status_code == 401

    def test_already_verified(self, auth_client, user_creds):
        from users.models import User
        user = User.objects.get(email=user_creds['email'])
        auth_client.post(reverse(self.URL), {'codigo': user.codigo_2fa}, format='json')
        resp = auth_client.post(reverse(self.URL), {'codigo': '000000'}, format='json')
        assert resp.status_code == 200


class TestResendCode:

    URL = 'auth-resend-code'

    def test_resend(self, auth_client):
        resp = auth_client.post(reverse(self.URL), {}, format='json')
        assert resp.status_code == 200
        assert 'message' in resp.data

    def test_unauthenticated(self, client):
        resp = client.post(reverse(self.URL), {}, format='json')
        assert resp.status_code == 401


class TestUpdateMunicipio:

    URL = 'auth-update-municipio'

    def test_missing_municipio_id(self, auth_client):
        resp = auth_client.patch(reverse(self.URL), {}, format='json')
        assert resp.status_code == 400

    def test_nonexistent_municipio(self, auth_client):
        resp = auth_client.patch(reverse(self.URL), {'municipio_id': '999'}, format='json')
        assert resp.status_code == 404

    def test_unauthenticated(self, client):
        resp = client.patch(reverse(self.URL), {'municipio_id': '1'}, format='json')
        assert resp.status_code == 401

    def test_success_with_real_municipio(self, auth_client):
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute('SELECT codigo::text FROM municipios LIMIT 1')
            row = cursor.fetchone()
        if not row:
            pytest.skip('No municipios in database')
        resp = auth_client.patch(reverse(self.URL), {'municipio_id': row[0]}, format='json')
        assert resp.status_code == 200
        assert resp.data['municipio']['codigo'] == row[0]


class TestAdminUsers:

    URL = 'auth-admin-users'

    def test_non_admin_forbidden(self, auth_client):
        resp = auth_client.get(reverse(self.URL))
        assert resp.status_code == 403

    def test_admin_list(self, admin_client):
        resp = admin_client.get(reverse(self.URL))
        assert resp.status_code == 200
        assert isinstance(resp.data, list)

    def test_unauthenticated(self, client):
        resp = client.get(reverse(self.URL))
        assert resp.status_code == 401


class TestAdminToggle:

    URL = 'auth-admin-toggle'

    def test_promote_user(self, admin_client):
        import uuid
        from users.models import User
        uid = str(uuid.uuid4())[:8]
        user = User.objects.create_user(
            email=f'promote-{uid}@example.com', nome='Promote Me', password='Test@123456',
        )
        resp = admin_client.patch(
            reverse(self.URL, kwargs={'pk': user.id}),
            {'admin': True}, format='json',
        )
        assert resp.status_code == 200

    def test_demote_user(self, admin_client):
        import uuid
        from users.models import User
        uid = str(uuid.uuid4())[:8]
        user = User.objects.create_user(
            email=f'demote-{uid}@example.com', nome='Demote Me', password='Test@123456',
        )
        user.admin = 1
        user.save(update_fields=['admin'])

        resp = admin_client.patch(
            reverse(self.URL, kwargs={'pk': user.id}),
            {'admin': False}, format='json',
        )
        assert resp.status_code == 200

    def test_nonexistent_user(self, admin_client):
        resp = admin_client.patch(
            reverse(self.URL, kwargs={'pk': uuid.uuid4()}),
            {'admin': True}, format='json',
        )
        assert resp.status_code == 404

    def test_non_admin_forbidden(self, auth_client):
        import uuid
        from users.models import User
        uid = str(uuid.uuid4())[:8]
        user = User.objects.create_user(
            email=f'target-{uid}@example.com', nome='Target', password='Test@123456',
        )
        resp = auth_client.patch(
            reverse(self.URL, kwargs={'pk': user.id}),
            {'admin': True}, format='json',
        )
        assert resp.status_code == 403

    def test_unauthenticated(self, client):
        resp = client.patch(
            reverse(self.URL, kwargs={'pk': uuid.uuid4()}),
            {'admin': True}, format='json',
        )
        assert resp.status_code == 401

    def test_missing_admin_field(self, admin_client):
        import uuid
        from users.models import User
        uid = str(uuid.uuid4())[:8]
        user = User.objects.create_user(
            email=f'noflag-{uid}@example.com', nome='No Flag', password='Test@123456',
        )
        resp = admin_client.patch(
            reverse(self.URL, kwargs={'pk': user.id}),
            {}, format='json',
        )
        assert resp.status_code == 400


class TestAdminEstatisticas:

    URL = 'auth-admin-estatisticas'

    def test_non_admin_forbidden(self, auth_client):
        resp = auth_client.get(reverse(self.URL))
        assert resp.status_code == 403

    def test_admin_access(self, admin_client):
        resp = admin_client.get(reverse(self.URL))
        assert resp.status_code == 200
        assert 'total' in resp.data
        assert 'por_categoria' in resp.data
        assert 'por_status' in resp.data
        assert 'sla_medio_minutos' in resp.data
        assert 'tendencia_mensal' in resp.data
        assert 'anomalias' in resp.data

    def test_unauthenticated(self, client):
        resp = client.get(reverse(self.URL))
        assert resp.status_code == 401


class TestSubscribe:

    URL = 'auth-subscribe'

    def test_subscribe_success(self, auth_client):
        resp = auth_client.post(reverse(self.URL), {
            'subscription': {
                'endpoint': 'https://fcm.example.com/send',
                'keys': {'p256dh': 'abc123', 'auth': 'def456'},
            },
        }, format='json')
        assert resp.status_code == 201

    def test_subscribe_missing_data(self, auth_client):
        resp = auth_client.post(reverse(self.URL), {}, format='json')
        assert resp.status_code == 400

    def test_subscribe_unauthenticated(self, client):
        resp = client.post(reverse(self.URL), {}, format='json')
        assert resp.status_code == 401

    def test_unsubscribe(self, auth_client):
        auth_client.post(reverse(self.URL), {
            'subscription': {
                'endpoint': 'https://fcm.example.com/send',
                'keys': {'p256dh': 'abc123', 'auth': 'def456'},
            },
        }, format='json')

        from users.models import PushSubscription
        sub = PushSubscription.objects.first()
        assert sub is not None

        resp = auth_client.delete(reverse(self.URL), {'endpoint': sub.endpoint}, format='json')
        assert resp.status_code == 200
        assert resp.data['deleted'] >= 1


class TestPublicKey:

    URL = 'auth-public-key'

    def test_not_configured(self, client):
        resp = client.get(reverse(self.URL))
        assert resp.status_code == 501
