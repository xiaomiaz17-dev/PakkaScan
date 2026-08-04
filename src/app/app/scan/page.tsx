'use client';

import React, { useState } from 'react';

export default function ScanPage() {
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFilePreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const handleAnalyse = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('files', file);

    try {
      const res = await fetch('/api/beta/scan', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process document');
      }

      let parsed = data.analysis;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (e) {
          parsed = { summary: parsed, findings: [], recommendations: [] };
        }
      }

      setResult(parsed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '48px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Centered Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-block', marginBottom: '16px' }}>
            <svg style={{ width: '56px', height: '56px', display: 'block', margin: '0 auto' }} width="56" height="56" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4L4 12V24C4 35.0457 12.0543 44 24 44C35.9457 44 44 35.0457 44 24V12L24 4Z" fill="#1e40af" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M24 8L8 14.4V24C8 32.8366 14.4435 40 24 40C33.5565 40 40 32.8366 40 24V14.4L24 8Z" fill="#0f172a"/>
              <path d="M16 16H26C27.1046 16 28 16.8954 28 18V32C28 33.1046 27.1046 34 26 34H16C14.8954 34 14 33.1046 14 32V18C14 16.8954 14.8954 16 16 16Z" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M18 20H24" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
              <path d="M18 24H22" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
              <path d="M18 30L22 34L32 24" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.025em' }}>
            Pakka<span style={{ color: '#2563eb' }}>Scan</span>
          </h1>
          
          <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', color: '#64748b', textTransform: 'uppercase', margin: '0 0 16px 0' }}>
            Evidence-Linked Verification
          </p>

          <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 6px 0' }}>
            AI-powered legal due diligence for Pakistani property
          </p>
          
          <p style={{ fontSize: '15px', color: '#475569', margin: '0' }}>
            Don&apos;t pay bayana until you know what&apos;s real.
          </p>
        </div>

        {/* Main Split Layout or Upload View */}
        {!result ? (
          <div style={{ maxWidth: '768px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
                Upload Contract Page (PDF or Image)
              </label>
              <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '32px 20px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <svg style={{ width: '48px', height: '48px', margin: '0 auto 12px auto', color: '#94a3b8', display: 'block' }} width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#475569', marginBottom: '4px' }}>
                  <label style={{ color: '#059669', fontWeight: '600', cursor: 'pointer' }}>
                    <span>Upload a file</span>
                    <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
                  <span>or drag and drop</span>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0' }}>PDF, PNG, JPG up to 10MB</p>
              </div>
            </div>

            {file && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '8px', fontSize: '14px', marginBottom: '24px', border: '1px solid #bfdbfe' }}>
                <span style={{ fontWeight: '500' }}>Selected: {file.name}</span>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ready</span>
              </div>
            )}

            <button
              onClick={handleAnalyse}
              disabled={!file || loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: !file || loading ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '14px',
                borderRadius: '10px',
                border: 'none',
                cursor: !file || loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? 'Analysing Document & Running Compliance Checks...' : 'Analyse Document'}
            </button>
          </div>
        ) : (
          /* Side-by-Side Split View once analysis completes */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Column: Document Preview */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'sticky', top: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0' }}>Contract Preview</h3>
                <button 
                  onClick={() => setResult(null)} 
                  style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Upload New File
                </button>
              </div>
              <div style={{ width: '1000%', maxWidth: '100%', height: '600px', backgroundColor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {filePreviewUrl ? (
                  file?.type === 'application/pdf' ? (
                    <iframe src={filePreviewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview" />
                  ) : (
                    <img src={filePreviewUrl} alt="Contract Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  )
                ) : (
                  <p style={{ color: '#64748b', fontSize: '14px' }}>No preview available</p>
                )}
              </div>
            </div>

            {/* Right Column: Due Diligence Report */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0' }}>Due Diligence Report</h2>
                <span style={{ padding: '4px 10px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                  Risk: {result.riskScore || 'Moderate'}
                </span>
              </div>

              <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5', marginBottom: '20px' }}>
                {result.summary}
              </p>

              {/* Validation Checks */}
              {result.validations && (
                <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>Compliance & Identity Checks</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', color: '#334155' }}>CNIC Format Check:</span>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: result.validations.cnicStatus.isValid ? '#dcfce7' : '#fee2e2', color: result.validations.cnicStatus.isValid ? '#166534' : '#991b1b' }}>
                        {result.validations.cnicStatus.isValid ? 'Valid' : 'Action Required'}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0' }}>{result.validations.cnicStatus.message}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontWeight: '600', color: '#334155' }}>Stamp Paper Duty:</span>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', backgroundColor: result.validations.stampPaperStatus.isValid ? '#dcfce7' : '#fee2e2', color: result.validations.stampPaperStatus.isValid ? '#166534' : '#991b1b' }}>
                        {result.validations.stampPaperStatus.isValid ? 'Compliant' : 'Review Needed'}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0' }}>{result.validations.stampPaperStatus.message}</p>
                  </div>
                </div>
              )}

              {/* Findings */}
              {result.findings && result.findings.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>Key Findings & Red Flags</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {result.findings.map((f: any, idx: number) => (
                      <div key={idx} style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{f.category}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: f.severity === 'High' ? '#dc2626' : '#d97706' }}>{f.severity}</span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 6px 0' }}>{f.detail}</p>
                        {f.evidence && (
                          <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#64748b', margin: '0' }}>Evidence: {f.evidence}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>Recommendations</h4>
                  <ul style={{ margin: '0', paddingLeft: '18px', color: '#334155', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {result.recommendations.map((rec: string, idx: number) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

          </div>
        )}

        {error && (
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', fontSize: '14px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

      </div>
    </div>
  );
}