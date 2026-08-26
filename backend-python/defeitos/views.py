from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db.models import Count
from .models import Defeito, Apoio
from .serializers import (
    DefeitoListSerializer, DefeitoDetailSerializer,
    DefeitoCreateSerializer, ApoioSerializer,
)
from users.models import User


class DefeitoViewSet(viewsets.ModelViewSet):
    queryset = Defeito.objects.select_related(
        'usuario',
    ).annotate(total_apoios=Count('apoios')).order_by('-criado_em')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('titulo', 'descricao', 'rua', 'bairro')
    ordering_fields = ('criado_em', 'total_apoios')
    lookup_value_regex = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

    def get_queryset(self):
        qs = self.queryset
        user = self.request.user
        # Admin vinculado a um município enxerga só os chamados que caíram nele
        # (pelo `municipio_id` do chamado, resolvido por lat/lng). Admin sem
        # município — ou o super admin — vê tudo.
        if user.is_authenticated and user.admin and user.municipio_id:
            super_admin_email = getattr(settings, 'SUPER_ADMIN_EMAIL', None)
            if not super_admin_email or user.email != super_admin_email:
                qs = qs.filter(municipio_id=user.municipio_id)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return DefeitoListSerializer
        if self.action == 'retrieve':
            return DefeitoDetailSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return DefeitoCreateSerializer
        return DefeitoDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'apoiar', 'meus', 'apoiados', 'apoiei', 'atender', 'status',
                           'batch_status', 'ordem_servico',
                           'update', 'partial_update', 'destroy', 'anexar'):
            return (permissions.IsAuthenticated(),)
        return (permissions.AllowAny(),)

    def create(self, request, *args, **kwargs):
        # Chamado só com foto do local, tirada na hora (o app abre a câmera;
        # galeria não entra). Sem imagem não há como a prefeitura triar.
        if 'imagem' not in request.FILES:
            return Response(
                {'imagem': 'Tire uma foto do problema para abrir o chamado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError as e:
            detail = e.detail
            if isinstance(detail, dict) and detail.get('duplicado'):
                # O DRF embrulha cada valor em ErrorDetail (string); devolve tipos limpos.
                corpo = {k: str(v) for k, v in detail.items()}
                corpo['duplicado'] = True
                for campo in ('distancia_m', 'similaridade'):
                    if campo in corpo:
                        corpo[campo] = float(corpo[campo])
                return Response(corpo, status=status.HTTP_409_CONFLICT)
            raise

    def perform_create(self, serializer):
        webp = None
        if 'imagem' in self.request.FILES:
            from services.image_processor import process_image
            result = process_image(self.request.FILES['imagem'].read())
            webp = result['webp_bytes']

        from services.ia_client import routing
        categoria = self.request.data.get('categoria', '')
        rota = routing(categoria) if categoria else {}

        serializer.save(
            usuario=self.request.user,
            criado_em=timezone.now(),
            atualizado_em=timezone.now(),
            imagem_thumbnail=webp,
            secretaria_responsavel=rota.get('secretaria', ''),
            prazo_sla_dias=rota.get('prazo_sla_dias', 0),
        )

    @action(detail=True, methods=['post'])
    def apoiar(self, request, pk=None):
        defeito = self.get_object()
        apoio, created = Apoio.objects.get_or_create(
            usuario=request.user, defeito=defeito,
            defaults={'criado_em': timezone.now()},
        )
        if not created:
            apoio.delete()
            return Response({'apoiado': False}, status=status.HTTP_200_OK)
        return Response({'apoiado': True}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        defeito = self.get_object()
        if not (request.user.admin or (defeito.atendente_id and defeito.atendente == request.user)):
            return Response(
                {'error': 'Permissao negada'},
                status=status.HTTP_403_FORBIDDEN,
            )
        novo_status = request.data.get('status')
        if novo_status not in dict(Defeito.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        resolvidos = {'atendido', 'encerrado', 'concluido'}
        if novo_status in resolvidos and defeito.status not in resolvidos:
            arquivo = request.FILES.get('foto_resolucao')
            if arquivo is None:
                return Response(
                    {'error': 'Foto de resolucao obrigatoria para concluir o chamado'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            from services.image_processor import process_image
            try:
                result = process_image(arquivo.read())
                defeito.foto_resolucao = result['webp_bytes']
            except Exception:
                return Response(
                    {'error': 'Imagem de resolucao invalida'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        defeito.status = novo_status
        if novo_status in resolvidos and not defeito.atendido_em:
            defeito.atendido_em = timezone.now().isoformat()
        defeito.save()
        return Response(DefeitoDetailSerializer(defeito).data)

    @action(detail=False, methods=['get'])
    def meus(self, request):
        qs = self.get_queryset().filter(usuario=request.user)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(
                DefeitoListSerializer(page, many=True).data,
            )
        return Response(DefeitoListSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def apoiados(self, request):
         ids = Apoio.objects.filter(usuario=request.user).values_list(
             'defeito_id', flat=True,
         )
         qs = self.get_queryset().filter(id__in=list(ids))
         page = self.paginate_queryset(qs)
         if page is not None:
             return self.get_paginated_response(
                 DefeitoListSerializer(page, many=True).data,
             )
         return Response(DefeitoListSerializer(qs, many=True).data)

    @action(detail=True, methods=['patch'])
    def atender(self, request, pk=None):
        defeito = self.get_object()
        if defeito.atendente_id:
            return Response(
                {'error': 'Chamado já possui atendente'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        defeito.atendente = request.user
        defeito.status = 'vinculado_sem_resposta'
        defeito.atendido_em = timezone.now().isoformat()
        defeito.save()
        return Response({'message': 'Chamado vinculado com sucesso'})

    @action(detail=True, methods=['post'])
    def anexar(self, request, pk=None):
        defeito = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        from services.image_processor import process_image
        import json, base64
        result = process_image(file.read())
        extras = json.loads(defeito.imagens_extra or '[]')
        b64 = base64.b64encode(result['thumbnail_bytes']).decode('ascii')
        extras.append(f'data:image/webp;base64,{b64}')
        defeito.imagens_extra = json.dumps(extras)
        defeito.save()
        return Response(DefeitoDetailSerializer(defeito).data)

    @action(detail=False, methods=['get'])
    def apoiei(self, request):
        ids = Apoio.objects.filter(usuario=request.user).values_list('defeito_id', flat=True)
        return Response({'ids': [str(i) for i in ids]})

    @action(detail=True, methods=['get'])
    def ordem_servico(self, request, pk=None):
        if not request.user.admin:
            return Response(
                {'error': 'Permissao negada'},
                status=status.HTTP_403_FORBIDDEN,
            )
        defeito = self.get_object()
        from services.ordem_servico import gerar_ordem_servico
        pdf_bytes = gerar_ordem_servico(defeito)
        id_curto = str(defeito.id)[:8]
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="OS-{id_curto}.pdf"'
        return response

    @action(detail=False, methods=['patch'])
    def batch_status(self, request):
        if not request.user.admin:
            return Response(
                {'error': 'Permissao negada'},
                status=status.HTTP_403_FORBIDDEN,
            )
        ids = request.data.get('ids')
        if not isinstance(ids, list) or not ids:
            return Response(
                {'error': 'Informe ao menos um id'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(ids) > 100:
            return Response(
                {'error': 'Maximo de 100 chamados por lote'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        novo_status = request.data.get('status')
        if novo_status not in dict(Defeito.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if novo_status in {'atendido', 'encerrado', 'concluido'}:
            return Response(
                {'error': 'Status resolvido exige foto de resolucao - use a acao individual'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = self.get_queryset().filter(id__in=ids)
        updated = qs.update(status=novo_status, atualizado_em=timezone.now())
        return Response({'updated': updated})

    @action(detail=False, methods=['post'])
    def imagem(self, request):
        from services.image_processor import process_image
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = process_image(file.read())
        return Response({
            'image': result['webp_bytes'].hex(),
            'thumbnail': result['thumbnail_bytes'].hex(),
        })
