"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, publicErrorMessage } from "@/client/api";

export default function UploadPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setProgress(15);
    const form = event.currentTarget;
    const data = new FormData(form);
    // Multipart upload with CSRF
    const result = await apiFetch(`/api/properties/${id}/documents`, {
      method: "POST",
      csrf: true,
      body: data,
    });
    setProgress(70);
    if (!result.ok) {
      setLoading(false);
      setProgress(0);
      if (result.status === 401) {
        router.replace("/login");
        return;
      }
      setError(publicErrorMessage(result.error));
      return;
    }
    setProgress(100);
    // Trigger analysis after upload
    const analyse = await apiFetch(`/api/properties/${id}/analyse`, {
      method: "POST",
      csrf: true,
    });
    setLoading(false);
    if (!analyse.ok && analyse.error !== "LIVE_OCR_REQUIRED") {
      setError(publicErrorMessage(analyse.error));
      router.push(`/properties/${id}/status`);
      return;
    }
    router.push(`/properties/${id}/status`);
  }

  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <header className="topbar">
        <Link href={`/properties/${id}`}>← Property</Link>
      </header>
      <section className="panel" aria-labelledby="upload-title">
        <h1 id="upload-title">Guided document upload</h1>
        <p className="muted">Upload Fard, Mutation, CNIC/NICOP and supporting deeds. Max 15 MB per file.</p>
        <p className="muted small">PDF, JPEG, PNG, WebP, BMP, TIFF, HEIC — including exports from ClearScanner / CamScanner. Prefer enhanced PDF or JPEG for best OCR.</p>
      <form className="stack" onSubmit={onSubmit}>
          <label htmlFor="docType">
            Document type
            <select id="docType" name="docType" required defaultValue="FARD">
              <option value="FARD">Fard-e-Malkiyat</option>
              <option value="MUTATION">Mutation</option>
              <option value="CNIC">CNIC / NICOP</option>
              <option value="OTHER">Other supporting document</option>
            </select>
          </label>
          <label htmlFor="file">
            File
            <input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff,.heic,.heif,.gif,application/pdf,image/*" required />
          </label>
          {error ? (
            <div className="banner failed" role="alert">
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="banner loading" role="status">
              Uploading and validating…
              <div className="progress" aria-label="Upload progress">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}
          <div className="form-actions">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Working…" : "Upload and validate"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
