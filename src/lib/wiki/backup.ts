import { clearAll, putChampion, putElement } from "./db";
import type { ChampionInput, ElementInput, Skin } from "./types";

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function asSkin(value: unknown, fallbackName: string): Skin {
  const skin = (value && typeof value === "object" ? value : {}) as Partial<Skin>;
  return {
    name: typeof skin.name === "string" && skin.name.trim() ? skin.name : fallbackName,
    thumb: typeof skin.thumb === "string" ? skin.thumb : "",
    frameImg: typeof skin.frameImg === "string" ? skin.frameImg : "",
    splash: typeof skin.splash === "string" ? skin.splash : "",
    posX: typeof skin.posX === "number" && Number.isFinite(skin.posX) ? skin.posX : 50,
    posY: typeof skin.posY === "number" && Number.isFinite(skin.posY) ? skin.posY : 50,
    loadingImage: typeof skin.loadingImage === "string" ? skin.loadingImage : "",
    circleImage: typeof skin.circleImage === "string" ? skin.circleImage : "",
    playerIcon: typeof skin.playerIcon === "string" ? skin.playerIcon : "",
    splashBgImage: typeof skin.splashBgImage === "string" ? skin.splashBgImage : "",
    splashFrame: skin.splashFrame && typeof skin.splashFrame === "object"
      ? normalizeSplashFrame(skin.splashFrame)
      : undefined,
  };
}

function normalizeSplashFrame(value: unknown): import("@/lib/wiki/types").ChampionSplashFrame {
  const frame = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const numberOr = (raw: unknown, fallback: number) =>
    typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;

  return {
    x: Math.max(0, Math.min(100, numberOr(frame.x, 50))),
    y: Math.max(0, Math.min(100, numberOr(frame.y, 50))),
    zoom: Math.max(100, Math.min(500, numberOr(frame.zoom, 100))),
    opacity: Math.max(0, Math.min(100, numberOr(frame.opacity, 50))),
    radialX: Math.max(0, Math.min(100, numberOr(frame.radialX, 50))),
    radialY: Math.max(0, Math.min(100, numberOr(frame.radialY, 50))),
    radialSize: Math.max(10, Math.min(100, numberOr(frame.radialSize, 65))),
    radialIntensity: Math.max(0, Math.min(100, numberOr(frame.radialIntensity, 60))),
  };
}

export function normalizeChampion(input: Record<string, unknown>): ChampionInput {
  const name = String(input.name ?? input.nome ?? "Campeão").trim() || "Campeão";
  const rawSkins = Array.isArray(input.skins) ? input.skins : [];
  const skins =
    rawSkins.length > 0
      ? rawSkins.map((skin) => asSkin(skin, name))
      : [
          asSkin(
            {
              name,
              thumb: input.imgUrl,
              frameImg: input.imgUrl,
              splash: input.splashUrl,
              posX: 50,
              posY: 50,
            },
            name,
          ),
        ];
  const record: ChampionInput = {
    name,
    title: typeof input.title === "string" ? input.title : "",
    tags: typeof input.tags === "string" ? input.tags : "",
    bio: typeof input.bio === "string" ? input.bio : "",
    imgUrl: skins[0]?.frameImg || skins[0]?.thumb || "",
    splashUrl: skins[0]?.splash || "",
    loadingImage: typeof input.loadingImage === "string" ? input.loadingImage : "",
    circleImage: typeof input.circleImage === "string" ? input.circleImage : "",
    splashBgImage: typeof input.splashBgImage === "string" ? input.splashBgImage : "",
    splashFrame: normalizeSplashFrame(input.splashFrame),
    skins,
  };
  const id = num(input.id);
  if (id != null) record.id = id;
  return record;
}

