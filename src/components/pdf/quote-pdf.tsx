import {
  Defs,
  Document,
  LinearGradient,
  Page,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import { formatPence } from "@/lib/format";
import { deposit, formatLongDate, lineTotal, totals, validUntil } from "@/lib/quotes";
import type { Quote, QuoteSettings } from "@/lib/types";

/**
 * The quote as a PDF, laid out to Business/01-Business-Identity/document-brand-style.md:
 * the cyan small-caps wordmark, the navy title, the navy-to-cyan rule, the
 * standard sections, the standard footer. Helvetica stands in for Arial,
 * which is the style note's own fallback. Every colour is from the brand table.
 */

const NAVY = "#1A2332";
const CYAN = "#00C4CC";
const CYAN_ACTION = "#007A80";
const TEXT = "#333333";
const TEXT_SOFT = "#555555";
const MUTED = "#888888";
const LINE = "#E3E7EB";
const SOFT_BG = "#F7F9FA";

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 10.5, color: TEXT, lineHeight: 1.5 },
  wordmark: { fontSize: 9, letterSpacing: 2, color: CYAN, fontFamily: "Helvetica-Bold", marginBottom: 10 },
  title: { fontSize: 22, color: NAVY, fontFamily: "Helvetica-Bold", lineHeight: 1.2 },
  subtitle: { fontSize: 10.5, color: TEXT_SOFT, marginTop: 4 },
  meta: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, fontSize: 9.5, color: TEXT_SOFT },
  section: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: LINE },
  h2: { fontSize: 9, letterSpacing: 1.2, color: TEXT_SOFT, fontFamily: "Helvetica-Bold", marginBottom: 8, textTransform: "uppercase" },
  para: { marginBottom: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 7 },
  head: { flexDirection: "row", backgroundColor: SOFT_BG, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: LINE },
  headText: { fontSize: 8, letterSpacing: 0.6, color: TEXT_SOFT, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  cellItem: { flex: 1, paddingHorizontal: 6 },
  cellQty: { width: 40, paddingHorizontal: 6, textAlign: "right" },
  cellAmt: { width: 90, paddingHorizontal: 6, textAlign: "right" },
  totalRow: { flexDirection: "row", paddingVertical: 8 },
  totalLabel: { flex: 1, paddingHorizontal: 6, textAlign: "right", fontFamily: "Helvetica-Bold", color: NAVY },
  totalAmt: { width: 90, paddingHorizontal: 6, textAlign: "right", fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 12 },
  callout: { borderWidth: 1, borderColor: CYAN, backgroundColor: SOFT_BG, borderRadius: 4, padding: 12, marginTop: 4 },
  strong: { fontFamily: "Helvetica-Bold", color: NAVY },
  footer: { position: "absolute", left: 44, right: 44, bottom: 24, fontSize: 8.5, color: MUTED },
  footerRule: { height: 2, backgroundColor: NAVY, opacity: 0.15, borderRadius: 1, marginBottom: 8 },
  link: { color: CYAN_ACTION },
});

function Rule() {
  return (
    <Svg width="100%" height="3" style={{ marginTop: 16 }}>
      <Defs>
        <LinearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={NAVY} />
          <Stop offset="1" stopColor={CYAN} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="3" rx="1.5" fill="url(#rule)" />
    </Svg>
  );
}

function Lines({ text }: { text: string }) {
  return (
    <>
      {text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => (
          <Text key={index} style={styles.para}>
            {line.startsWith("-") ? line : `•  ${line}`}
          </Text>
        ))}
    </>
  );
}

