import base64
import io
from datetime import datetime

import qrcode
from xhtml2pdf import pisa


def _thumbnail_data_url(defeito):
    if not defeito.imagem_thumbnail:
        return None
    b64 = base64.b64encode(defeito.imagem_thumbnail).decode('ascii')
    return f'data:image/webp;base64,{b64}'


def _qr_code_data_url(lat, lng):
    if lat is None or lng is None:
        return None
    url = f'https://maps.google.com/?q={lat},{lng}'
    img = qrcode.make(url, box_size=6, border=2)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return f'data:image/png;base64,{base64.b64encode(buf.getvalue()).decode("ascii")}'


def gerar_ordem_servico(defeito):
    """Gera o PDF da Ordem de Serviço e retorna os bytes."""
    titulo = defeito.titulo
    categoria = defeito.categoria or ''
    prioridade = defeito.prioridade or ''
    status = defeito.status or ''
    rua = defeito.rua or ''
    bairro = defeito.bairro or ''
    descricao = defeito.descricao or ''
    lat = defeito.latitude
    lng = defeito.longitude
    id_curto = str(defeito.id)[:8]
    gerado_em = datetime.now().strftime('%d/%m/%Y %H:%M')

    html = f'''
    <html>
    <head>
    <style>
      @page {{ size: A4; margin: 18mm; }}
      body {{ font-family: Helvetica, Arial, sans-serif; color: #111; font-size: 11px; }}
      h1 {{ font-size: 20px; color: #1a1a1a; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 4px 0; }}
      .sub {{ color: #666; font-size: 10px; margin-bottom: 14px; }}
      .bar {{ border-bottom: 3px solid #B8860B; margin-bottom: 16px; }}
      h2 {{ font-size: 13px; color: #8B6914; text-transform: uppercase; letter-spacing: 1px; margin: 14px 0 6px 0; }}
      table.data {{ width: 100%; border-collapse: collapse; }}
      table.data td {{ padding: 4px 0; }}
      .label {{ color: #666; width: 30%; }}
      .valor {{ font-weight: bold; }}
      .foto {{ width: 100%; margin: 8px 0; }}
      .qr {{ margin: 8px 0; }}
      .assinatura {{ margin-top: 40px; }}
      .assinatura hr {{ border: 0; border-top: 1px dashed #999; margin: 8px 0; }}
      .rodape {{ margin-top: 30px; color: #888; font-size: 9px; text-align: center; }}
    </style>
    </head>
    <body>
      <h1>Ordem de Serviço</h1>
      <div class="sub">Central de Inteligência Urbana &bull; Chamado #{id_curto}</div>
      <div class="bar"></div>

      <h2>Dados do Chamado</h2>
      <table class="data">
        <tr><td class="label">Título</td><td class="valor">{titulo}</td></tr>
        <tr><td class="label">Categoria</td><td class="valor">{categoria}</td></tr>
        <tr><td class="label">Prioridade</td><td class="valor">{prioridade}</td></tr>
        <tr><td class="label">Status</td><td class="valor">{status}</td></tr>
        <tr><td class="label">Endereço</td><td class="valor">{rua}{" - " if rua and bairro else ""}{bairro}</td></tr>
        <tr><td class="label">Gerado em</td><td class="valor">{gerado_em}</td></tr>
      </table>

      <h2>Descrição</h2>
      <p>{descricao}</p>
    '''

    foto = _thumbnail_data_url(defeito)
    if foto:
        html += f'<h2>Foto do Local</h2><img class="foto" src="{foto}" />'

    qr_img = _qr_code_data_url(lat, lng)
    if qr_img:
        coords = f'{lat}, {lng}' if lat is not None and lng is not None else ''
        html += f'''
        <h2>Localização & QR Code</h2>
        <table class="data">
          <tr><td class="label">Coordenadas</td><td class="valor">{coords}</td></tr>
        </table>
        <img class="qr" src="{qr_img}" width="120" height="120" />
        <div class="sub">Escanear para abrir no Google Maps</div>
        '''

    html += '''
      <div class="assinatura">
        <h2>Parecer Técnico</h2>
        <hr />
        <hr />
      </div>
      <div class="rodape">Documento gerado automaticamente pela Central de Inteligência Urbana em {gerado}</div>
    </body>
    </html>
    '''.replace('{gerado}', gerado_em)

    buf = io.BytesIO()
    pisa.CreatePDF(html, dest=buf, encoding='utf-8')
    return buf.getvalue()
