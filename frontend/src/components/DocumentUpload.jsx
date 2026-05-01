import { useState, useRef } from 'react';
import { UploadCloud, File as FileIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function DocumentUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  
  // НОВИ ЩАТИ ЗА PROGRESS BAR-A
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedExtensions = ['.pdf', '.docx', '.txt', '.csv'];
      const isValid = allowedExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
      
      if (isValid) {
        setFile(selectedFile);
        setStatus(null);
        setMessage('');
        setProgress(0);
      } else {
        setFile(null);
        setStatus('error');
        setMessage('Моля, изберете валиден файл (PDF, DOCX, TXT или CSV).');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setStatus(null);
    setMessage('');
    setProgress(5);
    setProgressMsg('Подготовка за качване...');

    // 1. Генерираме уникално ID за този потребител/качване
    const clientId = Math.random().toString(36).substring(7);
    
    // 2. Отваряме WebSocket връзка към бекенда
    const ws = new WebSocket(`ws://localhost:8000/api/documents/ws/progress/${clientId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress);
      setProgressMsg(data.message);
    };

    try {
      // 3. Изпращаме файла + clientId към бекенда
      const formData = new FormData();
      formData.append('file', file);
      formData.append('client_id', clientId);

      const response = await fetch('http://localhost:8000/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Възникна грешка при качването.');
      }

      const result = await response.json();
      
      setProgress(100);
      setProgressMsg('Готово!');
      setStatus('success');
      setMessage(`Файлът "${result.filename}" е качен и векторизиран успешно!`);
      setFile(null);
      
      if (fileInputRef.current) fileInputRef.current.value = '';

      window.dispatchEvent(new CustomEvent('documentUploaded', { detail: result.filename }));
      if (onUploadSuccess) onUploadSuccess();
      
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('error');
      setMessage(error.message);
    } finally {
      setIsUploading(false);
      ws.close(); // Затваряме връзката накрая
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <UploadCloud className="w-5 h-5 mr-2 text-blue-600" />
          Качване на документи
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Качете файл (PDF, DOCX, TXT, CSV), за да го добавите към знанията на асистента.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden">
          
          {/* НОВО: Лента за зареждане (Progress Bar) */}
          {isUploading && (
            <div 
              className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          )}

          <input type="file" accept=".pdf,.docx,.txt,.csv" onChange={handleFileChange} ref={fileInputRef} className="hidden" id="file-upload" disabled={isUploading} />
          
          <label htmlFor="file-upload" className={`cursor-pointer flex flex-col items-center z-10 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="bg-blue-100 text-blue-600 p-3 rounded-full mb-3">
              <FileIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">
              {file ? file.name : 'Кликнете тук, за да изберете файл'}
            </span>
          </label>
        </div>

        {isUploading && (
          <div className="text-center animate-pulse">
            <span className="text-sm font-medium text-blue-600">{progressMsg}</span>
            <span className="text-xs text-gray-400 block mt-1">{progress}% завършено</span>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {message}
          </div>
        )}

        {status === 'success' && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {message}
          </div>
        )}

        <button onClick={handleUpload} disabled={!file || isUploading} className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
          {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Обработка...</> : 'Качи файла в базата'}
        </button>
      </div>
    </div>
  );
}