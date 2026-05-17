from django.contrib.gis import admin
from .models import Defeito, Apoio


@admin.register(Defeito)
class DefeitoAdmin(admin.GISModelAdmin):
    list_display = ('titulo', 'status', 'categoria', 'usuario', 'criado_em')
    list_filter = ('status', 'categoria')
    search_fields = ('titulo', 'descricao', 'rua', 'bairro')
    readonly_fields = ('id', 'criado_em', 'atualizado_em')


@admin.register(Apoio)
class ApoioAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'defeito', 'criado_em')
    readonly_fields = ('id', 'criado_em')
