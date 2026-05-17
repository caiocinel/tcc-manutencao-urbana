from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Municipio


class MunicipioSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Municipio
        geo_field = 'polygon_geom'
        id_field = 'codigo'
        fields = ('codigo', 'nome', 'uf', 'uf_sigla', 'min_lat', 'max_lat', 'min_lng', 'max_lng', 'poligono_json')
