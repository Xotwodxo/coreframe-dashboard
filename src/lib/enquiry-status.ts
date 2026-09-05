import type { EnquiryStatus } from "@/lib/types";

/**
 * The enquiry lifecycle, as one forward-only map.
 *
 *   new -> replied -> quoted -> won
 *                            -> lost
 *
 * Lost is reachable from any open stage because a lead can die at any point.
 * Won is only reachable from quoted, because nothing is won without a quote.
 * The server action checks a requested change against this map, so the
 * client cannot skip a stage or walk one backwards.
 */
export const NEXT_STATUSES: Record<EnquiryStatus, readonly EnquiryStatus[]> = {
  new: ["replied", "lost"],
  replied: ["quoted", "lost"],
  quoted: ["won", "lost"],
  won: [],
  lost: [],
};

export const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  replied: "Replied",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

export const ALL_STATUSES = Object.keys(STATUS_LABELS) as EnquiryStatus[];

export function isEnquiryStatus(value: unknown): value is EnquiryStatus {
  return typeof value === "string" && value in STATUS_LABELS;
}

export function canMove(from: EnquiryStatus, to: EnquiryStatus): boolean {
  return NEXT_STATUSES[from].includes(to);
}

/** How long an enquiry may sit at `new` before Today flags it. */
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isOverdue(receivedAt: string, now = Date.now()): boolean {
  return now - new Date(receivedAt).getTime() > REPLY_WINDOW_MS;
}
