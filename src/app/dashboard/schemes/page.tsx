'use client';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/hooks/use-language"
import { useState, useEffect } from "react"

import schemesEn from '@/locales/schemes/en.json'
import schemesHi from '@/locales/schemes/hi.json'
import schemesMr from '@/locales/schemes/mr.json'
import schemesGu from '@/locales/schemes/gu.json'

const allSchemes = {
    en: schemesEn,
    hi: schemesHi,
    mr: schemesMr,
    gu: schemesGu,
}

export default function GovernmentSchemesPage() {
    const { t, language } = useLanguage();
    const [schemes, setSchemes] = useState(allSchemes.en.schemes);

    useEffect(() => {
        setSchemes(allSchemes[language].schemes);
    }, [language]);


    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {t('govtSchemes.title')}
                </h1>
                <p className="text-muted-foreground">{t('govtSchemes.description')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {schemes.map(scheme => (
                    <Card key={scheme.id}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                                <span className="pr-4">{scheme.title}</span>
                                <Button asChild variant="outline" size="sm" className="shrink-0">
                                    <Link href={scheme.link} target="_blank">
                                        {t('govtSchemes.applyNow')} <ExternalLink className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardTitle>
                            <CardDescription>{scheme.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>{t('govtSchemes.eligibility')}</AccordionTrigger>
                                    <AccordionContent>
                                        {scheme.eligibility}
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger>{t('govtSchemes.benefits')}</AccordionTrigger>
                                    <AccordionContent>
                                        {scheme.benefits}
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-3">
                                    <AccordionTrigger>{t('govtSchemes.incomeCriteria')}</AccordionTrigger>
                                    <AccordionContent>
                                        {scheme.incomeCriteria}
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-4">
                                    <AccordionTrigger>{t('govtSchemes.documentsRequired')}</AccordionTrigger>
                                    <AccordionContent>
                                        {scheme.documentsRequired}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
