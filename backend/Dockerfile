# PlantBrain Backend — Dockerfile
# Includes system binaries for pytesseract (OCR) and pdf2image

FROM python:3.11-slim

# System deps: Tesseract OCR + Poppler (for pdf2image)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    libgl1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create ChromaDB persist dir (will be mounted as a volume on Render)
RUN mkdir -p /data/chroma

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
