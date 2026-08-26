import base64
import math
from datetime import timedelta
from rest_framework import serializers
from django.conf import settings
from django.db import connection
from .models import Defeito, Apoio

RESOLVIDOS = {'atendido', 'encerrado', 'concluido'}


def _is_sla_vencido(obj):
    if obj.status in RESOLVIDOS or not obj.prazo_sla_dias:
        return False
    if not obj.criado_em:
        return False
    from django.utils import timezone
    prazo = obj.criado_em + timedelta(days=obj.prazo_sla_dias)
    return timezone.now() > prazo


class ThumbnailField(serializers.Field):
    def to_representation(self, value):
        if not value:
            return None
        b64 = base64.b64encode(value).decode('ascii')
        return f'data:image/webp;base64,{b64}'

    def to_internal_value(self, data):
        return data


class DefeitoListSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='usuario.nome', read_only=True, default='')
    categoria_nome = serializers.CharField(source='categoria', read_only=True, default='')
    total_apoios = serializers.SerializerMethodField()
    sla_vencido = serializers.SerializerMethodField()

    class Meta:
        model = Defeito
        fields = (
            'id', 'titulo', 'status', 'categoria_nome',
            'autor_nome', 'latitude', 'longitude', 'municipio_id',
            'rua', 'bairro', 'prioridade',
            'total_apoios', 'criado_em', 'imagem_url',
            'sla_vencido',
        )

    def get_total_apoios(self, obj):
        return getattr(obj, 'total_apoios', 0)

    def get_sla_vencido(self, obj):
        return _is_sla_vencido(obj)


class DefeitoDetailSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='usuario.nome', read_only=True, default='')
    categoria_nome = serializers.CharField(source='categoria', read_only=True, default='')
    total_apoios = serializers.SerializerMethodField()
    imagem_thumbnail = ThumbnailField()
    foto_resolucao_url = ThumbnailField(source='foto_resolucao', read_only=True)
    sla_vencido = serializers.SerializerMethodField()
    municipio = serializers.SerializerMethodField()

    class Meta:
        model = Defeito
        exclude = ('foto_resolucao',)

    def get_total_apoios(self, obj):
        return getattr(obj, 'total_apoios', 0)

    def get_municipio(self, obj):
        """{codigo, nome, uf_sigla} do município do chamado, ou None."""
        if not obj.municipio_id:
            return None
        with connection.cursor() as cur:
            cur.execute('SELECT codigo, nome, uf_sigla FROM municipios WHERE codigo = %s', [obj.municipio_id])
            row = cur.fetchone()
        return {'codigo': str(row[0]), 'nome': row[1], 'uf_sigla': row[2]} if row else None

    def get_sla_vencido(self, obj):
        return _is_sla_vencido(obj)


def municipio_do_ponto(lat, lng):
    """
    Município (código IBGE, nome, UF) que contém o ponto, ou None.

    Usa o polígono PostGIS de `municipios`; se o ponto não cair em nenhum
    (fronteira, mar, dado ausente), tenta a bounding box mais próxima do centro.
    """
    if lat is None or lng is None:
        return None
    with connection.cursor() as cur:
        cur.execute(
            """
            SELECT codigo, nome, uf_sigla FROM municipios
            WHERE polygon_geom IS NOT NULL
              AND ST_Contains(polygon_geom::geometry, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
            LIMIT 1
            """,
            [lng, lat],
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                """
                SELECT codigo, nome, uf_sigla FROM municipios
                WHERE %s BETWEEN min_lat AND max_lat AND %s BETWEEN min_lng AND max_lng
                ORDER BY ABS((min_lat + max_lat) / 2 - %s) + ABS((min_lng + max_lng) / 2 - %s)
                LIMIT 1
                """,
                [lat, lng, lat, lng],
            )
            row = cur.fetchone()
    if not row:
        return None
    return {'codigo': str(row[0]), 'nome': row[1], 'uf_sigla': row[2]}


def _distancia_m(lat1, lng1, lat2, lng2):
    """Distância aproximada em metros (equiretangular; suficiente para dezenas de metros)."""
    dlat = (lat2 - lat1) * 111000
    dlng = (lng2 - lng1) * 111000 * math.cos(math.radians(lat1))
    return math.sqrt(dlat * dlat + dlng * dlng)


