import { useEffect, useState, type ReactNode } from "react";
import {
  AudioLines,
  ChevronLeft,
  Download,
  Eye,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Pause,
  Pencil,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Upload,
} from "lucide-react";
import { Editors } from "@/components/wiki/Editors";
import { useWiki } from "@/lib/wiki/store";
import { audioFileName, formatTime, isMediaVideo, plainText, sanitizeHtml, visibleItems } from "@/lib/wiki/text";
import type { Champion, ElementLevel, WikiElement } from "@/lib/wiki/types";

function cssUrl(url: string) {
  return url.replace(/["\\\n\r]/g, "");
}

export function WikiApp() {
  const champId = useWiki((state) => state.champId);
  const ready = useWiki((state) => state.ready);
  const toast = useWiki((state) => state.toast);

  useEffect(() => {
    void useWiki.getState().init();
  }, []);

  return (
    <div className={`wiki-root${champId == null ? " wiki-root-home" : ""}`}>
      <Backdrop />
<HomeBackgroundMeasure />
      <Header />
      <main className="wiki-main" id="mainContainer">
        {ready ? <Main /> : <p className="empty-msg">Abrindo o grimório…</p>}
      </main>
      <PlayerBar />
      <Editors />
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}


function HomeBackgroundMeasure() {
  const champId = useWiki((state) => state.champId);
  const ready = useWiki((state) => state.ready);

  useEffect(() => {
    const player = document.querySelector<HTMLElement>(".lol-sounds-player");
    if (!player) return;

    let frame = 0;
    const measurePlayer = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(player.getBoundingClientRect().height);
        document.documentElement.style.setProperty("--player-height", `${height}px`);
      });
    };

    measurePlayer();

    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(measurePlayer)
      : undefined;

    observer?.observe(player);
    window.addEventListener("resize", measurePlayer);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measurePlayer);
      document.documentElement.style.removeProperty("--player-height");
    };
  }, []);

  useEffect(() => {
    if (champId != null || !ready) return;

    const root = document.querySelector<HTMLElement>(".wiki-root-home");
    if (!root) return;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const grid = root.querySelector(".champions-grid");
        const firstCard = grid?.querySelector(".champ-card");
        if (!firstCard) return;

        const rootTop = root.getBoundingClientRect().top;
        const cardBottom = firstCard.getBoundingClientRect().bottom;
        const height = Math.max(0, Math.ceil(cardBottom - rootTop));
        root.style.setProperty("--home-bg-height", `${height}px`);
      });
    };

    measure();
    const observer = new MutationObserver(measure);
    observer.observe(root, { childList: true, subtree: true });

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(root);
    }

    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty("--home-bg-height");
    };
  }, [champId, ready]);

  return null;
}



function Backdrop() {
  const champId = useWiki((state) => state.champId);
  const skinIndex = useWiki((state) => state.skinIndex);
  const champions = useWiki((state) => state.champions);
  const champion = champions.find((item) => item.id === champId);
  const skin = champion?.skins[skinIndex] ?? champion?.skins[0];
  const candidate = skin?.splashBgImage || skin?.splash || champion?.splashBgImage || "";
  const splash = candidate && !isMediaVideo(candidate) ? candidate : "";
  const frame = {
    x: 50, y: 50, zoom: 100, opacity: 50,
    radialX: 50, radialY: 50, radialSize: 65, radialIntensity: 60,
    ...(champion?.splashFrame ?? {}),
    ...(skin?.splashFrame ?? {}),
  };

  return (
    <>
      <div
        id="fixedBgLayer"
        style={{ opacity: splash ? 1 : 0 }}
      >
        {splash ? (
          <img
            className="fixed-bg-splash-image"
            src={splash}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              right: "auto",
              width: "auto",
              height: "100%",
              maxWidth: "none",
              objectFit: "contain",
              objectPosition: `${frame.x}% ${frame.y}%`,
              opacity: frame.opacity / 100,
              WebkitMaskImage: `radial-gradient(ellipse ${frame.radialSize}% ${frame.radialSize}% at ${frame.radialX}% ${frame.radialY}%, #000 0%, rgb(0 0 0 / ${1 - frame.radialIntensity / 100}) 100%)`,
              maskImage: `radial-gradient(ellipse ${frame.radialSize}% ${frame.radialSize}% at ${frame.radialX}% ${frame.radialY}%, #000 0%, rgb(0 0 0 / ${1 - frame.radialIntensity / 100}) 100%)`,
              transform: `translateX(-50%) scale(${Math.max(100, frame.zoom) / 100})`,
              transformOrigin: `${frame.x}% ${frame.y}%`,
            }}/>
        ) : null}
      </div>
      <div id="fixedBgOverlay" style={{ opacity: splash ? 1 : 0 }} />
    </>
  );
}

