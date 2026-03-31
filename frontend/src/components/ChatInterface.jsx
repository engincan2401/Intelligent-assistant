import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, BookOpen } from 'lucide-react';
import { chatService } from '../service/api';

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput(''); 
    
   
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
     
      const response = await chatService.askQuestion(userMessage);
      
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
          sources: response.sources,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: error.response?.data?.detail || 'Възникна грешка при свързването със сървъра.',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
      
      <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <Bot className="w-5 h-5 mr-2 text-blue-600" />
          RAG Асистент
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Bot className="w-12 h-12 mb-3 opacity-20" />
            <p>Задайте въпрос относно качените документи.</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Иконка */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 
                msg.isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

            
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none'} p-4`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
                
                {msg.sources && msg.sources.length > 0 && (
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