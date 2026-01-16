import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCGgpkwpnVBRRhvfXubN0oXF0ucuEpiGD0",
  authDomain: "my-tiiny-host-d8660.firebaseapp.com",
  projectId: "my-tiiny-host-d8660",
  storageBucket: "my-tiiny-host-d8660.firebasestorage.app",
  messagingSenderId: "985363120155",
  appId: "1:985363120155:web:ff836fc7c9ba0b5f50f8be"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'tinyhost-v1';

export default function App() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth).catch(e => setError(e.message));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const filesRef = collection(db, 'artifacts', appId, 'public', 'data', 'sites');
    return onSnapshot(filesRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFiles(list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    }, (e) => setError(e.message));
  }, [user]);

  const handleUpload = async (e) => {
    const targetFiles = e.target.files;
    if (!targetFiles?.length || !user) return;
    setIsUploading(true);
    try {
      for (let file of targetFiles) {
        const content = await new Promise((res) => {
          const reader = new FileReader();
          reader.onload = (ev) => res(ev.target.result);
          reader.readAsText(file);
        });
        const id = Math.random().toString(36).substring(7);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sites', id), {
          name: file.name,
          content: content,
          createdAt: new Date().toISOString(),
          ownerId: user.uid,
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
      }
    } catch (e) { setError(e.message); }
    setIsUploading(false);
  };

  if (viewingFile) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#000', color: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setViewingFile(null)} style={{ color: '#fff', background: '#333', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold' }}>Close</button>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{viewingFile.name}</span>
          <span style={{ color: '#4ade80', fontSize: '10px', fontWeight: 'bold' }}>LIVE</span>
        </div>
        <iframe srcDoc={viewingFile.content} style={{ flex: 1, border: 'none' }} title="preview" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: '-apple-system, sans-serif', maxWidth: '500px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ color: '#4f46e5', margin: 0, fontSize: '24px', fontWeight: '900', letterSpacing: '-1px' }}>TIINY</h1>
        <div style={{ fontSize: '10px', background: '#fff', padding: '4px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', color: user ? '#10b981' : '#94a3b8' }}>
          {user ? '● ONLINE' : '● CONNECTING'}
        </div>
      </header>

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '12px', fontSize: '12px', marginBottom: '20px', fontWeight: 'bold' }}>
          Error: {error}
        </div>
      )}

      <div 
        onClick={() => fileInputRef.current.click()}
        style={{ background: 'white', border: '2px dashed #cbd5e1', borderRadius: '24px', padding: '48px 24px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
      >
        <input type="file" ref={fileInputRef} hidden onChange={handleUpload} accept=".html" />
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{isUploading ? '⚙️' : '☁️'}</div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold' }}>{isUploading ? 'Deploying...' : 'Upload HTML'}</h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Select a file to host it instantly</p>
      </div>

      <div style={{ marginTop: '48px' }}>
        <h4 style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900', marginBottom: '16px' }}>Deployments</h4>
        {files.map(f => (
          <div key={f.id} style={{ background: 'white', padding: '16px', borderRadius: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>{f.name}</div>
              <div style={{ fontSize: '10px', color: '#4f46e5', fontWeight: 'bold' }}>{f.size} • PUBLIC</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setViewingFile(f)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', padding: '10px 16px', fontWeight: 'bold', fontSize: '13px' }}>View</button>
              <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sites', f.id))} style={{ background: 'transparent', color: '#cbd5e1', border: 'none', padding: '8px' }}>✕</button>
            </div>
          </div>
        ))}
        {!files.length && !isUploading && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }}>No active sites</div>
        )}
      </div>
    </div>
  );
                      }
    