function Header() {
  const editMode = useWiki((state) => state.editMode);
  const champId = useWiki((state) => state.champId);
  const query = useWiki((state) => state.query);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="wiki-header wiki-header-floating">
      <div className="header-top">
        <button type="button" className="header-title" onClick={() => useWiki.getState().showList()}>
          <h1>LOLEDY</h1>
        </button>
        <button
          type="button"
          className="settings-menu-btn"
          aria-label="Configurações"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <img src="/IMG_20261027_130338.png" alt="" />
        </button>
      </div>
      {settingsOpen ? (
        <div className="settings-menu">
          <button
            type="button"
            className={editMode ? "toggle-mode-btn editing" : "toggle-mode-btn"}
            onClick={() => useWiki.getState().toggleEdit()}
          >
            {editMode ? <Pencil size={14} /> : <Eye size={14} />}
            <span>{editMode ? "Modo de edição" : "Modo de leitura"}</span>
          </button>
          {editMode ? (
            <div className="icon-toolbar">
          <IconButton title="Exportar JSON" onClick={() => useWiki.getState().exportJson()}>
            <Download size={16} />
          </IconButton>
          <IconButton title="Importar JSON" onClick={() => document.getElementById("jsonFileInput")?.click()}>
            <Upload size={16} />
          </IconButton>
          <IconButton title="Importar falas" onClick={() => useWiki.getState().openModal({ kind: "text" })}>
            <FileText size={16} />
          </IconButton>
          <IconButton title="Editar imagens" onClick={() => useWiki.getState().openModal({ kind: "media" })}>
            <ImageIcon size={16} />
          </IconButton>
          <IconButton
            title="Nova categoria"
            onClick={() => useWiki.getState().openModal({ kind: "title", id: null, parentId: null })}
          >
            <FolderPlus size={16} />
          </IconButton>
          <IconButton
            title="Nova fala"
            onClick={() => useWiki.getState().openModal({ kind: "quote", id: null, categoryId: null })}
          >
            <AudioLines size={16} />
          </IconButton>
          {champId == null ? (
            <IconButton title="Novo campeão" onClick={() => useWiki.getState().openModal({ kind: "champ", id: null })}>
              <Plus size={16} />
            </IconButton>
          ) : null}
        </div>
          ) : null}
        </div>
      ) : null}
      <div className="search-box">
        <input
          value={query}
          onChange={(event) => useWiki.getState().setQuery(event.target.value)}
          placeholder="Buscar campeão ou fala..."
          aria-label="Buscar campeão ou fala"
        />
      </div>
      <input
        id="jsonFileInput"
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              void useWiki.getState().importJson(JSON.parse(String(reader.result ?? "")));
            } catch {
              useWiki.getState().flash("O arquivo JSON não pôde ser lido.");
            }
          };
          reader.readAsText(file);
        }}
      />
    </header>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="icon-btn" title={title} aria-label={title} onClick={onClick}>
      {children}
    </button>
  );
}

function Main() {
  const champId = useWiki((state) => state.champId);
  if (champId == null) return <ChampionGrid />;
  return <ChampionPage />;
}

