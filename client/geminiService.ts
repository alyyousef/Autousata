
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const geminiService = {
  /**
   * Enhances a basic vehicle description into a high-converting auction listing.
   */
  async enhanceDescription(specs: { make: string; model: string; year: number; condition: string; notes: string }) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a professional, persuasive, and detailed car auction listing description for a ${specs.year} ${specs.make} ${specs.model} in ${specs.condition} condition. Key notes: ${specs.notes}. Include sections for Exterior, Interior, Mechanical, and Why to Buy.`,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini enhancement failed:", error);
      return "Unable to enhance description at this time.";
    }
  },

  /**
   * Estimates financing terms based on vehicle price and user profile.
   */
  async getFinancingAdvice(price: number, creditScore: 'Excellent' | 'Good' | 'Fair') {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `As a financial advisor for car buyers, suggest optimal financing terms for a $${price} vehicle for a buyer with ${creditScore} credit. Provide estimated APR, term length, and a monthly payment range. Format as concise JSON-like text.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              apr: { type: Type.NUMBER },
              termMonths: { type: Type.NUMBER },
              monthlyPayment: { type: Type.NUMBER },
              advice: { type: Type.STRING }
            }
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Gemini financing advice failed:", error);
      return null;
    }
  }
};
