import json
import urllib.request
from django.core.management.base import BaseCommand
from django.db import connection


TBURGZ_URL = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-mun.json'


class Command(BaseCommand):
    help = 'Cria tabela municipios (se não existir) e popula com dados do IBGE'

    def handle(self, *args, **options):
        self.stdout.write('Criando extensão PostGIS...')
        with connection.cursor() as cur:
            cur.execute('CREATE EXTENSION IF NOT EXISTS postgis')

        self.stdout.write('Criando tabela municipios se não existir...')
        with connection.cursor() as cur:
            cur.execute("""
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
            """)

        self.stdout.write('Baixando dados do IBGE/tbrugz...')
        req = urllib.request.Request(TBURGZ_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())

        features = data.get('features', [])
        self.stdout.write(f'Recebidos {len(features)} municípios. Inserindo...')

        IBGE_UF = {
            '11': ('RO', 'Rondônia'), '12': ('AC', 'Acre'),
            '13': ('AM', 'Amazonas'), '14': ('RR', 'Roraima'),
            '15': ('PA', 'Pará'), '16': ('AP', 'Amapá'),
            '17': ('TO', 'Tocantins'), '21': ('MA', 'Maranhão'),
            '22': ('PI', 'Piauí'), '23': ('CE', 'Ceará'),
            '24': ('RN', 'Rio Grande do Norte'), '25': ('PB', 'Paraíba'),
            '26': ('PE', 'Pernambuco'), '27': ('AL', 'Alagoas'),
            '28': ('SE', 'Sergipe'), '29': ('BA', 'Bahia'),
            '31': ('MG', 'Minas Gerais'), '32': ('ES', 'Espírito Santo'),
            '33': ('RJ', 'Rio de Janeiro'), '35': ('SP', 'São Paulo'),
            '41': ('PR', 'Paraná'), '42': ('SC', 'Santa Catarina'),
            '43': ('RS', 'Rio Grande do Sul'), '50': ('MS', 'Mato Grosso do Sul'),
            '51': ('MT', 'Mato Grosso'), '52': ('GO', 'Goiás'),
            '53': ('DF', 'Distrito Federal'),
        }

        count = 0
        for feat in features:
            props = feat.get('properties', {})
            cod = str(props.get('id') or props.get('cd_geocmu') or '')
            if not cod:
                continue
            nome = props.get('name') or props.get('nm_mun') or props.get('nome') or ''
            if len(cod) < 7:
                cod = cod.zfill(7)
            uf_code = cod[:2]
            uf_sigla, uf_nome = IBGE_UF.get(uf_code, ('', ''))
            geometry = feat.get('geometry')
            if not geometry or not geometry.get('coordinates'):
                continue
            coords = geometry['coordinates'][0] if geometry['type'] == 'Polygon' else geometry['coordinates'][0][0]
            lngs = [c[0] for c in coords]
            lats = [c[1] for c in coords]
            min_lat = min(lats)
            max_lat = max(lats)
            min_lng = min(lngs)
            max_lng = max(lngs)
            geom_json = json.dumps(geometry)
            with connection.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO municipios (codigo, nome, uf, uf_sigla, min_lat, max_lat, min_lng, max_lng, poligono_json, polygon_geom)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, ST_SetSRID(ST_SimplifyPreserveTopology(ST_GeomFromGeoJSON(%s), 0.0001), 4326))
                    ON CONFLICT (codigo) DO UPDATE SET
                        nome = EXCLUDED.nome,
                        uf = EXCLUDED.uf,
                        uf_sigla = EXCLUDED.uf_sigla,
                        min_lat = EXCLUDED.min_lat,
                        max_lat = EXCLUDED.max_lat,
                        min_lng = EXCLUDED.min_lng,
                        max_lng = EXCLUDED.max_lng,
                        poligono_json = EXCLUDED.poligono_json,
                        polygon_geom = EXCLUDED.polygon_geom
                    """,
                    [cod, nome, uf_nome, uf_sigla, min_lat, max_lat, min_lng, max_lng, geom_json, geom_json],
                )
            count += 1
            if count % 500 == 0:
                self.stdout.write(f'  {count} inseridos...')

        self.stdout.write(self.style.SUCCESS(f'Seed concluído: {count} municípios inseridos/atualizados'))
