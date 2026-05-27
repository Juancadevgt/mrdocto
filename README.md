# mrdocto

Aplicación web para **aplicar normas APA (ediciones 7, 6 y 5) a documentos Word** y
**convertirlos a PDF**. Subes un `.docx`, eliges la norma, y descargas el documento
formateado y/o su versión en PDF.

## Arquitectura

```
            Vercel                         Render (Docker)
┌──────────────────────────┐     ┌──────────────────────────────────┐
│  Frontend (Next.js + TS)  │ ──► │  Backend (FastAPI)                │
│  · subir .docx            │     │   · python-docx  → formato APA    │
│  · elegir APA 7/6/5       │     │   · LibreOffice  → Word a PDF     │
│  · descargar Word / PDF   │ ◄── │   · perfiles APA = modulos        │
└──────────────────────────┘     └──────────────────────────────────┘
```

El procesamiento pesado (editar Word y convertir a PDF con LibreOffice) vive en el
backend porque LibreOffice no puede ejecutarse en funciones serverless de Vercel.

## Estructura del proyecto

```
mrdocto/
├── backend/                 # Microservicio Python (FastAPI)
│   ├── app/
│   │   ├── main.py          # Endpoints HTTP
│   │   ├── pdf.py           # Conversión Word→PDF (LibreOffice)
│   │   └── apa/
│   │       ├── profiles.py  # Normas APA 7/6/5 como datos
│   │       └── formatter.py # Aplica un perfil con python-docx
│   ├── requirements.txt
│   └── Dockerfile           # Python + LibreOffice (para Render)
├── frontend/                # App Next.js + TypeScript + Tailwind
│   ├── app/page.tsx         # Interfaz
│   └── lib/api.ts           # Llamadas al backend
├── render.yaml              # Blueprint de Render (backend)
└── README.md
```

## Requisitos

- **Node.js** 18+ y **npm**
- **Python** 3.12+
- **LibreOffice** (opcional, solo para probar la conversión a PDF en local)

## Desarrollo local (Windows)

### 1. Backend

```powershell
cd backend
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

La API queda en `http://localhost:8000` (documentación interactiva en `/docs`).

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

La app queda en `http://localhost:3000`. La URL del backend se toma de
`frontend/.env.local` (ya incluido con `NEXT_PUBLIC_API_URL=http://localhost:8000`).

### 3. Conversión a PDF en local (opcional)

Para probar el Word→PDF en tu PC necesitas LibreOffice. Descárgalo de
[libreoffice.org](https://www.libreoffice.org/download/) e instálalo. El backend lo
detecta automáticamente en `C:\Program Files\LibreOffice\program\soffice.exe`.

Sin LibreOffice, los endpoints de PDF responden `503` con un mensaje claro; el resto
(aplicar APA y descargar el Word) funciona igual.

## Despliegue

Despliega **primero el backend** (para obtener su URL) y luego el frontend.

### Backend en Render

1. Sube este repositorio a GitHub.
2. En Render: **New > Blueprint** y selecciona el repo (detecta `render.yaml`).
   - Alternativa manual: **New > Web Service**, *Root Directory* = `backend`, runtime *Docker*.
3. En las variables de entorno define `ALLOWED_ORIGINS` con la URL de tu frontend
   (p. ej. `https://mrdocto.vercel.app`).
4. Deploy. Copia la URL pública (p. ej. `https://mrdocto-api.onrender.com`).

> Plan gratuito: el servicio se "duerme" tras un rato sin uso; la primera petición
> tarda ~30-60 s en despertar. No afecta a la calidad del resultado.

### Frontend en Vercel

1. En Vercel: **New Project**, importa el mismo repo.
2. **Root Directory** = `frontend`.
3. Variable de entorno `NEXT_PUBLIC_API_URL` = la URL del backend en Render.
4. Deploy.

Por último, asegúrate de que `ALLOWED_ORIGINS` (en Render) sea la URL final de Vercel.

## Variables de entorno

| Dónde    | Variable              | Ejemplo                            |
|----------|-----------------------|------------------------------------|
| Backend  | `ALLOWED_ORIGINS`     | `https://mrdocto.vercel.app`       |
| Frontend | `NEXT_PUBLIC_API_URL` | `https://mrdocto-api.onrender.com` |

## Qué aplica el formato APA (y límites actuales)

**Aplica:** fuente Times New Roman 12, interlineado doble, márgenes de 1", sangría de
primera línea, sangría francesa en las referencias, numeración de página arriba a la
derecha, salto de página antes de "Referencias", y estilos de título por nivel (cuando
el documento usa estilos *Título/Heading*). El título de "Referencias" va en negrita
en APA 7 y sin negrita en APA 6/5.

**Aún no incluye:** portada APA (requiere datos como título, autor e institución, que
habría que pedir en el formulario), *running head* de APA 6, ni el formateo automático
de cada cita individual. En APA 6 y 5 el cuerpo es exacto; los niveles de título son
una aproximación.

## Extender con nuevas normas

Cada norma es un objeto `ApaProfile` en `backend/app/apa/profiles.py`. Para añadir una
edición nueva (o estilos como IEEE/Vancouver), agrega un perfil ahí; aparecerá solo en
el desplegable del frontend.
