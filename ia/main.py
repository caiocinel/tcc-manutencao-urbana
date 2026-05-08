from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Classificador de Defeitos Urbanos")

CLASSIFICATION_API_URL = os.getenv(
    "CLASSIFICATION_API_URL",
    "https://api-inference.huggingface.co/models/facebook/bart-large-mnli"
)
CLASSIFICATION_API_KEY = os.getenv("CLASSIFICATION_API_KEY", "")
CATEGORIES = os.getenv(
    "CLASSIFICATION_CATEGORIES",
    "Buraco,Iluminação,Semáforo,Árvore Caída,Outro"
).split(",")

REQUEST_TIMEOUT = int(os.getenv("CLASSIFICATION_TIMEOUT", "10"))


class ClassificationRequest(BaseModel):
    text: str


class ClassificationResponse(BaseModel):
    category: str
    confidence: float


def build_headers():
    headers = {"Content-Type": "application/json"}
    if CLASSIFICATION_API_KEY:
        headers["Authorization"] = f"Bearer {CLASSIFICATION_API_KEY}"
    return headers


def build_payload(text: str):
    from_ext = os.getenv("CLASSIFICATION_FORMAT", "huggingface")

    if from_ext == "huggingface":
        return {
            "inputs": text,
            "parameters": {"candidate_labels": CATEGORIES}
        }
    return {
        "text": text,
        "categories": CATEGORIES
    }


def parse_response(data: dict) -> tuple:
    from_ext = os.getenv("CLASSIFICATION_FORMAT", "huggingface")

    if from_ext == "huggingface":
        scores = data.get("scores", [])
        labels = data.get("labels", CATEGORIES)
        if not scores:
            raise ValueError("Resposta da API não contém 'scores'")
        max_index = scores.index(max(scores))
        return labels[max_index], scores[max_index]

    category = data.get("category", "Outro")
    confidence = data.get("confidence", 0.0)
    return category, confidence


@app.post("/classify", response_model=ClassificationResponse)
async def classify_text(request: ClassificationRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Texto vazio")
    try:
        headers = build_headers()
        payload = build_payload(request.text)

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(
                CLASSIFICATION_API_URL, headers=headers, json=payload
            )
            response.raise_for_status()
            data = response.json()

        category, confidence = parse_response(data)
        return ClassificationResponse(category=category, confidence=confidence)

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout da API de classificação")
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Erro na API externa: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    api_configured = bool(CLASSIFICATION_API_KEY) or bool(os.getenv("CLASSIFICATION_API_URL"))
    return {
        "status": "ok",
        "api_configured": api_configured,
        "categories": CATEGORIES,
        "format": os.getenv("CLASSIFICATION_FORMAT", "huggingface")
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
