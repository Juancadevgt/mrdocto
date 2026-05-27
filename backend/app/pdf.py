"""Conversion de Word (.docx) a PDF mediante LibreOffice headless."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

# Rutas habituales de LibreOffice en Windows (para desarrollo local). En el
# contenedor de Render, `soffice` esta en el PATH y se resuelve antes.
_WINDOWS_SOFFICE_PATHS = (
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
)


class LibreOfficeNotFound(RuntimeError):
    """No se encontro el ejecutable de LibreOffice."""


class PdfConversionError(RuntimeError):
    """LibreOffice no pudo generar el PDF."""


def find_soffice() -> str:
    """Localiza el binario de LibreOffice o lanza LibreOfficeNotFound."""
    for name in ("soffice", "libreoffice"):
        path = shutil.which(name)
        if path:
            return path
    for path in _WINDOWS_SOFFICE_PATHS:
        if os.path.isfile(path):
            return path
    raise LibreOfficeNotFound(
        "No se encontro LibreOffice (soffice). Instalalo para convertir a PDF "
        "en local, o despliega el backend con el Dockerfile incluido."
    )


def convert_to_pdf(docx_path: str, output_dir: Optional[str] = None) -> str:
    """Convierte un .docx a .pdf y devuelve la ruta del PDF generado."""
    soffice = find_soffice()
    docx_path = os.path.abspath(docx_path)
    if output_dir is None:
        output_dir = os.path.dirname(docx_path)
    os.makedirs(output_dir, exist_ok=True)

    # Un perfil de usuario aislado por conversion evita que LibreOffice falle
    # cuando llegan varias peticiones a la vez (comparten el perfil por defecto).
    with tempfile.TemporaryDirectory() as profile_dir:
        profile_uri = Path(profile_dir).as_uri()
        cmd = [
            soffice,
            f"-env:UserInstallation={profile_uri}",
            "--headless",
            "--norestore",
            "--convert-to",
            "pdf",
            "--outdir",
            output_dir,
            docx_path,
        ]
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=120
            )
        except subprocess.TimeoutExpired as exc:
            raise PdfConversionError(
                "La conversion a PDF excedio el tiempo limite."
            ) from exc

    if result.returncode != 0:
        raise PdfConversionError(
            f"LibreOffice fallo (codigo {result.returncode}): "
            f"{result.stderr.strip() or result.stdout.strip()}"
        )

    pdf_path = os.path.join(output_dir, Path(docx_path).stem + ".pdf")
    if not os.path.isfile(pdf_path):
        raise PdfConversionError("LibreOffice no genero el PDF esperado.")
    return pdf_path
