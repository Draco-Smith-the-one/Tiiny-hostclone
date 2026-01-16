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

export default function App() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [errorLog, setErrorLog] = useState(null); // Mobile error logger
  const [isUploading, setIsUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const fileInputRef = useRef(null);

  // Initialize Firebase inside a try-catch to catch mobile crashes
  let db, auth;
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    if (!errorLog) setErrorLog("Firebase Init Failed: " + e.message);
  }

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth).catch(e => setErrorLog("Auth Error: " + e.message));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    try {
      const filesRef = collection(db, 'artifacts', 'tinyhost-v1', 'public', 'data');
      return onSnapshot(filesRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFiles(list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
      }, (e) => setErrorLog("Database Sync Error: " + e.message));
    } catch (e) {
      setErrorLog("Effect Error: " + e.message);
    }
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
        await setDoc(doc(db, 'artifacts', 'tinyhost-v1', 'public', 'data', id), {
          name: file.name,
          content: content,
          createdAt: new Date().toISOString(),
          ownerId: user.uid,
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
      }
    } catch (e) { setErrorLog("Upload Error: " + e.message); }
    setIsUploading(false);
  };

  // --- UI RENDER ---

  // 1. If there's an error, show it in Red
  if (errorLog) {
    return (
      <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace', background: '#fff5f5', minHeight: '100vh' }}>
        <h1 style={{ fontSize: '20px' }}>⚠️ Mobile Debugger</h1>
        <p style={{ background: '#000', color: '#0f0', padding: '10px', borderRadius: '5px' }}>{errorLog}</p>
        <button onClick={() => window.location.reload()} style={{ padding: '10px', width: '100%' }}>Reload Page</button>
      </div>
    );
  }

  // 2. Viewing a site
  if (viewingFile) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#000', color: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setViewingFile(null)} style={{ color: '#fff', background: '#333', border: 'none', padding: '8px 15px', borderRadius: '5px' }}>Back</button>
          <span style={{ fontSize: '12px' }}>{viewingFile.name}</span>
        </div>
        <iframe srcDoc={viewingFile.content} style={{ flex: 1, border: 'none' }} />
      </div>
    );
  }

  // 3. Main Dashboard
  return (
    <div style={{ padding: '20px', fontFamily: '-apple-system, sans-serif', maxWidth: '500px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <b style={{ color: '#4f46e5', fontSize: '24px' }}>TIINY</b>
        <div style={{ fontSize: '10px', opacity: 0.5 }}>{user ? 'Connected' : 'Connecting...'}</div>
      </header>

      <div 
        onClick={() => fileInputRef.current.click()}
        style={{ background: 'white', border: '3px dashed #e2e8f0', borderRadius: '20px', padding: '40px 20px', textAlign: 'center' }}
      >
        <input type="file" ref={fileInputRef} hidden onChange={handleUpload} accept="text/html" />
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>☁️</div>
        <h3 style={{ margin: '0 0 5px 0' }}>{isUploading ? "Deploying..." : "Upload HTML"}</h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Tap to select file</p>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h4 style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Deployments</h4>
        {files.map(f => (
          <div key={f.id} style={{ background: 'white', padding: '15px', borderRadius: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
              <div style={{ fontSize: '10px', color: '#4f46e5' }}>LIVE • {f.size}</div>
            </div>
            <button onClick={() => setViewingFile(f)} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 15px', fontWeight: 'bold' }}>View</button>
          </div>
        ))}
        {!files.length && !isUploading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#cbd5e1' }}>No sites yet</div>
        )}
      </div>
    </div>
  );
                                           }
          
