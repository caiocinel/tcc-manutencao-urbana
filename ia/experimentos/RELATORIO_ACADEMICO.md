# Relatório de Experimentos Acadêmicos

**Data:** 2026-08-04 18:09:42

---

## 1. Avaliação do Classificador ONNX

### Configuração

- **Modelo:** paraphrase-multilingual-MiniLM-L12-v2
- **Quantização:** INT8
- **Dataset:** 525 relatos sintéticos (75 por categoria)
- **Categorias:** 7

### Métricas Globais

- **Acurácia:** 43.73%
- **Confiança Média:** 0.2456

### Métricas por Categoria

| Categoria | Precision | Recall | F1-Score | Support |
|-----------|-----------|--------|----------|---------|
| Arvore Caida | 0.4444 | 0.3200 | 0.3721 | 75 |
| Buraco | 0.2632 | 0.6667 | 0.3774 | 75 |
| Calcada Danificada | 0.3529 | 0.4800 | 0.4068 | 75 |
| Entulho | 0.7174 | 0.4400 | 0.5455 | 75 |
| Iluminacao | 0.7903 | 0.6533 | 0.7153 | 75 |
| Outro | 0.0000 | 0.0000 | 0.0000 | 75 |
| Semafaro | 0.4930 | 0.4667 | 0.4795 | 75 |

**Média Ponderada:** Precision 0.4373 · Recall 0.4324 · F1 0.4138 · Support 525

### Matriz de Confusão

```
         Real \ Pred Arvore C   Buraco Calcada   Entulho Iluminac    Outro Semafaro
-----------------------------------------------------------------------------------
        Arvore Caida       24       33       12        0        1        0        5
              Buraco        4       50       17        1        0        0        3
  Calcada Danificada        4       28       36        2        0        0        5
             Entulho        2       21       10       33        0        0        9
          Iluminacao        3       11        9        0       49        0        3
               Outro       13       31       10       10        0        0       11
            Semafaro        4       16        8        0       12        0       35
```

## 2. Benchmark de Performance

### Endpoint /classify

- **Latência Média:** 94.75ms
- **Latência P95:** 104.03ms
- **Throughput:** 10.6 req/s

### Endpoint /embeddings-batch

| Batch Size | Latência Total | Latência/Texto |
|------------|----------------|----------------|
| 1 | 99.38ms | 99.38ms |
| 5 | 599.16ms | 119.83ms |
| 10 | 1011.59ms | 101.16ms |
| 20 | 1805.19ms | 90.26ms |
| 50 | 4599.16ms | 91.98ms |

### Endpoint /text-similarity

- **Latência Média:** 180.87ms

### Health Check

- **Latência Média:** 8.86ms

## 3. Avaliação da Detecção de Duplicados

### Configuração

- **Pares testados:** 16
- **Raios testados:** [30, 50, 100]m
- **Limiares testados:** [0.7, 0.75, 0.8, 0.85]

### Melhor Configuração

- **Raio:** 50m
- **Limiar de Similaridade:** 0.70
- **Acurácia:** 56.25%
- **Precisão:** 0.6667
- **Recall:** 0.4444
- **F1-Score:** 0.5333

### Matriz de Resultados (Raio × Limiar)

| Raio (m) | Limiar | Acurácia | Precisão | Recall | F1 |
|----------|--------|----------|----------|--------|----|
| 30 | 0.70 | 56.25% | 0.7500 | 0.3333 | 0.4615 |
| 30 | 0.75 | 56.25% | 0.7500 | 0.3333 | 0.4615 |
| 30 | 0.80 | 50.00% | 0.6667 | 0.2222 | 0.3333 |
| 30 | 0.85 | 43.75% | 0.5000 | 0.1111 | 0.1818 |
| 50 | 0.70 | 56.25% | 0.6667 | 0.4444 | 0.5333 |
| 50 | 0.75 | 56.25% | 0.6667 | 0.4444 | 0.5333 |
| 50 | 0.80 | 50.00% | 0.6000 | 0.3333 | 0.4286 |
| 50 | 0.85 | 43.75% | 0.5000 | 0.2222 | 0.3077 |
| 100 | 0.70 | 50.00% | 0.5714 | 0.4444 | 0.5000 |
| 100 | 0.75 | 50.00% | 0.5714 | 0.4444 | 0.5000 |
| 100 | 0.80 | 43.75% | 0.5000 | 0.3333 | 0.4000 |
| 100 | 0.85 | 37.50% | 0.4000 | 0.2222 | 0.2857 |

## 4. Conclusões e Recomendações

### Classificador

- ⚠️ **Acurácia abaixo do alvo (43.73% vs. alvo ≥70%)**: A expansão do dataset (100→525 relatos, 75 por categoria) não elevou a acurácia; o modelo ainda requer fine-tuning/retreinamento do centróide.
- A categoria 'Outro' não possui centróide definido, resultando em 0% de acerto (75 relatos todos classificados como outras categorias). Esta categoria é um "catch-all" e o classificador atual não consegue representá-la.
- **Próximos passos:** (1) adicionar mais templates por categoria para aumentar a variedade lexical; (2) tuning de temperatura do centróide/limiar de confiança; (3) re-treinar os centróides do modelo ONNX com o dataset expandido (75 exemplos por categoria, incluindo 'Outro'); (4) avaliar a separabilidade das categorias no espaço de embedding (muitas confusões Buraco↔Calcada Danificada↔Arvore Caida indicam baixa distância entre centróides).

### Performance

- ✅ **Latência adequada**: ~95ms por classificação (10.6 req/s)
- ✅ **Batch processing eficiente**: ~92ms/texto em batch de 50
- ✅ **Health check rápido**: ~9ms

### Detecção de Duplicados

- ✅ **Melhor configuração validada**: raio=50m, limiar=0.70
- ⚠️ **F1 moderado (0.5333)**: Sugere necessidade de ajuste fino nos limiares
- Recomenda-se expandir o dataset de teste para 50+ pares

---

*Relatório gerado automaticamente pelo script de experimentos acadêmicos.*
