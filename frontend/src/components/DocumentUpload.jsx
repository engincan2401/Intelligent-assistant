import { useState, useRef } from 'react';
import { UploadCloud, File as FileIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { documentService } from '../service/api';

export default function DocumentUpload({ onUploadSuccess }) {
  // Тук дефинираме всички липсващи променливи (states)
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  // Новата функция, която проверява за множество разширения
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedExtensions = ['.pdf', '.docx', '.txt', '.csv'];
      const isValid = allowedExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
      
      if (isValid) {
        setFile(selectedFile);
        setStatus(null);
        setMessage('');
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

    try {
      const result = await documentService.uploadDocument(file);
      
      setStatus('success');
      setMessage(`Файлът "${result.filename}" е качен и векторизиран успешно!`);
      setFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Уведомяваме ChatInterface, че има нов файл
      window.dispatchEvent(new CustomEvent('documentUploaded', { detail: result.filename }));

      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('error');
      setMessage(error.message || 'Възникна грешка при качването на файла.');
    } finally {
      setIsUploading(false);
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
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
          <input
            type="file"
            accept=".pdf,.docx,.txt,.csv"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer flex flex-col items-center ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="bg-blue-100 text-blue-600 p-3 rounded-full mb-3">
              <FileIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">
              {file ? file.name : 'Кликнете тук, за да изберете файл'}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              Поддържани формати: PDF, DOCX, TXT, CSV
            </span>
          </label>
        </div>

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

        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Качване и векторизиране...
            </>
          ) : (
            'Качи файла в базата'
          )}
        </button>
      </div>
    </div>
  );
}