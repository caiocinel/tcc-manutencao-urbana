"""
gerar_centroides.py
Regenera os centróides por categoria a partir do dataset sintético expandido
(525 relatos, 75 por categoria, incluindo "Outro").

Usa o modelo ONNX já baixado (sem precisar de torch) para computar os embeddings.
Substitui os centróides antigos (CATEGORY_EXAMPLES com apenas 6 categorias) por
centróides robustos derivados do dataset completo.

Uso (dentro do container IA):
  python gerar_centroides.py [--output-dir /app/models]
"""

import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np


CATEGORIES = [
    "Buraco",
    "Iluminacao",
    "Semafaro",
    "Arvore Caida",
    "Entulho",
    "Calcada Danificada",
    "Outro",
]


def mean_pooling(embeddings, attention_mask):
    mask = attention_mask[:, :, np.newaxis].astype(np.float32)
    sum_emb = np.sum(embeddings * mask, axis=1)
    sum_mask = np.clip(np.sum(mask, axis=1), a_min=1e-9, a_max=None)
    return sum_emb / sum_mask


def normalize(embeddings):
    norms = np.linalg.norm(embeddings, axis=-1, keepdims=True)
    return embeddings / np.clip(norms, a_min=1e-9, a_max=None)


def build_centroids_from_dataset(model_dir: Path, output_dir: Path):
    from inference import TextClassifier

    classifier = TextClassifier(model_path=str(model_dir / "text_model.onnx"))
    if classifier.session is None or classifier.tokenizer is None:
        print("ERRO: modelo ONNX ou tokenizer nao carregados", file=sys.stderr)
        sys.exit(1)

    sys.path.insert(0, str(Path(__file__).parent / "experimentos"))
    from dataset_sintetico import get_dataset_by_category

    by_cat = get_dataset_by_category()
    missing = [c for c in CATEGORIES if c not in by_cat]
    if missing:
        print(f"ERRO: categorias sem exemplos no dataset: {missing}", file=sys.stderr)
        sys.exit(1)

    all_embeddings = []
    for cat in CATEGORIES:
        texts = by_cat[cat]
        ex_embs = []
        for text in texts:
            emb = classifier._encode(text)
            if emb is not None:
                ex_embs.append(emb)
        if not ex_embs:
            print(f"ERRO: categoria '{cat}' sem embeddings validos", file=sys.stderr)
            sys.exit(1)
        centroid = np.mean(np.array(ex_embs), axis=0)
        centroid = normalize(centroid[np.newaxis, :])[0]
        all_embeddings.append(centroid)

    centroids = np.array(all_embeddings, dtype=np.float32)

    output_dir.mkdir(parents=True, exist_ok=True)
    labels_path = output_dir / "centroids_labels.json"
    npy_path = output_dir / "centroids.npy"

    with open(labels_path, "w") as f:
        json.dump(CATEGORIES, f, ensure_ascii=False)
    np.save(str(npy_path), centroids)

    print(f"Centroides salvos: {npy_path} ({centroids.shape})")
    print(f"Labels: {labels_path}")
    for i, name in enumerate(CATEGORIES):
        print(f"  {name}: {centroids[i][:5]}...")


def main():
    parser = argparse.ArgumentParser(description="Regenera centróides do dataset expandido")
    parser.add_argument(
        "--output-dir",
        default=os.path.join(os.path.dirname(__file__), "models"),
        help="Diretorio de saida dos centróides",
    )
    args = parser.parse_args()
    output_dir = Path(args.output_dir)
    build_centroids_from_dataset(output_dir, output_dir)


if __name__ == "__main__":
    main()