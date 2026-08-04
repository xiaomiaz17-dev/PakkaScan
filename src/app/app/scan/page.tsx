'use client';

import React, { useState } from 'react';

export default function MultiFileUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Prevent browser from opening files in a new tab on drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Capture dropped files safely
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
      e.dataTransfer.clearData();
    }
  };

  // Capture files via standard file picker dialog
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'system-ui' }}>
      {/* Drop Zone Box */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          border: '2px dashed #94a3b8',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          marginBottom: '20px',
        }}
      >
        <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#334155' }}>
          Drag and drop multiple tenancy agreements here
        </p>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>
          or select them from your computer:
        </p>

        {/* File Input with 'multiple' attribute */}
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
      </div>

      {/* List of files ready to upload/scan */}
      {selectedFiles.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Selected Documents ({selectedFiles.length}):</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569' }}>
            {selectedFiles.map((file, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {file.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}