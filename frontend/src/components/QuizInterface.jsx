import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

export default function QuizInterface({ questions, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!questions || questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];

  const handleOptionClick = (option) => {
    if (selectedOption) return;
    setSelectedOption(option);
    if (option.is_correct) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <div className="absolute inset-0 bg-gray-50/95 backdrop-blur-sm z-20 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-bold">
              {score}/{questions.length}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Тестът приключи!
          </h2>
          <p className="text-gray-600 mb-8">
            {score === questions.length
              ? "Перфектен резултат! Справи се блестящо."
              : "Добра работа! Продължавай да учиш."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
            >
              Затвори
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gray-50/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-100 flex flex-col max-h-full">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            Въпрос {currentIndex + 1} от {questions.length}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            Затвори
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          <h2 className="text-xl font-bold text-gray-800 mb-6 leading-relaxed">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              let btnClass =
                "w-full text-left p-4 rounded-xl border-2 transition-all font-medium ";

              if (!selectedOption) {
                btnClass +=
                  "border-gray-100 hover:border-blue-300 hover:bg-blue-50 text-gray-700";
              } else if (option.is_correct) {
                btnClass += "border-green-500 bg-green-50 text-green-700";
              } else if (selectedOption === option && !option.is_correct) {
                btnClass += "border-red-500 bg-red-50 text-red-700";
              } else {
                btnClass +=
                  "border-gray-100 opacity-50 text-gray-500 cursor-not-allowed";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(option)}
                  disabled={selectedOption !== null}
                  className={btnClass}
                >
                  <div className="flex justify-between items-center">
                    <span>{option.text}</span>
                    {selectedOption && option.is_correct && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {selectedOption === option && !option.is_correct && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedOption && (
            <div className="mt-6 p-5 bg-blue-50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-bottom-2">
              <h4 className="flex items-center text-blue-800 font-bold mb-2">
                <Lightbulb className="w-5 h-5 mr-2 text-blue-600" />
                Обяснение
              </h4>
              <p className="text-blue-900/80 text-sm leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 bg-white rounded-b-2xl flex justify-end">
          <button
            onClick={handleNext}
            disabled={!selectedOption}
            className="flex items-center bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {currentIndex + 1 === questions.length
              ? "Приключи теста"
              : "Следващ въпрос"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
