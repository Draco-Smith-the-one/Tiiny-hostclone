import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
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
  Upload, Cloud, CheckCircle, Search, Loader2, Globe, Code, Share2, ArrowLeft, Eye, Trash2, X
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'tinyhost-sim-v5';

export default function App() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  
  // VIRTUAL ROUTING STATE (Prevents 404s)
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'viewer'
  const [activeSite, setActiveSite] = useState(null);
  
  const fileInputRef = useRef(null);

  // --- Auth Logic ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- Real-time Sync ---
  useEffect(() => {
    if (!user) return;
    const filesRef = collection(db, 'artifacts', appId, 'public', 'data', 'hosted_files');
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
        
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'hosted_files', fileId), {
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          content: content,
          createdAt: serverTimestamp(),
          ownerId: user.uid
        });
      }
      showNote("Site Deployed Locally!");
    } catch (err) { showNote("Upload failed"); }
    finally { setIsUploading(false); setDragActive(false); }
  };

  const openPreview = (file) => {
    setActiveSite(file);
    setCurrentView('viewer');
  };

  // --- VIEW: THE HOSTED SITE ---
  if (currentView === 'viewer' && activeSite) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col z-[9999]">
        <div className="h-12 bg-slate-900 text-white flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentView('dashboard')} className="text-xs font-bold flex items-center gap-1 hover:text-indigo-400">
              <ArrowLeft className="w-3 h-3" /> EXIT PREVIEW
            </button>
            <span className="text-[10px] opacity-30">|</span>
            <span className="text-xs font-mono">{activeSite.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-green-400">LIVE SIMULATION</span>
            <Globe className="w-3 h-3 text-green-400 animate-pulse" />
          </div>
        </div>
        <iframe 
          title="Hosted Page" 
          srcDoc={activeSite.content} 
          className="flex-1 w-full border-none"
          sandbox="allow-scripts allow-forms"
        />
      </div>
    );
  }

  // --- VIEW: THE DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 font-sans">
      <nav className="h-16 bg-white border-b px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 font-black text-xl italic text-indigo-600">
          <Cloud className="w-6 h-6" /> TINYHOST.
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100"
        >
          Deploy
        </button>
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="mb-10">
          <h1 className="text-4xl font-black mb-2 tracking-tight">Deploy your static site.</h1>
          <p className="text-slate-500">Files are stored in the cloud. Testing links works inside this window.</p>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFileUpload(e); }}
          className={`border-4 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center justify-center cursor-pointer transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <div className="bg-indigo-600 p-5 rounded-3xl text-white shadow-xl mb-6">
            {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
          </div>
          <p className="text-xl font-bold">Drag & Drop HTML File</p>
        </div>

        <div className="mt-12 space-y-3">
          {files.map(file => (
            <div key={file.id} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Code className="w-5 h-5" /></div>
                <h3 className="font-bold text-slate-800">{file.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openPreview(file)} 
                  className="bg-indigo-50 text-indigo-600 font-bold px-4 py-2 rounded-xl text-xs hover:bg-indigo-600 hover:text-white transition-all"
                >
                  VIEW SITE
                </button>
                <button 
                  onClick={async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'hosted_files', file.id))}
                  className="p-3 text-slate-200 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-5 h-5"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl font-bold z-[10000]">
          {notification}
        </div>
      )}
    </div>
  );
}

  export default App; // <--- Make sure this line is at the very end