def _mesma_categoria_perto(lat, lng, categoria, raio_m):
    """Chamado aberto da mesma categoria a até `raio_m` do ponto, ou None."""
    deg = raio_m / 111000 * 1.5  # caixa folgada; a distância real é conferida abaixo
    candidatos = (
        Defeito.objects.filter(
            categoria__iexact=categoria,
            latitude__range=(lat - deg, lat + deg),
            longitude__range=(lng - deg, lng + deg),
        )
        .exclude(status__in=RESOLVIDOS | {'rejeitado'})
        .values('id', 'latitude', 'longitude')[:20]
    )
    mais_perto = None
    for c in candidatos:
        d = _distancia_m(lat, lng, c['latitude'], c['longitude'])
        if d <= raio_m and (mais_perto is None or d < mais_perto['distancia_m']):
            mais_perto = {'id': c['id'], 'distancia_m': d}
    return mais_perto


class DefeitoCreateSerializer(serializers.ModelSerializer):
    imagem_thumbnail = ThumbnailField(read_only=True)

    class Meta:
        model = Defeito
        exclude = ('usuario', 'criado_em', 'atualizado_em')

    def create(self, validated_data):
        lat = validated_data.get('latitude')
        lng = validated_data.get('longitude')
        descricao = validated_data.get('descricao', '')
        categoria = (validated_data.get('categoria') or '').strip()

        # 1) Regra dura, independente de texto: outro chamado da MESMA categoria,
        #    ainda aberto, a poucos metros -> é o mesmo problema. O cliente deve
        #    confirmar o existente em vez de abrir outro (evita o mapa cheio de
        #    pinos repetidos no mesmo buraco).
        if lat and lng and categoria:
            existente = _mesma_categoria_perto(lat, lng, categoria, settings.DUPLICATE_CATEGORY_RADIUS_M)
            if existente:
                raise serializers.ValidationError(
                    {
                        'duplicado': True,
                        'defeito_existente_id': str(existente['id']),
                        'distancia_m': round(existente['distancia_m'], 1),
                        'detail': (
                            f'Já existe um chamado de {categoria} a '
                            f'{max(1, round(existente["distancia_m"]))} m daqui. '
                            'Confirme ele no mapa em vez de abrir outro.'
                        ),
                    },
                    code='duplicate_defect',
                )

        # Em qual cidade o ponto caiu — gravado no chamado, não no usuário.
        municipio = municipio_do_ponto(lat, lng) if lat and lng else None
        validated_data['municipio_id'] = municipio['codigo'] if municipio else None

        # 2) Similaridade de texto (IA) num raio maior, só quando há descrição.
        if lat and lng and descricao:
            from django.db.models import F
            from django.db.models.functions import ACos, Cos, Radians, Sin
            import asyncio

            radius_m = settings.DUPLICATE_RADIUS_M
            threshold = settings.DUPLICATE_SIMILARITY_THRESHOLD

            deg_approx = radius_m / 111000

            candidatos_qs = Defeito.objects.filter(
                latitude__range=(lat - deg_approx, lat + deg_approx),
                longitude__range=(lng - deg_approx, lng + deg_approx),
            ).exclude(
                status__in=['concluido', 'encerrado', 'rejeitado']
            ).exclude(
                descricao=''
            ).values('id', 'descricao', 'latitude', 'longitude')[:20]

            candidatos = []
            for c in candidatos_qs:
                dlat = c['latitude'] - lat
                dlng = c['longitude'] - lng
                dist_approx_m = math.sqrt((dlat * 111000) ** 2 + (dlng * 111000 * math.cos(math.radians(lat))) ** 2)
                if dist_approx_m <= radius_m:
                    candidatos.append(c)

            if candidatos:
                from services.ia_client import get_embeddings_batch

                textos = [descricao] + [c['descricao'] for c in candidatos]

                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)

                embeddings = loop.run_until_complete(get_embeddings_batch(textos))

                if embeddings and len(embeddings) == len(textos):
                    emb_novo = embeddings[0]

                    for i, candidato in enumerate(candidatos):
                        emb_existente = embeddings[i + 1]
                        dot_product = sum(a * b for a, b in zip(emb_novo, emb_existente))
                        norm_novo = math.sqrt(sum(a * a for a in emb_novo))
                        norm_existente = math.sqrt(sum(a * a for a in emb_existente))
                        similaridade = dot_product / (norm_novo * norm_existente) if norm_novo > 0 and norm_existente > 0 else 0.0

                        if similaridade >= threshold:
                            raise serializers.ValidationError(
                                {
                                    'duplicado': True,
                                    'defeito_existente_id': str(candidato['id']),
                                    'similaridade': round(similaridade, 4),
                                    'detail': 'Ja existe um relato similar nesta localizacao'
                                },
                                code='duplicate_defect'
                            )

        return super().create(validated_data)


class ApoioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Apoio
        fields = '__all__'
        read_only_fields = ('criado_em', 'municipio_id')
