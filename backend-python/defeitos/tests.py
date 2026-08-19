import itertools
from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from defeitos.models import Defeito

pytestmark = pytest.mark.django_db(transaction=True)

# Coordenadas únicas por chamada para evitar que a detecção de duplicados
# (raio espacial + similaridade) rejeite defeitos criados em testes distintos
# que usariam as mesmas coordenadas de São Paulo.
_COORD_COUNTER = itertools.count()


def _create_defeito(auth_client, **overrides):
    i = next(_COORD_COUNTER)
    data = {
        'titulo': f'Test Bug Report {i}',
        'descricao': f'A test bug for integration testing numero {i}',
        'latitude': -23.5505,
        'longitude': -46.6333 + i * 0.01,
        'rua': 'Avenida Paulista',
        'bairro': 'Bela Vista',
        'categoria': 'Buraco',
    }
    data.update(overrides)
    resp = auth_client.post(reverse('defeitos-list'), data, format='json')
    assert resp.status_code == 201
    return resp.data


class TestDefeitosList:

    def test_list_unauthenticated(self, client):
        resp = client.get(reverse('defeitos-list'))
        assert resp.status_code == 200

    def test_list_structure(self, client):
        resp = client.get(reverse('defeitos-list'))
        assert resp.status_code == 200
        assert 'count' in resp.data
        assert 'results' in resp.data

    def test_list_with_data(self, auth_client, client):
        _create_defeito(auth_client)
        resp = client.get(reverse('defeitos-list'))
        assert resp.status_code == 200
        assert resp.data['count'] >= 1

    def test_list_pagination(self, auth_client, client):
        for i in range(3):
            _create_defeito(auth_client, titulo=f'Bug {i}')
        resp = client.get(reverse('defeitos-list'))
        assert resp.status_code == 200
        assert len(resp.data['results']) >= 1
        assert 'count' in resp.data
        assert 'next' in resp.data
        assert 'previous' in resp.data

    def test_search_by_titulo(self, auth_client, client):
        _create_defeito(auth_client, titulo='Buraco na Rua Augusta')
        _create_defeito(auth_client, titulo='Poste queimado')
        resp = client.get(reverse('defeitos-list'), {'search': 'Buraco'})
        assert resp.status_code == 200
        assert any('Buraco' in r['titulo'] for r in resp.data['results'])

    def test_search_by_bairro(self, auth_client, client):
        _create_defeito(auth_client, bairro='Pinheiros')
        resp = client.get(reverse('defeitos-list'), {'search': 'Pinheiros'})
        assert resp.status_code == 200
        assert any(r['bairro'] == 'Pinheiros' for r in resp.data['results'])


class TestDefeitosCreate:

    def test_create_authenticated(self, auth_client):
        data = {
            'titulo': 'New Bug',
            'descricao': 'Description',
            'latitude': -23.5,
            'longitude': -46.6,
            'rua': 'Rua Teste',
            'bairro': 'Centro',
            'categoria': 'Iluminacao',
        }
        resp = auth_client.post(reverse('defeitos-list'), data, format='json')
        assert resp.status_code == 201
        assert resp.data['titulo'] == 'New Bug'
        assert 'id' in resp.data

    def test_create_unauthenticated(self, client):
        resp = client.post(reverse('defeitos-list'), {}, format='json')
        assert resp.status_code == 401

    def test_create_minimal_fields(self, auth_client):
        resp = auth_client.post(reverse('defeitos-list'), {
            'titulo': 'Minimal bug',
        }, format='json')
        assert resp.status_code == 201

    def test_create_with_coordinates(self, auth_client):
        lat, lng = -22.9068, -43.1729
        resp = auth_client.post(reverse('defeitos-list'), {
            'titulo': 'Bug with coords',
            'latitude': lat,
            'longitude': lng,
        }, format='json')
        assert resp.status_code == 201
        assert abs(float(resp.data['latitude']) - lat) < 0.01
        assert abs(float(resp.data['longitude']) - lng) < 0.01

    def test_create_defeito_persists_routing(self, auth_client):
        resp = auth_client.post(reverse('defeitos-list'), {
            'titulo': 'Buraco na rua',
            'descricao': 'Buraco grande na via',
            'latitude': -21.17,
            'longitude': -47.82,
            'categoria': 'Buraco',
            'status': 'pendente',
        }, format='json')
        assert resp.status_code == 201
        defeito_id = resp.data['id']
        defeito = Defeito.objects.get(id=defeito_id)
        assert defeito.secretaria_responsavel == 'Secretaria de Obras e Infraestrutura'
        assert defeito.prazo_sla_dias == 7


