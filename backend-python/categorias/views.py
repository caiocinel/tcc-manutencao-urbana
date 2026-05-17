from rest_framework import viewsets, permissions
from .models import Categoria
from .serializers import CategoriaSerializer


class CategoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Categoria.objects.all().order_by('nome')
    serializer_class = CategoriaSerializer
    permission_classes = (permissions.AllowAny,)