function normalizeElement(input: Record<string, unknown>): ElementInput | null {
  const type = input.type === "title" || input.type === "quote" ? input.type : null;
  if (!type || typeof input.text !== "string") return null;
  const champId = num(input.champId);
  if (champId == null) return null;
  const record: ElementInput = {
    champId,
    skinIndex: num(input.skinIndex) ?? 0,
    type,
    text: input.text,
    orderIndex: num(input.orderIndex) ?? num(input.id) ?? Date.now(),
  };
  const id = num(input.id);
  if (id != null) record.id = id;
  if (type === "title") {
    const level = input.level === "h3" || input.level === "h4" || input.level === "h2" ? input.level : "h2";
    record.level = level;
    record.parentId = num(input.parentId);
    record.position = input.position === "start" ? "start" : "end";
  } else {
    record.categoryId = num(input.categoryId);
    record.position = input.position === "start" ? "start" : "end";
    record.audios = Array.isArray(input.audios)
      ? input.audios.filter((url): url is string => typeof url === "string")
      : [];
  }
  return record;
}

function championsFromUnknown(raw: unknown): { champions: ChampionInput[]; elements: ElementInput[] } {
  if (!raw || typeof raw !== "object") return { champions: [], elements: [] };
  const data = raw as Record<string, unknown>;

  if (Array.isArray(data.champions)) {
    const champions = data.champions
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => normalizeChampion(item));
    const elements = Array.isArray(data.elements)
      ? data.elements
          .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
          .map((item) => normalizeElement(item))
          .filter((item): item is ElementInput => item != null)
      : [];
    return { champions, elements };
  }

  const champions: ChampionInput[] = [];
  for (const key of Object.keys(data)) {
    const item = data[key];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const name = String(record.nome ?? record.name ?? key).toUpperCase();
    champions.push(
      normalizeChampion({
        name,
        title: record.title ?? "",
        tags: "MEIO",
        bio: "",
        skins: [{ name, thumb: "", frameImg: "", splash: "", posX: 50, posY: 50 }],
      }),
    );
  }
  return { champions, elements: [] };
}

export async function importBackup(raw: unknown): Promise<number> {
  const { champions, elements } = championsFromUnknown(raw);
  if (champions.length === 0) {
    throw new Error("Nenhum campeão válido no arquivo.");
  }

  await clearAll();

  const champIdMap = new Map<number, number>();
  for (const champion of champions) {
    const oldId = champion.id;
    const { id: _ignored, ...rest } = champion;
    const newId = await putChampion(rest);
    if (oldId != null) champIdMap.set(oldId, newId);
  }

  const titles = elements.filter((item) => item.type === "title");
  const quotes = elements.filter((item) => item.type === "quote");
  const titleIdMap = new Map<number, number>();

  for (const title of titles) {
    const oldId = title.id;
    const { id: _ignored, ...rest } = title;
    if (champIdMap.has(rest.champId)) rest.champId = champIdMap.get(rest.champId)!;
    rest.parentId = null;
    const newId = await putElement(rest);
    if (oldId != null) titleIdMap.set(oldId, newId);
  }

  for (const title of titles) {
    const oldId = title.id;
    const parent = num(title.parentId);
    if (oldId == null || parent == null || !titleIdMap.has(oldId) || !titleIdMap.has(parent)) continue;
    await putElement({
      ...title,
      id: titleIdMap.get(oldId),
      champId: champIdMap.get(title.champId) ?? title.champId,
      parentId: titleIdMap.get(parent) ?? null,
    });
  }

  for (const quote of quotes) {
    const { id: _ignored, ...rest } = quote;
    if (champIdMap.has(rest.champId)) rest.champId = champIdMap.get(rest.champId)!;
    if (rest.categoryId != null) {
      rest.categoryId = titleIdMap.get(rest.categoryId) ?? null;
    }
    await putElement(rest);
  }

  return champions.length;
}

export function downloadBackup(champions: unknown[], elements: unknown[]) {
  const blob = new Blob([JSON.stringify({ champions, elements }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `wiki_vozes_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
