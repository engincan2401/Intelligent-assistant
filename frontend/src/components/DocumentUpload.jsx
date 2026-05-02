import { useState, useRef } from "react";
import { UploadCloud, File as FileIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function DocumentUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/api";
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedExtensions = [".pdf", ".docx", ".txt", ".csv"];
      const isValid = allowedExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));
      if (isValid) {
        setFile(selectedFile);
        setStatus(null);
        setMessage("");
        setProgress(0);
      } else {
        setFile(null);
        setStatus("error");
        setMessage("Моля, изберете валиден файл (PDF, DOCX, TXT или CSV).");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus(null);
    setMessage("");
    setProgress(5);
    setProgressMsg("Подготовка...");
    const clientId = Math.random().toString(36).substring(7);
    const ws = new WebSocket(`${WS_URL}/documents/ws/progress/${clientId}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress);
      setProgressMsg(data.message);
    };
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("client_id", clientId);
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Възникна грешка.");
      }
      const result = await response.json();
      setProgress(100);
      setProgressMsg("Готово!");
      setStatus("success");
      setMessage(`Файлът "${result.filename}" е качен успешно!`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      window.dispatchEvent(new CustomEvent("documentUploaded", { detail: result.filename }));
      if (onUploadSuccess) onUploadSuccess();
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("error");
      setMessage(error.message);
    } finally {
      setIsUploading(false);
      ws.close();
    }
  };

  return (
    <div className="bg-white dark:bg-[#111827] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 transition-colors duration-300">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
          <UploadCloud className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-500" />
          Качване на документи
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Качете файл (PDF, DOCX, TXT, CSV), за да го добавите към знанията на асистента.
        </p>
      </div>
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0B0F19] hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors relative overflow-hidden">
          {isUploading && (
            <div
              className="absolute bottom-0 left-0 h-1 bg-blue-500 dark:bg-blue-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          )}
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
            className={`cursor-pointer flex flex-col items-center z-10 ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-3 rounded-full mb-3">
              <FileIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
              {file ? file.name : "Кликнете тук, за да изберете файл"}
            </span>
          </label>
        </div>
        {isUploading && (
          <div className="text-center animate-pulse">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {progressMsg}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 block mt-1">
              {progress}% завършено
            </span>
          </div>
        )}
        {status === "error" && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center border border-red-100 dark:border-red-900/30">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {message}
          </div>
        )}
        {status === "success" && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm flex items-center border border-green-100 dark:border-green-900/30">
            <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {message}
          </div>
        )}
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full bg-blue-600 dark:bg-blue-500 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isUploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Обработка...</>
          ) : (
            "Качи файла в базата"
          )}
        </button>
      </div>
    </div>
  );
}