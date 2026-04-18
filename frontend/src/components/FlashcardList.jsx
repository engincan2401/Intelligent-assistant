import { useState } from 'react';
import { ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';

function FlashcardItem({ card, index }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="bg-blue-100 text-blue-600 font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
          {index + 1}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 text-lg leading-relaxed mb-2">
            {card.question}
          </h3>
          
          {isOpen ? (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-gray-700 leading-relaxed bg-blue-50/50 p-4 rounded-lg border border-blue-100/50">
                {card.answer}
              </p>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-gray-500 text-sm mt-3 flex items-center hover:text-gray-700 transition-colors font-medium"
              >
                <ChevronUp className="w-4 h-4 mr-1"/> Скрий отговора
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsOpen(true)} 
              className="text-blue-600 text-sm mt-2 flex items-center hover:text-blue-700 transition-colors font-medium bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
            >
              <ChevronDown className="w-4 h-4 mr-1"/> Покажи отговор
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlashcardList({ cards, onClose }) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="absolute inset-0 bg-gray-50/95 backdrop-blur-sm z-10 flex flex-col rounded-xl border border-gray-100">
      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center rounded-t-xl sticky top-0 z-20 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <BrainCircuit className="w-5 h-5 mr-2 text-purple-600" />
          Учебни флашкарти ({cards.length})
        </h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm"
        >
          Затвори
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          {cards.map((card, idx) => (
            <FlashcardItem key={idx} card={card} index={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}