import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';
import { Upload, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        addRandomSuffix: true, 
      });
      setUrl(newBlob.url);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 font-sans text-slate-900">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black tracking-tight text-indigo-600 mb-2">TIINY.CLONE</h1>
        <p className="text-slate-500 font-medium">Host your static files in seconds.</p>
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className={`relative group border-2 border-dashed rounded-xl p-10 transition-all flex flex-col items-center justify-center
            ${file ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="p-4 bg-indigo-100 rounded-full text-indigo-600 mb-4">
            {uploading ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
          </div>
          <p className="text-sm font-semibold text-slate-700">{file ? file.name : "Click or drag to upload file"}</p>
        </div>

        <button onClick={handleUpload} disabled={uploading || !file}
          className={`w-full mt-6 py-4 rounded-xl font-bold text-white transition-all
            ${uploading || !file ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg'}`}>
          {uploading ? "Deploying..." : "Launch Now"}
        </button>
      </div>

      {url && (
        <div className="w-full max-w-lg mt-8 bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><CheckCircle size={24} /></div>
          <div className="flex-1 overflow-hidden">
            <p className="text-emerald-800 font-bold text-sm">Deployment Successful!</p>
            <p className="text-slate-500 text-xs truncate mb-3">{url}</p>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-colors">
              Visit Site <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
