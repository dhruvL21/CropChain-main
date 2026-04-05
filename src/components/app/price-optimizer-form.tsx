
"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  aiSalesPriceOptimizer,
  type AiSalesPriceOptimizerOutput,
} from "@/ai/flows/ai-sales-price-optimizer";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bot, IndianRupee, Lightbulb } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useLanguage } from "@/hooks/use-language";

const usePriceOptimizerFormSchema = () => {
    const { t } = useLanguage();
    return useMemo(() => z.object({
        cropType: z.string().min(2, { message: t('priceOptimizer.validation.cropType') }),
        marketDemand: z.enum(["high", "medium", "low"]),
        supplyLevel: z.enum(["high", "medium", "low"]),
        historicalPriceTrends: z.enum(["increasing", "decreasing", "stable"]),
        qualityGrade: z.enum(["premium", "standard", "low"]),
        wholesaleRetail: z.enum(["wholesale", "retail"]),
      }), [t]);
}


export function PriceOptimizerForm() {
  const [result, setResult] = useState<AiSalesPriceOptimizerOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const formSchema = usePriceOptimizerFormSchema();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cropType: "",
      marketDemand: "medium",
      supplyLevel: "medium",
      historicalPriceTrends: "stable",
      qualityGrade: "standard",
      wholesaleRetail: "retail",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    try {
      const optimizationResult = await aiSalesPriceOptimizer({
        ...values,
        language,
      });
      setResult(optimizationResult);
    } catch (error) {
      console.error("Error optimizing price:", error);
      toast({
        title: t('common.error'),
        description: t('priceOptimizer.error'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-stretch">
      <Card className="bg-secondary flex flex-col">
        <CardHeader>
          <CardTitle>{t('priceOptimizer.marketConditions')}</CardTitle>
          <CardDescription>
            {t('priceOptimizer.marketConditionsDescription')}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cropType"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t('priceOptimizer.cropType')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('priceOptimizer.cropTypePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marketDemand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('priceOptimizer.marketDemand')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">{t('priceOptimizer.high')}</SelectItem>
                        <SelectItem value="medium">{t('priceOptimizer.medium')}</SelectItem>
                        <SelectItem value="low">{t('priceOptimizer.low')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="supplyLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('priceOptimizer.supplyLevel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="high">{t('priceOptimizer.high')}</SelectItem>
                        <SelectItem value="medium">{t('priceOptimizer.medium')}</SelectItem>
                        <SelectItem value="low">{t('priceOptimizer.low')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="historicalPriceTrends"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('priceOptimizer.priceTrends')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="increasing">{t('priceOptimizer.increasing')}</SelectItem>
                        <SelectItem value="decreasing">{t('priceOptimizer.decreasing')}</SelectItem>
                        <SelectItem value="stable">{t('priceOptimizer.stable')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="qualityGrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('priceOptimizer.qualityGrade')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="premium">{t('priceOptimizer.premium')}</SelectItem>
                        <SelectItem value="standard">{t('priceOptimizer.standard')}</SelectItem>
                        <SelectItem value="low">{t('priceOptimizer.low')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="wholesaleRetail"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t('priceOptimizer.salesModel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="retail">{t('priceOptimizer.retail')}</SelectItem>
                        <SelectItem value="wholesale">{t('priceOptimizer.wholesale')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="mt-auto">
              <Button type="submit" disabled={isLoading} className="w-full" suppressHydrationWarning>
                {isLoading ? t('priceOptimizer.optimizing') : t('priceOptimizer.getSuggestion')}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card className="bg-secondary flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot /> {t('priceOptimizer.aiStrategy')}
          </CardTitle>
          <CardDescription>
            {t('priceOptimizer.aiStrategyDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 flex flex-col flex-1 justify-center">
            {isLoading && (
                 <div className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-12 w-1/3" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                 </div>
            )}
            {!isLoading && !result && (
                <div className="text-center text-muted-foreground">
                    <Lightbulb className="mx-auto h-12 w-12" />
                    <p className="mt-4">{t('priceOptimizer.resultsPlaceholder')}</p>
                </div>
            )}
            {result && (
                <div className="space-y-6">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('priceOptimizer.suggestedPrice')}</p>
                        <p className="text-4xl font-bold text-primary flex items-center gap-2">
                            <IndianRupee className="h-8 w-8" />
                            {result.suggestedPrice.toFixed(2)}
                            <span className="text-lg text-muted-foreground"> {t('priceOptimizer.perUnit')}</span>
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('priceOptimizer.explanation')}</p>
                        <p className="text-md whitespace-pre-wrap">{result.pricingStrategyExplanation}</p>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
