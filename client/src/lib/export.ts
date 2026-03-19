/**
 * Export utilities for study and project guides.
 */

import type { ProjectGuide, StructuredStudyGuide, StudyGuide } from "@shared/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(name: string) {
  return name.replace(/[^a-z0-9\-_]/gi, "_").replace(/_+/g, "_").slice(0, 60);
}

function parseStructured(content: string): StructuredStudyGuide | null {
  try {
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    const candidate = JSON.parse(cleaned) as unknown;
    if (
      candidate &&
      typeof candidate === "object" &&
      "subjects" in candidate &&
      Array.isArray((candidate as StructuredStudyGuide).subjects)
    ) {
      return candidate as StructuredStudyGuide;
    }
  } catch {
    // not structured
  }
  return null;
}

function structuredToMarkdown(parsed: StructuredStudyGuide, courseName: string): string {
  const lines: string[] = [`# Study Guide — ${courseName}`, "", parsed.overview, ""];
  for (const subject of parsed.subjects) {
    lines.push(`## ${subject.title} [${subject.priority} Priority]`);
    lines.push("", subject.summary, "");
    lines.push("**Key Points:**");
    for (const pt of subject.keyPoints) {
      lines.push(`- ${pt}`);
    }
    if (subject.materialExcerpts.length > 0) {
      lines.push("", "**From your materials:**");
      for (const ex of subject.materialExcerpts) {
        lines.push(`> *${ex.sourceName}:* "${ex.excerpt}"`);
      }
    }
    if (subject.searchQueries.length > 0) {
      lines.push("", "**Search queries:**");
      for (const q of subject.searchQueries) {
        lines.push(`- ${q}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ─── exports ────────────────────────────────────────────────────────────────

export function exportMarkdown(guide: StudyGuide | ProjectGuide, courseName: string) {
  const parsed = parseStructured(guide.content);
  const text = parsed
    ? structuredToMarkdown(parsed, courseName)
    : `# ${courseName} — Guide\n\n${guide.content}`;
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, `${safeFilename(courseName)}-study-guide.md`);
}

export function exportPdf(guide: StudyGuide | ProjectGuide, courseName: string) {
  // Dynamic import to avoid loading jsPDF until needed
  import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPage = (needed = 10) => {
      if (y + needed > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const writeLine = (text: string, size: number, style: "normal" | "bold" = "normal", color = "#111111") => {
      doc.setFontSize(size);
      doc.setFont("helvetica", style);
      doc.setTextColor(color);
      const lines = doc.splitTextToSize(text, contentWidth) as string[];
      checkPage(lines.length * (size * 0.4));
      doc.text(lines, margin, y);
      y += lines.length * (size * 0.4) + 2;
    };

    const parsed = parseStructured(guide.content);
    if (parsed) {
      writeLine(`Study Guide — ${courseName}`, 18, "bold");
      y += 3;
      writeLine(parsed.overview, 10, "normal", "#444444");
      y += 4;

      parsed.subjects.forEach((subject, i) => {
        checkPage(20);
        y += 2;
        const priorityColor =
          subject.priority === "High" ? "#c0392b" : subject.priority === "Medium" ? "#d68910" : "#1e8449";
        writeLine(`${i + 1}. ${subject.title}`, 13, "bold");
        doc.setFontSize(8);
        doc.setTextColor(priorityColor);
        doc.text(`${subject.priority} Priority`, margin, y);
        y += 5;
        writeLine(subject.summary, 9, "normal", "#555555");
        y += 1;
        for (const pt of subject.keyPoints) {
          checkPage(6);
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor("#111111");
          const lines = doc.splitTextToSize(`• ${pt}`, contentWidth - 4) as string[];
          doc.text(lines, margin + 2, y);
          y += lines.length * 3.8 + 1;
        }
        y += 2;
      });
    } else {
      // Plain text fallback for project guides
      writeLine(`${courseName} — Guide`, 18, "bold");
      y += 3;
      const lines = doc.splitTextToSize(guide.content, contentWidth) as string[];
      for (const line of lines) {
        checkPage(5);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor("#111111");
        doc.text(line, margin, y);
        y += 5;
      }
    }

    doc.save(`${safeFilename(courseName)}-guide.pdf`);
  });
}

export function exportAnkiCsv(guide: StudyGuide, courseName: string) {
  const parsed = parseStructured(guide.content);
  if (!parsed) return;

  const rows: string[] = [];
  for (const subject of parsed.subjects) {
    for (const keyPoint of subject.keyPoints) {
      const front = keyPoint;
      const excerptNote =
        subject.materialExcerpts[0]
          ? `\n\nSource: ${subject.materialExcerpts[0].sourceName} — "${subject.materialExcerpts[0].excerpt}"`
          : "";
      const back = `${subject.title} [${subject.priority} Priority]\n\n${subject.summary}${excerptNote}`;
      // Anki tab-separated format: front\tback
      rows.push(`${front}\t${back}`);
    }
  }

  const content = rows.join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, `${safeFilename(courseName)}-anki-flashcards.txt`);
}
