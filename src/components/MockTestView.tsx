import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateMockTest } from '../lib/rag';
import { BookOpen, CheckCircle, XCircle, ArrowRight, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

type Question = {
  question: string;
  options: string[];
  correctAnswerIndex: number;
};

export default function MockTestView() {
  const [state, setState] = useState<'idle' | 'generating' | 'taking' | 'results'>('idle');
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setState('generating');
    setError(null);

    try {
      const generatedQuestions = await generateMockTest(topic, questionCount);
      if (generatedQuestions && generatedQuestions.length > 0) {
        setQuestions(generatedQuestions);
        setCurrentQuestionIndex(0);
        setSelectedAnswers(new Array(generatedQuestions.length).fill(-1));
        setState('taking');
      } else {
        throw new Error("Received empty test.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate test.');
      setState('idle');
    }
  };

  const handleSelectAnswer = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const calculateScore = () => {
    return selectedAnswers.reduce((score, answer, index) => {
      return score + (answer === questions[index].correctAnswerIndex ? 1 : 0);
    }, 0);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      const score = calculateScore();
      if (score / questions.length >= 0.5) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ffd6e0', '#c8e7ff', '#e2f0cb', '#ffe5b4', '#5a5a5a']
        });
      }
      setState('results');
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col w-full h-full relative">
      <AnimatePresence mode="wait">
        
        {state === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
          >
            <div className="w-16 h-16 rounded-xl bg-[#c8e7ff] border-2 border-[#5a5a5a] shadow-[2px_2px_0px_0px_#5a5a5a] flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-[#5a5a5a]" />
            </div>
            <h2 className="text-2xl font-bold text-[#5a5a5a] mb-2 uppercase tracking-tight">Quiz Generator</h2>
            <p className="text-[#5a5a5a]/70 text-sm mb-6 max-w-[200px]">Generate a custom test from your notes.</p>

            <form onSubmit={handleGenerate} className="w-full max-w-sm space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#5a5a5a] uppercase tracking-wider block text-left px-1">Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Biology"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[#fdfaf6] border-2 border-[#5a5a5a] rounded-lg px-4 py-2 text-[#5a5a5a] font-bold focus:outline-none focus:bg-white shadow-[2px_2px_0px_0px_#5a5a5a]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#5a5a5a] uppercase tracking-wider block text-left px-1">Questions</label>
                <div className="flex gap-2">
                  {[3, 5, 10, 15].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 border-[#5a5a5a] transition-all ${
                        questionCount === num 
                          ? 'bg-[#ffd6e0] shadow-[2px_2px_0px_0px_#5a5a5a] translate-y-[-2px]' 
                          : 'bg-[#fdfaf6] text-[#5a5a5a]/60 hover:bg-[#ffe5b4]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={!topic.trim()}
                className="w-full bg-[#5a5a5a] text-white font-bold py-3 rounded-lg mt-2 disabled:opacity-50"
              >
                Start Test
              </button>
              {error && <p className="text-red-500 text-xs font-bold mt-2">{error}</p>}
            </form>
          </motion.div>
        )}

        {state === 'generating' && (
          <motion.div 
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full"
          >
            <BookOpen className="w-10 h-10 text-[#5a5a5a] animate-bounce mb-4" />
            <h3 className="text-lg font-bold text-[#5a5a5a] uppercase">Crafting Test</h3>
            <p className="text-xs text-[#5a5a5a]/60 animate-pulse mt-1">Reading "{topic}" notes...</p>
          </motion.div>
        )}

        {state === 'taking' && currentQuestion && (
          <motion.div 
            key={`question-${currentQuestionIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full flex flex-col pt-2 pb-4"
          >
            {/* Progress Bar */}
            <div className="w-full h-2 bg-[#f3e5f5] border-2 border-[#5a5a5a] rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-[#e2f0cb] border-r-2 border-[#5a5a5a] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="text-xs font-bold text-[#5a5a5a] uppercase mb-4 px-1">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            
            <h3 className="text-lg font-bold text-[#5a5a5a] leading-snug mb-6 px-1">{currentQuestion.question}</h3>
            
            <div className="space-y-3 flex-1 overflow-y-auto px-1">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  className={`w-full text-left p-3 rounded-lg border-2 border-[#5a5a5a] transition-all flex items-center gap-3 ${
                    selectedAnswers[currentQuestionIndex] === idx
                      ? 'bg-[#c8e7ff] shadow-[2px_2px_0px_0px_#5a5a5a]'
                      : 'bg-white hover:bg-[#f3e5f5]'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md border-2 border-[#5a5a5a] flex items-center justify-center font-bold text-xs ${
                    selectedAnswers[currentQuestionIndex] === idx ? 'bg-white text-[#5a5a5a]' : 'bg-[#fdfaf6] text-[#5a5a5a]/50'
                  }`}>
                    {['A', 'B', 'C', 'D'][idx]}
                  </div>
                  <span className="flex-1 text-sm font-bold text-[#5a5a5a]">
                    {option}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={selectedAnswers[currentQuestionIndex] === -1}
              className="mt-4 w-full bg-[#5a5a5a] text-white font-bold px-4 py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-30"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Finish'} <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {state === 'results' && (
          <motion.div 
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full flex flex-col"
          >
            <div className="text-center mb-6 pt-4 shrink-0">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#ffd6e0] border-[3px] border-[#5a5a5a] shadow-[4px_4px_0px_0px_#5a5a5a] mb-4">
                <span className="text-3xl font-black text-[#5a5a5a]">{calculateScore()}/{questions.length}</span>
              </div>
              <h2 className="text-2xl font-black text-[#5a5a5a] uppercase">
                {calculateScore() === questions.length ? "Perfect!" : 
                 calculateScore() >= questions.length / 2 ? "Great Job!" : "Keep Studying!"}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
              {questions.map((q, qIdx) => {
                const isCorrect = selectedAnswers[qIdx] === q.correctAnswerIndex;
                return (
                  <div key={qIdx} className={`p-4 rounded-xl border-2 border-[#5a5a5a] shadow-[2px_2px_0px_0px_#5a5a5a] ${
                    isCorrect ? 'bg-[#e2f0cb]' : 'bg-[#ffd6e0]'
                  }`}>
                    <div className="flex gap-2 mb-3">
                      {isCorrect ? <CheckCircle className="w-5 h-5 text-[#5a5a5a] shrink-0" /> : <XCircle className="w-5 h-5 text-[#5a5a5a] shrink-0" />}
                      <h4 className="text-sm font-bold text-[#5a5a5a] leading-snug">{q.question}</h4>
                    </div>
                    
                    <div className="pl-7 space-y-2">
                      <div className="text-xs">
                        <span className="font-bold text-[#5a5a5a]/70 uppercase">You: </span>
                        <span className="font-bold text-[#5a5a5a]">{q.options[selectedAnswers[qIdx]]}</span>
                      </div>
                      {!isCorrect && (
                        <div className="text-xs">
                          <span className="font-bold text-[#5a5a5a]/70 uppercase">Correct: </span>
                          <span className="font-bold text-[#5a5a5a]">{q.options[q.correctAnswerIndex]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setState('idle')}
              className="mt-4 w-full bg-[#5a5a5a] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
