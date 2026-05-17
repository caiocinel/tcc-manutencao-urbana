from django.core.management.base import BaseCommand
from django.test import Client
from django.urls import reverse

class Command(BaseCommand):
    help = 'Teste básico de sanidade dos endpoints'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('=== Smoke Test ==='))
        c = Client()

        headers = {'HTTP_HOST': 'localhost', 'HTTP_ACCEPT': 'application/json'}
        endpoints = [
            ('GET', '/api/v1/municipios/'),
            ('GET', '/api/v1/categorias/'),
            ('GET', '/api/v1/defeitos/'),
            ('POST', '/api/v1/auth/login/'),
        ]

        for method, url in endpoints:
            try:
                if method == 'GET':
                    resp = c.get(url, **headers)
                elif method == 'POST':
                    resp = c.post(url, {}, content_type='application/json', **headers)
                status = resp.status_code
                if status in (200, 201, 400, 401, 403):
                    self.stdout.write(self.style.SUCCESS(f'  {method} {url} → {status} (esperado)'))
                else:
                    self.stdout.write(self.style.WARNING(f'  {method} {url} → {status} (verificar)'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  {method} {url} → ERRO: {e}'))

        self.stdout.write(self.style.SUCCESS('Smoke test concluído'))
