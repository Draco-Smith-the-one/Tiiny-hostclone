import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    setUploading(true);

    try {
      // Direct upload to Vercel Blob via our secure api route
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });

      setDownloadUrl(newBlob.url);
      alert("Upload Successful!");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Tiiny Host Clone</h1>
      <p>Upload HTML, Images, or ZIP files instantly</p>
      
      <div style={{ margin: '20px 0', border: '2px dashed #ccc', padding: '20px' }}>
        <input 
          type="file" 
          onChange={handleFileChange} 
          disabled={uploading}
        />
        <br /><br />
        <button 
          onClick={handleUpload} 
          disabled={uploading || !file}
          style={{
            padding: '10px 20px',
            backgroundColor: uploading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {uploading ? 'Uploading...' : 'Deploy Now'}
        </button>
      </div>

      {downloadUrl && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e9ecef' }}>
          <p>🎉 Your site is live at:</p>
          <a href={downloadUrl} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
            {downloadUrl}
          </a>
        </div>
      )}
    </div>
  );
}

export default App;
