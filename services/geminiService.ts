
import { GoogleGenAI, Type } from "@google/genai";

// Create a new instance for each service call to ensure the latest API key is used
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Função analyzeMaintenanceImage removida conforme solicitado para manter imagens 100% originais

export const improveTechnicalText = async (text: string) => {
  if (!text || text.trim().length < 3) return text;
  
  const ai = getAI();
  const prompt = `Você é um revisor técnico especializado em engenharia elétrica e manutenção de subestações. 
  Corrija a ortografia, gramática e pontuação do seguinte texto em português. 
  Mantenha o tom profissional e técnico. Se encontrar termos técnicos escritos de forma errada (ex: fuzivel, dijuntor, fase errada), corrija-os para a norma técnica.
  RETORNE APENAS O TEXTO CORRIGIDO, sem explicações adicionais.
  
  Texto: "${text}"`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  return response.text?.trim() || text;
};

export const generateImageWithAI = async (prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `Crie uma imagem técnica de alta qualidade para um relatório de manutenção elétrica: ${prompt}. Estilo: Foto realista, iluminação de campo, detalhado.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Nenhuma imagem gerada pela IA");
};

export const generateSupervisorSummary = async (records: any[]) => {
  const ai = getAI();
  const summaryPrompt = `Gere um resumo executivo profissional para um supervisor de manutenção. 
  Considere os seguintes registros: ${JSON.stringify(records)}. 
  Foque em estatísticas (pendentes vs concluídas), destaques técnicos e recomendações estratégicas para a região do Amazonas.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: summaryPrompt,
    config: {
      thinkingConfig: { thinkingBudget: 0 }
    }
  });

  return response.text;
};
