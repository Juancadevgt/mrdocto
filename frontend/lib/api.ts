// Cliente del backend de formato APA (microservicio FastAPI en Render).

export type ApaProfile = {
  id: string;
  label: string;
  edition: number;
  year: number;
  notes: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.detail) {
      return typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail);
    }
  } catch {
    // La respuesta de error no traia JSON.
  }
  return `Error ${res.status}`;
}

export async function fetchProfiles(): Promise<ApaProfile[]> {
  const res = await fetch(`${API_URL}/profiles`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function formatDocx(file: File, profileId: string): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);
  form.append("profile_id", profileId);
  const res = await fetch(`${API_URL}/format`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await readError(res));
  return res.blob();
}

export async function formatAndConvert(
  file: File,
  profileId: string,
): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);
  form.append("profile_id", profileId);
  const res = await fetch(`${API_URL}/format-and-convert`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.blob();
}

export async function convertToPdf(file: File): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/convert`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await readError(res));
  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function stripDocxExt(name: string): string {
  return name.replace(/\.docx$/i, "");
}
