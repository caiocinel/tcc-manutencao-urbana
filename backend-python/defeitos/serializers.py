import base64
from rest_framework import serializers
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
        return super().create(validated_data)


class ApoioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Apoio
        fields = '__all__'
        read_only_fields = ('criado_em',)
