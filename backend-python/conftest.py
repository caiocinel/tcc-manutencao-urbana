import os
import subprocess
import sys
import uuid

import pytest
from rest_framework.test import APIClient

# Força o settings de teste (local) para todo o processo pytest. O container de
# dev roda com DJANGO_SETTINGS_MODULE=core.settings.production, e se isso não
# for sobrescrito aqui, o pytest-django e o _bootstrap_test_db usariam o banco
# de produção (manutencao_urbana) em vez do banco de teste — apagando dados reais.
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings.local'


def _bootstrap_test_db():
    """Cria o banco de teste (se não existir) e aplica o schema via manage.py.

    As tabelas do projeto (users, defeitos, ...) são `managed=False` e criadas
    via `bootstrap_schema` (SQL puro). O pytest-django não as cria no banco de
    teste, então aplicamos o schema ANTES do pytest rodar (com --reuse-db o
    pytest não recria o banco). Sem isso, todos os testes falham com
    'relation "users" does not exist'.

    Usa um subprocess para evitar o bloqueio de acesso ao banco que o
    pytest-django impõe dentro da sessão de teste.
    """
    import django
    django.setup()

    from django.conf import settings
    db = settings.DATABASES['default']
    # Nunca dropar o banco de produção local: deriva o nome do banco de teste
    # exatamente como o pytest-django (prefixo test_ quando TEST.NAME ausente).
    test_cfg = db.get('TEST') or {}
    dbname = test_cfg.get('NAME') or f"test_{db['NAME']}"

    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    conn = psycopg2.connect(
        host=db['HOST'], port=db.get('PORT'), user=db['USER'],
        password=db.get('PASSWORD', ''), dbname='postgres',
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    # Recria o banco de teste do zero a cada execução -> estado determinístico
    # (evita que dados de execuções anteriores, acumulados com --reuse-db,
    # quebrem a detecção de duplicados e outros testes).
    cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()", (dbname,))
    cur.execute(f'DROP DATABASE IF EXISTS "{dbname}"')
    cur.execute(f'CREATE DATABASE "{dbname}"')
    cur.close()
    conn.close()

    env = os.environ.copy()
    env['DJANGO_SETTINGS_MODULE'] = 'core.settings.local'
    env['DB_NAME'] = dbname
    subprocess.run(
        [sys.executable, 'manage.py', 'bootstrap_schema'],
        env=env, check=True, capture_output=True,
    )


def pytest_sessionstart(session):
    _bootstrap_test_db()


@pytest.fixture(scope='session')
def django_db_setup(django_db_setup, django_db_blocker):
    """Garante o schema no banco de teste (redundante, mas seguro)."""
    with django_db_blocker.unblock():
        from django.core.management import call_command
        call_command('bootstrap_schema', verbosity=0)


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
def admin_client(auth_client, user_creds, settings):
    """
    Admin *super*: opera em qualquer município. Operadores comuns são
    restritos ao município vinculado — ver `TestOperacaoPorMunicipio`.
    """
    from users.models import User
    user = User.objects.get(email=user_creds['email'])
    user.admin = 1
    user.save(update_fields=['admin'])
    settings.SUPER_ADMIN_EMAIL = user_creds['email']
    return auth_client
