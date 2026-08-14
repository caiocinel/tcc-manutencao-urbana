import base64
import math
from rest_framework import serializers
from django.conf import settings
from .models import Defeito, Apoio


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

    class Meta:
        model = Defeito
        fields = (
            'id', 'titulo', 'status', 'categoria_nome',
            'autor_nome', 'latitude', 'longitude',
            'rua', 'bairro', 'prioridade',
            'total_apoios', 'criado_em', 'imagem_url',
        )

    def get_total_apoios(self, obj):
        return getattr(obj, 'total_apoios', 0)


class DefeitoDetailSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='usuario.nome', read_only=True, default='')
    categoria_nome = serializers.CharField(source='categoria', read_only=True, default='')
    total_apoios = serializers.SerializerMethodField()
    imagem_thumbnail = ThumbnailField()

    class Meta:
        model = Defeito
        fields = '__all__'

    def get_total_apoios(self, obj):
        return getattr(obj, 'total_apoios', 0)


class DefeitoCreateSerializer(serializers.ModelSerializer):
    imagem_thumbnail = ThumbnailField(read_only=True)

    class Meta:
        model = Defeito
        exclude = ('usuario', 'criado_em', 'atualizado_em')

    def create(self, validated_data):
        lat = validated_data.get('latitude')
        lng = validated_data.get('longitude')
        descricao = validated_data.get('descricao', '')

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
        read_only_fields = ('criado_em',)
