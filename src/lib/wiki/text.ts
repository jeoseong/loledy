import type { WikiElement } from "./types";

export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export function isMediaVideo(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("data:video")) return true;
  const clean = url.split("?")[0]?.split("#")[0] ?? url;
  return /\.(mp4|webm|ogg|mov)$/i.test(clean);
}

export function visibleItems(
  elements: WikiElement[],
  champId: number,
  skinIndex: number,
): WikiElement[] {
  return elements
    .filter((item) => item.champId === champId && (item.skinIndex ?? 0) === skinIndex)
    .slice()
    .sort((a, b) => (a.orderIndex ?? a.id) - (b.orderIndex ?? b.id));
}

export function orderedQuotes(items: WikiElement[]): WikiElement[] {
  const quotes: WikiElement[] = [];
  quotes.push(...items.filter((item) => item.type === "quote" && !item.categoryId));
  const seen = new Set<number>();

  const walk = (parentId: number | null) => {
    const categories = items.filter((item) => {
      if (item.type !== "title") return false;
      if (parentId === null) return item.parentId == null;
      return item.parentId === parentId;
    });
    for (const category of categories) {
      if (seen.has(category.id)) continue;
      seen.add(category.id);
      quotes.push(
        ...items.filter((item) => item.type === "quote" && item.categoryId === category.id),
      );
      walk(category.id);
    }
  };

  walk(null);
  return quotes;
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const total = Math.max(0, Math.round(sec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export function audioFileName(title: string, url: string): string {
  const pathExt = /\.(mp3|ogg|wav|m4a|webm)$/i.exec(url.split("?")[0] ?? "");
  const data = /data:audio\/([a-z0-9]+)/i.exec(url);
  const raw = pathExt?.[1] ?? data?.[1] ?? "mp3";
  const ext = raw === "mpeg" ? "mp3" : raw === "wave" ? "wav" : raw;
  const base =
    title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42) || "fala";
  return `${base}.${ext}`;
}
