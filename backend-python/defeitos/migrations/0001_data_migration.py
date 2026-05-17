from django.db import migrations


class Migration(migrations.Migration):
    dependencies = []

    operations = [
        migrations.RunSQL(
            sql=r"""
            -- Convert TEXT dates to TIMESTAMPTZ in defeitos
            ALTER TABLE defeitos ALTER COLUMN criado_em TYPE TIMESTAMPTZ
                USING CASE
                    WHEN criado_em ~ '^\d{4}-\d{2}-\d{2}T' THEN criado_em::TIMESTAMPTZ
                    WHEN criado_em ~ '^\d{4}-\d{2}-\d{2} ' THEN criado_em::TIMESTAMPTZ
                    ELSE '1970-01-01T00:00:00Z'::TIMESTAMPTZ
                END;
            ALTER TABLE defeitos ALTER COLUMN atualizado_em TYPE TIMESTAMPTZ
                USING CASE
                    WHEN atualizado_em ~ '^\d{4}-\d{2}-\d{2}T' THEN atualizado_em::TIMESTAMPTZ
                    WHEN atualizado_em ~ '^\d{4}-\d{2}-\d{2} ' THEN atualizado_em::TIMESTAMPTZ
                    ELSE '1970-01-01T00:00:00Z'::TIMESTAMPTZ
                END;
            ALTER TABLE defeitos ALTER COLUMN criado_em SET DEFAULT NOW();
            ALTER TABLE defeitos ALTER COLUMN atualizado_em SET DEFAULT NOW();

            -- Convert TEXT dates in users
            ALTER TABLE users ALTER COLUMN criado_em TYPE TIMESTAMPTZ
                USING CASE
                    WHEN criado_em ~ '^\d{4}-\d{2}-\d{2}T' THEN criado_em::TIMESTAMPTZ
                    WHEN criado_em ~ '^\d{4}-\d{2}-\d{2} ' THEN criado_em::TIMESTAMPTZ
                    ELSE '1970-01-01T00:00:00Z'::TIMESTAMPTZ
                END;
            ALTER TABLE users ALTER COLUMN atualizado_em TYPE TIMESTAMPTZ
                USING CASE
                    WHEN atualizado_em ~ '^\d{4}-\d{2}-\d{2}T' THEN atualizado_em::TIMESTAMPTZ
                    WHEN atualizado_em ~ '^\d{4}-\d{2}-\d{2} ' THEN atualizado_em::TIMESTAMPTZ
                    ELSE '1970-01-01T00:00:00Z'::TIMESTAMPTZ
                END;
            ALTER TABLE users ALTER COLUMN criado_em SET DEFAULT NOW();
            ALTER TABLE users ALTER COLUMN atualizado_em SET DEFAULT NOW();

            -- Convert TEXT dates in apoios
            ALTER TABLE apoios ALTER COLUMN criado_em TYPE TIMESTAMPTZ
                USING CASE
                    WHEN criado_em ~ '^\d{4}-\d{2}-\d{2}T' THEN criado_em::TIMESTAMPTZ
                    WHEN criado_em ~ '^\d{4}-\d{2}-\d{2} ' THEN criado_em::TIMESTAMPTZ
                    ELSE '1970-01-01T00:00:00Z'::TIMESTAMPTZ
                END;
            ALTER TABLE apoios ALTER COLUMN criado_em SET DEFAULT NOW();

            -- Populate PointField from latitude/longitude
            UPDATE defeitos SET localizacao = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND localizacao IS NULL;
            """,
            reverse_sql='',
        ),
    ]
