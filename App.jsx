import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Upload, Cloud, Search, Loader2, Globe, Code, Share2, ArrowLeft, Eye, Trash2
} from 'lucide-react';

// --- CONFIGURATION ---
// Replace the empty strings below with your actual Firebase keys 
// found in your Firebase Console (Project Settings > General)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const customAppId = 'production-tinyhost-v1';

export default function App() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeSite, setActiveSite] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Standard Anonymous Auth for Production
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const filesRef = collection(db, 'deployments', customAppId, 'files');
    const unsubscribe = onSnapshot(filesRef, (snapshot) => {
      const filesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFiles(filesList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user]);

  const showNote = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFileUpload = async (e) => {
    const uploadedFiles = e.target.files || e.dataTransfer.files;
    if (!uploadedFiles.length || !user) return;
    setIsUploading(true);
    try {
      for (let file of uploadedFiles) {
        const fileId = crypto.randomUUID();
        const content = await new Promise((res) => {
          const reader = new FileReader();
          reader.onload = (ev) => res(ev.target.result);
          reader.readAsText(file);
        });
        
        await setDoc(doc(db, 'deployments', customAppId, 'files', fileId), {
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          content: content,
          createdAt: serverTimestamp(),
          ownerId: user.uid
        });
      }
      showNote("Successfully Published!");
    } catch (err) { showNote("Upload failed"); }
    finally { setIsUploading(false); setDragActive(false); }
  };

  if (currentView === 'viewer' && activeSite) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col z-[9999]">
        <div className="h-12 bg-slate-900 text-white flex items-center justify-between px-4">
          <button onClick={() => setCurrentView('dashboard')} className="text-xs font-bold flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> DASHBOARD
          </button>
          <span className="text-xs font-mono opacity-50">{activeSite.name}</span>
          <div className="flex items-center gap-2 text-green-400 text-[10px] font-bold uppercase">
            <Globe className="w-3 h-3 animate-pulse" /> Live
          </div>
        </div>
        <iframe title="Preview" srcDoc={activeSite.content} className="flex-1 w-full border-none" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center justify-between mb-12">
          <div className="font-black text-2xl tracking-tighter text-indigo-600 flex items-center gap-2">
            <Cloud /> TINYHOST
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-100">Deploy</button>
        </nav>

        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileUpload(e); }}
          className={`border-4 border-dashed rounded-[2.5rem] p-20 flex flex-col items-center justify-center cursor-pointer transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-400'}`}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <Upload className={`w-12 h-12 mb-4 ${isUploading ? 'animate-bounce text-indigo-400' : 'text-slate-300'}`} />
          <p className="text-xl font-bold">Drag & Drop HTML</p>
        </div>

        <div className="mt-12 space-y-4">
          {files.map(file => (
            <div key={file.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <Code className="text-indigo-600" />
                <span className="font-bold">{file.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setActiveSite(file); setCurrentView('viewer'); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Eye size={18} /></button>
                <button onClick={async () => await deleteDoc(doc(db, 'deployments', customAppId, 'files', file.id))} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {notification && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-3 rounded-full font-bold shadow-2xl">{notification}</div>}
    </div>
  );
}

export default App; // <--- Make sure this line is at the very end
