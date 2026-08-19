"""
Avaliação do classificador ONNX multilíngue.
Calcula matriz de confusão, precision, recall e F1-score por categoria.
Executa dentro do container IA.
"""

import json
import sys
import urllib.request
from collections import defaultdict

from dataset_sintetico import get_dataset, get_categories

IA_URL = "http://localhost:8000"


def classify_text(text):
    """Chama endpoint /classify do serviço IA."""
    payload = json.dumps({"text": text}).encode()
    req = urllib.request.Request(
        f"{IA_URL}/classify",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        return result["category"], result["confidence"]
    except Exception as e:
        print(f"  Erro ao classificar '{text[:40]}...': {e}")
        return None, 0.0


def compute_metrics(y_true, y_pred, categories):
    """Calcula precision, recall e F1 por categoria."""
    metrics = {}
    for cat in categories:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == cat and p == cat)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != cat and p == cat)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == cat and p != cat)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

        metrics[cat] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": sum(1 for t in y_true if t == cat),
        }

    return metrics


def build_confusion_matrix(y_true, y_pred, categories):
    """Constrói matriz de confusão."""
    matrix = defaultdict(lambda: defaultdict(int))
    for t, p in zip(y_true, y_pred):
        matrix[t][p] += 1
    return matrix


def print_confusion_matrix(matrix, categories):
    """Imprime matriz de confusão formatada."""
    print("\n=== MATRIZ DE CONFUSÃO ===")
    print(f"{'Real \\ Pred':>20}", end="")
    for cat in categories:
        print(f" {cat[:8]:>8}", end="")
    print()
    print("-" * (20 + 9 * len(categories)))

    for real_cat in categories:
        print(f"{real_cat:>20}", end="")
        for pred_cat in categories:
            count = matrix[real_cat][pred_cat]
            print(f" {count:>8}", end="")
        print()


def print_metrics(metrics, categories):
    """Imprime tabela de métricas."""
    print("\n=== MÉTRICAS POR CATEGORIA ===")
    print(f"{'Categoria':>25} {'Precision':>10} {'Recall':>10} {'F1':>10} {'Support':>10}")
    print("-" * 70)

    total_precision = 0
    total_recall = 0
    total_f1 = 0
    total_support = 0

    for cat in categories:
        m = metrics[cat]
        print(f"{cat:>25} {m['precision']:>10.4f} {m['recall']:>10.4f} {m['f1']:>10.4f} {m['support']:>10}")
        total_precision += m["precision"] * m["support"]
        total_recall += m["recall"] * m["support"]
        total_f1 += m["f1"] * m["support"]
        total_support += m["support"]

    print("-" * 70)
    if total_support > 0:
        print(f"{'Média Ponderada':>25} {total_precision/total_support:>10.4f} {total_recall/total_support:>10.4f} {total_f1/total_support:>10.4f} {total_support:>10}")

    acc = sum(metrics[c]["recall"] * metrics[c]["support"] for c in categories) / total_support if total_support > 0 else 0
    print(f"\nAcurácia Global: {acc:.4f}")


def run_evaluation():
    """Executa avaliação completa do classificador."""
    print("=" * 70)
    print("AVALIAÇÃO DO CLASSIFICADOR ONNX MULTILÍNGUE")
    print("Modelo: paraphrase-multilingual-MiniLM-L12-v2 (INT8 quantizado)")
    print("=" * 70)

    dataset = get_dataset()
    categories = sorted(get_categories())

    print(f"\nDataset: {len(dataset)} relatos em {len(categories)} categorias")
    print(f"Categorias: {', '.join(categories)}\n")

    y_true = []
    y_pred = []
    confidences = []

    print("Classificando relatos...")
    for i, item in enumerate(dataset):
        text = item["text"]
        expected = item["categoria"]

        predicted, confidence = classify_text(text)
        if predicted is None:
            continue

        y_true.append(expected)
        y_pred.append(predicted)
        confidences.append(confidence)

        status = "✓" if predicted == expected else "✗"
        print(f"  [{i+1:3d}/{len(dataset)}] {status} Esperado: {expected:<20} Predito: {predicted:<20} (conf: {confidence:.3f})")

    print(f"\nTotal classificado: {len(y_true)}/{len(dataset)}")

    if not y_true:
        print("ERRO: Nenhum relato foi classificado.")
        return

    metrics = compute_metrics(y_true, y_pred, categories)
    matrix = build_confusion_matrix(y_true, y_pred, categories)

    print_confusion_matrix(matrix, categories)
    print_metrics(metrics, categories)

    avg_confidence = sum(confidences) / len(confidences)
    print(f"\nConfiança Média: {avg_confidence:.4f}")

    results = {
        "modelo": "paraphrase-multilingual-MiniLM-L12-v2",
        "quantizacao": "INT8",
        "dataset_size": len(dataset),
        "categorias": categories,
        "metricas": metrics,
        "confianca_media": round(avg_confidence, 4),
        "acuracia_global": round(sum(metrics[c]["recall"] * metrics[c]["support"] for c in categories) / len(y_true), 4) if y_true else 0,
    }

    with open("resultados_classificacao.json", "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nResultados salvos em: resultados_classificacao.json")

    return results


if __name__ == "__main__":
    run_evaluation()
