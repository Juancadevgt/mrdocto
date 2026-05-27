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
type Theme = "light" | "dark";

function SunIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

export default function Home() {
  const [theme, setTheme] = useState<Theme>("light");

  const [profiles, setProfiles] = useState<ApaProfile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const [apaFile, setApaFile] = useState<File | null>(null);
  const [convFile, setConvFile] = useState<File | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [formattedBlob, setFormattedBlob] = useState<Blob | null>(null);
  const [applied, setApplied] = useState<Applied | null>(null);

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  }, []);

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

  function toggleTheme() {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* localStorage no disponible */
      }
      return next;
    });
  }

  const selected = profiles.find((p) => p.id === profileId);

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

  const fileInputClass =
    "block w-full text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-600";

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <DocIcon />
            </span>
            <h1 className="text-2xl font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              MR DOCTO
            </h1>
          </div>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Aplica normas APA a tu documento Word y conviertelo a PDF.
          </p>
        </div>
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          className="shrink-0 rounded-md border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      {profilesError && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          No se pudo conectar con el servidor ({profilesError}).
        </div>
      )}

      {notice && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            notice.type === "ok"
              ? "border border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Seccion 1: aplicar normas APA */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          1. Aplicar normas APA
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sube tu .docx, elige la edicion y pulsa Aplicar.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Documento Word (.docx)
            </span>
            <input type="file" accept=".docx" onChange={onApaFileChange} className={fileInputClass} />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Norma APA
            </span>
            <select
              value={profileId}
              onChange={onProfileChange}
              disabled={profiles.length === 0}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
            >
              {profiles.length === 0 && <option>Cargando normas...</option>}
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {selected && (
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                {selected.notes}
              </span>
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
          <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
            <p className="text-sm font-semibold text-green-900 dark:text-green-200">
              Se aplico {applied.profile.label}. Esto se ajusto en tu documento:
            </p>
            <ul className="mt-3 space-y-1.5">
              {(applied.profile.rules ?? []).map((rule) => (
                <li
                  key={rule}
                  className="flex gap-2 text-sm text-green-900 dark:text-green-200"
                >
                  <span aria-hidden className="mt-0.5 text-green-600 dark:text-green-400">
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
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          2. Convertir Word a PDF
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Convierte cualquier .docx a PDF, sin cambiar su formato.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Documento Word (.docx)
            </span>
            <input
              type="file"
              accept=".docx"
              onChange={(e) => setConvFile(e.target.files?.[0] ?? null)}
              className={fileInputClass}
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

      <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
        La primera operacion puede tardar ~30-60s si el servidor estaba inactivo (plan
        gratuito de Render).
      </p>
    </main>
  );
}
