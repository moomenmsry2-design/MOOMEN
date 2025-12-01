import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChevronRight, RefreshCw, Trophy } from 'lucide-react';
import { Question, ExamState, Language } from '../types';
import { generateQuizQuestions } from '../services/geminiService';

interface ExamProps {
  language: Language;
}

const Exam: React.FC<ExamProps> = ({ language }) => {
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('Kinematics');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  
  const [examState, setExamState] = useState<ExamState>({
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    completed: false,
    answers: {}
  });

  const startNewQuiz = async () => {
    setLoading(true);
    setExamState({ questions: [], currentQuestionIndex: 0, score: 0, completed: false, answers: {} });
    
    const questions = await generateQuizQuestions(topic, difficulty, language);
    
    setExamState({
      questions: questions,
      currentQuestionIndex: 0,
      score: 0,
      completed: false,
      answers: {}
    });
    setLoading(false);
  };

  const handleAnswer = (answer: string) => {
    setExamState(prev => ({
      ...prev,
      answers: { ...prev.answers, [prev.questions[prev.currentQuestionIndex].id]: answer }
    }));
  };

  const nextQuestion = () => {
    if (examState.currentQuestionIndex < examState.questions.length - 1) {
      setExamState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    let score = 0;
    examState.questions.forEach(q => {
      const userAnswer = examState.answers[q.id];
      // Basic normalization for comparison
      if (userAnswer?.toLowerCase() === q.correctAnswer.toLowerCase()) {
        score++;
      }
    });

    setExamState(prev => ({ ...prev, completed: true, score }));
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white space-y-4">
        <RefreshCw className="animate-spin text-neon-blue" size={48} />
        <p className="text-xl">Generating Physics Problems...</p>
        <p className="text-sm text-slate-400">Consulting the AI Physics Engine</p>
      </div>
    );
  }

  // Setup Screen
  if (examState.questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="bg-space-800 p-8 rounded-2xl border border-space-700 max-w-md w-full text-center shadow-xl">
          <Trophy className="mx-auto text-neon-pink mb-4" size={48} />
          <h2 className="text-2xl font-bold text-white mb-6">Test Your Knowledge</h2>
          
          <div className="space-y-4 mb-8 text-left">
            <div>
              <label className="block text-slate-400 mb-1 text-sm">Topic</label>
              <select value={topic} onChange={e => setTopic(e.target.value)} className="w-full bg-space-900 border border-space-700 text-white p-2 rounded">
                <option>Kinematics</option>
                <option>Forces</option>
                <option>Energy</option>
                <option>Momentum</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 text-sm">Difficulty</label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button 
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 p-2 rounded text-sm capitalize transition-colors ${difficulty === d ? 'bg-neon-blue text-black font-bold' : 'bg-space-700 text-white'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={startNewQuiz}
            className="w-full bg-gradient-to-r from-neon-purple to-neon-pink text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  // Results Screen
  if (examState.completed) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-space-800 p-6 rounded-2xl border border-space-700 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
            <div className="text-6xl font-bold text-neon-blue mb-4">
              {Math.round((examState.score / examState.questions.length) * 100)}%
            </div>
            <p className="text-slate-400">You got {examState.score} out of {examState.questions.length} correct.</p>
            <button onClick={() => setExamState({ questions: [], currentQuestionIndex: 0, score: 0, completed: false, answers: {} })} className="mt-6 px-6 py-2 bg-space-700 hover:bg-space-600 rounded-lg text-white transition-colors">
              Try Another
            </button>
          </div>

          {examState.questions.map((q, idx) => {
             const userAnswer = examState.answers[q.id];
             const isCorrect = userAnswer?.toLowerCase() === q.correctAnswer.toLowerCase();
             return (
               <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                 <div className="flex gap-3">
                   {isCorrect ? <CheckCircle className="text-green-500 shrink-0" /> : <XCircle className="text-red-500 shrink-0" />}
                   <div>
                     <p className="font-bold text-white mb-2">{idx + 1}. {q.text}</p>
                     <p className="text-sm text-slate-300 mb-1">Your Answer: <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>{userAnswer || '(Skipped)'}</span></p>
                     {!isCorrect && <p className="text-sm text-green-400 mb-2">Correct Answer: {q.correctAnswer}</p>}
                     <div className="bg-space-900 p-3 rounded text-sm text-slate-400 mt-2">
                       <span className="font-bold text-slate-300">Explanation:</span> {q.explanation}
                     </div>
                   </div>
                 </div>
               </div>
             )
          })}
        </div>
      </div>
    )
  }

  // Question Screen
  const currentQuestion = examState.questions[examState.currentQuestionIndex];
  const hasAnswered = !!examState.answers[currentQuestion.id];

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-space-800 rounded-2xl border border-space-700 shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
        {/* Progress Bar */}
        <div className="w-full h-2 bg-space-900">
          <div 
            className="h-full bg-neon-blue transition-all duration-300" 
            style={{ width: `${((examState.currentQuestionIndex + 1) / examState.questions.length) * 100}%` }}
          />
        </div>

        <div className="p-8 flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <span className="text-neon-purple font-mono font-bold">QUESTION {examState.currentQuestionIndex + 1}/{examState.questions.length}</span>
            <span className="text-slate-500 text-sm uppercase tracking-wider">{currentQuestion.type}</span>
          </div>

          <h3 className="text-2xl font-bold text-white mb-8 leading-relaxed">
            {currentQuestion.text}
          </h3>

          <div className="flex-1 space-y-3">
            {currentQuestion.type === 'multiple-choice' ? (
              currentQuestion.options?.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    examState.answers[currentQuestion.id] === option 
                      ? 'bg-neon-blue text-black border-neon-blue font-bold shadow-[0_0_15px_rgba(76,201,240,0.3)]' 
                      : 'bg-space-900 border-space-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="inline-block w-6 font-mono opacity-50">{String.fromCharCode(65 + idx)}.</span> {option}
                </button>
              ))
            ) : (
              <textarea
                 className="w-full bg-space-900 border border-space-700 rounded-xl p-4 text-white focus:border-neon-blue outline-none min-h-[150px]"
                 placeholder="Type your answer here..."
                 value={examState.answers[currentQuestion.id] || ''}
                 onChange={(e) => handleAnswer(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="p-6 border-t border-space-700 flex justify-end">
          <button 
            onClick={nextQuestion}
            disabled={!hasAnswered}
            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {examState.currentQuestionIndex === examState.questions.length - 1 ? 'Finish' : 'Next Question'}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Exam;