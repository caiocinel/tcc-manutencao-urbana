#!/usr/bin/env python3
"""
Popula o banco demo (manutencao_urbana_demo) com dados realistas.

Uso:
    python scripts/seed_demo.py

Requisitos:
    - Django configurado (core.settings.local ou production) com a DB 'demo'
    - PostgreSQL com permissão para DROP/CREATE DATABASE
"""

import os
import sys
import random
from datetime import datetime, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.local')

import django

django.setup()

from django.db import connections
from django.contrib.auth.hashers import make_password

from core.management.commands.bootstrap_schema import SCHEMA, SEED_CATEGORIAS

DEMO_DB = 'demo'
DEMO_DB_NAME = os.environ.get('DB_DEMO_NAME', 'manutencao_urbana_demo')

# Coordenadas de Ribeirão Preto-SP
BAIRROS = [
    (-21.1700, -47.8100, "Centro"),
    (-21.1800, -47.8300, "Jardim América"),
    (-21.1650, -47.8050, "Vila Romana"),
    (-21.1900, -47.8400, "Ipiranga"),
    (-21.1750, -47.7950, "Sumaré"),
]

CATEGORIAS = [nome for nome, *_ in SEED_CATEGORIAS]
STATUS_CHOICES = [
    "pendente", "triado", "em_andamento", "atendido", "encerrado",
]
PRIORIDADES = ["baixa", "media", "alta", "urgente"]

USUARIOS_DEMO = [
    ("demo@ciu.app", "Administrador Demo", 1, "3543402"),
    ("atendente@demo.com", "Atendente Municipal", 1, "3543402"),
    ("cidadao1@demo.com", "Cidadão Um", 0, "3543402"),
    ("cidadao2@demo.com", "Cidadão Dois", 0, "3543402"),
    ("cidadao3@demo.com", "Cidadão Três", 0, "3543402"),
]


def create_demo_database():
    """Cria o banco demo vazio (DROP + CREATE), terminando conexões pendentes."""
    conn = connections['default']
    conn.set_autocommit(True)
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
            "WHERE datname = %s AND pid <> pg_backend_pid()",
            [DEMO_DB_NAME],
        )
        cursor.execute(f"DROP DATABASE IF EXISTS {DEMO_DB_NAME}")
        cursor.execute(f"CREATE DATABASE {DEMO_DB_NAME}")
    conn.set_autocommit(False)
    print(f"[seed] Banco demo '{DEMO_DB_NAME}' recriado.")
    # Fechar conexões default para liberar o novo banco
    connections['default'].close()


def apply_schema():
    """Aplica o schema (bootstrap) no banco demo."""
    with connections[DEMO_DB].cursor() as cur:
        for stmt in SCHEMA:
            cur.execute(stmt)
        for nome, icone, prioridade, prazo in SEED_CATEGORIAS:
            cur.execute(
                """
                INSERT INTO categorias (nome, icone, prioridade_base, prazo_sla_dias)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (nome) DO NOTHING
                """,
                [nome, icone, prioridade, prazo],
            )
    print("[seed] Schema aplicado no banco demo.")


def seed_users():
    password_hash = make_password('Demo@2024')
    with connections[DEMO_DB].cursor() as cur:
        for email, nome, admin, municipio in USUARIOS_DEMO:
            cur.execute(
                """
                INSERT INTO users (id, nome, email, senha, admin, municipio_id, email_verificado)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, 1)
                ON CONFLICT (email) DO NOTHING
                """,
                [nome, email, password_hash, admin, municipio],
            )
    print(f"[seed] {len(USUARIOS_DEMO)} usuários demo criados.")


def seed_municipios():
    with connections[DEMO_DB].cursor() as cur:
        cur.execute(
            """
            INSERT INTO municipios (codigo, nome, uf, uf_sigla, min_lat, max_lat, min_lng, max_lng)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (codigo) DO NOTHING
            """,
            ["3543402", "Ribeirão Preto", "São Paulo", "SP",
             -21.30, -21.00, -47.95, -47.60],
        )
    print("[seed] Município demo criado.")


def seed_defeitos():
    with connections[DEMO_DB].cursor() as cur:
        cur.execute(
            "SELECT id FROM users WHERE email LIKE '%%@demo.com' OR email = 'demo@ciu.app'"
        )
        user_ids = [row[0] for row in cur.fetchall()]
        if not user_ids:
            print("[seed] Nenhum usuário demo encontrado; pulando defeitos.")
            return

        now = datetime.now()
        for i in range(50):
            lat, lng, bairro = random.choice(BAIRROS)
            lat += random.uniform(-0.01, 0.01)
            lng += random.uniform(-0.01, 0.01)
            categoria = random.choice(CATEGORIAS)
            status = random.choice(STATUS_CHOICES)
            prioridade = random.choice(PRIORIDADES)
            usuario = random.choice(user_ids)
            dias_atras = random.randint(1, 30)
            criado_em = now - timedelta(days=dias_atras)

            cur.execute(
                """
                INSERT INTO defeitos (
                    id, usuario, titulo, descricao, latitude, longitude,
                    localizacao, rua, bairro, categoria, status, prioridade,
                    criado_em, atualizado_em
                ) VALUES (
                    gen_random_uuid(), %s, %s, %s, %s, %s,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s, %s, %s, %s
                )
                """,
                [
                    usuario,
                    f"Defeito demo #{i + 1}",
                    f"Descrição do defeito de {categoria.lower()} no bairro {bairro}.",
                    lat, lng,
                    lng, lat,
                    f"Rua Demo {i + 1}", bairro,
                    categoria, status, prioridade,
                    criado_em, criado_em,
                ],
            )
    print("[seed] 50 defeitos demo criados.")


def seed_apoios():
    with connections[DEMO_DB].cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email LIKE 'cidadao%%@demo.com'")
        cidadaos = [row[0] for row in cur.fetchall()]
        cur.execute("SELECT id FROM defeitos LIMIT 50")
        defeitos = [row[0] for row in cur.fetchall()]
        if not cidadaos or not defeitos:
            print("[seed] Sem cidadãos/defeitos; pulando apoios.")
            return
        for defeito in random.sample(defeitos, min(20, len(defeitos))):
            cidadao = random.choice(cidadaos)
            cur.execute(
                """
                INSERT INTO apoios (usuario_id, defeito_id)
                VALUES (%s, %s)
                ON CONFLICT (usuario_id, defeito_id) DO NOTHING
                """,
                [cidadao, defeito],
            )
    print("[seed] Apoios demo criados.")


def main():
    print("Iniciando seed do banco demo...")
    create_demo_database()
    apply_schema()
    seed_municipios()
    seed_users()
    seed_defeitos()
    seed_apoios()
    print("Seed do banco demo concluído!")


if __name__ == '__main__':
    main()
