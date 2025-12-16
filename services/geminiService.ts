import { GoogleGenAI } from '@google/genai';
import { Transaction, Product } from '../types';

export const analyzeSalesWithGemini = async (transactions: Transaction[], products: Product[]) => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found for Gemini");
    return "API Key missing. Please configure the environment.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare data summary to reduce token usage
  const totalSales = transactions.reduce((acc, t) => acc + t.total, 0);
  const lowStockProducts = products.filter(p => p.quantity <= p.minStock).map(p => p.name);
  const transactionCount = transactions.length;
  
  const prompt = `
    Analyze this retail shop data for today:
    - Total Sales Revenue: ${totalSales}
    - Total Transactions: ${transactionCount}
    - Low Stock Warnings: ${lowStockProducts.join(', ') || 'None'}
    
    Provide a concise, 3-bullet point executive summary for the shop owner. 
    Focus on performance, actionable inventory advice, and a motivational closing.
    Do not use markdown formatting like bold or italics, just plain text with bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Could not generate AI insights at this time.";
  }
};
