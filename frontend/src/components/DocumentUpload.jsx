import React, { useState } from 'react';
import { documentService } from '../service/api';

/**
 * Компонент за управление и качване на документи.
 * Включва функционалност за изтриване и генериране на автоматично резюме.
 */
const DocumentUpload = ({ documents = [], onUploadSuccess, onDelete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Състояние за модалния прозорец с резюмето
  const [summaryData, setSummaryData] = useState({ 
    isOpen: false, 
    text: '', 
    title: '', 
    isLoading: false 
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    try {
      await documentService.uploadDocument(file);
      setFile(null);
      // Нулиране на полето за избор на файл
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = ""; 
      
      onUploadSuccess();
    } catch (error) {
      console.error("Грешка при качване на файл:", error);
      alert("Възникна грешка при качването. Моля, опитайте отново.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGetSummary = async (filename) => {
    setSummaryData({ isOpen: true, text: '', title: filename, isLoading: true });
    try {
      const summary = await documentService.getSummary(filename);
      setSummaryData({ 
        isOpen: true, 
        text: summary, 
        title: filename, 
        isLoading: false 
      });
    } catch (error) {
      console.error("Грешка при генериране на резюме:", error);
      setSummaryData({ 
        isOpen: true, 
        text: 'Не успяхме да генерираме резюме за този документ. Уверете се, че бекендът работи.', 
        title: filename, 
        isLoading: false 
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Управление на Документи
      </h2>
      
      {/* Секция за качване */}
      <form onSubmit={handleUpload} className="mb-8 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <label className="block text-sm font-medium text-gray-700 mb-2">Качете нов PDF документ</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="file-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all"
            disabled={isUploading}
          />
          <button
            type="submit"
            disabled={!file || isUploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isUploading ? 'Обработка...' : 'Качи'}
          </button>
        </div>
      </form>

      {/* Списък с файлове */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Вашите файлове ({documents.length})</h3>
        {documents.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-400 italic">Все още няма качени документи.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {documents.map((doc, index) => (
              <li key={index} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-xl">📄</span>
                  <span className="text-sm text-gray-700 font-medium truncate" title={doc}>
                    {doc}
                  </span>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleGetSummary(doc)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                    title="Виж AI резюме"
                  >
                    💡 Резюме
                  </button>
                  <button
                    onClick={() => onDelete(doc)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                    title="Изтрий файла"
                  >
                    🗑️ Изтрий
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Модален прозорец за Резюме (AI Summary) */}
      {summaryData.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
            {/* Хедър на модала */}
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">AI Резюме</h3>
                  <p className="text-xs text-gray-500 truncate max-w-[300px]">{summaryData.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setSummaryData({ ...summaryData, isOpen: false })}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all font-bold"
              >
                ✕
              </button>
            </div>

            {/* Съдържание на модала */}
            <div className="p-8 overflow-y-auto flex-1 bg-white">
              {summaryData.isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-gray-500 font-medium animate-pulse">Анализиране на документа...</p>
                </div>
              ) : (
                <div className="prose prose-blue max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
                    {summaryData.text}
                  </div>
                </div>
              )}
            </div>

            {/* Футър на модала */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSummaryData({ ...summaryData, isOpen: false })}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-all shadow-sm"
              >
                Затвори
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;