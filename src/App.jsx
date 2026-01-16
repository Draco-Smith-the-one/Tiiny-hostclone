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
  const [status, setStatus] = useState('Initializing...');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setStatus('Ready');
      } else {
        signInAnonymously(auth).catch(e => setStatus('Auth Error: ' + e.message));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    // Path: artifacts -> tinyhost-v1 -> public -> sites (Odd number of segments: 3)
    const filesRef = collection(db, 'artifacts', appId, 'sites');
    
    const unsubscribe = onSnapshot(filesRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFiles(list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    }, (e) => {
      setStatus('Sync Error: ' + e.message);
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleUpload = async (e) => {
    const targetFiles = e.target.files;
    if (!targetFiles?.length || !user) return;
    
    setIsUploading(true);
    setStatus('Uploading...');
    
    try {
      for (let file of targetFiles) {
        const content = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = (ev) => res(ev.target.result);
          reader.onerror = rej;
          reader.readAsText(file);
        });

        const fileId = Math.random().toString(36).substring(7);
        // Doc Path: artifacts -> tinyhost-v1 -> sites -> [ID] (Even number: 4)
        const docRef = doc(db, 'artifacts', appId, 'sites', fileId);
        
        await setDoc(docRef, {
          name: file.name,
          content: content,
          createdAt: new Date().toISOString(),
          ownerId: user.uid,
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
      }
      setStatus('Success!');
      setTimeout(() => setStatus('Ready'), 2000);
    } catch (e) {
      setStatus('Upload Failed: ' + e.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (viewingFile) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#000', color: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setViewingFile(null)} style={{ color: '#fff', background: '#333', border: 'none', padding: '8px 15px', borderRadius: '8px' }}>Close</button>
          <span style={{ fontSize: '12px' }}>{viewingFile.name}</span>
          <span style={{ color: '#4ade80', fontSize: '10px' }}>LIVE</span>
        </div>
        <iframe srcDoc={viewingFile.content} style={{ flex: 1, border: 'none' }} title="preview" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#4f46e5', margin: 0, fontSize: '22px', fontWeight: 'bold' }}>TIINY HOST</h1>
        <div style={{ fontSize: '9px', background: '#fff', padding: '4px 10px', borderRadius: '15px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          {status}
        </div>
      </header>

      <div 
        onClick={() => fileInputRef.current.click()}
        style={{ background: 'white', border: '2px dashed #cbd5e1', borderRadius: '20px', padding: '40px 20px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
      >
        <input type="file" ref={fileInputRef} hidden onChange={handleUpload} accept=".html" />
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>{isUploading ? '⌛' : '📤'}</div>
        <h3 style={{ margin: '0 0 5px 0' }}>{isUploading ? 'Deploying...' : 'Upload HTML'}</h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Tap to browse files</p>
      </div>

      <div style={{ marginTop: '40px' }}>
        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px' }}>Live Sites ({files.length})</div>
        {files.map(f => (
          <div key={f.id} style={{ background: 'white', padding: '15px', borderRadius: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
            <div style={{ overflow: 'hidden', marginRight: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
              <div style={{ fontSize: '10px', color: '#4f46e5' }}>{f.size} • Public</div>
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => setViewingFile(f)} style={{ background: '#f1f5f9', color: '#4f46e5', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 'bold' }}>View</button>
              <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'sites', f.id))} style={{ background: 'none', border: 'none', color: '#fee2e2', padding: '5px' }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
