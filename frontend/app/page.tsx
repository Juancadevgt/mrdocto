"use client";

import { type ChangeEvent, useEffect, useState } from "react";

import {
  type ApaProfile,
  convertToPdf,
  downloadBlob,
  fetchProfiles,
  formatDocx,
  stripDocxExt,
} from "@/lib/api";

type Notice = { type: "ok" | "error"; text: string };
type Applied = { profile: ApaProfile; baseName: string };

export default function Home() {
  const [profiles, setProfiles] = useState<ApaProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const [apaFile, setApaFile] = useState<File | null>(null);
  const [convFile, setConvFile] = useState<File | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Resultado del paso "Aplicar": el Word ya formateado y la norma usada.
  const [formattedBlob, setFormattedBlob] = useState<Blob | null>(null);
  const [applied, setApplied] = useState<Applied | null>(null);

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

  // Cualquier cambio de archivo o norma invalida el resultado anterior.
  function resetApplied() {
    setFormattedBlob(null);
    setApplied(null);
  }

  function onApaFileChange(e: ChangeEvent<HTMLInputElement>) {
    setApaFile(e.target.files?.[0] ?? null);
    resetApplied();
    setNotice(null);
  }

  function onProfileChange(e: ChangeEvent<HTMLSelectElement>) {
    setProfileId(e.target.value);
    resetApplied();
    setNotice(null);
  }

  async function onApply() {
    if (!apaFile || !profileId || !selected) return;
    setBusy("apply");
    setNotice(null);
    try {
      const blob = await formatDocx(apaFile, profileId);
      setFormattedBlob(blob);
      setApplied({ profile: selected, baseName: stripDocxExt(apaFile.name) });
    } catch (err: unknown) {
      resetApplied();
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Error inesperado.",
      });
    } finally {
      setBusy(null);
    }
  }

  function onDownloadWord() {
    if (!formattedBlob || !applied) return;
    downloadBlob(formattedBlob, `${applied.baseName}_${applied.profile.id}.docx`);
  }

  async function onDownloadPdf() {
    if (!formattedBlob || !applied) return;
    setBusy("dl-pdf");
    setNotice(null);
    try {
      const pdf = await convertToPdf(formattedBlob, `${applied.baseName}.docx`);
      downloadBlob(pdf, `${applied.baseName}_${applied.profile.id}.pdf`);
    } catch (err: unknown) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Error al convertir a PDF.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function onConvert() {
    if (!convFile) return;
    setBusy("convert");
    setNotice(null);
    try {
      const pdf = await convertToPdf(convFile);
      downloadBlob(pdf, `${stripDocxExt(convFile.name)}.pdf`);
    } catch (err: unknown) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Error al convertir a PDF.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">mrdocto</h1>
        <p className="mt-2 text-slate-600">
          Aplica normas APA a tu documento Word y conviertelo a PDF.
        </p>
      </header>

      {profilesError && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se pudo conectar con el servidor ({profilesError}).
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
        <h2 className="text-lg font-semibold text-slate-900">1. Aplicar normas APA</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sube tu .docx, elige la edicion y pulsa Aplicar.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Documento Word (.docx)
            </span>
            <input
              type="file"
              accept=".docx"
              onChange={onApaFileChange}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Norma APA</span>
            <select
              value={profileId}
              onChange={onProfileChange}
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
              <span className="mt-1 block text-xs text-slate-500">{selected.notes}</span>
            )}
          </label>

          <button
            onClick={onApply}
            disabled={!apaFile || !profileId || busy !== null}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "apply" ? "Aplicando..." : "Aplicar normas APA"}
          </button>
        </div>

        {applied && (
          <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">
              Se aplico {applied.profile.label}. Esto se ajusto en tu documento:
            </p>
            <ul className="mt-3 space-y-1.5">
              {(applied.profile.rules ?? []).map((rule) => (
                <li key={rule} className="flex gap-2 text-sm text-green-900">
                  <span aria-hidden className="mt-0.5 text-green-600">
                    &#10003;
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={onDownloadWord}
                disabled={busy !== null}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Descargar Word
              </button>
              <button
                onClick={onDownloadPdf}
                disabled={busy !== null}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "dl-pdf" ? "Generando PDF..." : "Descargar PDF"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Seccion 2: convertir Word a PDF */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">2. Convertir Word a PDF</h2>
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
            {busy === "convert" ? "Convirtiendo..." : "Convertir y descargar PDF"}
          </button>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-400">
        La primera operacion puede tardar ~30-60s si el servidor estaba inactivo (plan
        gratuito de Render).
      </p>
    </main>
  );
}
