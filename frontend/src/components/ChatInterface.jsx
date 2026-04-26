/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, BookOpen, BrainCircuit, Copy, Check, Trash2, Lightbulb, X, MessageSquarePlus } from 'lucide-react'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { documentService, flashcardService } from '../service/api';
import FlashcardList from './FlashcardList';

export default function ChatInterface({ refreshDocs }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableDocs, setAvailableDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('all');
  const [persona, setPersona] = useState('default');
  
  // Щати за Флашкарти
  const [flashcards, setFlashcards] = useState([]);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Щат за Резюме
  const [summaryData, setSummaryData] = useState({ isOpen: false, text: '', isLoading: false });

  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const docs = await documentService.getDocuments();
        setAvailableDocs(docs);
      } catch (error) {
        console.error("Грешка при зареждане на списъка:", error);
      }
    };
    fetchDocs();

    const handleNewDoc = async (e) => {
      const newFileName = e.detail;
      if (newFileName) {
        setAvailableDocs((prev) => prev.includes(newFileName) ? prev : [...prev, newFileName]);
        setSelectedDoc(newFileName);
      }
      setTimeout(() => fetchDocs(), 1000);
    };

    window.addEventListener('documentUploaded', handleNewDoc);
    return () => window.removeEventListener('documentUploaded', handleNewDoc);
  }, [refreshDocs]);

  // --- Генериране на Флашкарти ---
  const handleGenerateCards = async () => {
    setIsGeneratingCards(true);
    try {
      const cards = await flashcardService.generateFlashcards(selectedDoc);
      if (cards && cards.length > 0) {
        setFlashcards(cards);
        setShowCards(true);
      } else {
        alert("Не успяхме да генерираме карти. Опитайте с друг документ.");
      }
    } catch (error) {
      console.error("Грешка при флашкарти:", error);
      alert("Възникна грешка при свързването със сървъра.");
    } finally {
      setIsGeneratingCards(false);
    }
  };

  // --- Генериране на Резюме ---
  const handleGetSummary = async () => {
    if (selectedDoc === 'all') return;
    setSummaryData({ isOpen: true, text: '', isLoading: true });
    try {
      const summary = await documentService.getSummary(selectedDoc);
      setSummaryData({ isOpen: true, text: summary, isLoading: false });
    } catch (error) {
      console.error("Грешка при резюме:", error);
      setSummaryData({ isOpen: true, text: 'Грешка при извличане на резюмето от сървъра.', isLoading: false });
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDeleteDocument = async () => {
    if (selectedDoc === 'all') return;
    const confirmDelete = window.confirm(`Сигурни ли сте, че искате да изтриете документа "${selectedDoc}" завинаги?`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await documentService.deleteDocument(selectedDoc);
      setAvailableDocs(prev => prev.filter(doc => doc !== selectedDoc));
      setSelectedDoc('all');
    } catch (error) {
      console.error("Грешка при изтриване:", error);
      alert("Не успяхме да изтрием документа.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Функция за изпращане на бърз въпрос (от предложенията)
  const handleFollowUpClick = (question) => {
    setInput(question);
    // Използваме setTimeout, за да дадем време на React да обнови стейта на input преди submit
    setTimeout(() => {
      const form = document.getElementById('chat-form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setMessages((prev) => [...prev, { role: 'assistant', content: '', sources: [], followUps: [] }]);

    try {
      const historyToPass = messages.map((msg) => ({ role: msg.role, content: msg.content }));

      const response = await fetch('http://localhost:8000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: userMessage, 
          chat_history: historyToPass,
          filename: selectedDoc !== 'all' ? selectedDoc : null,
          persona: persona
        })
      });

      if (!response.ok) throw new Error(`Грешка ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fullText += decoder.decode(value, { stream: true });

        // Обновяваме само текста, който е ПРЕДИ източниците
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          const sourceIndex = fullText.indexOf('\n\n===SOURCES===');
          
          if (sourceIndex !== -1) {
            newMessages[lastIndex].content = fullText.substring(0, sourceIndex);
          } else {
            newMessages[lastIndex].content = fullText;
          }
          return newMessages;
        });
      }

      // След като стриймингът приключи, парсваме JSON данните за Sources и Follow-ups
      if (fullText.includes('===SOURCES===')) {
        const parts = fullText.split('\n\n===SOURCES===\n');
        if (parts.length > 1) {
          const extraData = parts[1]; // Съдържа sources и може би follow_ups
          const extraParts = extraData.split('\n\n===FOLLOW_UPS===\n');
          
          // Парсване на източници
          try {
            const parsedSources = JSON.parse(extraParts[0]);
            setMessages((prev) => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].sources = parsedSources;
              return newMsgs;
            });
          } catch (e) { console.error("Грешка при Sources:", e); }

          // Парсване на следващи въпроси
          if (extraParts.length > 1) {
            try {
              const parsedFollowUps = JSON.parse(extraParts[1]);
              setMessages((prev) => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].followUps = parsedFollowUps;
                return newMsgs;
              });
            } catch (e) { console.error("Грешка при Follow-ups:", e); }
          }
        }
      }

    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: `⚠️ Проблем с връзката: ${error.message}.`,
          isError: true,
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 h-full min-h-[500px] relative">
      
      {/* ХЕДЪР НА ЧАТА */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <Bot className="w-5 h-5 mr-2 text-blue-600" />
          Асистент
        </h2>
        
        <div className="flex gap-2 items-center flex-wrap">
          {/* Бутон за Флашкарти */}
          <button
            onClick={handleGenerateCards}
            disabled={isGeneratingCards || availableDocs.length === 0}
            className="flex items-center text-sm font-medium bg-purple-100 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
            title="Генерирай въпроси за учене"
          >
            {isGeneratingCards ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-1.5" />}
            <span className="hidden sm:inline">Флашкарти</span>
          </button>

          {/* Избор на Персона */}
          <select 
            value={persona} 
            onChange={(e) => setPersona(e.target.value)}
            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none shadow-sm cursor-pointer"
          >
            <option value="default">Стандартен стил</option>
            <option value="simple">Като на 10-годишен</option>
            <option value="expert">Академичен експерт</option>
            <option value="bullet_points">Само кратки списъци</option>
          </select>

          {/* Избор на Документ и Инструменти към него */}
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg shadow-sm pr-1">
            <select 
              value={selectedDoc} 
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="text-gray-700 text-sm bg-transparent focus:ring-0 focus:outline-none block p-2 cursor-pointer max-w-[150px] md:max-w-[180px] truncate border-none"
            >
              <option value="all">Всички документи</option>
              {availableDocs.map((doc, idx) => (
                <option key={idx} value={doc}>{doc}</option>
              ))}
            </select>
            
            {/* Бутони Резюме и Изтриване (само ако е избран конкретен файл) */}
            {selectedDoc !== 'all' && (
              <div className="flex items-center border-l border-gray-200 pl-1">
                <button
                  onClick={handleGetSummary}
                  className="p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                  title="Генерирай AI Резюме на документа"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteDocument}
                  disabled={isDeleting}
                  className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors disabled:opacity-50"
                  title="Изтрий избрания документ"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* МОДАЛИ (Флашкарти и Резюме) */}
      {showCards && <FlashcardList cards={flashcards} onClose={() => setShowCards(false)} />}
      
      {summaryData.isOpen && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b flex justify-between items-center bg-blue-50/50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" /> 
              Резюме: {selectedDoc}
            </h3>
            <button onClick={() => setSummaryData({ ...summaryData, isOpen: false })} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            {summaryData.isLoading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="animate-pulse font-medium">Анализиране и синтезиране на текста...</p>
              </div>
            ) : (
              <div className="prose prose-blue max-w-none text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {summaryData.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ЗОНА ЗА СЪОБЩЕНИЯ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Bot className="w-12 h-12 mb-3 opacity-20" />
            <p>Задайте въпрос относно качените документи.</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 
                msg.isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div className={`max-w-[80%] overflow-x-auto ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-none shadow-sm'} p-4`}>
                
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : msg.isError ? (
                  <div className="text-red-600 whitespace-pre-wrap font-medium">{msg.content}</div>
                ) : (
                  <div className="text-sm md:text-base text-gray-700 relative">
                    {/* Markdown Парсер */}
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 mt-4 text-gray-900" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3 mt-4 text-gray-900" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-3 text-gray-900" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                        code: ({node, inline, children, ...props}) => inline 
                          ? <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded-md font-mono text-[13px] border border-gray-200" {...props}>{children}</code>
                          : <div className="relative my-4 bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800"><pre className="p-4 overflow-x-auto text-[13px] text-gray-50 font-mono leading-relaxed"><code {...props}>{children}</code></pre></div>,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-400 pl-4 py-1 italic text-gray-500 my-4 bg-blue-50/50 rounded-r-lg" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                        table: ({node, ...props}) => <div className="overflow-x-auto mb-4"><table className="min-w-full divide-y divide-gray-300 border border-gray-200 rounded-lg" {...props} /></div>,
                        th: ({node, ...props}) => <th className="bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-200" {...props} />,
                        td: ({node, ...props}) => <td className="px-3 py-2 text-sm text-gray-600 border-b border-gray-200" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>

                    {/* Бутон за Копиране */}
                    <div className="mt-3 pt-2 flex justify-end">
                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        className="flex items-center text-xs text-gray-500 hover:text-gray-800 transition-colors bg-gray-50 hover:bg-gray-100 px-2 py-1.5 rounded-md border border-gray-100"
                      >
                        {copiedIndex === index ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" /><span className="text-green-600 font-medium">Копирано</span></> : <><Copy className="w-3.5 h-3.5 mr-1.5" />Копирай</>}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* ИЗТОЧНИЦИ (Sources) */}
                {msg.sources && msg.sources.length > 0 && !msg.isError && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold flex items-center mb-2 text-gray-600">
                      <BookOpen className="w-3 h-3 mr-1" /> Източници:
                    </p>
                    <div className="space-y-2">
                      {msg.sources.map((source, idx) => (
                        <div key={idx} className="bg-gray-50 p-2 rounded text-xs text-gray-600 border border-gray-200">
                          <span className="font-semibold text-gray-700 block mb-1">Страница {source.page}</span>
                          <p className="line-clamp-3 italic">"{source.content}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

               
                {msg.followUps && msg.followUps.length > 0 && !isLoading && index === messages.length - 1 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold flex items-center mb-2 text-gray-500 uppercase tracking-wider">
                      <MessageSquarePlus className="w-3 h-3 mr-1" /> Може би искате да попитате:
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {msg.followUps.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleFollowUpClick(q)}
                          className="text-left text-xs px-3 py-2 bg-blue-50/50 border border-blue-100 text-blue-700 hover:bg-blue-100 hover:border-blue-200 transition-all rounded-lg font-medium"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none p-4 flex items-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500 mr-2" />
              <span className="text-gray-500 text-sm">Генериране на отговор...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ФОРМА ЗА ПИСАНЕ */}
      <form id="chat-form" onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100 rounded-b-xl z-10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Попитайте нещо..."
            disabled={isLoading}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}