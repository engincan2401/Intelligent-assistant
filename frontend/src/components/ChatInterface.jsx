/* eslint-disable no-unused-vars */
import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Send, User, Bot, Loader2, BookOpen, BrainCircuit, Copy, Check, Trash2, Lightbulb, X, MessageSquarePlus, Eraser, ListTodo, Mic, MicOff, Volume2, Square, Menu, Plus, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { documentService, flashcardService, quizService } from '../service/api';
import FlashcardList from './FlashcardList';
import QuizInterface from './QuizInterface';

export default function ChatInterface({ refreshDocs }) {
  // --- НОВИ ЩАТИ ЗА БАЗАТА ДАННИ И МЕНЮТО ---
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Съобщенията вече стартират като празен масив (ще се зареждат от базата)
  const [messages, setMessages] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState(null);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableDocs, setAvailableDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('all');
  const [persona, setPersona] = useState('default');
  
  const [flashcards, setFlashcards] = useState([]);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [showCards, setShowCards] = useState(false);
  
  const [quizData, setQuizData] = useState([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [summaryData, setSummaryData] = useState({ isOpen: false, text: '', isLoading: false });

  const [copiedIndex, setCopiedIndex] = useState(null);
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, streamingMessage]);

  // --- ИЗТЕГЛЯНЕ НА СЕСИИТЕ ОТ БЕКЕНДА ПРИ ЗАРЕЖДАНЕ ---
  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/chat/sessions');
      const data = await res.json();
      setSessions(data);
      
      if (data.length > 0 && !currentSessionId) {
        loadSessionMessages(data[0].id);
      } else if (data.length === 0) {
        handleNewChat();
      }
    } catch (error) {
      console.error("Грешка при зареждане на сесии:", error);
    }
  };

  const loadSessionMessages = async (id) => {
    setCurrentSessionId(id);
    setMessages([]);
    try {
      const res = await fetch(`http://localhost:8000/api/chat/sessions/${id}/messages`);
      const data = await res.json();
      const formatted = data.map(m => ({
        role: m.role,
        content: m.content,
        sources: [], 
        followUps: []
      }));
      setMessages(formatted);
    } catch (error) {
      console.error("Грешка при зареждане на съобщения:", error);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/chat/sessions', { method: 'POST' });
      const newSession = await res.json();
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
      setMessages([]);
    } catch (error) {
      console.error("Грешка при създаване на чат:", error);
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Сигурни ли сте, че искате да изтриете този разговор?")) return;
    
    try {
      await fetch(`http://localhost:8000/api/chat/sessions/${id}`, { method: 'DELETE' });
      const updated = sessions.filter(s => s.id !== id);
      setSessions(updated);
      
      if (currentSessionId === id) {
        if (updated.length > 0) loadSessionMessages(updated[0].id);
        else handleNewChat();
      }
    } catch (error) {
      console.error("Грешка при изтриване:", error);
    }
  };

  // --- ИНИЦИАЛИЗАЦИЯ НА МИКРОФОНА (Speech-to-Text) ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'bg-BG';

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Грешка при разпознаване на речта:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput(''); 
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // --- ЧЕТЕНЕ НА ГЛАС (Text-to-Speech) ---
  const handleSpeak = (text) => {
    if (!('speechSynthesis' in window)) {
      alert("Браузърът ви не поддържа четене на глас.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*#`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'bg-BG';
    utterance.rate = 1.0;
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // --- ИЗТЕГЛЯНЕ НА ДОКУМЕНТИ ---
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

  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true);
    try {
      const questions = await quizService.generateQuiz(selectedDoc);
      if (questions && questions.length > 0) {
        setQuizData(questions);
        setShowQuiz(true);
      } else {
        alert("Не успяхме да генерираме тест. Опитай отново.");
      }
    } catch (error) {
      console.error("Грешка при генериране на тест:", error);
      alert("Възникна грешка при свързването със сървъра.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

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

  const handleClearChat = () => {
    if (window.confirm("Сигурни ли сте, че искате да изчистите историята на чата?")) {
      setMessages([]);
      // Тук можете да добавите и логика за изтриване на сесията, 
      // но засега само изчистваме екрана.
    }
  };

  const handleFollowUpClick = (question) => {
    setInput(question);
    setTimeout(() => {
      const form = document.getElementById('chat-form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMessage = input.trim();
    const isFirstMessage = messages.length === 0;
    setInput('');
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setStreamingMessage({ role: 'assistant', content: '', sources: [], followUps: [] });

    try {
      const historyToPass = messages.map((msg) => ({ role: msg.role, content: msg.content }));

      const response = await fetch('http://localhost:8000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: userMessage, 
          chat_history: historyToPass,
          filename: selectedDoc !== 'all' ? selectedDoc : null,
          persona: persona,
          session_id: currentSessionId // ДОБАВЕНО: Изпращане на session_id
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

        let displayContent = fullText;
        const sourceIndex = fullText.indexOf('\n\n===SOURCES===');
        if (sourceIndex !== -1) {
          displayContent = fullText.substring(0, sourceIndex);
        }

        flushSync(() => {
          setStreamingMessage((prev) => ({
            ...prev,
            content: displayContent
          }));
        });
      }

      let parsedSources = [];
      let parsedFollowUps = [];

      if (fullText.includes('\n\n===SOURCES===\n')) {
        const parts = fullText.split('\n\n===SOURCES===\n');
        if (parts.length > 1) {
          const extraData = parts[1];
          const extraParts = extraData.split('\n\n===FOLLOW_UPS===\n');
          
          try {
            parsedSources = JSON.parse(extraParts[0]);
          } catch (e) { console.error("Грешка при Sources:", e); }

          if (extraParts.length > 1) {
            try {
              parsedFollowUps = JSON.parse(extraParts[1]);
            } catch (e) { console.error("Грешка при Follow-ups:", e); }
          }
        }
      }

      const finalContent = fullText.includes('\n\n===SOURCES===') 
        ? fullText.substring(0, fullText.indexOf('\n\n===SOURCES===')) 
        : fullText;

      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: finalContent, 
        sources: parsedSources, 
        followUps: parsedFollowUps 
      }]);
      
      setStreamingMessage(null);

      // Обновяване на списъка със сесии (за да се обнови заглавието), ако това е първият въпрос
      if (isFirstMessage) {
        fetchSessions();
      }

    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) => [
        ...prev, 
        {
          role: 'assistant',
          content: `⚠️ Проблем с връзката: ${error.message}.`,
          isError: true,
        }
      ]);
      setStreamingMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Конфигурация за ReactMarkdown
  const markdownComponents = {
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
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex h-[600px] overflow-hidden relative">
      
      {/* СТРАНИЧНО МЕНЮ (SIDEBAR) */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden z-20`}>
        <div className="p-4">
          <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            <Plus className="w-4 h-4" /> Нов разговор
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {sessions.map(session => (
            <div 
              key={session.id} 
              onClick={() => loadSessionMessages(session.id)}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${currentSessionId === session.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200 text-gray-700'}`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
                <span className="text-sm truncate font-medium">{session.title}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteSession(e, session.id)} 
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all"
                title="Изтрий"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ОСНОВНА ЧАСТ НА ЧАТА */}
      <div className="flex flex-col flex-1 h-full min-w-0 relative">
        
        {/* ХЕДЪР НА ЧАТА */}
        <div className="p-3 sm:p-4 border-b border-gray-100 bg-white flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Покажи/Скрий менюто">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center hidden sm:flex">
              <Bot className="w-5 h-5 mr-2 text-blue-600" />
              Асистент
            </h2>
            
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="text-xs flex items-center gap-1 text-gray-500 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors hidden md:flex"
                title="Изчисти екрана"
              >
                <Eraser className="w-3.5 h-3.5" />
                Изчисти
              </button>
            )}
          </div>
          
          <div className="flex gap-2 items-center flex-wrap">
            <button
                onClick={handleGenerateQuiz}
                disabled={isGeneratingQuiz || availableDocs.length === 0}
                className="flex items-center text-sm font-medium bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
              >
                {isGeneratingQuiz ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ListTodo className="w-4 h-4 mr-1.5" />}
                <span className="hidden lg:inline">Тест</span>
              </button>
            <button
              onClick={handleGenerateCards}
              disabled={isGeneratingCards || availableDocs.length === 0}
              className="flex items-center text-sm font-medium bg-purple-100 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
            >
              {isGeneratingCards ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-1.5" />}
              <span className="hidden lg:inline">Флашкарти</span>
            </button>

            <select 
              value={persona} 
              onChange={(e) => setPersona(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 block p-2 outline-none shadow-sm cursor-pointer hidden md:block"
            >
              <option value="default">Стандартен стил</option>
              <option value="simple">Като на 10-годишен</option>
              <option value="expert">Академичен експерт</option>
              <option value="bullet_points">Само кратки списъци</option>
            </select>

            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg shadow-sm pr-1">
              <select 
                value={selectedDoc} 
                onChange={(e) => setSelectedDoc(e.target.value)}
                className="text-gray-700 text-sm bg-transparent focus:ring-0 focus:outline-none block p-2 cursor-pointer max-w-[100px] md:max-w-[150px] truncate border-none"
              >
                <option value="all">Всички документи</option>
                {availableDocs.map((doc, idx) => (
                  <option key={idx} value={doc}>{doc}</option>
                ))}
              </select>
              
              {selectedDoc !== 'all' && (
                <div className="flex items-center border-l border-gray-200 pl-1">
                  <button onClick={handleGetSummary} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-md transition-colors" title="AI Резюме">
                    <Lightbulb className="w-4 h-4" />
                  </button>
                  <button onClick={handleDeleteDocument} disabled={isDeleting} className="p-1.5 text-red-400 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50" title="Изтрий">
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showCards && <FlashcardList cards={flashcards} onClose={() => setShowCards(false)} />}
        {showQuiz && <QuizInterface questions={quizData} onClose={() => setShowQuiz(false)} />}
        
        {summaryData.isOpen && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-blue-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-600" /> Резюме: {selectedDoc}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
          {messages.length === 0 && !streamingMessage ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Bot className="w-12 h-12 mb-3 opacity-20" />
              <p>Това е началото на разговора.</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 
                    msg.isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>

                  <div className={`max-w-[85%] overflow-x-auto ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-none shadow-sm'} p-4`}>
                    
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : msg.isError ? (
                      <div className="text-red-600 whitespace-pre-wrap font-medium">{msg.content}</div>
                    ) : (
                      <div className="text-sm md:text-base text-gray-700 relative">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {msg.content}
                        </ReactMarkdown>

                        <div className="mt-3 pt-2 flex justify-end gap-2">
                          <button
                            onClick={() => handleSpeak(msg.content)}
                            className="flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-md border border-blue-100"
                          >
                            {isSpeaking ? <><Square className="w-3.5 h-3.5 mr-1.5 fill-current" /> Спри</> : <><Volume2 className="w-3.5 h-3.5 mr-1.5" /> Прочети</>}
                          </button>
                          <button
                            onClick={() => handleCopy(msg.content, index)}
                            className="flex items-center text-xs text-gray-500 hover:text-gray-800 transition-colors bg-gray-50 hover:bg-gray-100 px-2 py-1.5 rounded-md border border-gray-100"
                          >
                            {copiedIndex === index ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" /><span className="text-green-600 font-medium">Копирано</span></> : <><Copy className="w-3.5 h-3.5 mr-1.5" />Копирай</>}
                          </button>
                        </div>
                      </div>
                    )}
                    
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
              ))}

              {streamingMessage && (
                <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-green-100 text-green-600">
                    <Bot className="w-5 h-5" />
                  </div>

                  <div className="max-w-[80%] overflow-x-auto bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-none shadow-sm p-4">
                    <div className="text-sm md:text-base text-gray-700 relative">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {streamingMessage.content}
                      </ReactMarkdown>
                      <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse"></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {isLoading && !streamingMessage && (
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

        <form id="chat-form" onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100 z-10">
          <div className="flex items-center gap-2">
            
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-lg flex-shrink-0 transition-colors ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isListening ? 'Спри микрофона' : 'Говори'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Слушам ви..." : "Попитайте нещо..."}
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
    </div>
  );
}