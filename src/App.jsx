import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, getDoc } from 'firebase/firestore';

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
    const initApp = async () => {
      // 1. Check for incoming shared links (?site=ID)
      const params = new URLSearchParams(window.location.search);
      const siteId = params.get('site');

      // 2. Handle Authentication
      const unsubscribe = onAuthStateChanged(auth, async (u) => {
        if (u) {
          setUser(u);
          setStatus('Ready');
          if (siteId) loadSharedSite(siteId);
        } else {
          try {
            await signInAnonymously(auth);
          } catch (e) {
            setStatus('Auth Error');
          }
        }
      });
      return unsubscribe;
    };
    initApp();
  }, []);

  const loadSharedSite = async (id) => {
    setStatus('Loading Site...');
    try {
      const docRef = doc(db, 'artifacts', appId, 'sites', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setViewingFile({ id: snap.id, ...snap.data() });
        setStatus('Live');
      } else {
        setStatus('Site Not Found');
      }
    } catch (e) {
      setStatus('Load Error');
    }
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
    setStatus('Deploying...');
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
    } catch (e) { setStatus('Upload Error'); }
    setIsUploading(false);
  };

  const copyLink = (id) => {
    // Generate clean URL without existing params
    const baseUrl = window.location.href.split('?')[0];
    const link = `${baseUrl}?site=${id}`;
    
    const textArea = document.createElement("textarea");
    textArea.value = link;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    setStatus('Link Copied!');
    setTimeout(() => setStatus('Ready'), 2000);
  };

  const closeViewer = () => {
    setViewingFile(null);
    window.history.replaceState({}, '', window.location.pathname);
    setStatus('Ready');
  };

  if (viewingFile) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0f172a', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={closeViewer} style={{ color: '#fff', background: '#334155', border: 'none', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>✕ Close</button>
          <span style={{ fontSize: '11px', fontWeight: '600', opacity: 0.8, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{viewingFile.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></span>
            <span style={{ color: '#22c55e', fontSize: '10px', fontWeight: '900', letterSpacing: '0.5px' }}>LIVE</span>
          </div>
        </div>
        <iframe srcDoc={viewingFile.content} style={{ flex: 1, border: 'none', width: '100%' }} title="preview" sandbox="allow-scripts allow-forms" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: '500px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', background: '#4f46e5', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>T</div>
          <h1 style={{ color: '#1e293b', margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '-0.5px' }}>TIINY HOST</h1>
        </div>
        <div style={{ fontSize: '10px', background: '#fff', padding: '6px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 'bold', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          {status.toUpperCase()}
        </div>
      </header>

      <div onClick={() => fileInputRef.current.click()} style={{ background: 'white', border: '2px dashed #cbd5e1', borderRadius: '28px', padding: '48px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
        <input type="file" ref={fileInputRef} hidden onChange={handleUpload} accept=".html" />
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{isUploading ? '⚙️' : '☁️'}</div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{isUploading ? 'Publishing...' : 'Upload Manga Page'}</h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Drop your .html file to go live</p>
      </div>

      <div style={{ marginTop: '40px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Active Sites</span>
          <span>{files.length}</span>
        </div>
        
        {files.map(f => (
          <div key={f.id} style={{ background: 'white', padding: '16px', borderRadius: '20px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ overflow: 'hidden', flex: 1, marginRight: '12px' }}>
              <div style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
              <div style={{ fontSize: '10px', color: '#4f46e5', fontWeight: '800' }}>{f.size} • PUBLIC</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setViewingFile(f)} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold' }}>View</button>
              <button onClick={() => copyLink(f.id)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', padding: '10px', fontSize: '14px' }}>🔗</button>
              <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'sites', f.id))} style={{ color: '#fca5a5', background: 'none', border: 'none', padding: '5px' }}>✕</button>
            </div>
          </div>
        ))}

        {!files.length && !isUploading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#cbd5e1' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
            <p style={{ fontSize: '14px', fontWeight: '500' }}>No deployments yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
