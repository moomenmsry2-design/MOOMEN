
import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_MODEL_FAST, GEMINI_MODEL_IMAGE } from "../constants";
import { BodyParams, UserProgress, Language } from "../types";

// Helper to get a fresh client instance
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

const getLanguageInstruction = (lang: Language): string => {
  const commonRules = "IMPORTANT: Do NOT use dollar signs ($) or LaTeX formatting for variables. Write them in plain text (e.g., 'v(t)', 'a', 'x0'). If the user asks for a summary, provide a very brief and concise answer.";
  
  switch (lang) {
    case 'ar': return "Respond in Arabic. " + commonRules;
    case 'he': return "Respond in Hebrew. " + commonRules;
    default: return "Respond in English. " + commonRules;
  }
};

export const getTutorResponse = async (
  history: { role: 'user' | 'model'; parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> }[],
  message: string,
  images: string[] | undefined,
  userProgress: UserProgress,
  language: Language,
  currentSimState?: { bodyA: BodyParams; bodyB: BodyParams }
): Promise<{ text: string; images: string[] }> => {
  try {
    const ai = getAiClient();
    const langInstruction = getLanguageInstruction(language);
    
    // Check if user is asking to generate an image
    // English keywords
    const enKeywords = /(draw|generate|create|make|show).*(image|picture|photo|diagram|sketch|graph)/i;
    // Arabic keywords: اخلق صورة, ارسم, صورة للتوضيح, etc.
    const arKeywords = /(اخلق|ارسم|أنشئ|ولد|أظهر).*(صورة|رسم|توضيح|بياني)/i;
    // Specific phrase requested by user: "اخلق صورة للتوضيح"
    const specificPhrase = /اخلق صورة للتوضيح/i;

    const isImageGenerationRequest = (enKeywords.test(message) || arKeywords.test(message) || specificPhrase.test(message)) && (!images || images.length === 0);

    if (isImageGenerationRequest) {
       const model = GEMINI_MODEL_IMAGE;
       const prompt = `${message}. ${langInstruction}. Create a high-quality, clear educational physics diagram or illustration to explain this concept. Make it visually appealing.`;
       
       const response = await ai.models.generateContent({
         model: model,
         contents: prompt,
       });

       let text = "";
       const generatedImages: string[] = [];

       if (response.candidates?.[0]?.content?.parts) {
         for (const part of response.candidates[0].content.parts) {
           if (part.text) {
             text += part.text;
           }
           if (part.inlineData) {
             const base64 = part.inlineData.data;
             const mimeType = part.inlineData.mimeType || 'image/png';
             generatedImages.push(`data:${mimeType};base64,${base64}`);
           }
         }
       }
       
       return { 
         text: text || (language === 'ar' ? "إليك الصورة التوضيحية التي طلبتها." : language === 'he' ? "הנה התמונה שביקשת." : "Here is the image you requested."), 
         images: generatedImages 
       };
    }

    // Standard Text Chat Logic
    const model = GEMINI_MODEL_FAST;
    
    let context = `You are a friendly, encouraging high-school physics teacher. 
    Your goal is to help the student understand kinematics and motion.
    Never shame the student for errors. Use simple language first, then introduce math.
    You can be witty, crack physics jokes, or use analogies. Use line breaks to make text readable.
    
    ${langInstruction}
    
    If the user asks to simulate a specific scenario (e.g., "A car moving at 20m/s stops in 5 seconds"), you can output a hidden simulation configuration block at the end of your response like this:
    <<<SIMULATION>>>
    {
      "bodyA": { "x0": 0, "v0": 20, "a": -4, "name": "Car" },
      "bodyB": { "x0": 100, "v0": 0, "a": 0, "name": "Stop Sign" }
    }
    <<<SIMULATION>>>
    
    Student Profile:
    - Struggling with: ${userProgress.weaknesses.join(', ') || 'None detected yet'}
    - Mastered: ${userProgress.topicsMastered.join(', ') || 'None yet'}
    `;

    if (currentSimState) {
      context += `
      Current Simulation State context:
      Object A: ${currentSimState.bodyA.isCustomGraph ? 'Using custom v(t) graph (piecewise motion)' : `x0=${currentSimState.bodyA.x0}m, v0=${currentSimState.bodyA.v0}m/s, a=${currentSimState.bodyA.a}m/s^2`}.
      Object B: ${currentSimState.bodyB.isCustomGraph ? 'Using custom v(t) graph (piecewise motion)' : `x0=${currentSimState.bodyB.x0}m, v0=${currentSimState.bodyB.v0}m/s, a=${currentSimState.bodyB.a}m/s^2`}.
      
      If the user is using a custom graph, explain that their drawn points determine the velocity over time.
      `;
    }

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: context,
      },
      history: history,
    });

    // Prepare the new message parts
    const parts: any[] = [{ text: message }];
    
    if (images && images.length > 0) {
      images.forEach(img => {
        const base64Data = img.split(',')[1];
        const mimeType = img.split(';')[0].split(':')[1];
        parts.unshift({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      });
    }

    const result = await chat.sendMessage({
      message: parts,
    });

    return { text: result.text || "I'm having trouble thinking right now. Let's try again.", images: [] };

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return { text: "I apologize, but I can't connect to my brain right now. Please check your connection.", images: [] };
  }
};

