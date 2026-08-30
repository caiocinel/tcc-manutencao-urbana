"""
Regras de moderação comunitária dos chamados.

Cidadãos sinalizam um chamado aberto como "já foi resolvido" ou "não existe"
(`Sinalizacao`). Aqui mora o que acontece a partir daí:

* **Já foi resolvido** — fecha o chamado (`concluido`) quando o próprio autor
  sinaliza ou quando `RESOLVIDO_MIN` pessoas sinalizam. Continua nos
  relatórios: o problema existiu e foi resolvido.
* **Não existe** — apaga o chamado de verdade (nunca aparece em lugar nenhum).
  Pelo autor, apaga na hora e sem penalidade (foi engano). Por terceiros, a
  barra sobe com cada confirmação no local (`apoios`): precisa de
  `NAO_EXISTE_MIN + apoios` sinalizações. Nesse caso o autor leva um `Strike`.
* **Quarentena** — com mais de `STRIKES_TOLERADOS` strikes ativos (não
  expirados), os chamados novos do autor nascem `restrita`: só quem está a até
  `RAIO_VISIBILIDADE_RESTRITA_M` do ponto, o autor e operadores enxergam. Na
  primeira confirmação no local por outra pessoa o chamado vira público e o
  autor perde um strike (redenção).

Todos os números vivem aqui para ajuste fino sem caçar pelo código.
"""

import json
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from .models import Apoio, Defeito, Sinalizacao, Strike

# "Já foi resolvido": quantas pessoas (fora o autor) fecham o chamado.
RESOLVIDO_MIN = 2
# "Não existe": base de sinalizações para apagar; cada confirmação no local soma 1.
NAO_EXISTE_MIN = 2
# Até quantos strikes ativos o usuário erra sem consequência.
STRIKES_TOLERADOS = 2
# Strike expira depois disso.
STRIKE_VALIDADE_DIAS = 90
# Chamado restrito aparece para quem está a até esta distância do ponto.
RAIO_VISIBILIDADE_RESTRITA_M = 500

RESULTADO_CONCLUIDO = 'concluido'
RESULTADO_INEXISTENTE = 'inexistente'


def contar_sinalizacoes(defeito):
    contagem = {Sinalizacao.RESOLVIDO: 0, Sinalizacao.NAO_EXISTE: 0}
    linhas = (
        Sinalizacao.objects.filter(defeito=defeito)
        .values('tipo').annotate(total=Count('id'))
    )
    for linha in linhas:
        contagem[linha['tipo']] = linha['total']
    return contagem


def strikes_ativos(usuario):
    limite = timezone.now() - timedelta(days=STRIKE_VALIDADE_DIAS)
    return Strike.objects.filter(usuario=usuario, criado_em__gte=limite)


def em_quarentena(usuario):
    return strikes_ativos(usuario).count() > STRIKES_TOLERADOS


def visibilidade_inicial(usuario):
    if em_quarentena(usuario):
        return Defeito.VISIBILIDADE_RESTRITA
    return Defeito.VISIBILIDADE_PUBLICA


def _registrar_atualizacao(defeito, texto):
    try:
        lista = json.loads(defeito.atualizacoes or '[]')
    except ValueError:
        lista = []
    lista.append({'texto': texto, 'data': timezone.now().isoformat()})
    defeito.atualizacoes = json.dumps(lista, ensure_ascii=False)


def aplicar_sinalizacao(defeito, usuario, tipo):
    """
    Chamada logo depois de gravar a sinalização de `usuario` (tipo `tipo`).
    Devolve `RESULTADO_CONCLUIDO`, `RESULTADO_INEXISTENTE` ou None. Quando
    devolve `RESULTADO_INEXISTENTE` o `defeito` já foi apagado do banco.
    """
    autor = defeito.usuario_id is not None and defeito.usuario_id == usuario.id
    contagem = contar_sinalizacoes(defeito)

    if tipo == Sinalizacao.RESOLVIDO:
        if autor or contagem[Sinalizacao.RESOLVIDO] >= RESOLVIDO_MIN:
            agora = timezone.now()
            defeito.status = 'concluido'
            if not defeito.atendido_em:
                defeito.atendido_em = agora.isoformat()
            defeito.atualizado_em = agora
            _registrar_atualizacao(
                defeito,
                'Concluído pelo próprio autor' if autor else 'Concluído por confirmação de cidadãos',
            )
            defeito.save()
            return RESULTADO_CONCLUIDO
        return None

    # tipo == NAO_EXISTE
    if autor:
        defeito.delete()
        return RESULTADO_INEXISTENTE

    apoios = Apoio.objects.filter(defeito=defeito).count()
    if contagem[Sinalizacao.NAO_EXISTE] >= NAO_EXISTE_MIN + apoios:
        if defeito.usuario_id is not None:
            Strike.objects.create(
                usuario_id=defeito.usuario_id,
                titulo=defeito.titulo,
                criado_em=timezone.now(),
            )
        defeito.delete()
        return RESULTADO_INEXISTENTE
    return None


def aplicar_confirmacao(defeito, usuario):
    """
    Chamada quando `usuario` confirma/apoia `defeito` pela primeira vez. Se for
    a primeira confirmação de outra pessoa, o chamado vira público e o autor
    resgata um strike. Devolve True se a visibilidade mudou.
    """
    if defeito.usuario_id is None or defeito.usuario_id == usuario.id:
        return False
    de_terceiros = Apoio.objects.filter(defeito=defeito).exclude(usuario_id=defeito.usuario_id).count()
    if de_terceiros != 1:
        return False

    mais_antigo = strikes_ativos(defeito.usuario).order_by('criado_em').first()
    if mais_antigo is not None:
        mais_antigo.delete()

    if defeito.visibilidade == Defeito.VISIBILIDADE_RESTRITA:
        defeito.visibilidade = Defeito.VISIBILIDADE_PUBLICA
        defeito.save(update_fields=['visibilidade'])
        return True
    return False


def visivel_para(defeito, usuario, lat=None, lng=None):
    """Se `usuario` (pode ser anônimo) pode ver `defeito` num contexto com/sem GPS."""
    if defeito.visibilidade != Defeito.VISIBILIDADE_RESTRITA:
        return True
    if usuario is not None and usuario.is_authenticated:
        if usuario.admin or defeito.usuario_id == usuario.id:
            return True
    if lat is None or lng is None or defeito.latitude is None or defeito.longitude is None:
        return False
    from .serializers import _distancia_m
    return _distancia_m(lat, lng, defeito.latitude, defeito.longitude) <= RAIO_VISIBILIDADE_RESTRITA_M