class TestDefeitosRetrieve:

    def test_retrieve(self, auth_client, client):
        created = _create_defeito(auth_client)
        resp = client.get(reverse('defeitos-detail', args=[created['id']]))
        assert resp.status_code == 200
        assert resp.data['titulo'] == created['titulo']

    def test_retrieve_nonexistent(self, client):
        import uuid
        resp = client.get(reverse('defeitos-detail', args=[uuid.uuid4()]))
        assert resp.status_code == 404

    def test_retrieve_includes_extra_fields(self, auth_client, client):
        created = _create_defeito(auth_client)
        resp = client.get(reverse('defeitos-detail', args=[created['id']]))
        assert 'categoria' in resp.data
        assert 'descricao' in resp.data
        assert 'status' in resp.data
        assert 'total_apoios' in resp.data


class TestDefeitosUpdate:

    def test_update_own(self, auth_client):
        created = _create_defeito(auth_client)
        resp = auth_client.patch(
            reverse('defeitos-detail', args=[created['id']]),
            {'titulo': 'Updated Title'}, format='json',
        )
        assert resp.status_code == 200
        assert resp.data['titulo'] == 'Updated Title'

    def test_update_status(self, auth_client):
        created = _create_defeito(auth_client)
        resp = auth_client.patch(
            reverse('defeitos-detail', args=[created['id']]),
            {'status': 'em_andamento'}, format='json',
        )
        assert resp.status_code == 200

    def test_update_unauthenticated(self, client, auth_client):
        created = _create_defeito(auth_client)
        resp = client.patch(
            reverse('defeitos-detail', args=[created['id']]),
            {'titulo': 'Hacked'}, format='json',
        )
        assert resp.status_code == 401


class TestDefeitosDelete:

    def test_delete_own(self, auth_client):
        created = _create_defeito(auth_client)
        resp = auth_client.delete(reverse('defeitos-detail', args=[created['id']]))
        assert resp.status_code == 204

    def test_delete_unauthenticated(self, client, auth_client):
        created = _create_defeito(auth_client)
        resp = client.delete(reverse('defeitos-detail', args=[created['id']]))
        assert resp.status_code == 401


class TestApoiar:

    APOIAR_URL = 'defeitos-apoiar'

    def test_apoiar(self, auth_client):
        created = _create_defeito(auth_client)
        resp = auth_client.post(reverse(self.APOIAR_URL, args=[created['id']]), format='json')
        assert resp.status_code == 201
        assert resp.data['apoiado'] is True

    def test_remover_apoio(self, auth_client):
        created = _create_defeito(auth_client)
        auth_client.post(reverse(self.APOIAR_URL, args=[created['id']]), format='json')
        resp = auth_client.post(reverse(self.APOIAR_URL, args=[created['id']]), format='json')
        assert resp.status_code == 200
        assert resp.data['apoiado'] is False

    def test_apoiar_unauthenticated(self, client, auth_client):
        created = _create_defeito(auth_client)
        resp = client.post(reverse(self.APOIAR_URL, args=[created['id']]), format='json')
        assert resp.status_code == 401

    def test_apoiar_nonexistent(self, auth_client):
        import uuid
        resp = auth_client.post(reverse(self.APOIAR_URL, args=[uuid.uuid4()]), format='json')
        assert resp.status_code == 404


class TestAtender:

    ATENDER_URL = 'defeitos-atender'

    def test_atender(self, auth_client):
        created = _create_defeito(auth_client)
        resp = auth_client.patch(reverse(self.ATENDER_URL, args=[created['id']]), format='json')
        assert resp.status_code == 200
        assert 'message' in resp.data

    def test_atender_duplicate(self, auth_client):
        created = _create_defeito(auth_client)
        auth_client.patch(reverse(self.ATENDER_URL, args=[created['id']]), format='json')
        resp = auth_client.patch(reverse(self.ATENDER_URL, args=[created['id']]), format='json')
        assert resp.status_code == 400

    def test_atender_unauthenticated(self, client, auth_client):
        created = _create_defeito(auth_client)
        resp = client.patch(reverse(self.ATENDER_URL, args=[created['id']]), format='json')
        assert resp.status_code == 401

    def test_atender_nonexistent(self, auth_client):
        import uuid
        resp = auth_client.patch(reverse(self.ATENDER_URL, args=[uuid.uuid4()]), format='json')
        assert resp.status_code == 404