export const generateQuizQuestions = async (topic: string, difficulty: 'easy' | 'medium' | 'hard', language: Language): Promise<any[]> => {
  try {
    const ai = getAiClient();
    const langInstruction = getLanguageInstruction(language);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: `Generate 3 high-school physics questions about ${topic}. Difficulty: ${difficulty}.
      Include 2 multiple choice and 1 open conceptual question. ${langInstruction}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['multiple-choice', 'open'] },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Only for multiple-choice"
              },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ['id', 'text', 'type', 'correctAnswer', 'explanation']
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];
  } catch (error) {
    console.error("Gemini Quiz Error:", error);
    return [];
  }
};

export const explainSimulationOutcome = async (bodyA: BodyParams, bodyB: BodyParams, meetingTime: number | null, language: Language): Promise<string> => {
  try {
    const ai = getAiClient();
    const langInstruction = getLanguageInstruction(language);
    
    let descA = bodyA.isCustomGraph ? "moving with variable velocity (custom graph)" : `Start=${bodyA.x0}m, Vel=${bodyA.v0}m/s, Acc=${bodyA.a}m/s^2`;
    let descB = bodyB.isCustomGraph ? "moving with variable velocity (custom graph)" : `Start=${bodyB.x0}m, Vel=${bodyB.v0}m/s, Acc=${bodyB.a}m/s^2`;

    const prompt = `
    Analyze this kinematic simulation:
    Object A: ${descA}.
    Object B: ${descB}.
    
    ${meetingTime !== null ? `They meet at t=${meetingTime.toFixed(2)}s.` : 'They never meet.'}
    
    Briefly explain WHY they meet or don't meet using physics concepts (relative velocity, acceleration gaps). Keep it short (under 50 words). 
    Constraint: Do NOT use dollar signs ($) for variables. Use plain text.
    ${langInstruction}
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: prompt,
    });
    
    return response.text || "Analyzing trajectory...";
  } catch (e) {
    return "Could not analyze trajectory.";
  }
};

export const extractSimulationParamsFromImage = async (base64Image: string): Promise<{ bodyA?: Partial<BodyParams>, bodyB?: Partial<BodyParams> } | null> => {
  try {
    const ai = getAiClient();
    const base64Data = base64Image.split(',')[1];
    const mimeType = base64Image.split(';')[0].split(':')[1];

    const prompt = `
      Analyze the image (which contains a physics problem or diagram).
      Extract kinematic parameters for up to two objects (A and B).
      Look for: Initial Position (x0 in meters), Initial Velocity (v0 in m/s), Acceleration (a in m/s^2).
      If a value is missing but implied (e.g., "starts from rest" -> v0=0), use that.
      If only one object exists, leave bodyB null.
      If units are different, convert to SI (m, m/s, m/s^2).
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_FAST,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bodyA: {
              type: Type.OBJECT,
              properties: {
                x0: { type: Type.NUMBER },
                v0: { type: Type.NUMBER },
                a: { type: Type.NUMBER },
              },
              required: ['x0', 'v0', 'a']
            },
            bodyB: {
              type: Type.OBJECT,
              properties: {
                x0: { type: Type.NUMBER },
                v0: { type: Type.NUMBER },
                a: { type: Type.NUMBER },
              },
              required: ['x0', 'v0', 'a']
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Image Analysis Error:", error);
    return null;
  }
};
