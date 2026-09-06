import "server-only";

import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import { QuotePdf } from "@/components/pdf/quote-pdf";
import { QUOTES_BUCKET, QUOTE_LINK_SECONDS, paymentText } from "@/lib/quotes";
import type { createClient } from "@/lib/supabase/server";
import type { Quote, QuoteSettings } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Renders the quote and stores it. Returns the path in the private bucket. */
export async function renderAndStoreQuote(supabase: Supabase, quote: Quote, settings: QuoteSettings): Promise<string> {
  // renderToBuffer wants a Document element; QuotePdf renders one at its root.
  const element = createElement(QuotePdf, {
    quote,
    settings,
    paymentText: paymentText(quote, settings.paymentNote),
  }) as unknown as ReactElement<DocumentProps>;
  const pdf = await renderToBuffer(element);
  const path = `${quote.id}/${quote.number}-${Date.now()}.pdf`;
  const { error } = await supabase.storage
    .from(QUOTES_BUCKET)
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });
  if (error) throw new Error(`Could not store the PDF: ${error.message}`);
  return path;
}

/** A link the lead can open without signing in. Lasts 30 days. */
export async function signedQuoteUrl(supabase: Supabase, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(QUOTES_BUCKET)
    .createSignedUrl(path, QUOTE_LINK_SECONDS, { download: false });
  if (error) {
    console.error("[quotes] Signed URL failed.", error.message);
    return null;
  }
  return data.signedUrl;
}
