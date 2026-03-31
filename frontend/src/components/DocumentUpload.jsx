import { useState } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { documentService } from '../service/api';

export default function DocumentUpload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setStatus('idle');
      setMessage('');
      setStats(null);
    } else if (selectedFile) {
      setFile(null);
      setStatus('error');
      setMessage('Моля, изберете валиден PDF файл.');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('loading');
    setMessage('Обработка и векторизиране на документа... Това може да отнеме малко време.');

    try {
      const response = await documentService.uploadPDF(file);
      setStatus('success');
      setMessage('Документът е готов за въпроси!');
      setStats({
        pages: response.total_pages,
        chunks: response.total_chunks
      });
      setFile(null); // Изчистваме файла след успешен ъплоуд
    } catch (error) {
      setStatus('error');
      setMessage(
        error.response?.data?.detail || 'Възникна грешка при връзката със сървъра.'
      );
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Добавяне на знание (PDF)</h2>
      
      {/* Зона за качване */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={status === 'loading'}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center justify-center space-y-3"
        >
          {file ? (
            <FileText className="w-12 h-12 text-blue-500" />
          ) : (
            <UploadCloud className="w-12 h-12 text-gray-400" />
          )}
          
          <span className="text-sm font-medium text-gray-700">
            {file ? file.name : 'Кликнете тук, за да изберете PDF файл'}
          </span>
          <span className="text-xs text-gray-500">
            Максимален размер зависи от паметта на сървъра
          </span>
        </label>
      </div>

      {file && status !== 'loading' && (
        <button
          onClick={handleUpload}
          className="mt-4 w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Качи и обработи документа
        </button>
      )}

      {status === 'loading' && (
        <div className="mt-4 flex items-center text-blue-600 bg-blue-50 p-3 rounded-lg">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          <span className="text-sm">{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 flex items-center text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="text-sm">{message}</span>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm font-medium">{message}</span>
          </div>
          {stats && (
            <div className="text-xs text-gray-500 flex gap-4 px-1">
              <span>Обработени страници: <strong>{stats.pages}</strong></span>
              <span>Създадени вектори (chunks): <strong>{stats.chunks}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}