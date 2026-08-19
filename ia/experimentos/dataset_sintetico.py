"""
Dataset sintético de relatos urbanos em PT-BR para validação do classificador.
100 relatos curados + expansão determinística até 75 por categoria (total 525).
"""

DATASET = [
    # Buraco (15 relatos)
    {"text": "Buraco enorme na avenida principal", "categoria": "Buraco"},
    {"text": "Cratera no asfalto da rua", "categoria": "Buraco"},
    {"text": "Pavimento quebrado com buracos fundos", "categoria": "Buraco"},
    {"text": "Buraqueira na pista depois da chuva", "categoria": "Buraco"},
    {"text": "Depressão no asfalto causando alagamento", "categoria": "Buraco"},
    {"text": "Erosão na pista formando buraco", "categoria": "Buraco"},
    {"text": "Sulco profundo na rua de terra", "categoria": "Buraco"},
    {"text": "Afundamento no asfalto perto da esquina", "categoria": "Buraco"},
    {"text": "Buraco perigoso na ciclovia", "categoria": "Buraco"},
    {"text": "Asfalto todo esburacado na saída da cidade", "categoria": "Buraco"},
    {"text": "Cratera na rua após obra da concessionária", "categoria": "Buraco"},
    {"text": "Buraco fundo na frente da minha casa", "categoria": "Buraco"},
    {"text": "Pavimento deteriorado com vários buracos", "categoria": "Buraco"},
    {"text": "Rua com buraqueira enorme", "categoria": "Buraco"},
    {"text": "Buraco na pista oferecendo risco de acidente", "categoria": "Buraco"},

    # Iluminacao (14 relatos)
    {"text": "Poste de luz apagado na rua", "categoria": "Iluminacao"},
    {"text": "Lâmpada queimada no poste", "categoria": "Iluminacao"},
    {"text": "Iluminação pública falhando", "categoria": "Iluminacao"},
    {"text": "Rua escura sem luz à noite", "categoria": "Iluminacao"},
    {"text": "Luminária quebrada no poste", "categoria": "Iluminacao"},
    {"text": "Falta de luz na via pública", "categoria": "Iluminacao"},
    {"text": "Poste com luz piscando intermitente", "categoria": "Iluminacao"},
    {"text": "Luz pública não funciona há semanas", "categoria": "Iluminacao"},
    {"text": "Beco escuro por falta de iluminação", "categoria": "Iluminacao"},
    {"text": "Poste de luz com fio exposto", "categoria": "Iluminacao"},
    {"text": "Lâmpada da rua não acende mais", "categoria": "Iluminacao"},
    {"text": "Iluminação pública muito fraca", "categoria": "Iluminacao"},
    {"text": "Poste apagado na praça", "categoria": "Iluminacao"},
    {"text": "Rua completamente escura, perigoso", "categoria": "Iluminacao"},

    # Semafaro (14 relatos)
    {"text": "Semáforo quebrado no cruzamento", "categoria": "Semafaro"},
    {"text": "Sinaleira com defeito", "categoria": "Semafaro"},
    {"text": "Cruzamento perigoso sem farol", "categoria": "Semafaro"},
    {"text": "Semáforo de pedestre não funciona", "categoria": "Semafaro"},
    {"text": "Trânsito parado por semáforo apagado", "categoria": "Semafaro"},
    {"text": "Sinal luminoso de trânsito apagado", "categoria": "Semafaro"},
    {"text": "Farol de trânsito piscando errado", "categoria": "Semafaro"},
    {"text": "Semáforo travado no verde", "categoria": "Semafaro"},
    {"text": "Sinaleira sem funcionar há dias", "categoria": "Semafaro"},
    {"text": "Cruzamento sem sinalização de trânsito", "categoria": "Semafaro"},
    {"text": "Semáforo com luz vermelha fixa", "categoria": "Semafaro"},
    {"text": "Farol quebrado na avenida", "categoria": "Semafaro"},
    {"text": "Semáforo de pedestre piscando", "categoria": "Semafaro"},
    {"text": "Sinal de trânsito com defeito", "categoria": "Semafaro"},

    # Arvore Caida (14 relatos)
    {"text": "Árvore caiu na rua depois da tempestade", "categoria": "Arvore Caida"},
    {"text": "Galho caído na calçada", "categoria": "Arvore Caida"},
    {"text": "Tronco obstruindo passagem", "categoria": "Arvore Caida"},
    {"text": "Queda de árvore na tempestade", "categoria": "Arvore Caida"},
    {"text": "Raiz levantando calçada", "categoria": "Arvore Caida"},
    {"text": "Poda de árvore necessária urgente", "categoria": "Arvore Caida"},
    {"text": "Árvore caída bloqueando a rua", "categoria": "Arvore Caida"},
    {"text": "Galho grande caiu no fio de luz", "categoria": "Arvore Caida"},
    {"text": "Árvore tombou sobre o muro", "categoria": "Arvore Caida"},
    {"text": "Tronco de árvore na pista", "categoria": "Arvore Caida"},
    {"text": "Árvore com risco de cair", "categoria": "Arvore Caida"},
    {"text": "Galhos quebrados pela chuva", "categoria": "Arvore Caida"},
    {"text": "Árvore caída na calçada", "categoria": "Arvore Caida"},
    {"text": "Poda urgente necessária", "categoria": "Arvore Caida"},

    # Entulho (14 relatos)
    {"text": "Entulho acumulado na calçada", "categoria": "Entulho"},
    {"text": "Lixo irregular descartado na via", "categoria": "Entulho"},
    {"text": "Resíduos de construção no terreno", "categoria": "Entulho"},
    {"text": "Sujeira acumulada no espaço público", "categoria": "Entulho"},
    {"text": "Detrito na via pública", "categoria": "Entulho"},
    {"text": "Material descartado irregularmente", "categoria": "Entulho"},
    {"text": "Restos de obra na calçada", "categoria": "Entulho"},
    {"text": "Terra e pedras jogadas na rua", "categoria": "Entulho"},
    {"text": "Móveis velhos abandonados", "categoria": "Entulho"},
    {"text": "Lixo de construção civil na esquina", "categoria": "Entulho"},
    {"text": "Entulho bloqueando a passagem", "categoria": "Entulho"},
    {"text": "Resíduos jogados no terreno baldio", "categoria": "Entulho"},
    {"text": "Descarte irregular de materiais", "categoria": "Entulho"},
    {"text": "Acúmulo de lixo e sujeira", "categoria": "Entulho"},

    # Calcada Danificada (14 relatos)
    {"text": "Calçada rachada e perigosa", "categoria": "Calcada Danificada"},
    {"text": "Passeio público quebrado", "categoria": "Calcada Danificada"},
    {"text": "Tampa de bueiro solta na calçada", "categoria": "Calcada Danificada"},
    {"text": "Buraco na calçada", "categoria": "Calcada Danificada"},
    {"text": "Piso irregular na calçada", "categoria": "Calcada Danificada"},
    {"text": "Calçamento quebrado na esquina", "categoria": "Calcada Danificada"},
    {"text": "Calçada com desnível perigoso", "categoria": "Calcada Danificada"},
    {"text": "Passeio danificado pelas raízes", "categoria": "Calcada Danificada"},
    {"text": "Calçada esburacada oferecendo risco", "categoria": "Calcada Danificada"},
    {"text": "Piso da calçada levantado", "categoria": "Calcada Danificada"},
    {"text": "Bueiro aberto na calçada", "categoria": "Calcada Danificada"},
    {"text": "Calçada com placas soltas", "categoria": "Calcada Danificada"},
    {"text": "Passeio público deteriorado", "categoria": "Calcada Danificada"},
    {"text": "Calçada com rachaduras profundas", "categoria": "Calcada Danificada"},

    # Outro (15 relatos)
    {"text": "Vazamento de água na rua", "categoria": "Outro"},
    {"text": "Esgoto estourado na calçada", "categoria": "Outro"},
    {"text": "Fio elétrico partido na rua", "categoria": "Outro"},
    {"text": "Placa de trânsito caída", "categoria": "Outro"},
    {"text": "Barulho excessivo de obra", "categoria": "Outro"},
    {"text": "Mato alto no terreno", "categoria": "Outro"},
    {"text": "Animal solto na rua", "categoria": "Outro"},
    {"text": "Carro abandonado na via", "categoria": "Outro"},
    {"text": "Poluição sonora constante", "categoria": "Outro"},
    {"text": "Falta de coleta de lixo", "categoria": "Outro"},
    {"text": "Alagamento após chuva forte", "categoria": "Outro"},
    {"text": "Desmoronamento de muro", "categoria": "Outro"},
    {"text": "Obras paralisadas na praça", "categoria": "Outro"},
    {"text": "Falta de manutenção na praça", "categoria": "Outro"},
    {"text": "Problema não identificado na via", "categoria": "Outro"},
]


