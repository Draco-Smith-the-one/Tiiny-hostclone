import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setDownloadUrl('');

    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        addRandomSuffix: true, // authorized by the server-side token
      });

      setDownloadUrl(newBlob.url);
      alert("Upload Successful!");
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>TIINY CLONE</h1>
        <p style={styles.subtitle}>Upload and host instantly</p>
        
        <div style={styles.dropzone}>
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files[0])} 
            style={styles.fileInput} 
          />
          <label style={styles.label}>
            {file ? `Selected: ${file.name}` : 'Tap to select file'}
          </label>
        </div>

        <button 
          onClick={handleUpload} 
          disabled={uploading || !file}
          style={{...styles.button, backgroundColor: uploading ? '#a29bfe' : '#6c5ce7'}}
        >
          {uploading ? 'Processing...' : 'Deploy Now'}
        </button>

        {downloadUrl && (
          <div style={styles.resultCard}>
            <p style={styles.successText}>🚀 Your site is live!</p>
            <a href={downloadUrl} target="_blank" rel="noreferrer" style={styles.visitLink}>
              View Website →
            </a>
            <p style={styles.urlText}>{downloadUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif', padding: '20px' },
  card: { backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%', textAlign: 'center' },
  title: { color: '#6c5ce7', fontSize: '28px', marginBottom: '8px' },
  subtitle: { color: '#636e72', marginBottom: '30px' },
  dropzone: { border: '2px dashed #dfe6e9', borderRadius: '12px', padding: '30px', marginBottom: '20px', position: 'relative' },
  fileInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0, cursor: 'pointer' },
  label: { color: '#2d3436', fontSize: '14px' },
  button: { width: '100%', padding: '14px', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  resultCard: { marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '12px' },
  successText: { color: '#00b894', fontWeight: 'bold', marginBottom: '10px' },
  visitLink: { display: 'block', color: '#6c5ce7', textDecoration: 'none', fontWeight: 'bold', marginBottom: '10px' },
  urlText: { fontSize: '10px', color: '#b2bec3', wordBreak: 'break-all' }
};

export default App;
