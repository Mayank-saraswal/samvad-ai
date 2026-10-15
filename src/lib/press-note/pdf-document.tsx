/**
 * pdf-document module — industry-grade PIB press-note PDF.
 *
 * Server-only React-PDF document (never rendered to the DOM; only passed to
 * `renderToBuffer` in the pdf API route). Mirrors the reference PIB layout:
 * A4 pages, Times serif, justified body, small-caps running header with
 * rules, centered page folios, numbered section headings, captioned
 * figure/table annexures, and a seal page.
 *
 * Figures arrive pre-resolved as data URLs (`figureData` maps figure id to a
 * `data:` URL); a missing entry renders the caption with an explicit
 * unavailability line instead of breaking the document.
 */
import { Document, Font, Image, Page, Text, View } from "@react-pdf/renderer";
import path from "node:path";
import type { PibPressNote } from "./pib";

const FONT_FAMILY = "NotoSerifDevanagari";

// OFL-licensed Noto Serif Devanagari (covers Latin + Devanagari) bundled in
// public/fonts so Hindi renders in the PDF with zero network fetches.
try {
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: path.join(process.cwd(), "public", "fonts", "NotoSerifDevanagari-Regular.ttf"), fontWeight: 400 },
      { src: path.join(process.cwd(), "public", "fonts", "NotoSerifDevanagari-Bold.ttf"), fontWeight: 700 },
      // No italic cut exists; map italics onto the upright faces so key
      // findings never fail font resolution.
      {
        src: path.join(process.cwd(), "public", "fonts", "NotoSerifDevanagari-Regular.ttf"),
        fontWeight: 400,
        fontStyle: "italic",
      },
      {
        src: path.join(process.cwd(), "public", "fonts", "NotoSerifDevanagari-Bold.ttf"),
        fontWeight: 700,
        fontStyle: "italic",
      },
    ],
  });
} catch {
  // Test/bundled environments without the font files fall back to Times.
}

interface PibPdfDocumentProps {
  readonly note: PibPressNote;
  readonly figureData: Readonly<Record<string, string>>;
  readonly governmentLine?: string;
  readonly pressNoteTitle?: string;
  readonly pageWord?: string;
}

const SERIF = FONT_FAMILY;
const BOLD_WEIGHT = 700 as const;
const ITALIC_STYLE = "italic" as const;

const page = {
  size: "A4" as const,
  style: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingLeft: 64,
    paddingRight: 64,
    fontFamily: SERIF,
    fontSize: 11,
    lineHeight: 1.6,
    color: "#111111",
    backgroundColor: "#ffffff",
  },
};

const headerRule = { borderBottomWidth: 1, borderBottomColor: "#111111", borderBottomStyle: "solid" as const };
const headerText = {
  fontSize: 8.5,
  letterSpacing: 0.8,
  textTransform: "uppercase" as const,
  fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT,
};

function RunningHeader({
  note,
  governmentLine,
  releaseDateEn,
}: {
  note: PibPressNote;
  governmentLine: string;
  releaseDateEn: string;
}): React.JSX.Element {
  return (
    <View>
      <View style={{ ...headerRule, paddingBottom: 6 }}>
        {/* placeholder keeps left block clear of the centered folio */}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 8 }}>
        <View>
          <Text style={headerText}>{governmentLine}</Text>
          <Text style={{ ...headerText, fontFamily: SERIF }}>{note.ministryEn.toUpperCase()}</Text>
        </View>
        <Text style={{ fontSize: 8.5, letterSpacing: 0.8, fontFamily: SERIF }}>{releaseDateEn.toUpperCase()}</Text>
      </View>
      <View style={{ ...headerRule, paddingTop: 8 }} />
    </View>
  );
}

function Folio({ pageWord, pageNumber }: { pageWord: string; pageNumber: number }): React.JSX.Element {
  return (
    <View style={{ alignItems: "center", marginTop: 24, borderTopWidth: 1, borderTopColor: "#111111", paddingTop: 8 }}>
      <Text style={{ fontSize: 10, fontFamily: SERIF }}>
        {pageWord} {pageNumber}
      </Text>
    </View>
  );
}

