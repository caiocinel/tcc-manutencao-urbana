from django.db import connection
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Municipio
from .serializers import MunicipioSerializer


class MunicipioViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Municipio.objects.all().order_by('nome')
    serializer_class = MunicipioSerializer
    permission_classes = (permissions.AllowAny,)

    @action(detail=False, methods=['get'])
    @method_decorator(cache_page(60 * 60))
    def lista(self, request):
        rows = Municipio.objects.order_by('uf_sigla', 'nome').values(
            'codigo', 'nome', 'uf_sigla'
        )
        return Response(list(rows))

    @action(detail=False, methods=['get'])
    def com_admin(self, request):
        with connection.cursor() as cursor:
            cursor.execute('''
                SELECT DISTINCT m.codigo::text, m.nome, m.uf_sigla
                FROM municipios m
                INNER JOIN users u ON u.municipio_id = m.codigo
                WHERE u.admin = 1
                ORDER BY m.nome
            ''')
            rows = cursor.fetchall()
        return Response([
            {'codigo': r[0], 'nome': r[1], 'uf_sigla': r[2]} for r in rows
        ])
