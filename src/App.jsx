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
        addRandomSuffix: true, // This requires server-side permission
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
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>TIINY CLONE</h1>
        <div style={styles.box}>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} style={styles.input} id="f" />
          <label htmlFor="f" style={styles.label}>{file ? file.name : "Select File"}</label>
        </div>
        <button onClick={handleUpload} disabled={uploading || !file} style={styles.btn}>
          {uploading ? "Uploading..." : "Deploy Now"}
        </button>
        {url && <div style={styles.res}><a href={url} target="_blank">View Site →</a><p style={{fontSize:'10px'}}>{url}</p></div>}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f4f7f6', fontFamily: 'sans-serif' },
  card: { background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', textAlign: 'center', width: '90%', maxWidth: '400px' },
  title: { color: '#6c5ce7', marginBottom: '20px' },
  box: { border: '2px dashed #ddd', padding: '20px', marginBottom: '20px', borderRadius: '10px', position: 'relative' },
  input: { position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0, cursor: 'pointer' },
  label: { color: '#666' },
  btn: { width: '100%', padding: '12px', background: '#6c5ce7', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  res: { marginTop: '20px', padding: '10px', background: '#eef', borderRadius: '8px' }
};
