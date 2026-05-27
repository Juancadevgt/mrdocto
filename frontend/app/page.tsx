"use client";

import { useEffect, useState } from "react";

import {
  type ApaProfile,
  convertToPdf,
  downloadBlob,
  fetchProfiles,
  formatAndConvert,
  formatDocx,
  stripDocxExt,
} from "@/lib/api";

type Notice = { type: "ok" | "error"; text: string };

export default function Home() {
  const [profiles, setProfiles] = useState<ApaProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const [apaFile, setApaFile] = useState<File | null>(null);
  const [convFile, setConvFile] = useState<File | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    fetchProfiles()
      .then((data) => {
        setProfiles(data);
        if (data.length > 0) setProfileId(data[0].id);
      })
      .catch((err: unknown) =>
        setProfilesError(err instanceof Error ? err.message : "Error desconocido"),
      );
  }, []);

  const selected = profiles.find((p) => p.id === profileId);

  async function run(action: string, task: () => Promise<Blob>, filename: string) {
    setBusy(action);
    setNotice(null);
    try {
      const blob = await task();
      downloadBlob(blob, filename);
      setNotice({ type: "ok", text: `Listo. Se descargo "${filename}".` });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Error inesperado.",
      });
    } finally {
      setBusy(null);
    }
  }

  function onFormatWord() {
    if (!apaFile || !profileId) return;
    void run(
      "word",
      () => formatDocx(apaFile, profileId),
      `${stripDocxExt(apaFile.name)}_${profileId}.docx`,
    );
  }

  function onFormatPdf() {
    if (!apaFile || !profileId) return;
    void run(
      "apa-pdf",
      () => formatAndConvert(apaFile, profileId),
      `${stripDocxExt(apaFile.name)}_${profileId}.pdf`,
    );
  }

  function onConvert() {
    if (!convFile) return;
    void run("pdf", () => convertToPdf(convFile), `${stripDocxExt(convFile.name)}.pdf`);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          mrdocto
        </h1>
        <p className="mt-2 text-slate-600">
          Aplica normas APA a tu documento Word y conviertelo a PDF.
        </p>
      </header>

      {profilesError && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se pudo conectar con el servidor ({profilesError}). Asegurate de que
          el backend este corriendo.
        </div>
      )}

      {notice && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            notice.type === "ok"
              ? "border border-green-300 bg-green-50 text-green-800"
              : "border border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Seccion 1: aplicar normas APA */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          1. Aplicar normas APA
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Sube tu .docx, elige la edicion y descarga el documento formateado.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Documento Word (.docx)
            </span>
            <input
              type="file"
              accept=".docx"
              onChange={(e) => setApaFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Norma APA
            </span>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              disabled={profiles.length === 0}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
            >
              {profiles.length === 0 && <option>Cargando normas...</option>}
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {selected && (
              <span className="mt-1 block text-xs text-slate-500">
                {selected.notes}
              </span>
            )}
          </label>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={onFormatWord}
              disabled={!apaFile || !profileId || busy !== null}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "word" ? "Procesando..." : "Descargar Word con APA"}
            </button>
            <button
              onClick={onFormatPdf}
              disabled={!apaFile || !profileId || busy !== null}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "apa-pdf" ? "Procesando..." : "Descargar PDF con APA"}
            </button>
          </div>
        </div>
      </section>

      {/* Seccion 2: convertir Word a PDF */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          2. Convertir Word a PDF
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Convierte cualquier .docx a PDF, sin cambiar su formato.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Documento Word (.docx)
            </span>
            <input
              type="file"
              accept=".docx"
              onChange={(e) => setConvFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </label>

          <button
            onClick={onConvert}
            disabled={!convFile || busy !== null}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "pdf" ? "Convirtiendo..." : "Convertir y descargar PDF"}
          </button>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-400">
        La primera operacion puede tardar ~30-60s si el servidor estaba inactivo
        (plan gratuito de Render).
      </p>
    </main>
  );
}
