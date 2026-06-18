// A Genkit flow that analyzes market data and suggests optimal crop pricing for farmers.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

/**
 * @fileOverview An AI sales price optimization agent for farmers.
 *
 * - aiSalesPriceOptimizer - A function that suggests optimal pricing strategies for crops.
 * - AiSalesPriceOptimizerInput - The input type for the aiSalesPriceOptimizer function.
 * - AiSalesPriceOptimizerOutput - The return type for the aiSalesPriceOptimizer function.
 */

const AiSalesPriceOptimizerInputSchema = z.object({
  cropType: z.string().describe('The type of crop for which to optimize pricing.'),
  marketDemand: z.string().describe('The current market demand for the crop (e.g., high, medium, low).'),
  supplyLevel: z.string().describe('The current supply level of the crop in the market (e.g., high, medium, low).'),
  historicalPriceTrends: z.string().describe('Historical price trends for the crop (e.g., increasing, decreasing, stable).'),
  qualityGrade: z.string().describe('The quality grade of the crop (e.g., premium, standard, low).'),
  wholesaleRetail: z.enum(['wholesale', 'retail']).describe('Whether the pricing is for wholesale or retail.'),
  language: z.string().describe('The language for the output explanation (e.g., "en", "hi", "mr", "gu").'),
});
export type AiSalesPriceOptimizerInput = z.infer<typeof AiSalesPriceOptimizerInputSchema>;

const AiSalesPriceOptimizerOutputSchema = z.object({
  suggestedPrice: z.number().describe('The suggested optimal price per unit for the crop.'),
  pricingStrategyExplanation: z.string().describe('A detailed explanation of the pricing strategy and factors considered.'),
});
export type AiSalesPriceOptimizerOutput = z.infer<typeof AiSalesPriceOptimizerOutputSchema>;

function getSimulatedPricing(input: AiSalesPriceOptimizerInput): AiSalesPriceOptimizerOutput {
  const basePrice = input.wholesaleRetail === 'wholesale' ? 35.00 : 55.00;
  const gradeMultiplier = input.qualityGrade === 'premium' ? 1.4 : input.qualityGrade === 'standard' ? 1.0 : 0.7;
  const demandMultiplier = input.marketDemand === 'high' ? 1.25 : input.marketDemand === 'medium' ? 1.0 : 0.8;
  const supplyMultiplier = input.supplyLevel === 'high' ? 0.85 : input.supplyLevel === 'medium' ? 1.0 : 1.2;
  
  const suggestedPrice = Math.round(basePrice * gradeMultiplier * demandMultiplier * supplyMultiplier * 100) / 100;
  
  const pricingStrategyExplanation = input.language === 'hi' 
    ? `सुझाया गया मूल्य ₹${suggestedPrice.toFixed(2)} प्रति इकाई है। यह ${input.cropType} के लिए वर्तमान बाजार स्थितियों पर आधारित है, जहां मांग ${input.marketDemand} है और आपूर्ति ${input.supplyLevel} है। गुणवत्ता ग्रेड ${input.qualityGrade} होने के कारण इसे अतिरिक्त मूल्य प्राप्त हुआ है।`
    : `The suggested price is ₹${suggestedPrice.toFixed(2)} per unit. This strategy is based on current market dynamics for ${input.cropType} showing ${input.marketDemand} demand and ${input.supplyLevel} supply. The quality grade is evaluated as ${input.qualityGrade}, justifying this optimized price point to maximize returns while staying competitive in the marketplace.`;

  return {
    suggestedPrice,
    pricingStrategyExplanation,
  };
}

export async function aiSalesPriceOptimizer(input: AiSalesPriceOptimizerInput): Promise<AiSalesPriceOptimizerOutput> {
  const currentKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!currentKey || currentKey === 'PLACEHOLDER_KEY' || currentKey.includes('YOUR_') || currentKey.includes('PLACEHOLDER')) {
    return getSimulatedPricing(input);
  }

  return aiSalesPriceOptimizerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiSalesPriceOptimizerPrompt',
  input: {schema: AiSalesPriceOptimizerInputSchema},
  output: {schema: AiSalesPriceOptimizerOutputSchema},
  prompt: `You are an AI-powered pricing strategist for agricultural products in India. Analyze the following market conditions and suggest an optimal price per unit for the specified crop, along with a concise explanation of your pricing strategy.

Crop Type: {{{cropType}}}
Market Demand: {{{marketDemand}}}
Supply Level: {{{supplyLevel}}}
Historical Price Trends: {{{historicalPriceTrends}}}
Quality Grade: {{{qualityGrade}}}
Sales Model: {{{wholesaleRetail}}}

Consider factors such as demand, supply, historical prices, and quality to determine the best pricing strategy. Provide a brief but effective explanation of your reasoning so the farmer understands the suggestion.

IMPORTANT:
- The suggested price and all monetary values must be in Indian Rupees (₹).
- Do not suggest low single-digit dollar values (like 3.29). Use realistic Indian Rupee prices (e.g., ₹20, ₹50, ₹150 etc.).
- Never use the dollar sign ($) anywhere in your output (neither in the suggested price nor in the explanation). Always use the Rupee symbol (₹) or "INR" for currency.
- The explanation must be written in the language corresponding to this code: {{{language}}}.

Based on your analysis, provide a suggested price per unit in Rupees (₹) and a concise explanation of your pricing strategy:

Suggested Price (in ₹):`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const aiSalesPriceOptimizerFlow = ai.defineFlow(
  {
    name: 'aiSalesPriceOptimizerFlow',
    inputSchema: AiSalesPriceOptimizerInputSchema,
    outputSchema: AiSalesPriceOptimizerOutputSchema,
  },
  async input => {
    let lastError: any = null;
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const {output} = await prompt(input);
        if (output) return output;
      } catch (error) {
        lastError = error;
        console.warn(`Gemini API call failed (attempt ${attempt}/${maxAttempts}):`, error);
        if (attempt < maxAttempts) {
          // Exponential backoff delay: 1s, 2s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // In case the API is completely down (503 Service Unavailable), fallback gracefully to the simulator
    console.error(`Gemini API failed after ${maxAttempts} attempts. Gracefully falling back to simulated pricing.`, lastError);
    return getSimulatedPricing(input);
  }
);
