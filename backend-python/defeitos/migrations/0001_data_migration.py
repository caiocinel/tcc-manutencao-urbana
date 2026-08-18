from django.db import migrations


def _convert_text_to_timestamptz(table, column):
    """Gera um bloco DO que converte a coluna de TEXT para TIMESTAMPTZ apenas
    se ela ainda for TEXT (schema legado). Em schemas modernos (bootstrap_schema
    já cria TIMESTAMPTZ) a conversão é um no-op, evitando o erro
    'operator does not exist: timestamp with time zone ~ unknown'."""
    return f"""
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = '{table}' AND column_name = '{column}'
              AND data_type = 'text'
        ) THEN
            EXECUTE format(
                'ALTER TABLE {table} ALTER COLUMN {column} TYPE TIMESTAMPTZ USING CASE
                    WHEN %I ~ ''^\\d{{4}}-\\d{{2}}-\\d{{2}}T'' THEN %I::TIMESTAMPTZ
                    WHEN %I ~ ''^\\d{{4}}-\\d{{2}}-\\d{{2}} '' THEN %I::TIMESTAMPTZ
                    ELSE ''1970-01-01T00:00:00Z''::TIMESTAMPTZ
                END',
                '{column}', '{column}', '{column}', '{column}'
            );
        END IF;
    END $$;
    """


class Migration(migrations.Migration):
    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="""
            -- Conversão TEXT -> TIMESTAMPTZ condicional (apenas schema legado)
            """ + '\n'.join(
                _convert_text_to_timestamptz(t, c)
                for t, c in [
                    ('defeitos', 'criado_em'),
                    ('defeitos', 'atualizado_em'),
                    ('users', 'criado_em'),
                    ('users', 'atualizado_em'),
                    ('apoios', 'criado_em'),
                ]
            ) + """

            -- Set defaults (idempotente)
            ALTER TABLE defeitos ALTER COLUMN criado_em SET DEFAULT NOW();
            ALTER TABLE defeitos ALTER COLUMN atualizado_em SET DEFAULT NOW();
            ALTER TABLE users ALTER COLUMN criado_em SET DEFAULT NOW();
            ALTER TABLE users ALTER COLUMN atualizado_em SET DEFAULT NOW();
            ALTER TABLE apoios ALTER COLUMN criado_em SET DEFAULT NOW();
            """,
            reverse_sql='',
        ),
    ]
