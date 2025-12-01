
import React, { useState, useEffect } from 'react';
import { Atom, MessageSquare, Award, MonitorPlay, ChevronLeft, Globe } from 'lucide-react';
import Simulation from './components/Simulation';
import Chat from './components/Chat';
import Exam from './components/Exam';
import { ViewState, BodyParams, UserProgress, Language } from './types';
import { INITIAL_BODY_A, INITIAL_BODY_B } from './constants';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './services/storageService';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  
  // Load language from storage or default to 'en'
  const [language, setLanguage] = useState<Language>(() => 
    loadFromStorage<Language>(STORAGE_KEYS.LANG_PREF, 'en')
  );

  const [bodyA, setBodyA] = useState<BodyParams>(INITIAL_BODY_A);
  const [bodyB, setBodyB] = useState<BodyParams>(INITIAL_BODY_B);
  
  // Load progress from storage or default
  const [userProgress, setUserProgress] = useState<UserProgress>(() => 
    loadFromStorage<UserProgress>(STORAGE_KEYS.USER_PROGRESS, {
      weaknesses: [],
      topicsMastered: [],
      interactionCount: 0
    })
  );

  const [aiAnalysis, setAiAnalysis] = useState<string>("");

  // Persist Language Changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LANG_PREF, language);
  }, [language]);

  // Persist Progress Changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.USER_PROGRESS, userProgress);
  }, [userProgress]);

  const handleNav = (v: ViewState) => setView(v);

  const isRTL = language === 'ar' || language === 'he';

  return (
    <div className="flex flex-col h-screen bg-space-900 text-white font-sans overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <header className="h-16 border-b border-space-700 bg-space-900/90 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNav(ViewState.HOME)}>
          <div className="w-10 h-10 bg-gradient-to-br from-neon-purple to-neon-blue rounded-lg flex items-center justify-center shadow-lg shadow-neon-blue/20">
            <Atom className="text-white animate-spin-slow" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
            PhysicsFlow AI
          </h1>
        </div>

        <div className="flex items-center gap-4">
           {/* Language Selector */}
           <div className="flex items-center gap-2 bg-space-800 rounded-lg p-1 border border-space-700">
             <Globe size={16} className="text-slate-400 ml-2" />
             <select 
               value={language} 
               onChange={(e) => setLanguage(e.target.value as Language)}
               className="bg-transparent text-sm text-slate-300 focus:outline-none p-1"
             >
               <option value="en">English</option>
               <option value="ar">العربية</option>
               <option value="he">עברית</option>
             </select>
           </div>

           {view !== ViewState.HOME && (
             <nav className="flex items-center bg-space-800 rounded-full p-1 border border-space-700">
               <button 
                 onClick={() => handleNav(ViewState.SIMULATION)}
                 className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === ViewState.SIMULATION ? 'bg-space-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
               >
                 Simulation
               </button>
               <button 
                 onClick={() => handleNav(ViewState.EXAM)}
                 className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === ViewState.EXAM ? 'bg-space-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
               >
                 Exam
               </button>
               <button 
                 onClick={() => handleNav(ViewState.CHAT)}
                 className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === ViewState.CHAT ? 'bg-space-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
               >
                 AI
               </button>
             </nav>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* HOME VIEW */}
        {view === ViewState.HOME && (
          <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-space-800 via-space-900 to-black -z-10"></div>
            
            <div className="text-center max-w-2xl mx-auto mb-12 animate-fade-in-up">
              <h2 className="text-5xl font-bold mb-6 text-white leading-tight">
                {language === 'en' ? 'Master Physics with ' : language === 'ar' ? 'أتقن الفيزياء مع ' : 'שלטו בפיזיקה עם '} <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">
                  {language === 'en' ? 'Intelligent Simulation' : language === 'ar' ? 'المحاكاة الذكية' : 'סימולציה חכמה'}
                </span>
              </h2>
              <p className="text-slate-400 text-lg">
                {language === 'en' 
                  ? "Visualize kinematics, solve complex problems, and get personalized tutoring from our advanced AI engine."
                  : language === 'ar'
                  ? "تصور الحركة المجردة، حل المشكلات المعقدة، واحصل على تدريس مخصص من محرك الذكاء الاصطناعي المتقدم لدينا."
                  : "הדמיית קינמטיקה, פתרון בעיות מורכבות וקבלת חונכות אישית ממנוע הבינה המלאכותית המתקדם שלנו."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 w-full max-w-4xl justify-center z-10">
              
              <button 
                onClick={() => handleNav(ViewState.CHAT)}
                className="group relative flex-1 bg-space-800 border border-space-700 p-8 rounded-2xl hover:border-neon-purple transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(114,9,183,0.3)] text-left rtl:text-right"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity rtl:left-0 rtl:right-auto">
                  <MessageSquare size={100} />
                </div>
                <div className="w-14 h-14 bg-neon-purple/20 text-neon-purple rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-neon-purple transition-colors">
                  {language === 'en' ? "Ask AI Tutor" : language === 'ar' ? "اسأل المعلم الذكي" : "שאל את הבינה המלאכותית"}
                </h3>
                <p className="text-slate-400 text-sm">
                  {language === 'en' ? "Get clear explanations, solve specific problems, and clear up confusion instantly." : "احصل على تفسيرات واضحة وحلول فورية."}
                </p>
              </button>

              <button 
                onClick={() => handleNav(ViewState.SIMULATION)}
                 className="group relative flex-1 bg-space-800 border border-space-700 p-8 rounded-2xl hover:border-neon-blue transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(76,201,240,0.3)] text-left rtl:text-right"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity rtl:left-0 rtl:right-auto">
                  <MonitorPlay size={100} />
                </div>
                <div className="w-14 h-14 bg-neon-blue/20 text-neon-blue rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MonitorPlay size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-neon-blue transition-colors">
                   {language === 'en' ? "Simulation Lab" : language === 'ar' ? "مختبر المحاكاة" : "מעבדת סימולציה"}
                </h3>
                <p className="text-slate-400 text-sm">
                   {language === 'en' ? "Experiment with motion bodies, graphs, and collisions in a real-time environment." : "جرّب الأجسام المتحركة والرسوم البيانية في بيئة واقعية."}
                </p>
              </button>

              <button 
                 onClick={() => handleNav(ViewState.EXAM)}
                 className="group relative flex-1 bg-space-800 border border-space-700 p-8 rounded-2xl hover:border-neon-pink transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(247,37,133,0.3)] text-left rtl:text-right"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity rtl:left-0 rtl:right-auto">
                  <Award size={100} />
                </div>
                <div className="w-14 h-14 bg-neon-pink/20 text-neon-pink rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Award size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-neon-pink transition-colors">
                   {language === 'en' ? "Exam & Exercises" : language === 'ar' ? "الامتحانات والتمارين" : "מבחנים ותרגילים"}
                </h3>
                <p className="text-slate-400 text-sm">
                   {language === 'en' ? "Test your skills with AI-generated problems tailored to your learning level." : "اختبر مهاراتك مع مسائل مولدة بالذكاء الاصطناعي."}
                </p>
              </button>

            </div>
          </div>
        )}

        {/* SIMULATION VIEW */}
        {view === ViewState.SIMULATION && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-6 p-4">
             <div className="lg:col-span-2 h-full overflow-y-auto pr-2 custom-scrollbar">
                <Simulation 
                  bodyA={bodyA} 
                  setBodyA={setBodyA}
                  bodyB={bodyB}
                  setBodyB={setBodyB}
                  onAnalysisUpdate={setAiAnalysis}
                  language={language}
                />
             </div>
             <div className="hidden lg:flex lg:col-span-1 flex-col h-full bg-space-800 rounded-xl border border-space-700 overflow-hidden">
                <div className="p-4 border-b border-space-700 font-bold text-neon-blue flex items-center gap-2">
                  <Atom size={18}/> Live AI Analysis
                </div>
                <div className="p-4 flex-1 overflow-y-auto">
                   <p className="text-sm text-slate-300 italic mb-4">
                     "{aiAnalysis}"
                   </p>
                   <hr className="border-space-700 my-4"/>
                   <Chat currentSimState={{bodyA, bodyB}} userProgress={userProgress} language={language} />
                </div>
             </div>
          </div>
        )}

        {/* CHAT VIEW */}
        {view === ViewState.CHAT && (
          <div className="h-full p-4 max-w-4xl mx-auto">
            <Chat currentSimState={{bodyA, bodyB}} userProgress={userProgress} language={language} />
          </div>
        )}

        {/* EXAM VIEW */}
        {view === ViewState.EXAM && (
          <div className="h-full p-4">
            <Exam language={language} />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
