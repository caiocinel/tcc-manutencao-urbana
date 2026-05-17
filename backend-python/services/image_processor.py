import io
from PIL import Image, ImageFilter
from django.conf import settings


def process_image(input_bytes: bytes) -> dict:
    img = Image.open(io.BytesIO(input_bytes))

    sigma = settings.PRIVACY_BLUR_SIGMA
    if sigma > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=sigma))

    img.thumbnail((1600, 1600), Image.LANCZOS)

    output_buf = io.BytesIO()
    img.save(output_buf, 'WEBP', quality=90)
    output_buf.seek(0)

    thumb = img.copy()
    thumb.thumbnail((400, 400), Image.LANCZOS)
    thumb_buf = io.BytesIO()
    thumb.save(thumb_buf, 'WEBP', quality=75)
    thumb_buf.seek(0)

    return {
        'webp_bytes': output_buf.getvalue(),
        'thumbnail_bytes': thumb_buf.getvalue(),
    }


def make_thumbnail(input_bytes: bytes, size: tuple = (400, 400)) -> bytes:
    img = Image.open(io.BytesIO(input_bytes))
    img.thumbnail(size, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, 'WEBP', quality=75)
    buf.seek(0)
    return buf.getvalue()