class TestStatusAction:

    STATUS_URL = 'defeitos-status'

    def test_update_status(self, auth_client):
        created = _create_defeito(auth_client)
        resp = auth_client.patch(
            reverse(self.STATUS_URL, args=[created['id']]),
            {'status': 'em_andamento'}, format='json',
        )
        assert resp.status_code == 200
        assert resp.data['status'] == 'em_andamento'

    def test_invalid_status(self, auth_client):
        created = _create_defeito(auth_client)
        resp = auth_client.patch(
            reverse(self.STATUS_URL, args=[created['id']]),
            {'status': 'invalid_status'}, format='json',
        )
        assert resp.status_code == 400

    def test_resolvido_exige_foto_resolucao(self, auth_client):
        created = _create_defeito(auth_client)
        resp = auth_client.patch(
            reverse(self.STATUS_URL, args=[created['id']]),
            {'status': 'atendido'}, format='json',
        )
        assert resp.status_code == 400

    def test_resolvido_com_foto_resolucao(self, auth_client):
        import io
        from PIL import Image
        created = _create_defeito(auth_client)
        buf = io.BytesIO()
        Image.new('RGB', (64, 64), color='red').save(buf, format='JPEG')
        buf.seek(0)
        resp = auth_client.patch(
            reverse(self.STATUS_URL, args=[created['id']]),
            {'status': 'atendido', 'foto_resolucao': buf},
            format='multipart',
        )
        assert resp.status_code == 200
        assert resp.data['status'] == 'atendido'


class TestMeus:

    URL = 'defeitos-meus'

    def test_meus(self, auth_client):
        _create_defeito(auth_client, titulo='My Bug')
        _create_defeito(auth_client, titulo='Another Bug')
        resp = auth_client.get(reverse(self.URL))
        assert resp.status_code == 200
        assert resp.data['count'] >= 2

    def test_meus_empty(self, auth_client):
        resp = auth_client.get(reverse(self.URL))
        assert resp.status_code == 200
        assert resp.data['count'] == 0

    def test_meus_unauthenticated(self, client):
        resp = client.get(reverse(self.URL))
        assert resp.status_code == 401

    def test_meus_only_own(self, auth_client):
        _create_defeito(auth_client, titulo='My Bug')
        resp = auth_client.get(reverse(self.URL))
        for r in resp.data['results']:
            assert r['titulo'] == 'My Bug'


class TestApoiados:

    APOIAR_URL = 'defeitos-apoiar'
    APOIADOS_URL = 'defeitos-apoiados'

    def test_apoiados(self, auth_client):
        created = _create_defeito(auth_client)
        auth_client.post(reverse(self.APOIAR_URL, args=[created['id']]), format='json')
        resp = auth_client.get(reverse(self.APOIADOS_URL))
        assert resp.status_code == 200
        assert resp.data['count'] >= 1

    def test_apoiados_empty(self, auth_client):
        resp = auth_client.get(reverse(self.APOIADOS_URL))
        assert resp.status_code == 200
        assert resp.data['count'] == 0


class TestSlaVencido:

    def test_sla_vencido(self, auth_client, client):
        created = _create_defeito(auth_client)
        defeito = Defeito.objects.get(id=created['id'])
        defeito.criado_em = timezone.now() - timedelta(days=30)
        defeito.save()
        resp = client.get(reverse('defeitos-detail', args=[created['id']]))
        assert resp.status_code == 200
        assert resp.data['sla_vencido'] is True

    def test_sla_vencido_fresh(self, auth_client, client):
        created = _create_defeito(auth_client)
        resp = client.get(reverse('defeitos-detail', args=[created['id']]))
        assert resp.status_code == 200
        assert resp.data['sla_vencido'] is False
