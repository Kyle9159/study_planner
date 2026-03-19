/**
 * Text extraction service — PDF, DOCX, TXT, YouTube.
 */

import { readFile } from "node:fs/promises";
import type { FileType } from "@shared/types";

export async function extractPdf(filePath: string): Promise<string> {
  // Dynamic import to avoid ESM/CJS issues with pdf-parse
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = await readFile(filePath);
  const result = await pdfParse(buffer);
  return result.text.trim();
}

export async function extractDocx(filePath: string): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value.trim();
}

export async function extractTxt(filePath: string): Promise<string> {
  const text = await readFile(filePath, "utf-8");
  return text.trim();
}

export async function extractYouTube(url: string): Promise<string> {
  const { YoutubeTranscript } = await import("youtube-transcript");

  // Extract video ID from URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  let videoId: string | null = null;
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      videoId = match[1];
      break;
    }
  }

  if (!videoId) {
    throw new Error(`Could not extract video ID from URL: ${url}`);
  }

  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  return transcript
    .map((t) => t.text)
    .join(" ")
    .trim();
}

export async function extractText(
  fileType: FileType,
  filePath: string | null,
  url: string | null,
): Promise<string | null> {
  try {
    if (fileType === "youtube" && url) {
      return await extractYouTube(url);
    }
    if (!filePath) return null;
    if (fileType === "pdf") return await extractPdf(filePath);
    if (fileType === "docx") return await extractDocx(filePath);
    if (fileType === "txt") return await extractTxt(filePath);
    // image — no text extraction
    return null;
  } catch (err) {
    console.error(`Text extraction failed for ${fileType}:`, err);
    throw err;
  }
}

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  // Snap to last word boundary
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + "..." : truncated + "...";
}
