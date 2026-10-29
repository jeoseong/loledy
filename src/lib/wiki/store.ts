import { create } from "zustand";
import { downloadBackup, importBackup, normalizeChampion } from "./backup";
import {
  deleteChampionCascade,
  deleteElement,
  loadAll,
  putChampion,
  putElement,
} from "./db";
import { orderedQuotes, plainText, sanitizeHtml, visibleItems } from "./text";
import type {
  Champion,
  ChampionInput,
  ElementInput,
  ElementLevel,
  Track,
  WikiElement,
} from "./types";

const SEED_KEY = "wiki-vozes-seeded-v1";

export type ConfirmState = {
  title: string;
  body: string;
  confirmLabel: string;
};

export type ModalState =
  | { kind: "closed" }
  | { kind: "champ"; id: number | null }
  | { kind: "title"; id: number | null; parentId: number | null }
  | { kind: "quote"; id: number | null; categoryId: number | null }
  | { kind: "text" }
  | { kind: "media" }
  | { kind: "transfer" }
  | { kind: "skin"; champId: number; skinIndex: number | null };

type WikiState = {
  ready: boolean;
  champions: Champion[];
  elements: WikiElement[];
  editMode: boolean;
  champId: number | null;
  skinIndex: number;
  query: string;
  modal: ModalState;
  confirm: ConfirmState | null;
  toast: string | null;
  playlist: Track[];
  trackIndex: number;
  playing: boolean;
  current: number;
  duration: number;
  playerError: string | null;
  init: () => Promise<void>;
  flash: (text: string) => void;
  toggleEdit: () => void;
  setQuery: (query: string) => void;
  showList: () => void;
  openChampion: (id: number) => void;
  setSkin: (index: number) => void;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  askConfirm: (confirm: ConfirmState, run: () => Promise<void>) => void;
  cancelConfirm: () => void;
  runConfirm: () => Promise<void>;
  saveChampion: (input: Record<string, unknown>) => Promise<void>;
  removeChampion: (id: number) => void;
  saveTitle: (draft: TitleDraft) => Promise<void>;
  removeTitle: (id: number) => void;
  saveQuote: (draft: QuoteDraft) => Promise<void>;
  removeQuote: (id: number) => void;
  saveQuickMedia: (loadingImage: string, circleImage: string, skinIndex: number, playerIcon: string, splashBgImage: string, frame: import("@/lib/wiki/types").ChampionSplashFrame) => Promise<void>;
  importText: (raw: string) => Promise<void>;
  transfer: (from: number, to: number, action: "copy" | "move") => Promise<void>;
  exportJson: () => void;
  importJson: (raw: unknown) => Promise<void>;
  toggleTrack: (index: number) => void;
  toggleMain: () => void;
  next: () => void;
  prev: () => void;
  seek: (percent: number) => void;
};

export type TitleDraft = {
  id: number | null;
  text: string;
  level: ElementLevel;
  position: "start" | "end";
  parentId: number | null;
};

export type QuoteDraft = {
  id: number | null;
  text: string;
  categoryId: number | null;
  position: "start" | "end";
  audios: string[];
};

let audio: HTMLAudioElement | null = null;
let audioBound = false;
let audioProgressFrame = 0;
let initOnce: Promise<void> | null = null;
let pendingConfirm: (() => Promise<void>) | null = null;
let toastTimer = 0;

function getAudio() {
  if (typeof window === "undefined") return null;
  if (!audio) audio = new Audio();
  return audio;
}

function derivePlaylist(elements: WikiElement[], champId: number | null, skinIndex: number): Track[] {
  if (champId == null) return [];
  const quotes = orderedQuotes(visibleItems(elements, champId, skinIndex));
  const tracks: Track[] = [];
  for (const quote of quotes) {
    for (const url of quote.audios ?? []) {
      const trimmed = url.trim();
      if (!trimmed) continue;
      tracks.push({
        url: trimmed,
        title: plainText(quote.text) || "Fala",
        quoteId: quote.id,
      });
    }
  }
  return tracks;
}