export function QuotePdf({ quote, settings, paymentText }: { quote: Quote; settings: QuoteSettings; paymentText: string }) {
  const { oneOff, monthly } = totals(quote.lines);
  const { depositPence, balancePence } = deposit(quote);
  const oneOffLines = quote.lines.filter((line) => line.kind === "one_off");
  const monthlyLines = quote.lines.filter((line) => line.kind === "monthly");
  const issued = new Date(quote.sent_at ?? quote.created_at);

  return (
    <Document title={`${quote.number} ${quote.title}`} author="Coreframe Digital">
      <Page size="A4" style={styles.page}>
        <Text style={styles.wordmark}>COREFRAME DIGITAL</Text>
        <Text style={styles.title}>{quote.title}</Text>
        <Text style={styles.subtitle}>
          Quote {quote.number} for {quote.to_business ? `${quote.to_business}` : quote.to_name}
        </Text>
        <Rule />
        <View style={styles.meta}>
          <Text>Issued {formatLongDate(issued)}</Text>
          <Text>Valid until {formatLongDate(validUntil(quote))}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Prepared for</Text>
          <Text style={styles.strong}>{quote.to_name}</Text>
          {quote.to_business ? <Text>{quote.to_business}</Text> : null}
          {quote.to_email ? <Text style={{ color: TEXT_SOFT }}>{quote.to_email}</Text> : null}
        </View>

        {quote.intro ? (
          <View style={styles.section}>
            <Text style={styles.h2}>Overview</Text>
            {quote.intro.split("\n").filter(Boolean).map((p, i) => (
              <Text key={i} style={styles.para}>
                {p}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.h2}>Pricing</Text>
          <View style={styles.head}>
            <Text style={[styles.cellItem, styles.headText]}>Item</Text>
            <Text style={[styles.cellQty, styles.headText]}>Qty</Text>
            <Text style={[styles.cellAmt, styles.headText]}>Amount</Text>
          </View>
          {oneOffLines.map((line, i) => (
            <View key={`o${i}`} style={styles.row} wrap={false}>
              <Text style={styles.cellItem}>{line.description}</Text>
              <Text style={styles.cellQty}>{line.quantity}</Text>
              <Text style={styles.cellAmt}>{formatPence(lineTotal(line))}</Text>
            </View>
          ))}
          {oneOff > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>One-off total</Text>
              <Text style={styles.totalAmt}>{formatPence(oneOff)}</Text>
            </View>
          ) : null}
          {monthlyLines.map((line, i) => (
            <View key={`m${i}`} style={styles.row} wrap={false}>
              <Text style={styles.cellItem}>{line.description}</Text>
              <Text style={styles.cellQty}>{line.quantity}</Text>
              <Text style={styles.cellAmt}>{formatPence(lineTotal(line))} / month</Text>
            </View>
          ))}
          {monthly > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Monthly total</Text>
              <Text style={styles.totalAmt}>{formatPence(monthly)} / month</Text>
            </View>
          ) : null}
          <Text style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>Prices exclude VAT.</Text>
        </View>

        {quote.not_included ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.h2}>Not included</Text>
            <Lines text={quote.not_included} />
          </View>
        ) : null}

        {quote.timeline ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.h2}>Timeline</Text>
            <Lines text={quote.timeline} />
          </View>
        ) : null}

        <View style={styles.section} wrap={false}>
          <Text style={styles.h2}>Payment</Text>
          {oneOff > 0 ? (
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ width: 110, color: TEXT_SOFT }}>Deposit</Text>
              <Text style={styles.strong}>{formatPence(depositPence)}</Text>
            </View>
          ) : null}
          {oneOff > 0 ? (
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ width: 110, color: TEXT_SOFT }}>Balance</Text>
              <Text style={styles.strong}>{formatPence(balancePence)}</Text>
            </View>
          ) : null}
          <Text>{paymentText}</Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.h2}>Next step</Text>
          <View style={styles.callout}>
            <Text>{settings.nextStep}</Text>
            <Text style={{ marginTop: 6, color: TEXT_SOFT }}>
              This quote is valid until {formatLongDate(validUntil(quote))}.
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerRule} />
          <Text>
            <Text style={{ color: TEXT_SOFT, fontFamily: "Helvetica-Bold" }}>Coreframe Digital</Text>
            {"   |   coreframedigital.co.uk   |   enquiries@coreframedigital.co.uk   |   Cardiff, Wales, UK"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
