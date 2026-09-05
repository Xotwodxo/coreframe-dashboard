/**
 * Live Stripe payment links, one per tier, from
 * Business/04-Operations/payment-collection.md as at 30 Aug 2026.
 *
 * Kept in code rather than a table because a change here should be a
 * reviewed commit: a wrong link takes money to the wrong place.
 */
export interface PaymentLink {
  label: string;
  price: string;
  url: string;
  /** Form service options this link is offered alongside. */
  forServices: string[];
}

export const PAYMENT_LINKS: PaymentLink[] = [
  { label: "Essential Care", price: "£35 a month", url: "https://buy.stripe.com/bJe6oG2ZA7gAd7FeGq2ZO03", forServices: [] },
  { label: "Managed Care", price: "£65 a month", url: "https://buy.stripe.com/dRm4gydEe7gAebJ55Q2ZO02", forServices: [] },
  { label: "Growth Care", price: "£110 a month", url: "https://buy.stripe.com/fZuaEW0RsasM6Jh7dY2ZO01", forServices: [] },
  { label: "Local Visibility Plan", price: "£195 a month", url: "https://buy.stripe.com/4gMcN40RsdEY2t1fKu2ZO00", forServices: ["Local SEO"] },
];

/** Stripe pre-fills the email field from this parameter. */
export function paymentLinkFor(link: PaymentLink, email: string | null): string {
  if (!email) return link.url;
  return `${link.url}?prefilled_email=${encodeURIComponent(email)}`;
}
