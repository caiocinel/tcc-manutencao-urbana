# Relatório de Experimentos Acadêmicos
**Data:** 2026-08-04 18:09:42

---

## 1. Avaliação do Classificador ONNX

### Configuração
- **Modelo:** paraphrase-multilingual-MiniLM-L12-v2
- **Quantização:** INT8
- **Dataset:** 100 relatos sintéticos
- **Categorias:** 7

### Métricas Globais
- **Acurácia:** 45.77%
- **Confiança Média:** 0.2621

### Métricas por Categoria

| Categoria | Precision | Recall | F1-Score | Support |
|-----------|-----------|--------|----------|---------|
| Arvore Caida | 0.4286 | 0.4286 | 0.4286 | 14 |
| Buraco | 0.3333 | 0.7333 | 0.4583 | 15 |
| Calcada Danificada | 0.5000 | 0.4286 | 0.4615 | 14 |
| Entulho | 0.7500 | 0.6429 | 0.6923 | 14 |
| Iluminacao | 0.7333 | 0.7857 | 0.7586 | 14 |
| Outro | 0.0000 | 0.0000 | 0.0000 | 15 |
| Semafaro | 0.5000 | 0.5000 | 0.5000 | 14 |

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
- ⚠️ **Acurácia baixa (45.77%)**: O modelo requer fine-tuning com mais exemplos por categoria
- A categoria 'Outro' não possui centróide definido, resultando em 0% de acerto
- Recomenda-se aumentar o dataset de treinamento para 50+ exemplos por categoria

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