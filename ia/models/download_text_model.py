"""
download_text_model.py
Baixa sentence-transformers/all-MiniLM-L6-v2, exporta para ONNX,
computa embeddings de centroides por categoria.
Uso: python download_text_model.py [--output-dir DIR]
"""

import argparse
import json
import os
import sys
from pathlib import Path
import numpy as np


CATEGORY_EXAMPLES: dict[str, list[str]] = {
    "Buraco": [
        "Buraco na rua",
        " cratera no asfalto",
        "pavimento quebrado",
        "buraqueira na avenida",
        "depressao no asfalto",
        "erosao na pista",
    ],
    "Iluminacao": [
        "Poste de luz apagado",
        "lampada queimada na rua",
        "iluminacao publica falhando",
        "rua escura sem luz a noite",
        "luminaria quebrada no poste",
        "falta de luz na via publica",
    ],
    "Semafaro": [
        "Semafaro quebrado no cruzamento",
        "sinaleira com defeito",
        "cruzamento perigoso sem farol",
        "semafaro de pedestre piscando",
        "transito parado por semafaro",
        "sinal luminoso de transito apagado",
    ],
    "Arvore Caida": [
        "Arvore caiu na rua",
        "galho caido na calcada",
        "tronco obstruindo passagem",
        "queda de arvore na tempestade",
        "raiz levantando calcada",
        "poda de arvore necessaria",
    ],
    "Entulho": [
        "Entulho acumulado na calcada",
        "lixo irregular descartado na via",
        "residuos de construcao no terreno",
        "sujeira acumulada no espaco publico",
        "detrito na via publica",
        "material descartado irregularmente",
    ],
    "Calcada Danificada": [
        "Calcada rachada e perigosa",
        "passeio publico quebrado",
        "tampa de bueiro solta",
        "buraco na calcada",
        "piso irregular na calcada",
        "calcamento quebrado na esquina",
    ],
}


def mean_pooling(embeddings: np.ndarray, attention_mask: np.ndarray) -> np.ndarray:
    mask = attention_mask[:, :, np.newaxis].astype(np.float32)
    sum_emb = np.sum(embeddings * mask, axis=1)
    sum_mask = np.clip(np.sum(mask, axis=1), a_min=1e-9, a_max=None)
    return sum_emb / sum_mask


def normalize(embeddings: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(embeddings, axis=-1, keepdims=True)
    return embeddings / np.clip(norms, a_min=1e-9, a_max=None)


def export_to_onnx(output_dir: Path):
    print("Carregando tokenizer e modelo: sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

    from transformers import AutoTokenizer, AutoModel
    import torch

    tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    model = AutoModel.from_pretrained("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    model.eval()

    output_dir.mkdir(parents=True, exist_ok=True)

    dummy_text = "exemplo de texto para rastreamento do modelo"
    dummy_tokens = tokenizer(dummy_text, return_tensors="pt", padding=True, truncation=True)

    onnx_path = output_dir / "text_model_fp32.onnx"
    print(f"Exportando para ONNX (FP32): {onnx_path}")

    with torch.no_grad():
        torch.onnx.export(
            model,
            (dummy_tokens["input_ids"], dummy_tokens["attention_mask"]),
            str(onnx_path),
            input_names=["input_ids", "attention_mask"],
            output_names=["last_hidden_state", "pooler_output"],
            dynamic_axes={
                "input_ids": {0: "batch_size", 1: "sequence"},
                "attention_mask": {0: "batch_size", 1: "sequence"},
                "last_hidden_state": {0: "batch_size", 1: "sequence"},
                "pooler_output": {0: "batch_size"},
            },
            opset_version=14,
        )

    tokenizer.save_pretrained(str(output_dir))
    size_mb = onnx_path.stat().st_size / (1024 * 1024)
    print(f"Modelo ONNX exportado (FP32): {onnx_path} ({size_mb:.1f}MB)")

    print("\nAplicando quantização INT8...")
    from onnxruntime.quantization import quantize_dynamic, QuantType

    onnx_quant_path = output_dir / "text_model.onnx"
    quantize_dynamic(
        model_input=str(onnx_path),
        model_output=str(onnx_quant_path),
        weight_type=QuantType.QUInt8
    )

    onnx_path.unlink()
    onnx_data_path = onnx_path.with_suffix('.onnx.data')
    if onnx_data_path.exists():
        onnx_data_path.unlink()
    size_mb = onnx_quant_path.stat().st_size / (1024 * 1024)
    print(f"Modelo ONNX quantizado (INT8): {onnx_quant_path} ({size_mb:.1f}MB)")

    tz_path = output_dir / "tokenizer.json"
    if tz_path.exists():
        print(f"Tokenizer salvo: {tz_path}")
    else:
        tz_alt = output_dir / "tokenizer_config.json"
        if tz_alt.exists():
            print(f"Aviso: tokenizer.json ausente, mas tokenizer_config.json encontrado")
        else:
            print("ERRO: tokenizer nao foi salvo")
            sys.exit(1)

    print("\nComputando embeddings de centroides por categoria...")
    cat_names = list(CATEGORY_EXAMPLES.keys())
    cat_examples_list = list(CATEGORY_EXAMPLES.values())

    all_embeddings = []

    for examples in cat_examples_list:
        ex_embs = []
        for ex in examples:
            tokens = tokenizer(ex, return_tensors="pt", padding=True, truncation=True, max_length=128)
            with torch.no_grad():
                outputs = model(**tokens)
            last_hidden = outputs.last_hidden_state.numpy()
            mask = tokens["attention_mask"].numpy()
            pooled = mean_pooling(last_hidden, mask)
            pooled = normalize(pooled)
            ex_embs.append(pooled[0])
        centroid = np.mean(ex_embs, axis=0)
        centroid = normalize(centroid[np.newaxis, :])[0]
        all_embeddings.append(centroid)

    centroids = np.array(all_embeddings, dtype=np.float32)
    labels_path = output_dir / "centroids_labels.json"
    npy_path = output_dir / "centroids.npy"

    with open(labels_path, "w") as f:
        json.dump(cat_names, f, ensure_ascii=False)
    np.save(str(npy_path), centroids)

    print(f"Centroides salvos: {npy_path} ({centroids.shape})")
    print(f"Labels: {labels_path}")
    for i, name in enumerate(cat_names):
        print(f"  {name}: {centroids[i][:5]}...")


def main():
    parser = argparse.ArgumentParser(description="Download e export ONNX do modelo de texto")
    parser.add_argument(
        "--output-dir",
        default=os.path.join(os.path.dirname(__file__), "."),
        help="Diretorio de saida",
    )
    args = parser.parse_args()
    output_dir = Path(args.output_dir)
    export_to_onnx(output_dir)


if __name__ == "__main__":
    main()
