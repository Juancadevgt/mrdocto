FROM python:3.12-slim

# LibreOffice (modo Writer) para convertir .docx a PDF, y fuentes Liberation
# (sustituto metricamente compatible de Times New Roman / Arial / Courier).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice-writer \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Render inyecta la variable PORT; se usa shell form para poder expandirla.
ENV PORT=8000
EXPOSE 8000
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