function BodyPara({ children }: { children: string }): React.JSX.Element {
  return <Text style={{ textAlign: "justify", marginBottom: 8 }}>{children}</Text>;
}

export function PibPdfDocument({
  note,
  figureData,
  governmentLine = "Government of India",
  pressNoteTitle = "PRESS NOTE",
  pageWord = "Page",
}: PibPdfDocumentProps): React.JSX.Element {
  let folio = note.pageNumber;

  const sectionPages = note.sections.map((section, i) => {
    const pageNumber = note.pageNumber + 1 + i;
    return (
      <Page key={`section-${i}`} {...page} wrap={false}>
        <RunningHeader note={note} governmentLine={governmentLine} releaseDateEn={note.releaseDateEn} />
        <Text style={{ fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT, fontSize: 14, marginTop: 18, marginBottom: 10 }}>
          {i + 1}. {section.heading}
        </Text>
        {section.paragraphs.map((para, j) => (
          <BodyPara key={j}>{para}</BodyPara>
        ))}
        <Folio pageWord={pageWord} pageNumber={pageNumber} />
      </Page>
    );
  });
  folio = note.pageNumber + 1 + note.sections.length;

  const figurePages = note.figures.map((fig, i) => {
    const pageNumber = folio + i;
    const dataUrl = figureData[fig.id];
    return (
      <Page key={`figure-${fig.id}`} {...page} wrap={false}>
        <RunningHeader note={note} governmentLine={governmentLine} releaseDateEn={note.releaseDateEn} />
        <Text style={{ fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT, fontSize: 14, marginTop: 18, marginBottom: 10 }}>
          Figure {i + 1} — {fig.caption}
        </Text>
        {dataUrl ? (
          <Image src={dataUrl} style={{ maxWidth: "100%", objectFit: "contain" }} />
        ) : (
          <Text style={{ fontFamily: FONT_FAMILY, fontStyle: ITALIC_STYLE, fontSize: 10, color: "#555555" }}>
            [Figure unavailable in this export]
          </Text>
        )}
        <Folio pageWord={pageWord} pageNumber={pageNumber} />
      </Page>
    );
  });
  folio += note.figures.length;

  const tablePages = note.tables.map((table, i) => {
    const pageNumber = folio + i;
    return (
      <Page key={`table-${table.id}`} {...page} wrap={false}>
        <RunningHeader note={note} governmentLine={governmentLine} releaseDateEn={note.releaseDateEn} />
        <Text style={{ fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT, fontSize: 14, marginTop: 18, marginBottom: 10 }}>
          Table {i + 1} — {table.caption}
        </Text>
        <View style={{ borderWidth: 1, borderColor: "#111111" }}>
          <View style={{ flexDirection: "row", backgroundColor: "#f2f2f2" }}>
            {table.headers.map((h, ci) => (
              <Text
                key={ci}
                style={{
                  flex: 1,
                  fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT,
                  fontSize: 10,
                  padding: 7,
                  borderRightWidth: ci < table.headers.length - 1 ? 1 : 0,
                  borderRightColor: "#111111",
                }}
              >
                {h}
              </Text>
            ))}
          </View>
          {table.rows.map((row, ri) => (
            <View
              key={ri}
              style={{
                flexDirection: "row",
                borderTopWidth: 1,
                borderTopColor: "#111111",
              }}
            >
              {row.map((cell, ci) => (
                <Text
                  key={ci}
                  style={{
                    flex: 1,
                    fontSize: 10,
                    padding: 7,
                    borderRightWidth: ci < row.length - 1 ? 1 : 0,
                    borderRightColor: "#111111",
                  }}
                >
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
        <Folio pageWord={pageWord} pageNumber={pageNumber} />
      </Page>
    );
  });
  folio += note.tables.length;

  return (
    <Document
      title={note.titleEn}
      author={note.ministryEn}
      subject="Official press note"
      keywords="press note, government of india"
    >
      {/* Page 1 — cover */}
      <Page {...page} wrap={false}>
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 92,
              height: 92,
              borderWidth: 2,
              borderColor: "#111111",
              borderRadius: 46,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 8, textAlign: "center" }}>National Emblem of India</Text>
          </View>
          <Text style={{ fontSize: 11, fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT, letterSpacing: 1.5 }}>{governmentLine.toUpperCase()}</Text>
          <Text style={{ fontSize: 13, fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT, marginTop: 8 }}>{note.ministryEn}</Text>
          {note.departmentEn !== null && <Text style={{ fontSize: 11, marginTop: 2 }}>{note.departmentEn}</Text>}
          <Text style={{ fontSize: 20, fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT, textDecoration: "underline", marginTop: 22 }}>
            {pressNoteTitle}
          </Text>
          {note.titleHi !== null && <Text style={{ fontSize: 17, fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT, marginTop: 10 }}>{note.titleHi}</Text>}
          <Text style={{ fontSize: 16, fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT, marginTop: 10, textAlign: "center" }}>{note.titleEn}</Text>
          {note.referencePeriod !== null && <Text style={{ fontSize: 11, marginTop: 10 }}>{note.referencePeriod}</Text>}
          {note.placeDateLine !== null && <Text style={{ fontSize: 11, marginTop: 6 }}>{note.placeDateLine}</Text>}
          <Text style={{ fontSize: 11, marginTop: 6 }}>{note.releaseDateEn}</Text>
        </View>
      </Page>

      {/* Page 2 — headline + key findings + body */}
      <Page {...page} wrap={false}>
        <RunningHeader note={note} governmentLine={governmentLine} releaseDateEn={note.releaseDateEn} />
        <Text
          style={{
            fontSize: 14,
            fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT,
            textDecoration: "underline",
            textAlign: "center",
            marginTop: 16,
            marginBottom: 6,
          }}
        >
          {pressNoteTitle}
        </Text>
        {note.titleHi !== null && (
          <Text style={{ fontFamily: FONT_FAMILY, fontStyle: ITALIC_STYLE, fontSize: 12, textAlign: "center", marginBottom: 4 }}>
            {note.titleHi}
          </Text>
        )}
        <Text style={{ fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT, fontSize: 12.5, textAlign: "center", marginBottom: 10 }}>{note.titleEn}</Text>
        {note.keyFindings.map((finding, i) => (
          <Text key={i} style={{ fontFamily: FONT_FAMILY, fontStyle: ITALIC_STYLE, textAlign: "justify", marginBottom: 8 }}>
            {i + 1}. {finding}
          </Text>
        ))}
        {note.bodyParagraphs.map((para, i) => (
          <BodyPara key={i}>{para}</BodyPara>
        ))}
        <Folio pageWord={pageWord} pageNumber={note.pageNumber} />
      </Page>

      {sectionPages}
      {figurePages}
      {tablePages}

      {/* Closing page — evidence analysis + seal */}
      <Page {...page} wrap={false}>
        <RunningHeader note={note} governmentLine={governmentLine} releaseDateEn={note.releaseDateEn} />
        {note.evidenceNotes.length > 0 && (
          <View>
            <Text style={{ fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT, fontSize: 14, marginTop: 18, marginBottom: 10 }}>
              Evidence Analysis
            </Text>
            {note.evidenceNotes.map((para, i) => (
              <BodyPara key={i}>{para}</BodyPara>
            ))}
          </View>
        )}
        {note.endnote !== null && (
          <Text style={{ fontSize: 10, color: "#333333", marginTop: 12 }}>{note.endnote}</Text>
        )}
        <View style={{ borderWidth: 1, borderColor: "#111111", padding: 14, alignItems: "center", marginTop: 24 }}>
          <Text style={{ fontSize: 9, letterSpacing: 1, fontFamily: FONT_FAMILY, fontWeight: BOLD_WEIGHT }}>DIGITALLY VERIFIED RELEASE</Text>
          <Text style={{ fontSize: 10, marginTop: 6 }}>
            {note.ministryEn} — {note.releaseDateEn}
          </Text>
        </View>
        <Folio pageWord={pageWord} pageNumber={folio} />
      </Page>
    </Document>
  );
}
