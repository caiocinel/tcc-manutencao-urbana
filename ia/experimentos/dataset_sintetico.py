"""
Dataset sintético de relatos urbanos em PT-BR para validação do classificador.
100 relatos distribuídos em 7 categorias (~14-15 por categoria).
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


def get_dataset():
    """Retorna o dataset sintético completo."""
    return DATASET


def get_dataset_by_category():
    """Retorna dataset agrupado por categoria."""
    by_cat = {}
    for item in DATASET:
        cat = item["categoria"]
        if cat not in by_cat:
            by_cat[cat] = []
        by_cat[cat].append(item["text"])
    return by_cat


def get_categories():
    """Retorna lista de categorias únicas."""
    return list(set(item["categoria"] for item in DATASET))


if __name__ == "__main__":
    print(f"Total de relatos: {len(DATASET)}")
    by_cat = get_dataset_by_category()
    for cat, texts in sorted(by_cat.items()):
        print(f"  {cat}: {len(texts)} relatos")
