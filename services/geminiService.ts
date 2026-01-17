
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, JobFile } from "../types";

// Always use process.env.API_KEY directly for initialization.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function simulateAgentExecution(
  task: string,
  repo: string | undefined,
  persona: string | undefined,
  useSearch: boolean | undefined,
  onLogUpdate: (log: LogEntry) => void,
  onCompletion: (files: JobFile[]) => void
) {
  const model = "gemini-3-flash-preview";
  
  onLogUpdate({
    timestamp: new Date().toLocaleTimeString('ar-EG'),
    message: `[SYSTEM] تعذر الاتصال بـ API الخلفي. الانتقال إلى نمط المحاكاة المحلية المستقلة...`,
    type: 'process'
  });

  const systemInstruction = `
    أنت Celia AI، وكيل برمجة ذكي ومستقل.
    شخصيتك المحددة: ${persona || "مهندس برمجيات محترف"}.
    المهمة المطلوبة: ${task}.
    المستودع الهدف: ${repo || "لا يوجد"}.
    استخدام البحث الخارجي: ${useSearch ? "مفعل (Google Search)" : "معطل"}.
    
    أنت الآن تعمل في "نمط المحاكاة" (Simulation Mode) مباشرة في متصفح المستخدم.
    قم بمحاكاة الخطوات التقنية كأنك وكيل حقيقي:
    1. تحليل معمق للخوارزميات أو الأكواد المطلوبة.
    2. استنتاج خطوات الحل وتوليد تقارير.
    3. إذا كانت المهمة تتعلق بمواقع جغرافية، قم بتمثيل البحث في الخرائط.

    الرد يجب أن يكون JSON حصراً كالتالي:
    {
      "steps": [{"thought": "تفكيري", "action": "الخطوة المنفذة", "type": "info|process|success|error|tool|search|map"}],
      "files": [{"name": "file.md", "path": "output/file.md", "size": "1.2KB"}]
    }
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      steps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            thought: { type: Type.STRING },
            action: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['info', 'process', 'success', 'error', 'tool', 'search', 'map'] },
          },
          required: ['thought', 'action', 'type']
        }
      },
      files: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            path: { type: Type.STRING },
            size: { type: Type.STRING }
          },
          required: ['name', 'path']
        }
      }
    },
    required: ['steps', 'files']
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `ابدأ محاكاة المهمة: ${task}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 12000 }
      },
    });

    const result = JSON.parse(response.text || '{"steps":[], "files":[]}');

    onLogUpdate({
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      message: `[BRAIN] جارِ تفعيل الروابط العصبية لمحاكاة المهمة ذهنياً...`,
      type: 'brain'
    });

    for (const step of result.steps) {
      const delay = step.type === 'search' || step.type === 'map' ? 3500 : (1000 + Math.random() * 1500);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      onLogUpdate({
        timestamp: new Date().toLocaleTimeString('ar-EG'),
        message: `${step.thought} -> ${step.action}`,
        type: step.type as any
      });
    }

    onCompletion(result.files);

  } catch (error: any) {
    onLogUpdate({
      timestamp: new Date().toLocaleTimeString('ar-EG'),
      message: `فشل المحاكاة المحلية: ${error.message}`,
      type: 'error'
    });
  }
}
