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
    const urlParams = new URLSearchParams(window.location.search);
    const siteId = urlParams.get('site');
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setStatus('Ready');
        if (siteId) fetchSpecificSite(siteId);
      } else {
        signInAnonymously(auth).catch(e => setStatus('Auth Error'));
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchSpecificSite = (id) => {
    const filesRef = collection(db, 'artifacts', appId, 'sites');
    onSnapshot(filesRef, (snap) => {
      const site = snap.docs.find(d => d.id === id);
      if (site) setViewingFile({ id: site.id, ...site.data() });
    });
  };

  useEffect(() => {
    if (!user) return;
    const filesRef = collection(db, 'artifacts', appId, 'sites');
    return onSnapshot(filesRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFiles(list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    }, (e) => setStatus('Sync Error'));
  }, [user]);

  const handleUpload = async (e) => {
    const targetFiles = e.target.files;
    if (!targetFiles?.length || !user) return;
    setIsUploading(true);
    setStatus('Uploading...');
    try {
      for (let file of targetFiles) {
        const content = await new Promise((res) => {
          const reader = new FileReader();
          reader.onload = (ev) => res(ev.target.result);
          reader.readAsText(file);
        });
        const fileId = Math.random().toString(36).substring(7);
        await setDoc(doc(db, 'artifacts', appId, 'sites', fileId), {
          name: file.name,
          content: content,
          createdAt: new Date().toISOString(),
          ownerId: user.uid,
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
      }
      setStatus('Success!');
      setTimeout(() => setStatus('Ready'), 2000);
    } catch (e) { setStatus('Error'); }
    setIsUploading(false);
  };

  const copyLink = (id) => {
    const link = `${window.location.origin}${window.location.pathname}?site=${id}`;
    const el = document.createElement('textarea');
    el.value = link;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setStatus('Link Copied!');
    setTimeout(() => setStatus('Ready'), 2000);
  };

  if (viewingFile) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#000', color: '#fff', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => { setViewingFile(null); window.history.replaceState({}, '', window.location.pathname); }} style={{ color: '#fff', background: '#333', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>✕ Exit</button>
          <span style={{ fontSize: '11px', fontWeight: 'bold', opacity: 0.7 }}>{viewingFile.name}</span>
          <div style={{ color: '#4ade80', fontSize: '10px', fontWeight: 'bold' }}>● LIVE</div>
        </div>
        <iframe srcDoc={viewingFile.content} style={{ flex: 1, border: 'none' }} title="preview" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: '-apple-system, sans-serif', maxWidth: '500px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#4f46e5', margin: 0, fontSize: '22px', fontWeight: '900' }}>TIINY</h1>
        <div style={{ fontSize: '9px', background: '#fff', padding: '5px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{status}</div>
      </header>

      <div onClick={() => fileInputRef.current.click()} style={{ background: 'white', border: '2px dashed #cbd5e1', borderRadius: '24px', padding: '40px 20px', textAlign: 'center' }}>
        <input type="file" ref={fileInputRef} hidden onChange={handleUpload} accept=".html" />
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>{isUploading ? '⚙️' : '🚀'}</div>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{isUploading ? 'Deploying...' : 'Deploy New Site'}</h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Tap to upload your HTML manga page</p>
      </div>

      <div style={{ marginTop: '40px' }}>
        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>My Deployments</div>
        {files.map(f => (
          <div key={f.id} style={{ background: 'white', padding: '15px', borderRadius: '18px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
              <div style={{ fontSize: '10px', color: '#4f46e5', fontWeight: 'bold' }}>{f.size} • ACTIVE</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setViewingFile(f)} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 'bold' }}>View</button>
              <button onClick={() => copyLink(f.id)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', padding: '8px 12px', fontSize: '12px' }}>🔗</button>
              <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'sites', f.id))} style={{ color: '#cbd5e1', background: 'none', border: 'none', padding: '5px' }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
