import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUrl(''); 

    try {
      // These options now match the permissions in your api/upload.js
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        addRandomSuffix: true, 
      });

      setUrl(newBlob.url);
      alert("Upload Successful!");
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-indigo-600 mb-8">TIINY CLONE</h1>
      
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border-2 border-dashed border-gray-300 text-center">
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        {file && <p className="text-sm text-gray-600 mb-4">Selected: {file.name}</p>}
        
        <button 
          onClick={handleUpload} 
          disabled={uploading || !file}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${uploading || !file ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {uploading ? "Uploading..." : "Deploy Now"}
        </button>
      </div>

      {url && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md w-full max-w-md text-center">
          <p className="text-green-700 font-bold mb-2">✅ Success! Your site is live:</p>
          <a href={url} target="_blank" rel="noreferrer" className="text-indigo-600 underline break-all">{url}</a>
        </div>
      )}
    </div>
  );
}
