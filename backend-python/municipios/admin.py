from django.contrib.gis import admin
from .models import Municipio


@admin.register(Municipio)
class MunicipioAdmin(admin.GISModelAdmin):
    list_display = ('nome', 'uf')
    list_filter = ('uf',)
    search_fields = ('nome',)
