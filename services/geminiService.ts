
import { GoogleGenAI, Type } from "@google/genai";

// Create a new instance for each service call to ensure the latest API key is used
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeMaintenanceImage = async (base64Image: string, description: string) => {
  const ai = getAI();
  const prompt = `Analise esta imagem de manutenção técnica no Amazonas. 
  Descrição fornecida: "${description}". 
  Resuma o que foi feito tecnicamente, identifique possíveis falhas visíveis e sugira uma conclusão para o relatório do supervisor.`;

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image.split(',')[1] || base64Image,
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [imagePart, { text: prompt }] },
  });

  return response.text;
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

export const chatWithAssistant = async (message: string, context: string) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `Você é o assistente virtual do "Amazonas Maintenance Pro". 
      Você ajuda técnicos de campo a organizar manutenções nas calhas dos rios Solimões, Japurá e Juruá. 
      Seja profissional, direto e conheça a geografia básica do Amazonas. Contexto atual: ${context}`
    }
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};