function ChampionGrid() {
  const champions = useWiki((state) => state.champions);
  const elements = useWiki((state) => state.elements);
  const query = useWiki((state) => state.query).trim().toLowerCase();
  const editMode = useWiki((state) => state.editMode);
  useLazyVideos(`${champions.length}`);

  const visible = champions
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
    .filter((champion) => matchesChampion(champion, elements, query));

  if (champions.length === 0) {
    return (
      <div className="empty-msg">
        Nenhum campeão ainda. Crie o primeiro ou importe um backup JSON.
        <div className="empty-actions">
          <button type="button" className="btn" onClick={() => useWiki.getState().openModal({ kind: "champ", id: null })}>
            Criar campeão
          </button>
          <button type="button" className="btn" onClick={() => document.getElementById("jsonFileInput")?.click()}>
            Importar JSON
          </button>
        </div>
      </div>
    );
  }

  if (visible.length === 0) {
    return <p className="empty-msg">Nenhum campeão combina com essa busca.</p>;
  }

  return (
    <div className="champions-grid">
      {visible.map((champion) => (
        <ChampionCard key={champion.id} champion={champion} editMode={editMode} />
      ))}
    </div>
  );
}

function matchesChampion(champion: Champion, elements: WikiElement[], query: string) {
  if (!query) return true;
  if (champion.name.toLowerCase().includes(query)) return true;
  if ((champion.title || "").toLowerCase().includes(query)) return true;
  return elements.some(
    (item) =>
      item.champId === champion.id &&
      item.type === "quote" &&
      plainText(item.text).toLowerCase().includes(query),
  );
}

function ChampionCard({ champion, editMode }: { champion: Champion; editMode: boolean }) {
  const image = champion.skins[0]?.frameImg || champion.imgUrl || "";
  const video = isMediaVideo(image);

  return (
    <article
      className="champ-card"
      style={!video && image ? { backgroundImage: `url("${cssUrl(image)}")` } : undefined}
    >
      {video ? <video className="champ-card-video lazy-video" src={image} loop muted playsInline /> : null}
      <button
        type="button"
        className="champ-open"
        aria-label={`Abrir ${champion.name}`}
        onClick={() => useWiki.getState().openChampion(champion.id)}
      />
      {editMode ? (
        <button
          type="button"
          className="champ-edit-badge"
          onClick={() => useWiki.getState().openModal({ kind: "champ", id: champion.id })}
        >
          Editar
        </button>
      ) : null}
      <div className="champ-card-overlay">
        <div className="champ-card-name">{champion.name}</div>
        <div className="champ-card-title">{champion.title}</div>
      </div>
    </article>
  );
}

