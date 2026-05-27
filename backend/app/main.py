"""API HTTP del servicio de formato APA."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Optional

from docx import Document
from docx.opc.exceptions import PackageNotFoundError
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.apa import apply_profile, describe_rules, get_profile, list_profiles
from app.pdf import LibreOfficeNotFound, PdfConversionError, convert_to_pdf

DOCX_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)
PDF_MEDIA_TYPE = "application/pdf"

app = FastAPI(title="mrdocto API", version="0.1.0")

# Origenes permitidos para CORS. En produccion se pasa el dominio de Vercel via
# la variable de entorno ALLOWED_ORIGINS (separada por comas).
_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
_allow_origins = [o.strip() for o in _origins_env.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/profiles")
def profiles() -> list:
    """Normas APA disponibles para el desplegable del frontend."""
    return [
        {
            "id": p.id,
            "label": p.label,
            "edition": p.edition,
            "year": p.year,
            "notes": p.notes,
            "rules": describe_rules(p),
        }
        for p in list_profiles()
    ]


def _safe_stem(filename: Optional[str]) -> str:
    stem = Path(filename or "documento").stem
    cleaned = "".join(c for c in stem if c.isalnum() or c in (" ", "-", "_")).strip()
    return cleaned or "documento"


async def _save_upload(upload: UploadFile, tmpdir: str) -> str:
    if not (upload.filename or "").lower().endswith(".docx"):
        raise HTTPException(
            status_code=400,
            detail="Solo se admiten archivos .docx (Word moderno). Si tienes un "
            ".doc antiguo, guardalo como .docx primero.",
        )
    src = os.path.join(tmpdir, "entrada.docx")
    with open(src, "wb") as handle:
        handle.write(await upload.read())
    return src


def _format_docx(src: str, profile_id: str, tmpdir: str) -> str:
    profile = get_profile(profile_id)
    if profile is None:
        raise HTTPException(status_code=400, detail=f"Norma desconocida: {profile_id}")
    try:
        doc = Document(src)
    except PackageNotFoundError:
        raise HTTPException(
            status_code=400, detail="El archivo no es un .docx valido."
        ) from None
    apply_profile(doc, profile)
    out = os.path.join(tmpdir, "salida.docx")
    doc.save(out)
    return out


def _to_pdf(docx_path: str, tmpdir: str) -> str:
    try:
        return convert_to_pdf(docx_path, tmpdir)
    except LibreOfficeNotFound as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except PdfConversionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _download(data: bytes, filename: str, media_type: str) -> Response:
    return Response(
        content=data,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/format")
async def format_endpoint(
    file: UploadFile = File(...), profile_id: str = Form(...)
) -> Response:
    """Aplica la norma APA elegida y devuelve el .docx formateado."""
    with tempfile.TemporaryDirectory() as tmp:
        src = await _save_upload(file, tmp)
        out = _format_docx(src, profile_id, tmp)
        data = Path(out).read_bytes()
    return _download(
        data, f"{_safe_stem(file.filename)}_{profile_id}.docx", DOCX_MEDIA_TYPE
    )


@app.post("/convert")
async def convert_endpoint(file: UploadFile = File(...)) -> Response:
    """Convierte un .docx a PDF (sin tocar el formato)."""
    with tempfile.TemporaryDirectory() as tmp:
        src = await _save_upload(file, tmp)
        pdf = _to_pdf(src, tmp)
        data = Path(pdf).read_bytes()
    return _download(data, f"{_safe_stem(file.filename)}.pdf", PDF_MEDIA_TYPE)


@app.post("/format-and-convert")
async def format_and_convert_endpoint(
    file: UploadFile = File(...), profile_id: str = Form(...)
) -> Response:
    """Aplica la norma APA y devuelve directamente el PDF formateado."""
    with tempfile.TemporaryDirectory() as tmp:
        src = await _save_upload(file, tmp)
        out = _format_docx(src, profile_id, tmp)
        pdf = _to_pdf(out, tmp)
        data = Path(pdf).read_bytes()
    return _download(
        data, f"{_safe_stem(file.filename)}_{profile_id}.pdf", PDF_MEDIA_TYPE
    )
