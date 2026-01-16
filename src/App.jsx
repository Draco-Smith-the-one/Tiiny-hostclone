import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

// --- FIREBASE CONFIG ---
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

// --- SIMPLE SVG ICONS (No external library needed) ---
const IconCloud = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-4-4.5-.5-3.7-3.7-6.5-7.5-6.5-3.5 0-6.5 2.5-7.3 5.8C1.2 10.1 0 12.1 0 14.5 0 17 2 19 4.5 19h13z"/></svg>;
const IconUpload = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IconEye = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconTrash = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

export default function App() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth).catch(console.error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const filesRef = collection(db, 'artifacts', appId, 'public', 'data');
    return onSnapshot(filesRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFiles(list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    }, (err) => console.error("DB Error:", err));
  }, [user]);

  const handleUpload = async (e) => {
    if (e.type === 'drop') e.preventDefault();
    const targetFiles = e.target.files || (e.dataTransfer && e.dataTransfer.files);
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
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', id), {
          name: file.name,
          content: content,
          createdAt: new Date().toISOString(),
          ownerId: user.uid,
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
      setDragActive(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (viewingFile) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col z-[100]">
        <div className="h-12 bg-black text-white flex items-center justify-between px-4">
          <button onClick={() => setViewingFile(null)} className="text-[10px] font-bold uppercase tracking-widest">← Back</button>
          <div className="text-[10px] font-mono opacity-50">{viewingFile.name}</div>
          <div className="text-green-400 text-[10px] font-bold">LIVE</div>
        </div>
        <iframe srcDoc={viewingFile.content} className="flex-1 w-full border-none" title="preview" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="text-xl font-black text-indigo-600 flex items-center gap-2 italic">
            <IconCloud /> TIINY
          </div>
          <div className="text-[9px] font-mono text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            AUTH: {user ? 'ACTIVE' : 'CONNECTING...'}
          </div>
        </header>

        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleUpload}
          className={`border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all cursor-pointer ${dragActive ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-sm'}`}
        >
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept=".html"/>
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100">
            {isUploading ? <div className="animate-spin border-2 border-white border-t-transparent rounded-full w-6 h-6" /> : <IconUpload />}
          </div>
          <h2 className="text-xl font-bold mb-1">{isUploading ? 'Deploying...' : 'Deploy a new site'}</h2>
          <p className="text-slate-400 text-sm italic">Drop HTML file here</p>
        </div>

        <div className="mt-12 space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Live Deployments</h3>
          {files.map(f => (
            <div key={f.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center">
                  <span className="text-[10px] font-bold">HTML</span>
                </div>
                <div>
                  <div className="font-bold text-sm truncate max-w-[150px]">{f.name}</div>
                  <div className="text-[9px] font-black text-indigo-500 uppercase">{f.size} • LIVE</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setViewingFile(f)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><IconEye /></button>
                <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', f.id))} className="p-2.5 text-slate-100 hover:text-red-500 transition-colors"><IconTrash /></button>
              </div>
            </div>
          ))}
          {!files.length && !isUploading && <div className="text-center py-10 text-slate-300 text-sm italic">Empty. Deploy something!</div>}
        </div>
      </div>
    </div>
  );
}
