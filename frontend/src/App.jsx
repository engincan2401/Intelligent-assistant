import { useState, useCallback, useEffect } from "react";
import ChatInterface from "./components/ChatInterface";
import DocumentUpload from "./components/DocumentUpload";
import { Bot, FileText, Zap, Moon, Sun } from "lucide-react";

function App() {
  const [refreshDocs, setRefreshDocs] = useState(0);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const handleUploadSuccess = useCallback(() => {
    setRefreshDocs((prev) => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <header className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm sticky top-0 z-50 transition-colors duration-300">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-950 dark:text-white tracking-tight">
              Интелигентен{" "}
              <span className="text-blue-600 dark:text-blue-500">Асистент</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              title="Превключи тема"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Модел:
              </span>
              <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-100 dark:border-green-500/20">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Llama 3
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          <DocumentUpload onUploadSuccess={handleUploadSuccess} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6 animate-in fade-in duration-500 delay-150">
            <div className="flex items-center gap-3 pb-1 border-b border-gray-200 dark:border-gray-800">
              <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Работен плот
              </h3>
            </div>
            <ChatInterface refreshDocs={refreshDocs} />
          </div>

          <aside className="space-y-6 animate-in fade-in duration-500 delay-300">
            <div className="flex items-center gap-3 pb-1 border-b border-gray-200 dark:border-gray-800">
              <Bot className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Как работи?
              </h3>
            </div>

            <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 transition-colors duration-300">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg mt-1 flex-shrink-0">
                  1
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <strong className="text-gray-800 dark:text-gray-200">
                    Качете PDF, DOCX, TXT, CSV:
                  </strong>{" "}
                  Системата ще го прочете и векторизира.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg mt-1 flex-shrink-0">
                  2
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <strong className="text-gray-800 dark:text-gray-200">
                    Задайте въпрос:
                  </strong>{" "}
                  Можете да пишете или да говорите на микрофона.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg mt-1 flex-shrink-0">
                  3
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <strong className="text-gray-800 dark:text-gray-200">
                    Умен отговор:
                  </strong>{" "}
                  Изкуственият интелект Llama 3 ще анализира вашите документи и
                  ще ви отговори с точни цитати.
                </p>
              </div>
            </div>

            <div className="bg-gray-900 dark:bg-blue-950/40 text-gray-100 p-6 rounded-2xl shadow-xl dark:border dark:border-blue-900/30 space-y-3">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" /> PRO Съвет
              </h4>
              <p className="text-xs text-gray-400 dark:text-blue-200/70 leading-relaxed">
                Използвайте бутоните за "Флашкарти" и "Тест", за да генерирате
                автоматични материали за учене от вашите лекции!
              </p>
            </div>
          </aside>
        </section>
      </main>

      <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          © 2026 Интелигентен RAG Асистент
        </div>
      </footer>
    </div>
  );
}

export default App;
