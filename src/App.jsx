import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { storage, db, auth } from './firebase';
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

  // Handle direct access to /:slug (redirect to raw content)
  useEffect(() => {
    const slug = location.pathname.slice(1).trim();
    if (!slug) return; // root path → show uploader

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
            setStatus('Site metadata found but no content URL');
          }
        } else {
          setStatus(`No site found for "${slug}"`);
        }
      } catch (err) {
        console.error(err);
        setStatus('Error loading site');
      } finally {
        setRedirecting(false);
      }
    };

    loadAndRedirect();
  }, [location.pathname]);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    if (!auth.currentUser) {
      setStatus('Authentication issue – please refresh');
      return;
    }

    setLoading(true);
    setStatus('Uploading files...');
    setShortUrl('');

    try {
      const slug = customName.trim()
        ? customName.replace(/[^a-z0-9-]+/gi, '').toLowerCase()
        : `s-${uuidv4().slice(0, 6)}`;

      const basePath = `sites/${slug}`;

      let filesToUpload = [];

      for (const file of acceptedFiles) {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = new JSZip();
          const zipContent = await file.arrayBuffer();
          const zipData = await zip.loadAsync(zipContent);

          zipData.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
              filesToUpload.push({
                path: relativePath,
                getBlob: () => zipEntry.async('blob'),
              });
            }
          });
        } else {
          filesToUpload.push({
            path: file.name,
            blob: file,
          });
        }
      }

      // Upload files to Storage
      for (const fileObj of filesToUpload) {
        const blob = fileObj.blob || (await fileObj.getBlob());
        const fileRef = ref(storage, `\( {basePath}/ \){fileObj.path}`);
        await uploadBytes(fileRef, blob);
      }

      // Find main entry point
      let rawUrl;
      try {
        const indexRef = ref(storage, `${basePath}/index.html`);
        rawUrl = await getDownloadURL(indexRef);
      } catch {
        const folderRef = ref(storage, basePath);
        const { items } = await listAll(folderRef);
        const htmlFile = items.find((item) => item.name.toLowerCase().endsWith('.html'));
        if (htmlFile) {
          rawUrl = await getDownloadURL(htmlFile);
        }
      }

      if (!rawUrl) throw new Error('No HTML file found in upload');

      // Save metadata to Firestore
      await setDoc(doc(db, "artifacts/tinyhost-v1", slug), {
        slug,
        storageBase: basePath,
        mainFile: 'index.html',
        rawUrl,
        createdAt: new Date().toISOString(),
        fileCount: filesToUpload.length,
        // optional: uploaderUid: auth.currentUser.uid
      });

      const domain = window.location.origin;
      const niceUrl = `\( {domain}/ \){slug}`;

      setShortUrl(niceUrl);
      setStatus('Upload successful! Your site is live at:');
    } catch (err) {
      console.error(err);
      setStatus(`Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html', '.htm'],
      'application/zip': ['.zip'],
    },
    multiple: true,
  });

  if (redirecting) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-center text-indigo-700 mb-2">Tiiny Host Clone</h1>
        <p className="text-center text-gray-600 mb-8">Upload HTML or ZIP → get shareable link</p>

        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Custom name (optional, letters/numbers/hyphens)"
          className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div
          {...getRootProps()}
          className={`border-4 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
            isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-400 hover:border-indigo-500'
          }`}
        >
          <input {...getInputProps()} />
          <p className="text-xl font-medium">
            {isDragActive ? 'Drop here now' : 'Drag & drop .html or .zip here'}
          </p>
          <p className="text-sm text-gray-500 mt-3">or click to select files</p>
        </div>

        {loading && <p className="text-center mt-6 text-indigo-600 font-medium">Uploading... Please wait</p>}

        {status && (
          <p className={`text-center mt-6 font-medium ${status.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
            {status}
          </p>
        )}

        {shortUrl && (
          <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl">
            <p className="font-semibold text-green-800 mb-3">Your site is ready:</p>
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-700 underline break-all hover:text-indigo-900 block text-lg"
            >
              {shortUrl}
            </a>
            <p className="text-sm text-gray-600 mt-4">
              Anyone visiting this link will see your uploaded content directly (raw HTML).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
