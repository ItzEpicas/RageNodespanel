import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DEFAULT_FAQS, fetchActiveFaqs, type CmsFaq } from "@/lib/cms";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ - RageNodes" },
      {
        name: "description",
        content: "Frequently asked questions about RageNodes game server hosting.",
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const [faqs, setFaqs] = useState<CmsFaq[]>(DEFAULT_FAQS);

  useEffect(() => {
    fetchActiveFaqs().then(setFaqs);
  }, []);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
      <h1 className="text-center text-5xl font-bold md:text-6xl">FAQ</h1>
      <p className="mt-4 text-center text-muted-foreground">
        Quick answers. Need more? Ask us on Discord.
      </p>
      <Accordion type="single" collapsible className="glass mt-12 rounded-2xl px-6">
        {faqs.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id} className="border-border/50">
            <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
