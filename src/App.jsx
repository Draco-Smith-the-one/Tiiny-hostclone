import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Upload, Cloud, Loader2, Globe, Code, ArrowLeft, Eye, Trash2 } from 'lucide-react';

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCGgpkwpnVBRRhvfXubN0oXF0ucuEpiGD0",
  authDomain: "my-tiiny-host-d8660.firebaseapp.com",
  projectId: "my-tiiny-host-d8660",
  storageBucket: "my-tiiny-host-d8660.firebasestorage.app",
  messagingSenderId: "985363120155",
  appId: "1:985363120155:web:ff836fc7c9ba0b5f50f8be"
};

// Safety Check for Firebase Init
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'tinyhost-v1';

export default function App() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeSite, setActiveSite] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        signInAnonymously(auth).catch(err => console.error("Auth Error:", err));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const filesRef = collection(db, 'artifacts', appId, 'public', 'data');
    const unsubscribe = onSnapshot(filesRef, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFiles(docs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
    }, (err) => {
      console.error("Firestore Error:", err);
    });
    return () => unsubscribe();
  }, [user]);

  const handleFileUpload = async (e) => {
    if (e.type === 'drop') e.preventDefault();
    const uploadedFiles = e.target.files || (e.dataTransfer && e.dataTransfer.files);
    if (!uploadedFiles || !uploadedFiles.length || !user) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const reader = new FileReader();
        const content = await new Promise((res) => {
          reader.onload = (ev) => res(ev.target.result);
          reader.readAsText(file);
        });

        const fileId = Math.random().toString(36).substring(7);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', fileId), {
          name: file.name,
          content: content,
          createdAt: new Date().toISOString(),
          ownerId: user.uid,
          size: (file.size / 1024).toFixed(1) + ' KB'
        });
      }
      setNotification("Site Published!");
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      setDragActive(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (currentView === 'viewer' && activeSite) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col z-[100]">
        <div className="h-12 bg-black text-white flex items-center justify-between px-4">
          <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 text-[10px] font-bold uppercase"><ArrowLeft size={14}/> Back</button>
          <div className="text-[10px] font-mono opacity-50">{activeSite.name}</div>
          <div className="text-green-400 text-[10px] font-bold flex items-center gap-1"><Globe size={10}/> LIVE</div>
        </div>
        <iframe srcDoc={activeSite.content} className="flex-1 w-full border-none" title="preview" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="text-xl font-black italic text-indigo-600 flex items-center gap-1">
            <Cloud size={24} fill="currentColor"/> TIINY
          </div>
          <div className="text-[10px] font-mono text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
            SECURE_ID: {user ? user.uid.slice(0, 8) : 'CONNECTING...'}
          </div>
        </header>

        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleFileUpload}
          className={`relative border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all cursor-pointer ${dragActive ? 'bg-indigo-50 border-indigo-500 scale-[0.98]' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-sm'}`}
        >
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".html"/>
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
          </div>
          <h2 className="text-xl font-bold mb-1">{isUploading ? 'Deploying...' : 'Deploy a new site'}</h2>
          <p className="text-slate-400 text-sm">Drag your HTML file here or click to browse</p>
        </div>

        <div className="mt-12">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 px-2">Active Sites</h3>
          <div className="space-y-3">
            {files.map(file => (
              <div key={file.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Code size={18}/>
                  </div>
                  <div>
                    <div className="font-bold text-sm">{file.name}</div>
                    <div className="text-[9px] font-black text-indigo-500 uppercase">{file.size} • PUBLIC</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setActiveSite(file); setCurrentView('viewer'); }} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600"><Eye size={16}/></button>
                  <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', file.id))} className="p-2.5 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
            {files.length === 0 && !isUploading && (
              <div className="text-center py-12 text-slate-300 text-sm italic font-medium">No sites live yet.</div>
            )}
          </div>
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-2xl text-sm">
          {notification}
        </div>
      )}
    </div>
  );
        }
                
