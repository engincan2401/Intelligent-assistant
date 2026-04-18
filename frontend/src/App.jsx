import { useState, useCallback } from 'react';
import ChatInterface from './components/ChatInterface';
import DocumentUpload from './components/DocumentUpload';
import { Bot, FileText, Zap } from 'lucide-react';

function App() {
  const [refreshDocs, setRefreshDocs] = useState(0);

  const handleUploadSuccess = useCallback(() => {
    setRefreshDocs(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      
      {/* 1. ГЛАВЕН ХЕДЪР */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-950 tracking-tight">
              Интелигентен <span className="text-blue-600">Асистент</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Статус:</span>
            <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold border border-green-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Активен Llama 3
            </div>
          </div>
        </nav>
      </header>

      {/* 2. ОСНОВНО СЪДЪРЖАНИЕ */}
      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* А. Блок за качване на документи (най-горе, цяла ширина) */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          <DocumentUpload onUploadSuccess={handleUploadSuccess} />
        </section>

        {/* Б. Мрежа с Чат и Асистент (един до друг) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Чат Интерфейс (2/3 от ширината на десктоп) */}
          <div className="lg:col-span-2 space-y-6 animate-in fade-in duration-500 delay-150">
            <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
              <FileText className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-800">Разговор с документите</h3>
            </div>
            <ChatInterface refreshDocs={refreshDocs} />
          </div>

          {/* Панел за информация / Помощ (1/3 от ширината) */}
          <aside className="space-y-6 animate-in fade-in duration-500 delay-300">
            <div className="flex items-center gap-3 pb-1 border-b border-gray-100">
              <Bot className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-800">Как работи?</h3>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg mt-1 flex-shrink-0">1</div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Качете PDF:</strong> Използвайте полето най-горе, за да добавите вашия файл. Той ще бъде анализиран и векторизиран.
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg mt-1 flex-shrink-0">2</div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Изберете файл:</strong> В чата вдясно, изберете конкретен документ от падащото меню или оставете "Всички".
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg mt-1 flex-shrink-0">3</div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Задайте въпрос:</strong> Пишете в полето и Llama 3 ще ви отговори, базирайки се *само* на качената информация.
                </p>
              </div>
            </div>

            <div className="bg-gray-900 text-gray-100 p-6 rounded-2xl shadow-xl space-y-3">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Бърз съвет
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                За най-добри резултати, задавайте конкретни въпроси. Можете да сменяте "личността" на асистента от падащото меню, за да получите по-прост или по-детайлен отговор.
              </p>
            </div>
          </aside>
          
        </section>
      </main>

      {/* 3. ФУТЪР */}
      <footer className="mt-16 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-gray-500">
          Дипломна работа © 2024 • Интелигентен RAG Асистент
        </div>
      </footer>

    </div>
  );
}

export default App;