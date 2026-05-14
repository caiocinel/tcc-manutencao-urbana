"""
download_image_model.py
Baixa MobileNetV3-small, remove classifier head, exporta para ONNX
como extrator de features (576-dim).
Uso: python download_image_model.py [--output-dir DIR]
"""

import argparse
import os
import sys
from pathlib import Path


def export_to_onnx(output_dir: Path):
    import torch
    import torchvision.models as models

    print("Carregando MobileNetV3-small (weights DEFAULT)...")
    model = models.mobilenet_v3_small(weights="DEFAULT")

    classifier = model.classifier
    in_features = classifier[0].in_features
    model.classifier = torch.nn.Identity()
    print(f"Classifier removido — feature dimension: {in_features}")

    model.eval()

    output_dir.mkdir(parents=True, exist_ok=True)

    dummy_input = torch.randn(1, 3, 224, 224)
    onnx_path = output_dir / "image_model.onnx"

    print(f"Exportando extrator de features para ONNX: {onnx_path}")
    with torch.no_grad():
        torch.onnx.export(
            model,
            dummy_input,
            str(onnx_path),
            input_names=["input"],
            output_names=["features"],
            dynamic_axes={
                "input": {0: "batch_size"},
                "features": {0: "batch_size"},
            },
            opset_version=14,
        )

    size_mb = onnx_path.stat().st_size / (1024 * 1024)
    print(f"Modelo ONNX exportado: {onnx_path} ({size_mb:.1f}MB)")

    out = model(dummy_input)
    print(f"Output shape: {out.shape} (esperado: [1, {in_features}])")


def main():
    parser = argparse.ArgumentParser(description="Download e export ONNX do modelo de imagem")
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
