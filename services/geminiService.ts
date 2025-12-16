
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Transaction, Product } from '../types';

// Safe environment variable access for Vite/Browser
const getApiKey = () => {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        return (import.meta as any).env.VITE_GEMINI_API_KEY;
    }
    // Fallback if process is defined (unlikely in pure browser but good for consistency)
    if (typeof process !== 'undefined' && process.env) {
        return process.env.API_KEY;
    }
    return '';
};

export const analyzeSalesWithGemini = async (transactions: Transaction[], products: Product[]) => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn("No API Key found for Gemini. Set VITE_GEMINI_API_KEY in .env");
    return "AI Insights Unavailable: Missing API Key. Please configure VITE_GEMINI_API_KEY in your environment variables.";
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Using gemini-1.5-flash which is widely supported by this SDK version
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Could not generate AI insights at this time.";
  }
};
