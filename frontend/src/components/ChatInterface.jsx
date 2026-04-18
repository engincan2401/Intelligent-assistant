/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, BookOpen, BrainCircuit, Copy, Check, Trash2 } from 'lucide-react'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { documentService, flashcardService } from '../service/api';
import FlashcardList from './FlashcardList';

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableDocs, setAvailableDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('all');
  const [persona, setPersona] = useState('default');
  
  const [flashcards, setFlashcards] = useState([]);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      setTimeout(() => {
        fetchDocs();
      }, 1000);
    };

    window.addEventListener('documentUploaded', handleNewDoc);
    return () => window.removeEventListener('documentUploaded', handleNewDoc);
  }, []);

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

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setMessages((prev) => [...prev, { role: 'assistant', content: '', sources: [] }]);

    try {
      const historyToPass = messages.map((msg) => ({
        role: msg.role,
        content: msg.content
      }));

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

      if (!response.ok) {
        let errorMsg = `Грешка ${response.status} - ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch(err) {
          console.debug("Грешката не е в JSON формат");
        }
        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fullText += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          
          if (fullText.includes('===SOURCES===')) {
            newMessages[lastIndex].content = fullText.split('===SOURCES===\n')[0];
          } else {
            newMessages[lastIndex].content = fullText;
          }
          return newMessages;
        });
      }

      if (fullText.includes('===SOURCES===')) {
        const parts = fullText.split('===SOURCES===\n');
        try {
          const parsedSources = JSON.parse(parts[1]);
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].sources = parsedSources;
            return newMessages;
          });
        } catch (e) {
          console.error("Грешка при парсване на източниците:", e);
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 h-full min-h-[500px]">
      
      <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <Bot className="w-5 h-5 mr-2 text-blue-600" />
           Асистент
        </h2>
        
        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={handleGenerateCards}
            disabled={isGeneratingCards || availableDocs.length === 0}
            className="flex items-center text-sm font-medium bg-purple-100 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
            title="Генерирай въпроси за учене"
          >
            {isGeneratingCards ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <BrainCircuit className="w-4 h-4 mr-1.5" />
            )}
            <span className="hidden sm:inline">Флашкарти</span>
          </button>

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

          {/* Меню за документи + Бутон Изтрий */}
          <div className="flex items-center gap-1">
            <select 
              value={selectedDoc} 
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none shadow-sm cursor-pointer max-w-[150px] md:max-w-[200px] truncate"
            >
              <option value="all">Всички документи</option>
              {availableDocs.map((doc, idx) => (
                <option key={idx} value={doc}>{doc}</option>
              ))}
            </select>
            
           
            {selectedDoc !== 'all' && (
              <button
                onClick={handleDeleteDocument}
                disabled={isDeleting}
                className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100 disabled:opacity-50"
                title="Изтрий избрания документ завинаги"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {showCards && (
        <FlashcardList 
          cards={flashcards} 
          onClose={() => setShowCards(false)} 
        />
      )}

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
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node: _node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                        ul: ({node: _node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                        ol: ({node: _node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                        li: ({node: _node, ...props}) => <li className="leading-relaxed" {...props} />,
                        h1: ({node: _node, ...props}) => <h1 className="text-xl font-bold mb-3 mt-4 text-gray-900" {...props} />,
                        h2: ({node: _node, ...props}) => <h2 className="text-lg font-bold mb-3 mt-4 text-gray-900" {...props} />,
                        h3: ({node: _node, ...props}) => <h3 className="text-base font-bold mb-2 mt-3 text-gray-900" {...props} />,
                        a: ({node: _node, ...props}) => <a className="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                        code: ({node: _node, inline, children, ...props}) => {
                          return inline ? (
                            <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded-md font-mono text-[13px] border border-gray-200" {...props}>
                              {children}
                            </code>
                          ) : (
                            <div className="relative my-4 bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                              <div className="flex items-center px-4 py-2 bg-[#2d2d2d] text-gray-400 text-xs font-mono border-b border-gray-700">
                                Код
                              </div>
                              <pre className="p-4 overflow-x-auto text-[13px] text-gray-50 font-mono leading-relaxed">
                                <code {...props}>{children}</code>
                              </pre>
                            </div>
                          );
                        },
                        blockquote: ({node: _node, ...props}) => <blockquote className="border-l-4 border-blue-400 pl-4 py-1 italic text-gray-500 my-4 bg-blue-50/50 rounded-r-lg" {...props} />,
                        strong: ({node: _node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                        table: ({node: _node, ...props}) => <div className="overflow-x-auto mb-4"><table className="min-w-full divide-y divide-gray-300 border border-gray-200 rounded-lg" {...props} /></div>,
                        th: ({node: _node, ...props}) => <th className="bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-gray-900 border-b border-gray-200" {...props} />,
                        td: ({node: _node, ...props}) => <td className="px-3 py-2 text-sm text-gray-600 border-b border-gray-200" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>

                    {/* 4. БУТОН ЗА КОПИРАНЕ (Появява се само при отговори на асистента) */}
                    <div className="mt-3 pt-2 flex justify-end">
                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        className="flex items-center text-xs text-gray-500 hover:text-gray-800 transition-colors bg-gray-50 hover:bg-gray-100 px-2 py-1.5 rounded-md border border-gray-100"
                        title="Копирай текста"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                            <span className="text-green-600 font-medium">Копирано</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            Копирай
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                )}
                
                {msg.sources && msg.sources.length > 0 && !msg.isError && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold flex items-center mb-2 text-gray-600">
                      <BookOpen className="w-3 h-3 mr-1" />
                      Източници:
                    </p>
                    <div className="space-y-2">
                      {msg.sources.map((source, idx) => (
                        <div key={idx} className="bg-white/50 bg-white p-2 rounded text-xs text-gray-600 border border-gray-200">
                          <span className="font-semibold text-gray-700 block mb-1">Страница {source.page}</span>
                          <p className="line-clamp-3 italic">"{source.content}"</p>
                        </div>
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

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100 rounded-b-xl">
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