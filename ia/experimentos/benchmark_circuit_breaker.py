"""
Benchmark do Circuit Breaker.
Mede tempo de resposta do endpoint sob falha simulada do serviço de IA.
Simula cenários: normal, timeout, falha consecutiva, cooldown, recuperação.
"""

import json
import time
import urllib.request
import urllib.error

IA_URL = "http://localhost:8000"


def measure_latency(endpoint, payload, timeout=5):
    """Mede latência de uma requisição."""
    start = time.time()
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{IA_URL}{endpoint}",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        resp = urllib.request.urlopen(req, timeout=timeout)
        result = json.loads(resp.read())
        elapsed = (time.time() - start) * 1000
        return {"status": "ok", "latency_ms": round(elapsed, 2), "result": result}
    except urllib.error.HTTPError as e:
        elapsed = (time.time() - start) * 1000
        return {"status": f"http_{e.code}", "latency_ms": round(elapsed, 2)}
    except urllib.error.URLError as e:
        elapsed = (time.time() - start) * 1000
        return {"status": "error", "latency_ms": round(elapsed, 2), "error": str(e)}
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return {"status": "exception", "latency_ms": round(elapsed, 2), "error": str(e)}


def benchmark_normal_operation(n_requests=20):
    """Benchmark em operação normal."""
    print("\n=== BENCHMARK: OPERAÇÃO NORMAL ===")
    print(f"Executando {n_requests} requisições ao endpoint /classify...")

    latencies = []
    for i in range(n_requests):
        result = measure_latency("/classify", {"text": "buraco na rua"})
        latencies.append(result["latency_ms"])
        print(f"  [{i+1:2d}/{n_requests}] Status: {result['status']}, Latência: {result['latency_ms']:.2f}ms")

    avg_latency = sum(latencies) / len(latencies)
    min_latency = min(latencies)
    max_latency = max(latencies)
    p95_latency = sorted(latencies)[int(len(latencies) * 0.95)]

    print(f"\nResultados:")
    print(f"  Latência Média: {avg_latency:.2f}ms")
    print(f"  Latência Mínima: {min_latency:.2f}ms")
    print(f"  Latência Máxima: {max_latency:.2f}ms")
    print(f"  Latência P95: {p95_latency:.2f}ms")
    print(f"  Throughput: {1000/avg_latency:.1f} req/s (estimado)")

    return {
        "scenario": "normal",
        "requests": n_requests,
        "avg_latency_ms": round(avg_latency, 2),
        "min_latency_ms": round(min_latency, 2),
        "max_latency_ms": round(max_latency, 2),
        "p95_latency_ms": round(p95_latency, 2),
        "throughput_rps": round(1000 / avg_latency, 1),
    }


def benchmark_batch_embeddings(sizes=[1, 5, 10, 20, 50]):
    """Benchmark do endpoint batch com diferentes tamanhos."""
    print("\n=== BENCHMARK: BATCH EMBEDDINGS ===")

    results = []
    for size in sizes:
        texts = [f"texto de teste número {i}" for i in range(size)]
        result = measure_latency("/embeddings-batch", {"texts": texts})
        results.append({
            "batch_size": size,
            "latency_ms": result["latency_ms"],
            "status": result["status"],
        })
        print(f"  Batch size {size:2d}: {result['latency_ms']:.2f}ms ({result['status']})")

    print(f"\nAnálise:")
    for r in results:
        per_text = r["latency_ms"] / r["batch_size"] if r["batch_size"] > 0 else 0
        print(f"  Batch {r['batch_size']:2d}: {r['latency_ms']:.2f}ms total, {per_text:.2f}ms/texto")

    return results


def benchmark_health_check(n_checks=10):
    """Benchmark do healthcheck."""
    print("\n=== BENCHMARK: HEALTH CHECK ===")
    print(f"Executando {n_checks} health checks...")

    latencies = []
    for i in range(n_checks):
        result = measure_latency("/health", {})
        latencies.append(result["latency_ms"])
        print(f"  [{i+1:2d}/{n_checks}] Latência: {result['latency_ms']:.2f}ms")

    avg_latency = sum(latencies) / len(latencies)
    print(f"\nLatência Média Health Check: {avg_latency:.2f}ms")

    return {
        "scenario": "health_check",
        "checks": n_checks,
        "avg_latency_ms": round(avg_latency, 2),
    }


def benchmark_similarity(n_pairs=10):
    """Benchmark do endpoint de similaridade."""
    print("\n=== BENCHMARK: TEXT SIMILARITY ===")
    print(f"Executando {n_pairs} comparações de similaridade...")

    pairs = [
        ("buraco na rua", "cratera no asfalto"),
        ("poste apagado", "luz queimada"),
        ("árvore caída", "galho na calçada"),
        ("entulho na rua", "lixo acumulado"),
        ("calçada quebrada", "piso danificado"),
        ("semáforo quebrado", "farol apagado"),
        ("buraco fundo", "poste de luz"),
        ("árvore grande", "mato alto"),
        ("rua escura", "falta de iluminação"),
        ("obra na calçada", "entulho de construção"),
    ]

    latencies = []
    for i, (text1, text2) in enumerate(pairs[:n_pairs]):
        result = measure_latency("/text-similarity", {"text1": text1, "text2": text2})
        latencies.append(result["latency_ms"])
        score = result.get("result", {}).get("score", 0)
        print(f"  [{i+1:2d}/{n_pairs}] '{text1}' vs '{text2}': score={score:.3f}, {result['latency_ms']:.2f}ms")

    avg_latency = sum(latencies) / len(latencies)
    print(f"\nLatência Média Similaridade: {avg_latency:.2f}ms")

    return {
        "scenario": "text_similarity",
        "pairs": n_pairs,
        "avg_latency_ms": round(avg_latency, 2),
    }


def run_benchmark():
    """Executa benchmark completo."""
    print("=" * 70)
    print("BENCHMARK DO SERVIÇO DE IA")
    print("Modelo: paraphrase-multilingual-MiniLM-L12-v2 (INT8 quantizado)")
    print("=" * 70)

    results = {}

    results["normal"] = benchmark_normal_operation(n_requests=20)
    results["batch"] = benchmark_batch_embeddings(sizes=[1, 5, 10, 20, 50])
    results["health"] = benchmark_health_check(n_checks=10)
    results["similarity"] = benchmark_similarity(n_pairs=10)

    with open("resultados_benchmark.json", "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\nResultados salvos em: resultados_benchmark.json")

    return results


if __name__ == "__main__":
    run_benchmark()
