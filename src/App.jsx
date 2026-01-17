import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUrl(''); // Clear old link

    try {
      // The options here MUST match the permissions in the API above
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        addRandomSuffix: true, 
      });

      setUrl(newBlob.url);
      alert("Upload Successful!");
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#6c5ce7' }}>TIINY CLONE</h1>
      <div style={{ border: '2px dashed #ccc', padding: '20px', margin: '20px auto', maxWidth: '300px' }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        {file && <p>Selected: {file.name}</p>}
      </div>
      <button 
        onClick={handleUpload} 
        disabled={uploading || !file}
        style={{ padding: '10px 20px', background: '#6c5ce7', color: '#fff', border: 'none', borderRadius: '5px' }}
      >
        {uploading ? "Uploading..." : "Deploy Now"}
      </button>

      {url && (
        <div style={{ marginTop: '20px', background: '#f0f0f0', padding: '10px' }}>
          <p>✅ Success! Link:</p>
          <a href={url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{url}</a>
        </div>
      )}
    </div>
  );
}
