/**
 * Text extraction service — PDF, DOCX, TXT, YouTube, WGU web pages.
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

/**
 * Extract reference URLs from course text (external educational links).
 * Filters out WGU internal links, image URLs, and non-article URLs.
 */
export function extractReferenceUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s)"'<>,]+/gi;
  const matches = text.match(urlPattern) ?? [];
  const seen = new Set<string>();
  const results: string[] = [];

  // Domains to skip (internal WGU, asset CDNs, paywalled/auth-required sites)
  const skipDomains = [
    "wgu.edu",
    "assets.wgu.edu",
    "dams.wgu.edu",
    "lrps.wgu.edu",
    "cgp-oex.wgu.edu",
    "apps.cgp-oex.wgu.edu",
    "youtube.com",
    "youtu.be",
    "vimeo.com",
    "linkedin.com",
    "pluralsight.com",
    "app.pluralsight.com",
    "percipio.com",
    "wgu.percipio.com",
    "w3.org",
    "doi.org",
    "redflagmania.com",
  ];

  // File extensions to skip
  const skipExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf", ".mp4", ".mp3", ".zip"];

  for (let url of matches) {
    // Trim trailing punctuation that's not part of the URL
    url = url.replace(/[.,;:!?)]+$/, "");

    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();

      // Skip internal/asset domains
      if (skipDomains.some((d) => host === d || host.endsWith("." + d))) continue;
      // Skip media/file URLs
      if (skipExtensions.some((ext) => path.endsWith(ext))) continue;
      // Skip duplicates
      const normalized = parsed.origin + parsed.pathname;
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      results.push(url);
    } catch {
      // Invalid URL, skip
    }
  }

  return results;
}

/**
 * Extract text content from a public webpage (no authentication needed).
 */
export async function extractPublicWebpage(url: string): Promise<string> {
  const { load } = await import("cheerio");

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = load(html);

  // Remove noise
  $("script, style, nav, header, footer, noscript, iframe, aside").remove();
  $("[role='navigation'], [role='banner'], [role='complementary']").remove();
  $(".sidebar, .nav, .menu, .footer, .header, .ads, .ad, .advertisement, .cookie-banner").remove();
  $("img, svg, video, audio, canvas").remove();
  $("button, input, select, textarea").remove();

  // Try article content containers first
  const container = $("article, [role='main'], main, .article-content, .post-content, .entry-content, .content").first();
  const text = (container.length ? container : $("body")).text();

  return text
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/(\s*\n){3,}/g, "\n\n")
    .trim();
}

