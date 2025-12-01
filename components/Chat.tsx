
import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Sparkles, Image as ImageIcon, X, Trash2, Plus, PlayCircle, Maximize2, Download } from 'lucide-react';
import { ChatMessage, BodyParams, UserProgress, Language } from '../types';
import { getTutorResponse } from '../services/geminiService';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../services/storageService';

interface ChatProps {
  currentSimState?: { bodyA: BodyParams; bodyB: BodyParams };
  userProgress: UserProgress;
  language: Language;
  onApplySimulation?: (simData: { bodyA?: Partial<BodyParams>, bodyB?: Partial<BodyParams> }) => void;
}

const Chat: React.FC<ChatProps> = ({ currentSimState, userProgress, language, onApplySimulation }) => {
  const getDefaultMessage = (): ChatMessage => ({
    id: '1',
    role: 'model',
    text: language === 'ar' ? "مرحباً! أنا معلم الفيزياء الخاص بك. كيف يمكنني مساعدتك اليوم؟" :
          language === 'he' ? "שלום! אני המורה לפיזיקה שלך. איך אני יכול לעזור לך היום?" :
          "Hi! I'm your Physics Mentor. I can help you understand motion, solve problems, or explain what's happening in your simulation. What's on your mind?",
    timestamp: Date.now()
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Load from storage or use default
    return loadFromStorage<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY, [getDefaultMessage()]);
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Persist messages whenever they change
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CHAT_HISTORY, messages);
  }, [messages]);

  const handleClearHistory = () => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من مسح المحادثة؟' : language === 'he' ? 'האם אתה בטוח שברצונך למחוק את ההיסטוריה?' : 'Are you sure you want to clear chat history?')) {
      const resetMsg = [getDefaultMessage()];
      setMessages(resetMsg);
      saveToStorage(STORAGE_KEYS.CHAT_HISTORY, resetMsg);
    }
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `physics-flow-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newImages: string[] = [];
      
      const readFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      try {
        const promises = Array.from(files).map(readFile);
        const results = await Promise.all(promises);
        setSelectedImages(prev => [...prev, ...results]);
      } catch (error) {
        console.error("Error reading images", error);
      }
    }
    // Reset input so same files can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImages([]);
    setIsLoading(true);

    try {
      // Filter out invalid history parts for API
      const history = messages
        .filter(m => !m.isError)
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }] 
        }));

      const response = await getTutorResponse(history, userMsg.text, userMsg.images, userProgress, language, currentSimState);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        images: response.images.length > 0 ? response.images : undefined,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I seem to have lost my train of thought. Can you try again?",
        timestamp: Date.now(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Function to parse text and extract Simulation blocks
  const parseMessageContent = (text: string) => {
    const simRegex = /<<<SIMULATION>>>([\s\S]*?)<<<SIMULATION>>>/;
    const match = text.match(simRegex);

    if (match) {
      const cleanText = text.replace(simRegex, '').trim();
      let simData = null;
      try {
        simData = JSON.parse(match[1]);
      } catch (e) {
        console.error("Failed to parse sim data", e);
      }

      return {
        display: cleanText,
        simData
      };
    }

    return { display: text, simData: null };
  };

  return (
    <>
      <div className="flex flex-col h-full bg-space-800 rounded-xl border border-space-700 overflow-hidden">
        <div className="p-4 bg-space-900 border-b border-space-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-neon-purple" size={20} />
            <h2 className="text-lg font-bold text-white">Physics Mentor</h2>
          </div>
          <button 
            onClick={handleClearHistory}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-space-800 rounded-lg transition-colors"
            title={language === 'ar' ? "مسح المحادثة" : "Clear History"}
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const msgImages = msg.images || (msg.image ? [msg.image] : []);
            const { display, simData } = parseMessageContent(msg.text);

            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center shrink-0
                  ${msg.role === 'user' ? 'bg-neon-blue text-black' : 'bg-neon-purple text-white'}
                `}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                
                <div className={`
                  max-w-[80%] flex flex-col gap-2
                  ${msg.role === 'user' ? 'items-end' : 'items-start'}
                `}>
                  {msgImages.length > 0 && (
                    <div className={`flex flex-wrap gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msgImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={img} 
                            alt="Content" 
                            className="rounded-lg max-w-[200px] max-h-[200px] object-cover border border-space-700 cursor-pointer hover:brightness-75 transition-all" 
                            onClick={() => setViewingImage(img)}
                          />
                           <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <button 
                                onClick={() => setViewingImage(img)} 
                                className="p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 pointer-events-auto"
                                title="Zoom"
                              >
                                <Maximize2 size={16} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); downloadImage(img); }} 
                                className="p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 pointer-events-auto"
                                title="Download"
                              >
                                <Download size={16} />
                              </button>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {display && (
                    <div className={`
                      rounded-2xl whitespace-pre-wrap
                      ${msg.role === 'user' 
                        ? 'p-3 text-sm leading-relaxed bg-space-700 text-slate-100 rounded-tr-none' 
                        : 'p-4 text-base md:text-lg leading-7 font-medium bg-space-900 border border-space-700 text-white rounded-tl-none shadow-md'}
                    `}>
                      {display}
                    </div>
                  )}

                  {simData && onApplySimulation && (
                    <button 
                      onClick={() => onApplySimulation(simData)}
                      className="flex items-center gap-2 px-4 py-3 bg-space-800 border border-neon-blue/30 rounded-xl hover:bg-space-700 hover:border-neon-blue transition-all group w-full text-left"
                    >
                      <div className="w-10 h-10 bg-neon-blue/20 rounded-lg flex items-center justify-center text-neon-blue group-hover:scale-110 transition-transform">
                        <PlayCircle size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">
                          {language === 'ar' ? "تشغيل المحاكاة" : language === 'he' ? "הפעל סימולציה" : "Launch Simulation"}
                        </div>
                        <div className="text-xs text-slate-400">
                           Click to apply this scenario to the lab
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
             <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-neon-purple text-white flex items-center justify-center shrink-0">
                 <Bot size={16} />
               </div>
               <div className="bg-space-900 border border-space-700 p-3 rounded-2xl rounded-tl-none">
                 <div className="flex gap-1">
                   <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                   <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                   <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                 </div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-space-900 border-t border-space-700">
          {selectedImages.length > 0 && (
            <div className="flex gap-2 mb-2 p-2 bg-space-800 rounded-lg overflow-x-auto">
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative shrink-0">
                   <img src={img} alt="Preview" className="h-16 w-16 object-cover rounded border border-space-600" />
                   <button 
                    onClick={() => removeImage(idx)} 
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white hover:bg-red-600"
                   >
                     <X size={12}/>
                   </button>
                </div>
              ))}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="h-16 w-16 rounded border-2 border-dashed border-space-600 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-400"
              >
                <Plus size={20} />
              </button>
            </div>
          )}
          <div className="relative flex gap-2">
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-space-800 border border-space-700 rounded-xl text-slate-400 hover:text-neon-blue hover:border-neon-blue transition-colors"
              title="Attach images"
            >
              <ImageIcon size={20} />
            </button>
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  language === 'ar' ? "اسأل سؤالاً..." : 
                  language === 'he' ? "שאל שאלה..." : 
                  "Ask a physics question..."
                }
                className={`w-full bg-space-800 border border-space-700 text-white p-3 rounded-xl focus:outline-none focus:border-neon-blue transition-colors ${language === 'ar' || language === 'he' ? 'text-right' : 'text-left'}`}
                dir={language === 'ar' || language === 'he' ? 'rtl' : 'ltr'}
              />
              <button 
                onClick={handleSend}
                disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
                className={`absolute top-1/2 -translate-y-1/2 p-2 text-neon-blue hover:text-white disabled:opacity-50 disabled:hover:text-neon-blue transition-colors ${language === 'ar' || language === 'he' ? 'left-2' : 'right-2'}`}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {viewingImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingImage(null)}>
           <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
              <img 
                src={viewingImage} 
                alt="Full View" 
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl border border-space-700" 
              />
              
              <div className="flex gap-4 mt-4">
                 <button 
                   onClick={() => downloadImage(viewingImage)} 
                   className="flex items-center gap-2 px-6 py-2 bg-space-800 text-white rounded-full hover:bg-neon-blue hover:text-black transition-all border border-space-600"
                 >
                   <Download size={20} />
                   {language === 'ar' ? "حفظ الصورة" : language === 'he' ? "שמור תמונה" : "Save Image"}
                 </button>
                 <button 
                   onClick={() => setViewingImage(null)} 
                   className="flex items-center gap-2 px-6 py-2 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all border border-red-500/50"
                 >
                   <X size={20} />
                   {language === 'ar' ? "إغلاق" : language === 'he' ? "סגור" : "Close"}
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default Chat;
