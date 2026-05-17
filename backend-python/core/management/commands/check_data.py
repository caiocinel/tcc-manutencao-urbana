from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from defeitos.models import Defeito
from municipios.models import Municipio
from categorias.models import Categoria

User = get_user_model()

class Command(BaseCommand):
    help = 'Verifica integridade dos dados migrados'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('=== Verificação de Dados ==='))

        qs_user = User.objects.all()
        self.stdout.write(f'Usuários: {qs_user.count()}')
        if qs_user.count() == 0:
            self.stdout.write(self.style.WARNING('  Nenhum usuário encontrado'))

        qs_def = Defeito.objects.all()
        self.stdout.write(f'Defeitos: {qs_def.count()}')
        if qs_def.count() == 0:
            self.stdout.write(self.style.WARNING('  Nenhum defeito encontrado'))
        sem_local = qs_def.filter(latitude__isnull=True, longitude__isnull=True).count()
        if sem_local:
            self.stdout.write(self.style.WARNING(f'  {sem_local} defeitos sem localização'))

        qs_mun = Municipio.objects.all()
        self.stdout.write(f'Municípios: {qs_mun.count()}')
        if qs_mun.count() == 0:
            self.stdout.write(self.style.WARNING('  Nenhum município encontrado'))

        qs_cat = Categoria.objects.all()
        self.stdout.write(f'Categorias: {qs_cat.count()}')
        if qs_cat.count() == 0:
            self.stdout.write(self.style.WARNING('  Nenhuma categoria encontrada'))

        self.stdout.write(self.style.SUCCESS('Verificação concluída'))