export async function extractWebpage(url: string, sessionCookie: string): Promise<string> {
  // Build sessionid cookie — accept "sessionid=VALUE" or just "VALUE"
  const sessionIdValue = sessionCookie.replace(/^sessionid=/i, "").trim();
  const cookieHeader = `sessionid=${sessionIdValue}`;
  const response = await fetch(url, {
    headers: {
      Cookie: cookieHeader,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("WGU session expired — update your cookie in Settings.");
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch page (HTTP ${response.status})`);
  }

  const html = await response.text();
  const { load } = await import("cheerio");
  const $ = load(html);

  // Remove noise elements
  $("script, style, nav, header, footer, .skip-link, noscript, iframe").remove();

  // Try course content containers first, fall back to body
  const container = $(".course-content, main, [role='main'], article").first();
  const text = (container.length ? container : $("body")).text();

  // Collapse whitespace
  return text
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export async function extractText(
  fileType: FileType,
  filePath: string | null,
  url: string | null,
  extra?: { wguCookie?: string },
): Promise<string | null> {
  try {
    if (fileType === "youtube" && url) {
      return await extractYouTube(url);
    }
    if (fileType === "webpage" && url) {
      if (!extra?.wguCookie) {
        throw new Error("WGU session cookie not configured. Add it in Settings.");
      }
      return await extractWebpage(url, extra.wguCookie);
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

export async function crawlWguCourse(
  startUrl: string,
  sessionCookie: string,
): Promise<{ sections: { title: string; text: string }[]; courseTitle: string }> {
  const { load } = await import("cheerio");

  // Build sessionid cookie — accept "sessionid=VALUE" or just "VALUE"
  const sessionIdValue = sessionCookie.replace(/^sessionid=/i, "").trim();
  const sessionIdCookie = `sessionid=${sessionIdValue}`;

  // Detect LMS host: strip "apps." prefix from the MFE host
  const mfeHost = new URL(startUrl).host;
  const lmsHost = mfeHost.replace(/^apps\./, "");
  console.log("[WGU crawl] MFE host:", mfeHost, "→ LMS host:", lmsHost);

  // Step 1 — Fetch CSRF token from the LMS using the sessionid
  console.log("[WGU crawl] Fetching CSRF token with sessionid...");
  const csrfRes = await fetch(`https://${lmsHost}/`, {
    headers: { Cookie: sessionIdCookie },
    redirect: "manual",
  });
  const setCookies = csrfRes.headers.getSetCookie?.() ?? [];
  const csrfCookie = setCookies.find((c) => c.startsWith("csrftoken="));

  const lmsCookies = [
    sessionIdCookie,
    csrfCookie ? csrfCookie.split(";")[0] : "",
  ]
    .filter(Boolean)
    .join("; ");

  const headers = {
    Cookie: lmsCookies,
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
  };

  console.log("[WGU crawl] Session ready, cookies:", lmsCookies.replace(/sessionid=[^;]+/, "sessionid=***"));

  // Step 2 — Get course outline via the Course Home API
  const courseIdMatch = startUrl.match(/course-v1:[^/\s?#]+/);
  if (!courseIdMatch) {
    throw new Error("Could not extract course ID (course-v1:...) from the URL. Make sure you're using a WGU course page URL.");
  }

  const courseId = courseIdMatch[0];
  type OutlineSection = {
    display_name?: string;
    id?: string;
    children?: OutlineSequence[];
  };
  type OutlineSequence = {
    display_name?: string;
    id?: string;
    children?: OutlineUnit[];
  };
  type OutlineUnit = {
    display_name?: string;
    id?: string;
    type?: string;
  };
  type OutlineResponse = {
    course_blocks?: {
      blocks?: Record<string, {
        display_name?: string;
        type?: string;
        id?: string;
        children?: string[];
        lms_web_url?: string;
        student_view_url?: string;
      }>;
    };
    enrollment_mode?: string | null;
  };

  const outlineUrl = `https://${lmsHost}/api/course_home/v1/outline/${courseId}`;
  console.log("[WGU crawl] Fetching outline:", outlineUrl);
  const outlineRes = await fetch(outlineUrl, { headers });

  if (outlineRes.status === 401 || outlineRes.status === 403) {
    throw new Error("WGU session expired — update your cookie in Settings.");
  }

  let sectionUrls: { title: string; url: string; blockId?: string }[] = [];
  let courseTitle = "WGU Course";

  if (outlineRes.ok) {
    const outline = (await outlineRes.json()) as OutlineResponse;
    console.log("[WGU crawl] Outline enrollment_mode:", outline.enrollment_mode);
    console.log("[WGU crawl] course_blocks present:", !!outline.course_blocks);

    if (outline.course_blocks?.blocks) {
      const blocks = outline.course_blocks.blocks;
      const blockCount = Object.keys(blocks).length;
      const types = new Set<string>();
      for (const b of Object.values(blocks)) {
        if (b.type) types.add(b.type);
      }
      console.log("[WGU crawl] Outline blocks:", blockCount, "types:", [...types].join(", "));

      // Extract verticals (units) — use block IDs for xBlock render API
      for (const [blockId, block] of Object.entries(blocks)) {
        if (block.type === "vertical") {
          sectionUrls.push({
            title: block.display_name ?? "Section",
            url: `https://${lmsHost}/xblock/${blockId}`,
            blockId,
          });
        }
      }

      // Fallback: try sequential or chapter blocks
      if (sectionUrls.length === 0) {
        for (const [blockId, block] of Object.entries(blocks)) {
          if (block.type === "sequential" || block.type === "chapter") {
            sectionUrls.push({
              title: block.display_name ?? "Section",
              url: `https://${lmsHost}/xblock/${blockId}`,
              blockId,
            });
          }
        }
      }
    }
  }

  // Step 3 — fallback: try the Blocks API on the LMS
  if (sectionUrls.length === 0) {
    console.log("[WGU crawl] Outline had no blocks, trying Blocks API...");
    type BlockEntry = { display_name?: string; type?: string; student_view_url?: string };
    type BlocksApiResponse = { blocks?: Record<string, BlockEntry> };

    const blocksApiUrl =
      `https://${lmsHost}/api/courses/v1/blocks/` +
      `?course_id=${encodeURIComponent(courseId)}` +
      `&all_blocks=true&depth=all&requested_fields=display_name,type,student_view_url`;

    try {
      const apiRes = await fetch(blocksApiUrl, { headers });
      console.log("[WGU crawl] Blocks API status:", apiRes.status);

      if (apiRes.ok) {
        const rawText = await apiRes.text();
        if (rawText.length > 0) {
          const json = JSON.parse(rawText) as BlocksApiResponse;
          if (json.blocks) {
            for (const [blockId, block] of Object.entries(json.blocks)) {
              if (block.type === "vertical") {
                sectionUrls.push({
                  title: block.display_name ?? "Section",
                  url: `https://${lmsHost}/xblock/${blockId}`,
                  blockId,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.log("[WGU crawl] Blocks API failed:", err instanceof Error ? err.message : err);
    }
  }

  // Step 4 — fallback: scrape HTML from LMS courseware page
  if (sectionUrls.length === 0) {
    console.log("[WGU crawl] APIs returned no blocks, trying HTML scraping on LMS...");
    const coursewareUrl = `https://${lmsHost}/courses/${courseId}/course/`;
    try {
      const pageRes = await fetch(coursewareUrl, {
        headers: { ...headers, Accept: "text/html" },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        console.log("[WGU crawl] Courseware HTML length:", html.length);
        const $ = load(html);
        const seen = new Set<string>();

        $("a[href]").each((_, el) => {
          const href = $(el).attr("href") ?? "";
          if (
            href.includes("/courseware/") ||
            href.includes("type@vertical") ||
            href.includes("type@sequential")
          ) {
            const fullUrl = href.startsWith("http") ? href : `https://${lmsHost}${href}`;
            if (!seen.has(fullUrl)) {
              seen.add(fullUrl);
              sectionUrls.push({ title: $(el).text().trim() || fullUrl, url: fullUrl });
            }
          }
        });

        // Get course title
        const heading = $("h1, .course-title, [class*='course-name']").first().text().trim();
        if (heading) courseTitle = heading;
      }
    } catch (err) {
      console.log("[WGU crawl] Courseware fetch failed:", err instanceof Error ? err.message : err);
    }
  }

  console.log("[WGU crawl] Total sections found:", sectionUrls.length);

  if (sectionUrls.length === 0) {
    throw new Error(
      "No course sections found. This usually means the WGU session has expired. " +
        "Log into WGU, navigate to the course page, then copy the `sessionid` cookie value from DevTools → Application → Cookies → cgp-oex.wgu.edu, " +
        "and update it in Settings.",
    );
  }

  // Get course title from outline or page
  if (courseTitle === "WGU Course") {
    try {
      const titleRes = await fetch(`https://${lmsHost}/courses/${courseId}/course/`, {
        headers: { ...headers, Accept: "text/html" },
      });
      if (titleRes.ok) {
        const $ = load(await titleRes.text());
        const heading = $("h1, .course-title, [class*='course-name']").first().text().trim();
        if (heading) courseTitle = heading;
        else {
          const title = $("title").text().split("|")[0].trim();
          if (title) courseTitle = title;
        }
      }
    } catch {
      // default title is fine
    }
  }

  // Step 5 — fetch each section via xBlock render API
  console.log("[WGU crawl] Fetching", sectionUrls.length, "sections via xBlock API...");
  const sections: { title: string; text: string }[] = [];
  let fetchedCount = 0;
  let emptyCount = 0;
  let errorCount = 0;

  for (const { title, url } of sectionUrls) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const text = await extractWebpageWithCookies(url, lmsCookies);
      fetchedCount++;
      if (text) {
        sections.push({ title, text });
      } else {
        emptyCount++;
        if (emptyCount <= 3) console.log("[WGU crawl] Empty response for:", title, "url:", url.slice(0, 100));
      }
    } catch (err) {
      errorCount++;
      if (errorCount <= 3) console.log("[WGU crawl] Fetch error for:", title, "-", err instanceof Error ? err.message : err);
    }
  }

  console.log("[WGU crawl] Results: fetched=%d, with-text=%d, empty=%d, errors=%d", fetchedCount, sections.length, emptyCount, errorCount);

  if (sections.length === 0) {
    throw new Error("Could not extract text from any course section. Check your WGU session cookie.");
  }

  return { sections, courseTitle };
}

async function extractWebpageWithCookies(url: string, cookies: string): Promise<string> {
  const { load } = await import("cheerio");
  const response = await fetch(url, {
    headers: {
      Cookie: cookies,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    console.log("[WGU crawl] xBlock fetch failed:", response.status, url.slice(0, 100));
    return "";
  }
  const html = await response.text();
  if (html.length < 200) {
    console.log("[WGU crawl] xBlock tiny response:", html.length, "bytes for", url.slice(0, 100));
  }
  const $ = load(html);

  // ── Phase 1: Remove noise elements before extracting text ──
  // Scripts, styles, and hidden elements
  $("script, style, noscript, iframe, link[rel='stylesheet']").remove();
  // Navigation and UI chrome
  $("nav, header, footer, .skip-link").remove();
  $(".sequence-nav, .sequence-list-wrapper, .bookmark-button-wrapper").remove();
  $(".indicator-container, .loading-spinner, .notification-gentle").remove();
  $("button, input, select, textarea, label[for]").remove();
  // WGU-specific noise: image blocks, xblock init args
  $(".xblock-student_view-wgu_image_dams, figure.image.wgu-image").remove();
  $("[class*='xblock-json-init-args']").remove();
  // Decorative images
  $("img").remove();
  // Microsoft Office artifacts
  $("o\\:p, O\\:P").remove();

  // ── Phase 2: Strip all data-* attributes (they leak into .text() in some cases) ──
  $("[data-course-id], [data-block-type], [data-usage-id], [data-request-token], [data-graded], [data-has-score], [data-init], [data-runtime-class], [data-runtime-version], [data-content]").each((_, el) => {
    const elem = $(el);
    const attrs = (el as unknown as { attribs?: Record<string, string> }).attribs;
    if (attrs) {
      for (const attr of Object.keys(attrs)) {
        if (attr.startsWith("data-")) {
          elem.removeAttr(attr);
        }
      }
    }
  });

  // ── Phase 3: Extract text from content containers ──
  const container = $(".xblock-student_view, .xblock, .vert, .course-content, main, [role='main'], article").first();
  let text = (container.length ? container : $("body")).text();

  // ── Phase 4: Handle double-encoded HTML from xBlock render ──
  // .text() decodes &lt;p&gt; → <p>, then we parse that as HTML to strip tags
  if (text.includes("<") && text.includes(">")) {
    const inner = load(text);
    inner("script, style, nav, iframe, img, button, input, select, textarea").remove();
    inner("o\\:p, O\\:P").remove();
    text = inner.text();
  }

  // ── Phase 5: Clean up noise patterns in the extracted text ──
  text = text
    // Remove "Previous" / "Next" navigation labels
    .replace(/\bPrevious\b\s*\bNext\b/g, "")
    .replace(/^\s*(Previous|Next)\s*$/gm, "")
    // Remove "Loading…" / "Loading..." spinner text
    .replace(/\bLoading[…\.]{1,3}\b/g, "")
    // Remove leftover CSS class-like strings (e.g. "MsoNormal", "vert-mod")
    .replace(/\bMsoNormal\b/g, "")
    // Remove xBlock/LMS identifiers that leak through
    .replace(/block-v1:[^\s]+/g, "")
    .replace(/course-v1:[^\s]+/g, "")
    // Remove stray HTML-like fragments that survived
    .replace(/<[^>]{0,200}>/g, "")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/&#\d+;/g, " ")
    // Collapse whitespace
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? truncated.slice(0, lastSpace) + "..." : truncated + "...";
}

/**
 * Clean extracted text by removing common HTML/CSS/JS artifacts.
 * Applied at AI-generation time so even previously-stored dirty text gets cleaned.
 */
export function cleanExtractedText(text: string): string {
  // Phase 1: If text contains significant HTML, strip script/style blocks then remove tags
  const tagCount = (text.match(/<[a-z/][^>]*>/gi) ?? []).length;
  if (tagCount > 10) {
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      // Remove all HTML tags but preserve the text content between them
      .replace(/<[^>]+>/g, " ");
  }

  return text
    // Remove HTML entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z]{2,8};/gi, " ")
    .replace(/&#\d+;/g, " ")
    // Remove xBlock/LMS identifiers
    .replace(/block-v1:[^\s]+/g, "")
    .replace(/course-v1:[^\s]+/g, "")
    // Remove navigation labels
    .replace(/\bPrevious\b\s*\bNext\b/g, "")
    .replace(/^\s*(Previous|Next)\s*$/gm, "")
    // Remove loading spinners
    .replace(/Loading[…\.]{1,3}/g, "")
    // Remove MS Office artifacts
    .replace(/\bMsoNormal\b/g, "")
    // Remove CSS class-like patterns that leak through
    .replace(/\bxblock[-\w]*/g, "")
    .replace(/\bvert-mod\b/g, "")
    .replace(/\bvert vert-\d+\b/g, "")
    .replace(/\bxmodule[-\w]*/g, "")
    // Remove CoursewareFactory JS snippets
    .replace(/\(function\s*\(require\)[\s\S]*?RequireJS\.require\);/g, "")
    .replace(/require\(\['js\/courseware\/courseware_factory'\][\s\S]*?\}\);/g, "")
    .replace(/CoursewareFactory\(\);?/g, "")
    // Remove stray inline CSS/class attributes
    .replace(/style\s*=\s*"[^"]*"/gi, "")
    .replace(/class\s*=\s*"[^"]*"/gi, "")
    // Remove WGU and LMS-specific noise strings
    .replace(/https?:\/\/assets\.wgu\.edu\/[^\s)"]*/g, "")
    .replace(/https?:\/\/dams\.wgu\.edu\/[^\s)"]*/g, "")
    .replace(/wgu[-_]?image[-\w]*/gi, "")
    .replace(/\bdata-[\w-]+=\s*"[^"]*"/g, "")
    .replace(/\bdata-[\w-]+=\s*[^\s"'>]+/g, "")
    // Remove quiz/problem input markup remnants
    .replace(/\binput_[a-f0-9_]+/g, "")
    .replace(/\bchoice_\d+/g, "")
    .replace(/\bfield-input\b/g, "")
    .replace(/\binput-radio\b/g, "")
    .replace(/\bresponse-label\b/g, "")
    .replace(/\bfield-label\b/g, "")
    .replace(/\blabel-inline\b/g, "")
    .replace(/\bresponse-fieldset-legend\b/g, "")
    .replace(/\bfield-group-hd\b/g, "")
    .replace(/\bcapa_inputtype\b/g, "")
    .replace(/\bchoicegroup\b/g, "")
    // Collapse whitespace
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/(\s*\n){3,}/g, "\n\n")
    .trim();
}
