from django.core.management.base import BaseCommand
from django.db import connection
from datetime import datetime, timezone
from django.contrib.auth.hashers import make_password


MUNICIPIOS = {
    '3548005': {
        'email': 'sap@santoantonioposse.sp.gov.br',
        'password': 'pmsaposse123',
        'nome': 'Admin Santo Antônio de Posse',
    },
    '3509502': {
        'email': 'admin@campinas.sp.gov.br',
        'password': 'campinas123',
        'nome': 'Admin Campinas',
    },
    '5208707': {
        'email': 'admin@goiania.go.gov.br',
        'password': 'goiania123',
        'nome': 'Admin Goiânia',
    },
}


class Command(BaseCommand):
    help = 'Cria administradores municipais para municípios sem admin'

    def handle(self, *args, **options):
        now = datetime.now(timezone.utc).isoformat()

        for codigo, dados in MUNICIPIOS.items():
            with connection.cursor() as cursor:
                cursor.execute(
                    'SELECT id FROM users WHERE email = %s',
                    [dados['email']],
                )
                existing = cursor.fetchone()

                if existing:
                    cursor.execute(
                        'UPDATE users SET admin = 1, municipio_id = %s, atualizado_em = %s WHERE id = %s',
                        [codigo, now, existing[0]],
                    )
                    self.stdout.write(self.style.WARNING(
                        f'Atualizado admin {dados["email"]} -> {codigo}'
                    ))
                else:
                    user_id = self._generate_uuid(cursor)
                    hashed = make_password(dados['password'])
                    cursor.execute('''
                        INSERT INTO users (id, email, nome, senha, admin, municipio_id, cpf, email_verificado, criado_em, atualizado_em)
                        VALUES (%s, %s, %s, %s, 1, %s, '', 1, %s, %s)
                    ''', [user_id, dados['email'], dados['nome'], hashed, codigo, now, now])
                    self.stdout.write(self.style.SUCCESS(
                        f'Criado admin {dados["email"]} para municipio {codigo}'
                    ))

    def _generate_uuid(self, cursor):
        cursor.execute("SELECT gen_random_uuid()::text")
        return cursor.fetchone()[0]