function ChampionPage() {
  const champions = useWiki((state) => state.champions);
  const elements = useWiki((state) => state.elements);
  const champId = useWiki((state) => state.champId);
  const skinIndex = useWiki((state) => state.skinIndex);
  const editMode = useWiki((state) => state.editMode);
  const query = useWiki((state) => state.query).trim().toLowerCase();
  const trackIndex = useWiki((state) => state.trackIndex);
  const champion = champions.find((item) => item.id === champId);

  useLazyVideos(`${champId ?? 0}-${skinIndex}-${champions.length}`);

  useEffect(() => {
    if (trackIndex < 0) return;
    const quoteId = useWiki.getState().playlist[trackIndex]?.quoteId;
    if (!quoteId) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`quote-${quoteId}`)?.scrollIntoView({
      block: "nearest",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [trackIndex]);

  if (!champion) return <p className="empty-msg">Campeão não encontrado.</p>;

  const skins = champion.skins.length
    ? champion.skins
    : [
        {
          name: champion.name,
          thumb: champion.imgUrl,
          frameImg: champion.imgUrl,
          splash: champion.splashUrl,
          posX: 50,
          posY: 50,
        },
      ];
  const skin = skins[skinIndex] ?? skins[0];
  if (!skin) return null;
  const frame = skin.loadingImage || skin.frameImg || skin.thumb || champion.imgUrl || "";
  const frameVideo = isMediaVideo(frame);
  const tags = (champion.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const items = visibleItems(elements, champion.id, skinIndex);
  const orphans = items.filter((item) => item.type === "quote" && !item.categoryId);

  return (
    <div className="champion-view">
      <nav className="champion-top-nav" aria-label="Navegação do campeão">
        <img
          className="champion-region-icon"
          src="/mt_targon_crest_icon.png"
          alt="Monte Targon"
        />
        <button
          type="button"
          className="champion-top-home"
          onClick={() => useWiki.getState().showList()}
        >
          CAMPEÕES
        </button>
        <img
          className="champion-top-arrow"
          src="/881afec8-0456-4c78-b593-d8652cc6dfaa.png"
          alt=""
        />
        <span className="champion-top-name">{champion.name.toLocaleUpperCase("pt-BR")}</span>
      </nav>
      <section className="hero-banner">
        <button type="button" className="inline-back-btn" onClick={() => useWiki.getState().showList()}>
          <img src="/e4469a9b-f634-4666-b74e-fa875130bd14.svg" alt="" aria-hidden="true" />
          <span>Voltar</span>
        </button>
        <div className="hero-content">
          <div
            className="hero-icon-frame"
            style={
              !frameVideo && frame
                ? {
                    backgroundImage: `url("${cssUrl(frame)}")`,
                    backgroundPosition: `${skin.posX ?? 50}% ${skin.posY ?? 50}%`,
                  }
                : undefined
            }
          >
            {frameVideo ? <video className="hero-frame-video" src={frame} loop muted playsInline autoPlay /> : null}
            {editMode ? (
              <button
                type="button"
                className="champion-edit-image-button"
                aria-label={`Editar ${champion.name}`}
                title="Editar campeão"
                onClick={() => useWiki.getState().openModal({ kind: "champ", id: champion.id })}
              >
                <img src="/champion-edit-icon.png" alt="" />
              </button>
            ) : null}
            {!frame ? <img className="hero-fallback" src="/app-icon.png" alt="" /> : null}
          </div>
          <h1 className={`hero-name${skin.name ? " skin-title" : ""}`}>{skin.name || champion.name}</h1>
          {skin.name ? <img className="skin-title-divider" src="/t1HeaderDivider.png" alt="" /> : null}
          {champion.title ? <div className="hero-subtitle">{champion.title}</div> : null}
          {tags.length > 0 ? (
            <div className="hero-tags">
              {tags.map((tag) => (
                <span className="tag-badge" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          <Biography text={champion.bio || "Sem história cadastrada."} resetKey={`${champion.id}-${skinIndex}`} />
        </div>
      </section>

      <section className="skins-section">
        <div className="section-label">
          <span>Skins · {skins.length}</span>
          <img className="skins-count-divider" src="/7b080128-d5b7-4f42-8f96-44b50666769d.png" alt="" />
          {editMode ? (
            <div className="section-actions">
              <button type="button" className="btn" onClick={() => useWiki.getState().openModal({ kind: "transfer" })}>
                Copiar / mover
              </button>
            </div>
          ) : null}
        </div>
        <div className="skins-carousel">
          {skins.map((item, index) => (
            <div className="skin-item-wrap" key={`${item.name}-${index}`}>
              <button
                type="button"
                className={index === skinIndex ? "skin-item active" : "skin-item"}
                onClick={() => useWiki.getState().setSkin(index)}
                aria-label={`Selecionar skin ${item.name || index + 1}`}
              >
                <div className="skin-thumb">
                  {item.circleImage ? (
                    <span
                      className="skin-thumb-art"
                      style={{
                        backgroundImage: `url("${cssUrl(item.circleImage)}")`,
                        backgroundPosition: `${item.posX ?? 50}% ${item.posY ?? 50}%`,
                      }}
                    />
                  ) : null}
                </div>
                <div className="skin-name">{item.name}</div>
              </button>
              {editMode ? (
                <button
                  type="button"
                  className="skin-edit-icon-button"
                  aria-label={`Editar skin ${item.name || index + 1}`}
                  title={`Editar ${item.name || "skin"}`}
                  onClick={() =>
                    useWiki.getState().openModal({
                      kind: "skin",
                      champId: champion.id,
                      skinIndex: index,
                    })
                  }
                >
                  <img src="/skin-edit-icon.png" alt="" />
                </button>
              ) : null}
            </div>
          ))}
          {editMode ? (
            <button
              type="button"
              className="add-skin-card"
              title="Adicionar skin"
              aria-label="Adicionar skin"
              onClick={() =>
                useWiki.getState().openModal({
                  kind: "skin",
                  champId: champion.id,
                  skinIndex: null,
                })
              }
            >
              <Plus size={18} />
            </button>
          ) : null}
        </div>
      </section>

      <section className="content-area">
        {orphans.map((quote) => (
          <QuoteRow key={quote.id} quote={quote} query={query} editMode={editMode} />
        ))}
        <CategoryTree items={items} parentId={null} query={query} editMode={editMode} />
        {items.length === 0 ? (
          <p className="empty-msg">Nenhuma fala nesta skin. No Modo Edição, crie uma categoria ou importe um texto.</p>
        ) : null}
      </section>
    </div>
  );
}

function Biography({ text, resetKey }: { text: string; resetKey: string }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setExpanded(false);
  }, [resetKey]);
  const long = text.length > 140;
  return (
    <>
      <p className={expanded ? "hero-bio expanded" : "hero-bio"}>
        <span className="hero-bio-initial"><span className="hero-bio-initial-letter">{text.charAt(0)}</span><span className="hero-bio-initial-rule" aria-hidden="true" /></span>{text.slice(1)}
      </p>
      {long ? (
        <button type="button" className="read-more-btn" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "‹ Ler menos" : "› Ler mais"}
        </button>
      ) : null}
    </>
  );
}

function CategoryTree({
  items,
  parentId,
  query,
  editMode,
}: {
  items: WikiElement[];
  parentId: number | null;
  query: string;
  editMode: boolean;
}) {
  const categories = items.filter((item) => {
    if (item.type !== "title") return false;
    if (parentId === null) return item.parentId == null;
    return item.parentId === parentId;
  });

  return (
    <>
      {categories.map((category) => {
        if (query && !branchMatches(items, category, query)) return null;
        const quotes = items.filter((item) => item.type === "quote" && item.categoryId === category.id);
        return (
          <section key={category.id}>
            <div className="dynamic-header-container">
              <div className="dynamic-header-content">
                <Heading level={category.level} html={category.text} />
              </div>
              {editMode ? (
                <div className="item-actions">
                  <button
                    type="button"
                    className="action-btn-add"
                    onClick={() => useWiki.getState().openModal({ kind: "title", id: null, parentId: category.id })}
                  >
                    + Sub
                  </button>
                  <button
                    type="button"
                    className="action-btn-add"
                    onClick={() => useWiki.getState().openModal({ kind: "quote", id: null, categoryId: category.id })}
                  >
                    + Fala
                  </button>
                  <button
                    type="button"
                    className="action-icon"
                    onClick={() => useWiki.getState().openModal({ kind: "title", id: category.id, parentId: null })}
                  >
                    Editar
                  </button>
                </div>
              ) : null}
            </div>
            {quotes.map((quote) => (
              <QuoteRow key={quote.id} quote={quote} query={query} editMode={editMode} />
            ))}
            <CategoryTree items={items} parentId={category.id} query={query} editMode={editMode} />
          </section>
        );
      })}
    </>
  );
}

function branchMatches(items: WikiElement[], category: WikiElement, query: string): boolean {
  if (plainText(category.text).toLowerCase().includes(query)) return true;
  const quotes = items.filter((item) => item.type === "quote" && item.categoryId === category.id);
  if (quotes.some((quote) => plainText(quote.text).toLowerCase().includes(query))) return true;
  const children = items.filter((item) => item.type === "title" && item.parentId === category.id);
  return children.some((child) => branchMatches(items, child, query));
}

function Heading({ level, html }: { level?: ElementLevel; html: string }) {
  const Tag = level === "h3" || level === "h4" ? level : "h2";
  return <Tag dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

function QuoteRow({ quote, query, editMode }: { quote: WikiElement; query: string; editMode: boolean }) {
  const playlist = useWiki((state) => state.playlist);
  const trackIndex = useWiki((state) => state.trackIndex);
  const playing = useWiki((state) => state.playing);
  const hidden = query.length > 0 && !plainText(quote.text).toLowerCase().includes(query);
  const buttons = playlist
    .map((track, index) => ({ track, index }))
    .filter((item) => item.track.quoteId === quote.id);
  const activeRow = trackIndex >= 0 && playlist[trackIndex]?.quoteId === quote.id;

  if (hidden) return null;

  return (
    <div className={activeRow ? "quote-row is-playing" : "quote-row"} id={`quote-${quote.id}`}>
      <div className="quote-bullet" />
      {buttons.map(({ index }) => {
        const active = index === trackIndex && playing;
        return (
          <button
            key={index}
            type="button"
            className={active ? "fandom-audio-btn pause-icon" : "fandom-audio-btn play-icon"}
            aria-label={active ? "Pausar fala" : "Reproduzir fala"}
            onClick={() => useWiki.getState().toggleTrack(index)}
          />
        );
      })}
      <div className="quote-content-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(quote.text) }} />
      {editMode ? (
        <div className="item-actions">
          <button
            type="button"
            className="action-icon"
            onClick={() => useWiki.getState().openModal({ kind: "quote", id: quote.id, categoryId: null })}
          >
            Editar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PlayerBar() {
  const playlist = useWiki((state) => state.playlist);
  const trackIndex = useWiki((state) => state.trackIndex);
  const playing = useWiki((state) => state.playing);
  const current = useWiki((state) => state.current);
  const duration = useWiki((state) => state.duration);
  const playerError = useWiki((state) => state.playerError);
  const champId = useWiki((state) => state.champId);
  const skinIndex = useWiki((state) => state.skinIndex);
  const champions = useWiki((state) => state.champions);
  const champion = champions.find((item) => item.id === champId);
  const skin = champion?.skins[skinIndex] ?? champion?.skins[0];
  const thumb = skin?.playerIcon || skin?.thumb || champion?.imgUrl || "";
  const track = trackIndex >= 0 ? playlist[trackIndex] : undefined;
  const percent = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="lol-sounds-player">
      <div className="player-content">
        <div className="player-upper-row">
          <div className="player-info-box">
            <div
              className="eq-icon-frame"
              style={thumb ? { backgroundImage: `url("${cssUrl(thumb)}")` } : undefined}
            >
              {thumb ? null : <img src="/app-icon.png" alt="" />}
            </div>
            <div className="player-title-wrap">
              <div className="player-title-text">{track?.title ?? "Nada selecionado"}</div>
              {playerError ? <p className="player-error">{playerError}</p> : null}
            </div>
          </div>
          <div className="player-controls-group">
            <button type="button" className="nav-btn" aria-label="Anterior" onClick={() => useWiki.getState().prev()}>
              <SkipBack size={16} />
            </button>
            <button type="button" className="play-square-btn" aria-label={playing ? "Pausar" : "Reproduzir"} onClick={() => useWiki.getState().toggleMain()}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button type="button" className="nav-btn" aria-label="Próxima" onClick={() => useWiki.getState().next()}>
              <SkipForward size={16} />
            </button>
            {track ? (
              <a className="dl-btn" href={track.url} download={audioFileName(track.title, track.url)} aria-label="Baixar áudio">
                <Download size={16} />
              </a>
            ) : (
              <span className="dl-btn" aria-disabled="true">
                <Download size={16} />
              </span>
            )}
          </div>
        </div>
        <div className="player-progress-row">
          <span className="player-time">{formatTime(current)}</span>
          <input
            className="player-progress-bar"
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={Number.isFinite(percent) ? percent : 0}
            style={{
              background: `linear-gradient(to right, var(--color-gold) 0%, var(--color-gold) ${Math.max(0, Math.min(100, percent))}%, var(--color-line) ${Math.max(0, Math.min(100, percent))}%, var(--color-line) 100%) center / 100% 2px no-repeat`,
            }}
            aria-label="Progresso da fala"
            onChange={(event) => useWiki.getState().seek(Number(event.target.value))}
          />
          <span className="player-time">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function useLazyVideos(signature: string) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLVideoElement>("video.lazy-video"));
    if (nodes.length === 0) return;
    if (!("IntersectionObserver" in window)) {
      for (const video of nodes) void video.play().catch(() => undefined);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) void video.play().catch(() => undefined);
          else video.pause();
        }
      },
      { threshold: 0.15 },
    );
    for (const video of nodes) observer.observe(video);
    return () => observer.disconnect();
  }, [signature]);
}
