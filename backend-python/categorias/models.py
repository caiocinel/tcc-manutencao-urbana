from django.db import models


class Categoria(models.Model):
    nome = models.CharField(max_length=255, unique=True)
    icone = models.CharField(max_length=50, blank=True, default='')
    prioridade_base = models.CharField(max_length=50, default='media')
    prazo_sla_dias = models.IntegerField(default=7)

    class Meta:
        db_table = 'categorias'
        managed = False
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        ordering = ['nome']

    def __str__(self):
        return self.nome
