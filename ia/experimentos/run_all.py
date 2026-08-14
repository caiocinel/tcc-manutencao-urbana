"""
Script principal de experimentos acadêmicos.
Executa todas as avaliações e gera relatório consolidado.
"""

import json
import sys
import time
from datetime import datetime

import avaliar_classificador
import benchmark_circuit_breaker
import avaliar_duplicados


def run_all_experiments():
    """Executa todos os experimentos acadêmicos."""
    print("=" * 70)
    print("EXPERIMENTOS ACADÊMICOS — CENTRAL DE INTELIGÊNCIA URBANA")
    print(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    start_time = time.time()
    results = {}

    print("\n" + "=" * 70)
    print("FASE 1: AVALIAÇÃO DO CLASSIFICADOR")
    print("=" * 70)
    results["classificador"] = avaliar_classificador.run_evaluation()

    print("\n" + "=" * 70)
    print("FASE 2: BENCHMARK DE PERFORMANCE")
    print("=" * 70)
    results["benchmark"] = benchmark_circuit_breaker.run_benchmark()

    print("\n" + "=" * 70)
    print("FASE 3: AVALIAÇÃO DE DUPLICADOS")
    print("=" * 70)
    results["duplicados"] = avaliar_duplicados.run_duplicate_evaluation()

    elapsed = time.time() - start_time

    print("\n" + "=" * 70)
    print("RESUMO EXECUTIVO")
    print("=" * 70)

    print("\n1. CLASSIFICADOR:")
    if results["classificador"]:
        print(f"   Acurácia Global: {results['classificador']['acuracia_global']:.4f}")
        print(f"   Confiança Média: {results['classificador']['confianca_media']:.4f}")
        print(f"   Dataset: {results['classificador']['dataset_size']} relatos")

    print("\n2. BENCHMARK:")
    if results["benchmark"]:
        normal = results["benchmark"].get("normal", {})
        print(f"   Latência Média /classify: {normal.get('avg_latency_ms', 0):.2f}ms")
        print(f"   Throughput: {normal.get('throughput_rps', 0):.1f} req/s")
        batch = results["benchmark"].get("batch", [])
        if batch:
            print(f"   Batch Embeddings (50 textos): {batch[-1].get('latency_ms', 0):.2f}ms")

    print("\n3. DETECÇÃO DE DUPLICADOS:")
    if results["duplicados"]:
        best = results["duplicados"].get("best_result", {})
        print(f"   Melhor Configuração: raio={best.get('radius_m', 0)}m, limiar={best.get('threshold', 0):.2f}")
        print(f"   F1-Score: {best.get('f1', 0):.4f}")
        print(f"   Acurácia: {best.get('accuracy', 0):.4f}")

    print(f"\nTempo Total de Execução: {elapsed:.1f}s")

    with open("resultados_completos.json", "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nResultados completos salvos em: resultados_completos.json")

    return results


if __name__ == "__main__":
    run_all_experiments()