function readSeeded() {
  try {
    return localStorage.getItem(SEED_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeeded() {
  try {
    localStorage.setItem(SEED_KEY, "1");
  } catch {
    /* private mode */
  }
}

async function seedDemo() {
  const champId = await putChampion({
    name: "Vesper",
    title: "a Guardiã do Eco",
    tags: "MEIO, MAGO",
    bio: "Vesper caminha pelos corredores em que as vozes dos campeões ficam presas entre um feitiço e o seguinte. Ela não inventa juramentos: devolve, em ouro e silêncio, o que o Rift já ouviu. Este campeão é só um exemplo para explorar a wiki. No Modo Edição você pode apagá-lo, criar os seus, ou importar um backup JSON.",
    imgUrl: "",
    splashUrl: "",
    skins: [
      { name: "Clássica", thumb: "", frameImg: "", splash: "", posX: 50, posY: 50 },
      { name: "Eclipse", thumb: "", frameImg: "", splash: "", posX: 50, posY: 35 },
    ],
  });

  let order = 1;
  const moveId = await putElement({
    champId,
    skinIndex: 0,
    type: "title",
    level: "h2",
    text: "Movimentação",
    parentId: null,
    position: "end",
    orderIndex: order++,
  });
  const firstId = await putElement({
    champId,
    skinIndex: 0,
    type: "title",
    level: "h3",
    text: "Primeiro movimento",
    parentId: moveId,
    position: "end",
    orderIndex: order++,
  });
  await putElement({
    champId,
    skinIndex: 0,
    type: "quote",
    text: "“O eco chega antes de mim.”",
    audios: ["/demo-chime.wav"],
    categoryId: firstId,
    position: "end",
    orderIndex: order++,
  });
  await putElement({
    champId,
    skinIndex: 0,
    type: "quote",
    text: "“Há ouro nas frestas do silêncio.”",
    audios: [],
    categoryId: firstId,
    position: "end",
    orderIndex: order++,
  });
  const tauntId = await putElement({
    champId,
    skinIndex: 0,
    type: "title",
    level: "h2",
    text: "Provocação",
    parentId: null,
    position: "end",
    orderIndex: order++,
  });
  await putElement({
    champId,
    skinIndex: 0,
    type: "quote",
    text: "“Fala de novo. Eu guardo a segunda vez.”",
    audios: [],
    categoryId: tauntId,
    position: "end",
    orderIndex: order++,
  });
  const eclipse = await putElement({
    champId,
    skinIndex: 1,
    type: "title",
    level: "h2",
    text: "Eclipse",
    parentId: null,
    position: "end",
    orderIndex: order++,
  });
  await putElement({
    champId,
    skinIndex: 1,
    type: "quote",
    text: "“O eclipse guarda o que a luz entrega.”",
    audios: ["/demo-chime.wav"],
    categoryId: eclipse,
    position: "end",
    orderIndex: order++,
  });
}

function bindAudio(
  set: (partial: Partial<WikiState>) => void,
  get: () => WikiState,
) {
  const player = getAudio();
  if (!player || audioBound) return;
  audioBound = true;
  player.addEventListener("play", () => {
    set({ playing: true, playerError: null });
    if (audioProgressFrame) cancelAnimationFrame(audioProgressFrame);

    const updateProgress = () => {
      if (player.paused || player.ended) {
        audioProgressFrame = 0;
        return;
      }

      set({
        current: player.currentTime,
        duration: Number.isFinite(player.duration) ? player.duration : 0,
      });

      audioProgressFrame = requestAnimationFrame(updateProgress);
    };

    audioProgressFrame = requestAnimationFrame(updateProgress);
  });
  player.addEventListener("pause", () => {
    if (audioProgressFrame) cancelAnimationFrame(audioProgressFrame);
    audioProgressFrame = 0;
    set({
      playing: false,
      current: player.currentTime,
      duration: Number.isFinite(player.duration) ? player.duration : 0,
    });
  });
  player.addEventListener("ended", () => {
      const { trackIndex, playlist } = get();
      if (trackIndex + 1 < playlist.length) get().next();
      else set({ playing: false });
    });
  player.addEventListener("timeupdate", () => {
    set({
      current: player.currentTime,
      duration: Number.isFinite(player.duration) ? player.duration : 0,
    });
  });
  player.addEventListener("loadedmetadata", () => {
    set({ duration: Number.isFinite(player.duration) ? player.duration : 0 });
  });
}

function stopPlayer(set: (partial: Partial<WikiState>) => void) {
  const player = getAudio();
  player?.pause();
  if (player) {
    player.removeAttribute("src");
    player.load();
  }
  set({ trackIndex: -1, playing: false, current: 0, duration: 0, playerError: null });
}

export const useWiki = create<WikiState>((set, get) => {
  const flash = (text: string) => {
    if (toastTimer) window.clearTimeout(toastTimer);
    set({ toast: text });
    toastTimer = window.setTimeout(() => set({ toast: null }), 3400);
  };

  const publish = async (extra?: Partial<WikiState>) => {
    const data = await loadAll();
    const state = get();
    const champId = extra && "champId" in extra ? (extra.champId ?? null) : state.champId;
    const skinIndex = extra?.skinIndex ?? state.skinIndex;
    set({
      champions: data.champions,
      elements: data.elements,
      playlist: derivePlaylist(data.elements, champId, skinIndex),
      ...extra,
    });
  };

  const requireChampion = () => {
    if (get().champId == null) {
      flash("Abra um campeão para editar as falas.");
      return false;
    }
    return true;
  };

  return {
    ready: false,
    champions: [],
    elements: [],
    editMode: false,
    champId: null,
    skinIndex: 0,
    query: "",
    modal: { kind: "closed" },
    confirm: null,
    toast: null,
    playlist: [],
    trackIndex: -1,
    playing: false,
    current: 0,
    duration: 0,
    playerError: null,
    flash,
    init: () => {
      if (!initOnce) {
        initOnce = (async () => {
          bindAudio(set, get);
          if (!readSeeded()) {
            const existing = await loadAll();
            if (existing.champions.length === 0) await seedDemo();
            markSeeded();
          }
          await publish();
          set({ ready: true });
        })().catch((error) => {
          initOnce = null;
          set({ ready: true });
          flash(error instanceof Error ? error.message : "Não foi possível abrir a wiki.");
        });
      }
      return initOnce;
    },
    toggleEdit: () => set({ editMode: !get().editMode }),
    setQuery: (query) => set({ query }),
    showList: () => {
      stopPlayer(set);
      set({ champId: null, skinIndex: 0, playlist: [] });
    },
    openChampion: (id) => {
      stopPlayer(set);
      const playlist = derivePlaylist(get().elements, id, 0);
      set({ champId: id, skinIndex: 0, playlist });
    },
    setSkin: (index) => {
      stopPlayer(set);
      const { elements, champId } = get();
      set({ skinIndex: index, playlist: derivePlaylist(elements, champId, index) });
    },
    openModal: (modal) => {
      if (
        (modal.kind === "text" ||
          modal.kind === "media" ||
          modal.kind === "title" ||
          modal.kind === "quote" ||
          modal.kind === "transfer" ||
          modal.kind === "skin") &&
        !requireChampion()
      ) {
        return;
      }
      set({ modal });
    },
    closeModal: () => set({ modal: { kind: "closed" } }),
    askConfirm: (confirm, run) => {
      pendingConfirm = run;
      set({ confirm });
    },
    cancelConfirm: () => {
      pendingConfirm = null;
      set({ confirm: null });
    },
    runConfirm: async () => {
      const run = pendingConfirm;
      pendingConfirm = null;
      set({ confirm: null });
      if (run) await run();
    },
    saveChampion: async (input) => {
      const record = normalizeChampion(input);
      if (!record.name.trim()) {
        flash("Digite o nome do campeão.");
        return;
      }
      const id = await putChampion(record);
      await publish();
      set({ modal: { kind: "closed" } });
      flash(input.id ? "Campeão atualizado." : "Campeão criado.");
      if (get().champId == null && !input.id) get().openChampion(id);
    },
    removeChampion: (id) => {
      get().askConfirm(
        {
          title: "Excluir campeão",
          body: "O campeão e todas as falas dele serão apagados deste aparelho.",
          confirmLabel: "Excluir",
        },
        async () => {
          await deleteChampionCascade(id);
          stopPlayer(set);
          await publish({ champId: null, skinIndex: 0, modal: { kind: "closed" } });
          flash("Campeão excluído.");
        },
      );
    },
    saveTitle: async (draft) => {
      const { champId, skinIndex, elements } = get();
      if (champId == null) return;
      const text = sanitizeHtml(draft.text).trim();
      if (!text || text === "<br>") {
        flash("Digite o texto da categoria.");
        return;
      }
      const existing = draft.id != null ? elements.find((item) => item.id === draft.id) : undefined;
      const record: ElementInput = {
        champId,
        skinIndex,
        type: "title",
        level: draft.level,
        text,
        parentId: draft.parentId,
        position: draft.position,
        orderIndex:
          existing?.orderIndex ?? (draft.position === "start" ? Date.now() * -1 : Date.now()),
      };
      if (draft.id != null) record.id = draft.id;
      await putElement(record);
      await publish({ modal: { kind: "closed" } });
      flash("Categoria salva.");
    },
    removeTitle: (id) => {
      get().askConfirm(
        {
          title: "Excluir categoria",
          body: "As falas dessa categoria ficam soltas no topo. As subcategorias sobem um nível.",
          confirmLabel: "Excluir",
        },
        async () => {
          const related = get().elements.filter((item) => item.categoryId === id || item.parentId === id);
          await deleteElement(id);
          for (const item of related) {
            if (item.type === "quote" && item.categoryId === id) {
              await putElement({ ...item, categoryId: null });
            } else if (item.type === "title" && item.parentId === id) {
              await putElement({ ...item, parentId: null });
            }
          }
          await publish({ modal: { kind: "closed" } });
          flash("Categoria excluída.");
        },
      );
    },
    saveQuote: async (draft) => {
      const { champId, skinIndex, elements } = get();
      if (champId == null) return;
      const text = sanitizeHtml(draft.text).trim();
      if (!text || text === "<br>") {
        flash("Digite o texto da fala.");
        return;
      }
      const existing = draft.id != null ? elements.find((item) => item.id === draft.id) : undefined;
      const record: ElementInput = {
        champId,
        skinIndex,
        type: "quote",
        text,
        audios: draft.audios.map((url) => url.trim()).filter(Boolean),
        categoryId: draft.categoryId,
        position: draft.position,
        orderIndex:
          existing?.orderIndex ?? (draft.position === "start" ? Date.now() * -1 : Date.now()),
      };
      if (draft.id != null) record.id = draft.id;
      await putElement(record);
      await publish({ modal: { kind: "closed" } });
      flash("Fala salva.");
    },
    removeQuote: (id) => {
      get().askConfirm(
        {
          title: "Excluir fala",
          body: "Esta fala e os áudios guardados nela serão apagados deste aparelho.",
          confirmLabel: "Excluir",
        },
        async () => {
          await deleteElement(id);
          await publish({ modal: { kind: "closed" } });
          flash("Fala excluída.");
        },
      );
    },
    saveQuickMedia: async (loadingImage, circleImage, skinIndex, playerIcon, splashBgImage, frame) => {
      const { champions, champId } = get();
      const champ = champions.find((item) => item.id === champId);
      if (!champ) {
        flash("Selecione um campeão antes de salvar as imagens.");
        return;
      }
      const index = Math.max(0, Math.min(champ.skins.length - 1, Math.trunc(skinIndex)));
      const skins = champ.skins.map((skin, i) => i === index ? {
        ...skin,
        loadingImage,
        circleImage,
        playerIcon,
        splashBgImage,
        splashFrame: {
          x: Math.max(0, Math.min(100, Number(frame.x) || 0)),
          y: Math.max(0, Math.min(100, Number(frame.y) || 0)),
          zoom: Math.max(100, Math.min(500, Number(frame.zoom) || 100)),
          opacity: Math.max(0, Math.min(100, Number(frame.opacity ?? 50))),
          radialX: Math.max(0, Math.min(100, Number(frame.radialX ?? 50))),
          radialY: Math.max(0, Math.min(100, Number(frame.radialY ?? 50))),
          radialSize: Math.max(10, Math.min(100, Number(frame.radialSize ?? 65))),
          radialIntensity: Math.max(0, Math.min(100, Number(frame.radialIntensity ?? 60))),
        },
      } : skin);
      const record: ChampionInput = {
        ...champ,
        skins,
      };
      await putChampion(record);
      await publish();
      flash("Imagens do campeão e da skin atualizadas.");
    },
    importText: async (raw) => {
      const { champId, skinIndex } = get();
      if (champId == null) return;
      const lines = raw.split("\n");
      let mainId: number | null = null;
      let subId: number | null = null;
      let order = Date.now();
      let count = 0;
      for (const sourceLine of lines) {
        const line = sourceLine.trim();
        if (!line) continue;
        if (/^[“"•-]/.test(line)) {
          const clean = line.replace(/^[“"•-]\s*/, "").replace(/[”"]$/u, "").trim();
          if (!clean) continue;
          await putElement({
            champId,
            skinIndex,
            type: "quote",
            text: `“${clean}”`,
            audios: [],
            categoryId: subId ?? mainId,
            position: "end",
            orderIndex: order++,
          });
          count += 1;
        } else if (line.includes("—") || line.includes("-")) {
          subId = await putElement({
            champId,
            skinIndex,
            type: "title",
            level: "h3",
            text: line,
            parentId: mainId,
            position: "end",
            orderIndex: order++,
          });
          count += 1;
        } else {
          mainId = await putElement({
            champId,
            skinIndex,
            type: "title",
            level: "h2",
            text: line,
            parentId: null,
            position: "end",
            orderIndex: order++,
          });
          subId = null;
          count += 1;
        }
      }
      if (count === 0) {
        flash("Cole o texto das falas primeiro.");
        return;
      }
      await publish({ modal: { kind: "closed" } });
      flash("Falas importadas nesta skin.");
    },
    transfer: async (from, to, action) => {
      const { champId, elements } = get();
      if (champId == null) return;
      if (from === to) {
        flash("Escolha skins diferentes.");
        return;
      }
      const source = elements.filter(
        (item) => item.champId === champId && (item.skinIndex ?? 0) === from,
      );
      if (source.length === 0) {
        flash("Nenhuma fala na skin de origem.");
        return;
      }
      if (action === "move") {
        for (const item of source) {
          await putElement({ ...item, skinIndex: to });
        }
      } else {
        const titles = source.filter((item) => item.type === "title");
        const sourceIds = new Set(titles.map((item) => item.id));
        const idMap = new Map<number, number>();
        const pending = titles.slice();
        let guard = 0;
        while (pending.length > 0 && guard < 30) {
          guard += 1;
          let moved = false;
          for (let index = pending.length - 1; index >= 0; index -= 1) {
            const category = pending[index];
            if (!category) continue;
            const parentInSource = category.parentId != null && sourceIds.has(category.parentId);
            if (parentInSource && category.parentId != null && !idMap.has(category.parentId)) continue;
            const { id: _ignored, ...rest } = category;
            rest.skinIndex = to;
            if (rest.parentId != null && idMap.has(rest.parentId)) {
              rest.parentId = idMap.get(rest.parentId)!;
            }
            const newId = await putElement(rest);
            idMap.set(category.id, newId);
            pending.splice(index, 1);
            moved = true;
          }
          if (!moved) break;
        }
        for (const quote of source.filter((item) => item.type === "quote")) {
          const { id: _ignored, ...rest } = quote;
          rest.skinIndex = to;
          if (rest.categoryId != null && idMap.has(rest.categoryId)) {
            rest.categoryId = idMap.get(rest.categoryId)!;
          }
          await putElement(rest);
        }
      }
      await publish({ modal: { kind: "closed" } });
      flash(action === "move" ? "Falas movidas." : "Falas copiadas.");
    },
    exportJson: () => {
      const { champions, elements } = get();
      if (champions.length === 0) {
        flash("Não há campeões para exportar.");
        return;
      }
      downloadBackup(champions, elements);
      flash("Backup baixado.");
    },
    importJson: async (raw) => {
      try {
        const count = await importBackup(raw);
        stopPlayer(set);
        await publish({ champId: null, skinIndex: 0, modal: { kind: "closed" } });
        flash(`${count} campeão(ões) importado(s).`);
      } catch (error) {
        flash(error instanceof Error ? error.message : "Não foi possível importar o JSON.");
      }
    },
    toggleTrack: (index) => {
      const player = getAudio();
      const { playlist, trackIndex } = get();
      if (!player || index < 0 || index >= playlist.length) return;
      if (trackIndex === index && player.src && !player.paused) {
        player.pause();
        return;
      }
      const track = playlist[index];
      if (!track) return;
      if (trackIndex !== index) {
        player.src = track.url;
        set({ trackIndex: index, current: 0, duration: 0, playerError: null });
      }
      void player.play().catch(() => {
        set({ playing: false, playerError: "Não foi possível reproduzir este áudio." });
      });
    },
    toggleMain: () => {
      const player = getAudio();
      const { playlist, trackIndex } = get();
      if (!player) return;
      if (trackIndex < 0 || !player.src) {
        if (playlist.length > 0) get().toggleTrack(0);
        return;
      }
      if (player.paused) {
        void player.play().catch(() => set({ playerError: "Não foi possível reproduzir este áudio." }));
      } else {
        player.pause();
      }
    },
    next: () => {
      const { trackIndex, playlist } = get();
      if (trackIndex + 1 < playlist.length) get().toggleTrack(trackIndex + 1);
    },
    prev: () => {
      const player = getAudio();
      const { trackIndex } = get();
      if (player && player.currentTime > 2) {
        player.currentTime = 0;
        return;
      }
      if (trackIndex > 0) get().toggleTrack(trackIndex - 1);
    },
    seek: (percent) => {
      const player = getAudio();
      if (!player || !player.duration) return;
      player.currentTime = (percent / 100) * player.duration;
    },
  };
});

export function currentChampion(state: { champions: Champion[]; champId: number | null }) {
  return state.champions.find((champion) => champion.id === state.champId) ?? null;
}
