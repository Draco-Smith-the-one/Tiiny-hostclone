import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      setUrl(newBlob.url);
    } catch (error) {
      alert("Upload Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>TIINY CLONE</h1>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? "Uploading..." : "Deploy Now"}
      </button>
      {url && (
        <div style={{ marginTop: '20px' }}>
          <p>Success! Your file is at:</p>
          <a href={url} target="_blank" rel="noreferrer">{url}</a>
        </div>
      )}
    </div>
  );
}
