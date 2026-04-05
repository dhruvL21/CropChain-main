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

export async function aiSalesPriceOptimizer(input: AiSalesPriceOptimizerInput): Promise<AiSalesPriceOptimizerOutput> {
  return aiSalesPriceOptimizerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiSalesPriceOptimizerPrompt',
  input: {schema: AiSalesPriceOptimizerInputSchema},
  output: {schema: AiSalesPriceOptimizerOutputSchema},
  prompt: `You are an AI-powered pricing strategist for agricultural products. Analyze the following market conditions and suggest an optimal price per unit for the specified crop, along with a concise explanation of your pricing strategy.

Crop Type: {{{cropType}}}
Market Demand: {{{marketDemand}}}
Supply Level: {{{supplyLevel}}}
Historical Price Trends: {{{historicalPriceTrends}}}
Quality Grade: {{{qualityGrade}}}
Sales Model: {{{wholesaleRetail}}}

Consider factors such as demand, supply, historical prices, and quality to determine the best pricing strategy. Provide a brief but effective explanation of your reasoning so the farmer understands the suggestion.

IMPORTANT: The explanation must be written in the language corresponding to this code: {{{language}}}.

Based on your analysis, provide a suggested price per unit and a concise explanation of your pricing strategy:

Suggested Price:`,
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
    const {output} = await prompt(input);
    return output!;
  }
);
