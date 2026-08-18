from django.core.management.base import BaseCommand
from django.db import connection


SCHEMA = [
    """
    CREATE EXTENSION IF NOT EXISTS postgis
    """,
    """
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha TEXT NOT NULL,
        admin INTEGER NOT NULL DEFAULT 0,
        municipio_id TEXT,
        cpf TEXT,
        cpf_hash TEXT UNIQUE,
        email_verificado INTEGER NOT NULL DEFAULT 0,
        codigo_2fa TEXT,
        codigo_2fa_expira TEXT,
        requestsresetat TEXT,
        requestscount INTEGER NOT NULL DEFAULT 0,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS municipios (
        codigo TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        uf TEXT NOT NULL,
        uf_sigla TEXT NOT NULL,
        min_lat DOUBLE PRECISION,
        max_lat DOUBLE PRECISION,
        min_lng DOUBLE PRECISION,
        max_lng DOUBLE PRECISION,
        poligono_json JSONB,
        polygon_geom geometry(MultiPolygon, 4326)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        icone TEXT NOT NULL DEFAULT '',
        prioridade_base TEXT NOT NULL DEFAULT 'media',
        prazo_sla_dias INTEGER NOT NULL DEFAULT 7
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS defeitos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario UUID REFERENCES users(id) ON DELETE SET NULL,
        titulo TEXT NOT NULL,
        descricao TEXT NOT NULL DEFAULT '',
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        localizacao geometry(Point, 4326),
        rua TEXT NOT NULL DEFAULT '',
        bairro TEXT NOT NULL DEFAULT '',
        imagem_url TEXT NOT NULL DEFAULT '',
        categoria TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pendente',
        prioridade TEXT NOT NULL DEFAULT '',
        previsao_conclusao TEXT NOT NULL DEFAULT '',
        atendido_em TEXT NOT NULL DEFAULT '',
        secretaria_responsavel TEXT NOT NULL DEFAULT '',
        prazo_sla_dias INTEGER NOT NULL DEFAULT 0,
        usuario_email TEXT NOT NULL DEFAULT '',
        imagem_thumbnail BYTEA,
        imagens_extra TEXT NOT NULL DEFAULT '[]',
        atualizacoes TEXT NOT NULL DEFAULT '[]',
        atendente_id UUID REFERENCES users(id) ON DELETE SET NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_defeitos_usuario ON defeitos(usuario)
    """,
    """
    ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS secretaria_responsavel TEXT NOT NULL DEFAULT ''
    """,
    """
    ALTER TABLE defeitos ADD COLUMN IF NOT EXISTS prazo_sla_dias INTEGER NOT NULL DEFAULT 0
    """,
    """
    CREATE TABLE IF NOT EXISTS apoios (
        id SERIAL PRIMARY KEY,
        usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        defeito_id UUID NOT NULL REFERENCES defeitos(id) ON DELETE CASCADE,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (usuario_id, defeito_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
]

SEED_CATEGORIAS = [
    ("Buraco", "🕳️", "alta", 7),
    ("Iluminação", "💡", "alta", 5),
    ("Semáforo", "🚦", "urgente", 2),
    ("Árvore Caída", "🌳", "urgente", 2),
    ("Entulho", "🗑️", "media", 15),
    ("Calçada Danificada", "🚶", "media", 7),
    ("Outro", "📋", "baixa", 15),
]


class Command(BaseCommand):
    help = 'Cria o schema do banco (tabelas managed=False) e popula categorias base'

    def handle(self, *args, **options):
        self.stdout.write('Criando schema do banco...')
        with connection.cursor() as cur:
            for stmt in SCHEMA:
                cur.execute(stmt)
            self.stdout.write('  - tabelas criadas/verificadas')

            self.stdout.write('Populando categorias base...')
            for nome, icone, prioridade, prazo in SEED_CATEGORIAS:
                cur.execute(
                    """
                    INSERT INTO categorias (nome, icone, prioridade_base, prazo_sla_dias)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (nome) DO NOTHING
                    """,
                    [nome, icone, prioridade, prazo],
                )
            self.stdout.write('  - categorias semeadas')

        self.stdout.write(self.style.SUCCESS('Schema pronto!'))
