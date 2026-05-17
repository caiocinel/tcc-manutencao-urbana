from django.contrib.gis.db import models


class Municipio(models.Model):
    codigo = models.TextField(primary_key=True)
    nome = models.CharField(max_length=255)
    uf = models.CharField(max_length=2)
    uf_sigla = models.CharField(max_length=2)
    min_lat = models.FloatField()
    max_lat = models.FloatField()
    min_lng = models.FloatField()
    max_lng = models.FloatField()
    poligono_json = models.TextField(null=True, blank=True)
    polygon_geom = models.MultiPolygonField(srid=4326, null=True, blank=True, geography=True)

    class Meta:
        db_table = 'municipios'
        managed = False
        verbose_name = 'Município'
        verbose_name_plural = 'Municípios'
        ordering = ['nome']

    def __str__(self):
        return f'{self.nome}/{self.uf_sigla}'
