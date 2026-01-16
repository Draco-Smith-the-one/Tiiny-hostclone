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
  onSnapshot, 
  deleteDoc
} from 'firebase/firestore';
import { 
  Upload, Cloud, Loader2, Globe, Code, ArrowLeft, Eye, Trash2
} from 'lucide-react';

// --- YOUR VERIFIED FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyCGgpkwpnVBRRhvfXubN0oXF0ucuEpiGD0",
  authDomain: "my-tiiny-host-d8660.firebaseapp.com",
  projectId: "my-tiiny-host-d8660",
  storageBucket: "my-tiiny-host-d8660.firebasestorage.app",
  messagingSenderId: "985363120155",
  appId: "1:985363120155:web:ff836fc7c9ba0b5f50f8be"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'tinyhost-v1';

function App() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeSite, setActiveSite] = useState(null);
  const fileInputRef = useRef(null);

  // Auth initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth failed:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Data listener
  useEffect(() => {
    if (!user) return;
    // Using the required path structure: /artifacts/{appId}/public/data/{collection}
    const filesRef = collection(db, 'artifacts', appId, 'public', 'data');
    
    const unsubscribe = onSnapshot(filesRef, (snapshot) => {
      const filesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by local timestamp or name
      setFiles(filesList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }, (err) => {
      console.error("Firestore Error:", err);
    });
    
    return () => unsubscribe();
  }, [user]);

  const showNote = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFileUpload = async (e) => {
    // Prevent default browser behavior for drag/drop
    if (e.type === 'drop') {
      e.preventDefault();
      setDragActive(false);
    }

    const uploadedFiles = e.target.files || (e.dataTransfer && e.dataTransfer.files);
    if (!uploadedFiles || uploadedFiles.length === 0 || !user) return;
    
    setIsUploading(true);
    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const fileId = Math.random().toString(36).substring(2, 15);
        
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.onerror = (err) => reject(err);
          reader.readAsText(file);
        });
        
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', fileId);
        await setDoc(docRef, {
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          content: content,
          createdAt: new Date().toISOString(),
          ownerId: user.uid
        });
      }
      showNote("Successfully Published!");
    } catch (err) { 
      console.error("Upload Error:", err);
      showNote("Upload failed"); 
    } finally { 
      setIsUploading(false); 
      setDragActive(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
        <iframe title="Preview" srcDoc={activeSite.content} className="flex-1 w-full border-none" sandbox="allow-scripts allow-forms" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center justify-between mb-8 md:mb-12">
          <div className="font-black text-2xl tracking-tighter text-indigo-600 flex items-center gap-2">
            <Cloud className="w-8 h-8" /> TINYHOST
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {isUploading ? 'Working...' : 'Deploy'}
          </button>
        </nav>

        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleFileUpload}
          className={`border-4 border-dashed rounded-[2rem] md:rounded-[2.5rem] p-10 md:p-20 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xl'}`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".html,.htm,.txt"
          />
          {isUploading ? (
            <Loader2 className="w-12 h-12 mb-4 animate-spin text-indigo-500" />
          ) : (
            <Upload className="w-12 h-12 mb-4 text-slate-300" />
          )}
          <p className="text-lg md:text-xl font-bold text-center">
            {isUploading ? "Uploading your site..." : "Drag & Drop HTML file here"}
          </p>
          <p className="text-slate-400 mt-2 text-sm">or click to browse files</p>
        </div>

        <div className="mt-12 space-y-4 pb-20">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Your Live Sites</h2>
          {files.map(file => (
            <div key={file.id} className="bg-white p-4 md:p-5 rounded-2xl md:rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                <div className="bg-indigo-50 p-2 md:p-3 rounded-xl text-indigo-600 shrink-0">
                  <Code size={20} />
                </div>
                <span className="font-bold truncate text-sm md:text-base">{file.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => { setActiveSite(file); setCurrentView('viewer'); }} 
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                  title="View Site"
                >
                  <Eye size={18} />
                </button>
                <button 
                  onClick={async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', file.id))} 
                  className="p-2 text-slate-300 hover:text-red-500"
                  title="Delete Site"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {files.length === 0 && !isUploading && (
            <div className="text-center py-10 text-slate-300 font-medium bg-white rounded-3xl border border-dashed border-slate-200">
              No sites deployed yet.
            </div>
          )}
        </div>
      </div>
      
      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-3 rounded-full font-bold shadow-2xl z-[10000]">
          {notification}
        </div>
      )}
    </div>
  );
}

export default App;

  
