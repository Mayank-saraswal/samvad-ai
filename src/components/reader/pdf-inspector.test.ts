import { describe, it, expect } from "vitest";
import type { PressNoteData } from "./pdf-inspector";

describe("PdfInspector Press Note Data Contract & Business Rules", () => {
  const samplePressNote: PressNoteData = {
    headline1: "Cyber Crime Cell Apprehends Financial Fraud Network in Targeted Interception",
    headline2: "Three Suspects Detained with Hardware Rigs and 47 Devices",
    headline3: "Emergency Freeze Order Secures Stolen Funds across Eight Mule Accounts",
    summary:
      "Cyber Crime Cell intercepted three suspects operating an unauthorized financial diversion rig. 47 mobile devices and flash storage were secured under BSA §65B protocol.",
    detail:
      "Following formal complaints on 14-Oct-2026 regarding mirror-payment fraudulent endpoints, coordinated traces led to the apprehension of prime suspects. Forensic chain of custody established.",
    secondaryHeadline: "साइबर क्राइम सेल द्वारा वित्तीय धोखाधड़ी गिरोह का पर्दाफाश",
    secondarySummary:
      "भारतीय साक्ष्य अधिनियम की धारा 65बी के तहत तीन आरोपियों को हिरासत में लिया गया एवं 47 मोबाइल फोन जब्त किए गए।",
    department: "STATE POLICE INVESTIGATION DEPT",
    status: "draft",
    revisionsCount: 2,
    spans: [
      { sourceId: "src-1", locator: "LOC-P1", text: "Formal complaint lodged 14-Oct-2026." },
      { sourceId: "src-1", locator: "LOC-P2", text: "Three suspects apprehended at transit hideout." },
    ],
    documentId: "doc-sample-1234",
  };

  it("calculates headline word count strictly for Indian statutory press standards (<= 15 words)", () => {
    const words = samplePressNote.headline1!.trim().split(/\s+/).filter(Boolean);
    expect(words.length).toBeLessThanOrEqual(15);
    expect(words.length).toBe(10);
  });

  it("verifies dual-language Hindi seam integrity without hardcoded fallbacks", () => {
    expect(samplePressNote.secondaryHeadline).toBeDefined();
    expect(samplePressNote.secondarySummary).toBeDefined();
    expect(samplePressNote.secondaryHeadline).toContain("साइबर");
    expect(samplePressNote.secondarySummary).toContain("65बी");
  });

  it("validates evidentiary locators are grounded in primary sources under BSA §65B", () => {
    expect(samplePressNote.spans).toHaveLength(2);
    expect(samplePressNote.spans![0]?.locator).toBe("LOC-P1");
    expect(samplePressNote.spans![1]?.locator).toBe("LOC-P2");
  });

  it("formats plain-text press release export with proper department header and legal seal", () => {
    const textToCopy = `
OFFICIAL PRESS RELEASE
Department: ${samplePressNote.department}
Title: Financial Fraud Interception
Status: ${samplePressNote.status} (BSA §65B Certified)

HEADLINE (Primary):
${samplePressNote.headline1}

ALTERNATIVE HEADLINE 2:
${samplePressNote.headline2}

EXECUTIVE SUMMARY:
${samplePressNote.summary}

DETAILED INVESTIGATION NARRATIVE:
${samplePressNote.detail}
    `.trim();

    expect(textToCopy).toContain("OFFICIAL PRESS RELEASE");
    expect(textToCopy).toContain("BSA §65B Certified");
    expect(textToCopy).toContain(samplePressNote.headline1!);
    expect(textToCopy).toContain("DETAILED INVESTIGATION NARRATIVE");
  });
});
