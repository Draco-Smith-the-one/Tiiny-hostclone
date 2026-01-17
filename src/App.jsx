import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { storage, db } from './firebase';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const location = useLocation();
  const [customName, setCustomName] = useState('');
  const [status, setStatus] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const slug = location.pathname.slice(1).trim();
    if (!slug) return;

    const loadAndRedirect = async () => {
      setRedirecting(true);
      setStatus('Loading site...');
      try {
        const siteRef = doc(db, "artifacts/tinyhost-v1", slug);
        const siteSnap = await getDoc(siteRef);

        if (siteSnap.exists()) {
          const data = siteSnap.data();
          if (data.rawUrl) {
            window.location.replace(data.rawUrl);
          } else {
            setStatus('No content URL found');
          }
        } else {
          setStatus("Site '" + slug + "' not found.");
        }
      } catch (err) {
        setStatus('Error loading site');
      } finally {
        setRedirecting(false);
      }
    };
    loadAndRedirect();
  }, [location.pathname]);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setLoading(true);
    setStatus('Preparing files...');
    setShortUrl('');

    try {
      const slug = customName.trim()
        ? customName.replace(/[^a-z0-9-]+/gi, '').toLowerCase()
        : "site-" + uuidv4().slice(0, 6);

      const basePath = "sites/" + slug;
      let filesToUpload = [];

      for (const file of acceptedFiles) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = new JSZip();
          const zipData = await zip.loadAsync(await file.arrayBuffer());
          zipData.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
              filesToUpload.push({
                path: relativePath,
                getBlob: () => zipEntry.async('blob'),
              });
            }
          });
        } else {
          filesToUpload.push({ path: file.name, blob: file });
        }
      }

      setStatus('Uploading ' + filesToUpload.length + ' files...');

      for (const fileObj of filesToUpload) {
        const blob = fileObj.blob || (await fileObj.getBlob());
        const fileRef = ref(storage, basePath + "/" + fileObj.path);
        await uploadBytes(fileRef, blob);
      }

      setStatus('Finalizing...');

      let rawUrl = '';
      try {
        const indexRef = ref(storage, basePath + "/index.html");
        rawUrl = await getDownloadURL(indexRef);
      } catch (e) {
        const folderRef = ref(storage, basePath);
        const result = await listAll(folderRef);
        const firstHtml = result.items.find(item => item.name.endsWith('.html'));
        if (firstHtml) rawUrl = await getDownloadURL(firstHtml);
      }

      if (!rawUrl) throw new Error('No HTML file found.');

      await setDoc(doc(db, "artifacts/tinyhost-v1", slug), {
        slug,
        rawUrl,
        createdAt: new Date().toISOString(),
      });

      const finalUrl = window.location.origin + "/" + slug;
      setShortUrl(finalUrl);
      setStatus('Success!');
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
      setStatus("Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'text/html': ['.html', '.htm'], 'application/zip': ['.zip'] }
  });

  if (redirecting) return <div className="p-10 text-center font-bold">Redirecting to site...</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-black text-indigo-600 mb-6 text-center">TIINY CLONE</h1>
        
        <input
          type="text"
          placeholder="Custom name (optional)"
          className="w-full border p-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-indigo-400"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />

        <div {...getRootProps()} className="border-4 border-dashed border-slate-200 p-10 rounded-xl text-center cursor-pointer hover:bg-slate-50 transition">
          <input {...getInputProps()} />
          <p className="text-slate-500 font-medium">Drop .html or .zip here</p>
        </div>

        {loading && <div className="mt-4 text-center animate-pulse text-indigo-500 font-bold">{status}</div>}
        {!loading && status && <div className="mt-4 text-center text-slate-700">{status}</div>}

        {shortUrl && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-sm text-green-700 mb-1">Your site is live:</p>
            <a href={shortUrl} className="text-indigo-600 font-bold underline break-all">
              {shortUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