import random


def get_dataset():
    """Retorna o dataset sintético completo (curado + expandido determinístico)."""
    return DATASET + _generate_more()


def get_dataset_by_category():
    """Retorna dataset agrupado por categoria."""
    by_cat = {}
    for item in get_dataset():
        cat = item["categoria"]
        if cat not in by_cat:
            by_cat[cat] = []
        by_cat[cat].append(item["text"])
    return by_cat


def get_categories():
    """Retorna lista de categorias únicas."""
    return list(set(item["categoria"] for item in get_dataset()))


# ---------------------------------------------------------------------------
# Gerador determinístico para expandir o dataset até 75 relatos por categoria.
# Mantém o estilo ASCII do dataset curado (sem acentos) e usa seed fixo.
# ---------------------------------------------------------------------------

_TEMPLATES = {
    "Buraco": [
        "Buraco {tam} na {via}",
        "Cratera aberta {local}",
        "Pavimento esburacado {local}",
        "Afundamento no asfalto {local}",
        "Rua com buracos {local}",
        "Depressao na pista {local}",
        "Erosao formando buraco {local}",
        "Buraqueira na {via} {local}",
        "Sulco profundo {local}",
        "Asfalto deteriorado {local}",
        "Pista com crateras {local}",
        "Buraco fundo oferecendo risco {local}",
        "Desgaste do pavimento {local}",
        "Buraco na {via} proximo {local}",
        "Reboco do asfalto solto {local}",
    ],
    "Iluminacao": [
        "Poste apagado {local}",
        "Lampada queimada na {via}",
        "Iluminacao publica falha {local}",
        "Rua escura a noite {local}",
        "Luminaria quebrada {local}",
        "Falta de luz na via {local}",
        "Poste com luz piscando {local}",
        "Beco escuro por falta de lampada {local}",
        "Refletor apagado {local}",
        "Iluminacao insuficiente {local}",
        "Poste sem lampada {local}",
        "Rua sem iluminacao a noite {local}",
        "Luz publica falhando {local}",
        "Ponto de luz queimado {local}",
        "Iluminacao fraca na {via} {local}",
    ],
    "Semafaro": [
        "Semafaro quebrado {local}",
        "Sinaleira com defeito {local}",
        "Farol de transito apagado {local}",
        "Semafaro de pedestre parado {local}",
        "Cruzamento sem sinal {local}",
        "Semafaro travado no verde {local}",
        "Sinal luminoso piscando errado {local}",
        "Semafaro apagado na {via} {local}",
        "Farol piscando amarelo constante {local}",
        "Sinaleira sem funcionar {local}",
        "Semafaro com luz vermelha fixa {local}",
        "Controle de transito falho {local}",
        "Sinal de pedestre quebrado {local}",
        "Semafaro com defeito no cruzamento {local}",
        "Luz do semafaro apagada {local}",
    ],
    "Arvore Caida": [
        "Arvore caida {local}",
        "Galho grande caido na {via}",
        "Tronco obstruindo a passagem {local}",
        "Queda de arvore na tempestade {local}",
        "Arvore tombada {local}",
        "Galhos quebrados pela chuva {local}",
        "Arvore com risco de cair {local}",
        "Poda urgente de arvore {local}",
        "Tronco na pista {local}",
        "Arvore bloqueando a rua {local}",
        "Galho caido sobre o fio {local}",
        "Arvore caida sobre o muro {local}",
        "Ramos obstruindo a calcada {local}",
        "Arvore arrancada pela ventania {local}",
        "Toco de arvore na {via} {local}",
    ],
    "Entulho": [
        "Entulho acumulado {local}",
        "Lixo irregular descartado {local}",
        "Residuos de construcao {local}",
        "Sujeira acumulada {local}",
        "Material de obra jogado {local}",
        "Restos de demolicao {local}",
        "Terra e pedras na via {local}",
        "Moveis velhos abandonados {local}",
        "Descarte irregular de entulho {local}",
        "Acumulo de residuos {local}",
        "Detritos espalhados {local}",
        "Restos de obra na calcada {local}",
        "Lixo de construcao {local}",
        "Sucata abandonada {local}",
        "Entulho bloqueando passagem {local}",
    ],
    "Calcada Danificada": [
        "Calcada rachada {local}",
        "Passeio publico quebrado {local}",
        "Tampa de bueiro solta {local}",
        "Piso irregular na calcada {local}",
        "Calçamento quebrado {local}",
        "Desnivel perigoso na calcada {local}",
        "Passeio danificado por raizes {local}",
        "Calcada esburacada {local}",
        "Piso levantado {local}",
        "Bueiro aberto na calcada {local}",
        "Placas de calcada soltas {local}",
        "Passeio deteriorado {local}",
        "Rachaduras profundas no piso {local}",
        "Calcada quebrada na frente {local}",
        "Piso da calcada irregular {local}",
    ],
    "Outro": [
        "Vazamento de agua {local}",
        "Esgoto estourado {local}",
        "Fio eletrico partido {local}",
        "Placa de transito caida {local}",
        "Barulho excessivo de obra {local}",
        "Mato alto no terreno {local}",
        "Animal solto na via {local}",
        "Carro abandonado {local}",
        "Poluicao sonora constante {local}",
        "Falta de coleta de lixo {local}",
        "Alagamento apos chuva {local}",
        "Desmoronamento de muro {local}",
        "Obras paralisadas {local}",
        "Falta de manutencao {local}",
        "Problema na rede de esgoto {local}",
    ],
}

