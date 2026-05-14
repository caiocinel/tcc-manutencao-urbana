"""
test_load.py — Teste de carga para o servico IA (ONNX local).
Uso: python test_load.py [--url http://localhost:8000] [--requests 50] [--concurrent 10]
"""

import argparse
import time
import statistics
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

import httpx


def classify_text(client: httpx.Client, url: str, text: str) -> float:
    start = time.time()
    resp = client.post(f"{url}/classify", json={"text": text}, timeout=30)
    resp.raise_for_status()
    elapsed = time.time() - start
    return elapsed


def main():
    parser = argparse.ArgumentParser(description="Teste de carga IA")
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--requests", type=int, default=50)
    parser.add_argument("--concurrent", type=int, default=10)
    args = parser.parse_args()

    textos = [
        "Buraco enorme na rua principal, perto do semaforo, carro quase quebrou",
        "Poste de luz apagado ha uma semana na esquina da avenida",
        "Arvore caiu na calcada depois da tempestade, bloqueando a passagem",
        "Semafaro quebrado no cruzamento movimentado, perigoso para pedestres",
        "Entulho acumulado na calcada, moradores jogam lixo irregularmente",
    ]

    print(f"=== Teste de carga IA ({args.requests} req, {args.concurrent} concorrentes) ===")
    print(f"URL: {args.url}")

    with httpx.Client() as client:
        try:
            health = client.get(f"{args.url}/health", timeout=5)
            print(f"Health: {health.json()}")
        except Exception as e:
            print(f"Erro ao conectar: {e}")
            sys.exit(1)

    latencias = []

    with ThreadPoolExecutor(max_workers=args.concurrent) as executor:
        futures = []
        for i in range(args.requests):
            text = textos[i % len(textos)]
            with httpx.Client() as client:
                futures.append(executor.submit(classify_text, client, args.url, text))

        for i, future in enumerate(as_completed(futures)):
            try:
                elapsed = future.result()
                latencias.append(elapsed)
                bar = "█" * int(elapsed * 50)
                print(f"[{i+1:3d}] {elapsed*1000:6.1f}ms {bar}")
            except Exception as e:
                print(f"[{i+1:3d}] ERRO: {e}")

    if latencias:
        print(f"\n=== Resultados ===")
        print(f"Total: {len(latencias)} requisicoes")
        print(f"Media: {statistics.mean(latencias)*1000:.1f}ms")
        print(f"Mediana: {statistics.median(latencias)*1000:.1f}ms")
        if len(latencias) > 1:
            print(f"P95: {sorted(latencias)[int(len(latencias)*0.95)]*1000:.1f}ms")
        print(f"Min: {min(latencias)*1000:.1f}ms")
        print(f"Max: {max(latencias)*1000:.1f}ms")
        print(f"Vazao: {len(latencias)/sum(latencias):.1f} req/s")


if __name__ == "__main__":
    main()
