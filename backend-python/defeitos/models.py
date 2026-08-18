import uuid
from django.contrib.gis.db import models
from django.contrib.gis.geos import Point
from django.conf import settings
from users.models import User


class Defeito(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('em_andamento', 'Em Andamento'),
        ('vinculado_sem_resposta', 'Vinculado sem resposta'),
        ('vinculado_com_resposta', 'Vinculado com resposta'),
        ('atendido', 'Atendido'),
        ('encerrado', 'Encerrado'),
        ('concluido', 'Concluído'),
        ('rejeitado', 'Rejeitado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='defeitos_defeitos', db_column='usuario',
    )
    titulo = models.CharField(max_length=255)
    descricao = models.TextField(blank=True, default='')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    @property
    def localizacao(self):
        if self.latitude is not None and self.longitude is not None:
            return Point(self.longitude, self.latitude, srid=4326)
        return None

    @localizacao.setter
    def localizacao(self, value):
        if value is not None:
            self.longitude = value.x
            self.latitude = value.y

    rua = models.TextField(blank=True, default='')
    bairro = models.TextField(blank=True, default='')
    imagem_url = models.CharField(max_length=512, blank=True, default='')
    categoria = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pendente')
    prioridade = models.CharField(max_length=50, blank=True, default='')
    previsao_conclusao = models.TextField(blank=True, default='')
    atendido_em = models.TextField(blank=True, default='')
    secretaria_responsavel = models.CharField(max_length=255, blank=True, default='', db_column='secretaria_responsavel')
    prazo_sla_dias = models.IntegerField(default=0, db_column='prazo_sla_dias')
    usuario_email = models.CharField(max_length=255, blank=True, default='')
    imagem_thumbnail = models.BinaryField(null=True, blank=True, db_column='imagem_thumbnail')
    imagens_extra = models.TextField(default='[]')
    atualizacoes = models.TextField(default='[]')
    atendente = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='defeitos_atendidos', db_column='atendente_id',
    )
    criado_em = models.DateTimeField(db_column='criado_em')
    atualizado_em = models.DateTimeField(db_column='atualizado_em')

    class Meta:
        db_table = 'defeitos'
        managed = False
        verbose_name = 'Defeito'
        verbose_name_plural = 'Defeitos'
        ordering = ['-criado_em']

    def __str__(self):
        return self.titulo


class Apoio(models.Model):
    id = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='apoios',
        db_column='usuario_id',
    )
    defeito = models.ForeignKey(
        Defeito, on_delete=models.CASCADE, related_name='apoios',
        db_column='defeito_id',
    )
    criado_em = models.DateTimeField(db_column='criado_em')

    class Meta:
        db_table = 'apoios'
        managed = False
        verbose_name = 'Apoio'
        verbose_name_plural = 'Apoios'
        unique_together = ('usuario', 'defeito')

    def __str__(self):
        return f'{self.usuario_id} -> {self.defeito_id}'