_SUFIXOS = [
    "perto da escola",
    "em frente ao mercado",
    "na praca central",
    "no bairro centro",
    "proximo ao hospital",
    "na avenida principal",
    "em frente a igreja",
    "na rua principal",
    "no cruzamento movimentado",
    "proximo ao terminal",
    "na praca da matriz",
    "em frente ao posto",
    "na orla do rio",
    "na entrada do bairro",
    "na rua do comercio",
    "proximo ao parque",
    "na esquina da padaria",
    "em frente ao predio publico",
]

_TAMS = ["enorme", "fundo", "perigoso", "grande", "medio", "pequeno", "largo", "profundo"]
_VIAS = ["avenida", "rua", "alameda", "travessa", "rodovia"]


def _generate_more(seed=42, alvo=75):
    """Gera relatos determinísticos até cada categoria atingir `alvo` exemplos."""
    rng = random.Random(seed)
    extra = []
    contador = {}
    for item in DATASET:
        contador[item["categoria"]] = contador.get(item["categoria"], 0) + 1
    for categoria, templates in _TEMPLATES.items():
        while contador.get(categoria, 0) < alvo:
            tpl = rng.choice(templates)
            sufixo = rng.choice(_SUFIXOS)
            texto = tpl.format(
                tam=rng.choice(_TAMS),
                via=rng.choice(_VIAS),
                local=sufixo,
            )
            extra.append({"text": texto, "categoria": categoria})
            contador[categoria] = contador.get(categoria, 0) + 1
    return extra


if __name__ == "__main__":
    print(f"Total de relatos: {len(get_dataset())}")
    by_cat = get_dataset_by_category()
    for cat, texts in sorted(by_cat.items()):
        print(f"  {cat}: {len(texts)} relatos")
