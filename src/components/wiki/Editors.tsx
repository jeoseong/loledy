import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bold, Italic, X } from "lucide-react";
import { readAsDataUrl } from "@/lib/wiki/files";
import { useWiki, type QuoteDraft, type TitleDraft } from "@/lib/wiki/store";
import { isMediaVideo, plainText } from "@/lib/wiki/text";
import type { ElementLevel, Skin } from "@/lib/wiki/types";
import type React from "react";

const emptySkin = (): Skin => ({ name: "", thumb: "", frameImg: "", splash: "", posX: 50, posY: 50 });

export function Editors() {
  const modal = useWiki((state) => state.modal);
  const confirm = useWiki((state) => state.confirm);

  useEffect(() => {
    if (modal.kind === "closed" && !confirm) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirm) useWiki.getState().cancelConfirm();
      else useWiki.getState().closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal.kind, confirm]);

  return (
    <>
      {modal.kind === "champ" ? <ChampionEditor id={modal.id} /> : null}
      {modal.kind === "skin" ? <SkinEditor champId={modal.champId} skinIndex={modal.skinIndex} /> : null}
      {modal.kind === "title" ? <TitleEditor id={modal.id} parentId={modal.parentId} /> : null}
      {modal.kind === "quote" ? <QuoteEditor id={modal.id} categoryId={modal.categoryId} /> : null}
      {modal.kind === "text" ? <TextImporter /> : null}
      {modal.kind === "media" ? <MediaEditor /> : null}
      {modal.kind === "transfer" ? <TransferEditor /> : null}
      {confirm ? (
        <div className="modal-overlay confirm-layer" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="confirmTitle">{confirm.title}</h3>
            </div>
            <p className="hint">{confirm.body}</p>
            <div className="row-actions">
              <button type="button" className="modal-btn delete-btn" onClick={() => void useWiki.getState().runConfirm()}>
                {confirm.confirmLabel}
              </button>
              <button type="button" className="modal-btn" onClick={() => useWiki.getState().cancelConfirm()}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div className="modal-content">
        <div className="modal-header">
          <h3 id="modalTitle">{title}</h3>
          <button type="button" className="close-modal" aria-label="Fechar" onClick={() => useWiki.getState().closeModal()}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ChampionEditor({ id }: { id: number | null }) {
  const champions = useWiki((state) => state.champions);
  const existing = id != null ? champions.find((champion) => champion.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [tags, setTags] = useState(existing?.tags ?? "MEIO, MAGO");
  const [bio, setBio] = useState(existing?.bio ?? "");

  return (
    <Shell title={id == null ? "Novo campeão" : "Editar campeão"}>
      <Field label="Nome do campeão">
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Epíteto">
        <input value={title} placeholder="a Guardiã do Eco" onChange={(event) => setTitle(event.target.value)} />
      </Field>
      <Field label="Posição">
        <input value={tags} placeholder="MEIO, MAGO" onChange={(event) => setTags(event.target.value)} />
      </Field>
      <Field label="Sinopse">
        <textarea rows={4} value={bio} onChange={(event) => setBio(event.target.value)} />
      </Field>
      <button
        type="button"
        className="modal-btn"
        onClick={() =>
          void useWiki.getState().saveChampion({
            ...(existing ?? {}),
            id: id ?? undefined,
            name,
            title,
            tags,
            bio,
            skins: existing?.skins?.length ? existing.skins : [emptySkin()],
          })
        }
      >
        Salvar campeão
      </button>
      {id != null ? (
        <button type="button" className="modal-btn delete-btn" onClick={() => useWiki.getState().removeChampion(id)}>
          Excluir campeão
        </button>
      ) : null}
    </Shell>
  );
}

function SkinEditor({ champId, skinIndex }: { champId: number; skinIndex: number | null }) {
  const champions = useWiki((state) => state.champions);
  const champion = champions.find((item) => item.id === champId);
  const existingSkin = skinIndex == null ? undefined : champion?.skins[skinIndex];
  const [name, setName] = useState(existingSkin?.name ?? "");

  if (!champion) {
    return (
      <Shell title="Skin indisponível">
        <p className="hint">Este campeão não foi encontrado.</p>
      </Shell>
    );
  }

  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      useWiki.getState().flash("Digite o nome da skin.");
      return;
    }

    const skins = champion.skins.length ? [...champion.skins] : [emptySkin()];
    if (skinIndex == null) {
      skins.push({ ...emptySkin(), name: trimmedName });
    } else if (skinIndex >= 0 && skinIndex < skins.length) {
      skins[skinIndex] = { ...skins[skinIndex], name: trimmedName };
    } else {
      useWiki.getState().flash("Esta skin não existe mais.");
      return;
    }

    void useWiki.getState().saveChampion({ ...champion, skins });
  };

  const remove = () => {
    if (skinIndex == null || !existingSkin) return;
    if (champion.skins.length <= 1) {
      useWiki.getState().flash("O campeão precisa ter pelo menos uma skin.");
      return;
    }

    useWiki.getState().askConfirm(
      {
        title: "Remover skin",
        body: `Remover "${existingSkin.name || "Skin sem nome"}" deste campeão?`,
        confirmLabel: "Remover",
      },
      async () => {
        const skins = champion.skins.filter((_, index) => index !== skinIndex);
        await useWiki.getState().saveChampion({ ...champion, skins });
        const current = useWiki.getState();
        if (current.champId === champId) {
          current.setSkin(Math.min(current.skinIndex, skins.length - 1));
        }
      },
    );
  };

  return (
    <Shell title={skinIndex == null ? "Adicionar skin" : "Editar skin"}>
      <Field label="Nome da skin">
        <input
          autoFocus
          value={name}
          placeholder="Clássica"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <button type="button" className="modal-btn" onClick={save}>
        {skinIndex == null ? "Adicionar skin" : "Salvar skin"}
      </button>
      {skinIndex != null ? (
        <button type="button" className="modal-btn delete-btn" onClick={remove}>
          Remover skin
        </button>
      ) : null}
    </Shell>
  );
}

function TitleEditor({ id, parentId }: { id: number | null; parentId: number | null }) {
  const elements = useWiki((state) => state.elements);
  const champId = useWiki((state) => state.champId);
  const skinIndex = useWiki((state) => state.skinIndex);
  const existing = id != null ? elements.find((item) => item.id === id) : undefined;
  const categories = elements.filter(
    (item) => item.champId === champId && item.type === "title" && (item.skinIndex ?? 0) === skinIndex && item.id !== id,
  );
  const [text, setText] = useState(existing?.text ?? "");
  const [level, setLevel] = useState<ElementLevel>(existing?.level ?? (parentId ? "h3" : "h2"));
  const [position, setPosition] = useState<"start" | "end">(existing?.position === "start" ? "start" : "end");
  const [parent, setParent] = useState<string>(
    existing?.parentId != null ? String(existing.parentId) : parentId != null ? String(parentId) : "",
  );

  const draft: TitleDraft = {
    id,
    text,
    level,
    position,
    parentId: parent ? Number(parent) : null,
  };

  return (
    <Shell title={id == null ? "Nova categoria" : "Editar categoria"}>
      <Field label="Categoria pai">
        <select value={parent} onChange={(event) => setParent(event.target.value)}>
          <option value="">Nenhuma (categoria principal)</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {plainText(category.text)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Posição">
        <select value={position} onChange={(event) => setPosition(event.target.value === "start" ? "start" : "end")}>
          <option value="end">Ao final</option>
          <option value="start">No início</option>
        </select>
      </Field>
      <Field label="Nível">
        <select value={level} onChange={(event) => setLevel(event.target.value as ElementLevel)}>
          <option value="h2">Categoria principal</option>
          <option value="h3">Subcategoria</option>
          <option value="h4">Título menor</option>
        </select>
      </Field>
      <Field label="Texto">
        <RichEditor initial={text} onChange={setText} />
      </Field>
      <button type="button" className="modal-btn" onClick={() => void useWiki.getState().saveTitle(draft)}>
        Salvar categoria
      </button>
      {id != null ? (
        <button type="button" className="modal-btn delete-btn" onClick={() => useWiki.getState().removeTitle(id)}>
          Excluir categoria
        </button>
      ) : null}
    </Shell>
  );
}

function QuoteEditor({ id, categoryId }: { id: number | null; categoryId: number | null }) {
  const elements = useWiki((state) => state.elements);
  const champId = useWiki((state) => state.champId);
  const skinIndex = useWiki((state) => state.skinIndex);
  const existing = id != null ? elements.find((item) => item.id === id && item.type === "quote") : undefined;
  const categories = elements.filter(
    (item) => item.champId === champId && item.type === "title" && (item.skinIndex ?? 0) === skinIndex,
  );
  const [text, setText] = useState(existing?.text ?? "");
  const [category, setCategory] = useState(
    existing?.categoryId != null ? String(existing.categoryId) : categoryId != null ? String(categoryId) : "",
  );
  const [position, setPosition] = useState<"start" | "end">(existing?.position === "start" ? "start" : "end");
  const [audios, setAudios] = useState<string[]>(existing?.audios?.length ? existing.audios : [""]);

  const draft: QuoteDraft = {
    id,
    text,
    categoryId: category ? Number(category) : null,
    position,
    audios,
  };

  return (
    <Shell title={id == null ? "Nova fala" : "Editar fala"}>
      <Field label="Categoria">
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Sem categoria</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {plainText(item.text)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Posição">
        <select value={position} onChange={(event) => setPosition(event.target.value === "start" ? "start" : "end")}>
          <option value="end">Ao final</option>
          <option value="start">No início</option>
        </select>
      </Field>
      <Field label="Transcrição">
        <RichEditor initial={text} onChange={setText} />
      </Field>
      <p className="field-label">Áudios</p>
      {audios.map((url, index) => (
        <div className="audio-input-row" key={index}>
          <input
            value={url}
            placeholder="URL .ogg, .mp3 ou arquivo"
            onChange={(event) =>
              setAudios((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
            }
          />
          <button
            type="button"
            className="remove-audio-btn"
            aria-label="Remover áudio"
            onClick={() => setAudios((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="row-actions">
        <button type="button" className="btn" onClick={() => setAudios((current) => [...current, ""])}>
          + URL
        </button>
        <label className="btn">
          Arquivo
          <input
            type="file"
            accept="audio/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void readAsDataUrl(file, 8_000_000)
                .then((url) => setAudios((current) => [...current.filter(Boolean), url]))
                .catch(() => useWiki.getState().flash("Áudio grande demais (máx. 8 MB)."));
            }}
          />
        </label>
      </div>
      <button type="button" className="modal-btn" onClick={() => void useWiki.getState().saveQuote(draft)}>
        Salvar fala
      </button>
      {id != null ? (
        <button type="button" className="modal-btn delete-btn" onClick={() => useWiki.getState().removeQuote(id)}>
          Excluir fala
        </button>
      ) : null}
    </Shell>
  );
}

function TextImporter() {
  const [text, setText] = useState("");
  return (
    <Shell title="Importar falas">
      <p className="hint">
        Uma linha sem travessão vira categoria. Uma linha com — ou hífen vira subcategoria. Falas começam com aspas,
        • ou -.
      </p>
      <Field label="Texto">
        <textarea
          rows={12}
          value={text}
          placeholder={"Movimentação\nPrimeiro movimento — inicial\n\n“Há ouro nas frestas.”"}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <button type="button" className="modal-btn" onClick={() => void useWiki.getState().importText(text)}>
        Importar nesta skin
      </button>
    </Shell>
  );
}

function MediaEditor() {
  const champions = useWiki((state) => state.champions);
  const champId = useWiki((state) => state.champId);
  const skinIndex = useWiki((state) => state.skinIndex);
  const champion = champions.find((item) => item.id === champId);
  const skin = champion?.skins[skinIndex] ?? champion?.skins[0];

  const [loadingImage, setLoadingImage] = useState(skin?.loadingImage || champion?.loadingImage || "");
  const [circleImage, setCircleImage] = useState(skin?.circleImage || champion?.circleImage || "");
  const [playerIcon, setPlayerIcon] = useState(skin?.playerIcon || "");
  const [splashBgImage, setSplashBgImage] = useState(
    skin?.splashBgImage || skin?.splash || champion?.splashBgImage || "",
  );
  const initialFrame = { ...defaultSplashFrame(), ...(skin?.splashFrame ?? champion?.splashFrame ?? {}) };
  const [frame, setFrame] = useState<SplashFrame>(initialFrame);
  const [draft, setDraft] = useState<SplashFrame>(initialFrame);

  useEffect(() => {
    setLoadingImage(skin?.loadingImage || champion?.loadingImage || "");
    setCircleImage(skin?.circleImage || champion?.circleImage || "");
    setPlayerIcon(skin?.playerIcon || "");
    setSplashBgImage(skin?.splashBgImage || skin?.splash || champion?.splashBgImage || "");
    const saved = { ...defaultSplashFrame(), ...(skin?.splashFrame ?? champion?.splashFrame ?? {}) };
    setFrame(saved);
    setDraft(saved);
  }, [
    champId, skinIndex, champion?.loadingImage, champion?.circleImage,
    skin?.loadingImage, skin?.circleImage, champion?.splashBgImage,
    champion?.splashFrame, skin?.playerIcon,
    skin?.splashBgImage, skin?.splash, skin?.splashFrame,
  ]);

  const updateFrame = (patch: Partial<SplashFrame>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  return (
    <Shell title="Imagens e vídeo">
      {!champion || !skin ? (
        <p className="hint">Selecione um campeão e uma skin antes de editar as imagens.</p>
      ) : (
        <>
          <p className="hint">
            Loading, círculo, splash, enquadramento e ícone do player pertencem à skin selecionada: {skin.name || `Skin ${skinIndex + 1}`}.
          </p>

          <Field label="1. Tela de loading (308 × 560)">
            <FilePick accept="image/*" onUrl={setLoadingImage} />
            {loadingImage ? <Preview src={loadingImage} variant="loading" /> : null}
          </Field>

          <Field label="2. Círculo (120 × 120)">
            <FilePick accept="image/*" onUrl={setCircleImage} />
            {circleImage ? <Preview src={circleImage} variant="circle" /> : null}
            <p className="hint">O círculo pertence à skin selecionada e aparece no carrossel, não no card inicial.</p>
          </Field>

          <Field label="3. Ícone do player desta skin (120 × 120)">
            <FilePick accept="image/*" onUrl={setPlayerIcon} />
            {playerIcon ? <Preview src={playerIcon} variant="player" /> : null}
          </Field>

          <Field label="4. Splash art de fundo desta skin">
            <FilePick
              accept="image/*"
              onUrl={(url) => {
                setSplashBgImage(url);
                const centeredFrame = defaultSplashFrame();
                setFrame(centeredFrame);
                setDraft(centeredFrame);
              }}
            />
            {splashBgImage ? (
              <div className="splash-background-live-preview">
                <p className="hint">
                  Prévia do recorte aplicado ao fundo da tela.
                </p>
                <SplashStaticPreview src={splashBgImage} frame={draft} />
              </div>
            ) : null}
          </Field>

          <section className="splash-framing-editor">
            <h4>5. Enquadramento da splash</h4>
            <p className="hint">
              Esta prévia mostra o recorte aplicado ao fundo da tela.
              Arraste para reposicionar ou use dois dedos para ajustar o zoom.
            </p>
            <div
              className="splash-radial-workspace"
              style={{ position: "relative", width: "100%" }}
            >
              <SplashGesturePreview
                src={splashBgImage}
                frame={draft}
                onChange={updateFrame}
              />
              <div
                className="splash-radial-overlay"
                style={{
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                  pointerEvents: "none",
                  touchAction: "pan-y",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: `${draft.radialX}%`,
                    top: `${draft.radialY}%`,
                    width: `${(draft.radialSize ?? 65) * 2}%`,
                    height: `${(draft.radialSize ?? 65) * 2}%`,
                    border: "1.5px dashed rgba(255,255,255,.9)",
                    borderRadius: "50%",
                    boxSizing: "border-box",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                  }}
                />
                <button
                  type="button"
                  aria-label="Arrastar centro do radial"
                  title="Arraste para mover o centro do radial"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                    const workspace = event.currentTarget.parentElement?.parentElement;
                    if (!workspace) return;
                    const rect = workspace.getBoundingClientRect();
                    if (!rect.width || !rect.height) return;
                    const radialX = Math.max(0, Math.min(
                      100, ((event.clientX - rect.left) / rect.width) * 100
                    ));
                    const radialY = Math.max(0, Math.min(
                      100, ((event.clientY - rect.top) / rect.height) * 100
                    ));
                    updateFrame({ radialX, radialY });
                  }}
                  onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                  }}
                  onPointerCancel={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                  }}
                  style={{
                    position: "absolute",
                    left: `${draft.radialX}%`,
                    top: `${draft.radialY}%`,
                    width: 30,
                    height: 30,
                    padding: 0,
                    border: "3px solid white",
                    borderRadius: "50%",
                    background: "rgba(80,160,255,.8)",
                    boxShadow: "0 0 0 3px rgba(0,0,0,.45)",
                    transform: "translate(-50%, -50%)",
                    cursor: "grab",
                    touchAction: "none",
                    pointerEvents: "auto",
                    zIndex: 5,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: 10,
                      height: 2,
                      background: "white",
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      width: 2,
                      height: 10,
                      background: "white",
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                </button>
              </div>
            </div>
            <div className="splash-radial-controls">
              <label>
                Opacidade da splash: {Math.round(draft.opacity)}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draft.opacity}
                  onChange={(event) => updateFrame({ opacity: Number(event.target.value) })}
                />
              </label>
              <label>
                Centro radial horizontal: {Math.round(draft.radialX)}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draft.radialX}
                  onChange={(event) => updateFrame({ radialX: Number(event.target.value) })}
                />
              </label>
              <label>
                Centro radial vertical: {Math.round(draft.radialY)}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draft.radialY}
                  onChange={(event) => updateFrame({ radialY: Number(event.target.value) })}
                />
              </label>
              <label>
                Tamanho do raio: {Math.round(draft.radialSize)}%
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={draft.radialSize}
                  onChange={(event) => updateFrame({ radialSize: Number(event.target.value) })}
                />
              </label>
              <label>
                Intensidade do degradê: {Math.round(draft.radialIntensity)}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draft.radialIntensity}
                  onChange={(event) => updateFrame({ radialIntensity: Number(event.target.value) })}
                />
              </label>
            </div>

            <div className="row-actions">
              <button type="button" className="modal-btn" onClick={() => setDraft({ ...frame })}>
                Descartar alterações
              </button>
              <button
                type="button"
                className="modal-btn"
                onClick={() => void useWiki.getState().saveQuickMedia(
                  loadingImage, circleImage, skinIndex, playerIcon, splashBgImage, draft,
                ).then(() => {
                  setFrame({ ...draft });
                })}
              >
                Salvar alterações
              </button>
              <button
                type="button"
                className="modal-btn"
                onClick={() => setDraft(defaultSplashFrame())}
              >
                Restaurar enquadramento
              </button>
            </div>
            <p className="hint">
              {JSON.stringify(frame) === JSON.stringify(draft)
                ? "Enquadramento sem alterações pendentes."
                : "Enquadramento alterado. Salve para aplicar."}
            </p>
          </section>
        </>
      )}
    </Shell>
  );
}

type SplashFrame = import("@/lib/wiki/types").ChampionSplashFrame;

function defaultSplashFrame(): SplashFrame {
  return {
    x: 50, y: 50, zoom: 100,
    opacity: 50, radialX: 50, radialY: 50,
    radialSize: 65, radialIntensity: 60,
  };
}

function SplashStaticPreview({
  src,
  frame,
}: {
  src: string;
  frame: SplashFrame;
}) {
  const image = src && !isMediaVideo(src);

  return (
    <div
      className="splash-framing-preview splash-framing-preview-static"
      role="img"
      aria-label="Prévia do fundo com o mesmo enquadramento da tela"
    >
      {image ? (
        <img
          className="splash-framing-art"
          src={src}
          alt=""
          draggable={false}
          style={{
            objectFit: "cover",
            objectPosition: `${frame.x}% ${frame.y}%`,
            opacity: (frame.opacity ?? 50) / 100,
            WebkitMaskImage: `radial-gradient(ellipse ${frame.radialSize ?? 65}% ${frame.radialSize ?? 65}% at ${frame.radialX ?? 50}% ${frame.radialY ?? 50}%, #000 0%, rgb(0 0 0 / ${1 - (frame.radialIntensity ?? 60) / 100}) 100%)`,
            maskImage: `radial-gradient(ellipse ${frame.radialSize ?? 65}% ${frame.radialSize ?? 65}% at ${frame.radialX ?? 50}% ${frame.radialY ?? 50}%, #000 0%, rgb(0 0 0 / ${1 - (frame.radialIntensity ?? 60) / 100}) 100%)`,
            transform: `scale(${Math.max(100, frame.zoom) / 100})`,
            transformOrigin: `${frame.x}% ${frame.y}%`,
          }}
        />
      ) : (
        <span>Selecione uma imagem de splash para visualizar o fundo.</span>
      )}
    </div>
  );
}

function SplashGesturePreview({
  src,
  frame,
  onChange,
}: {
  src: string;
  frame: SplashFrame;
  onChange: (patch: Partial<SplashFrame>) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    x: number; y: number; frameX: number; frameY: number;
    zoom: number; distance: number;
  } | null>(null);

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const begin = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!src || isMediaVideo(src)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      frameX: frame.x,
      frameY: frame.y,
      zoom: frame.zoom,
      distance: points.length >= 2 ? distance(points[0], points[1]) : 0,
    };
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const start = gesture.current;
    const bounds = boxRef.current?.getBoundingClientRect();
    if (!start || !bounds) return;

    const points = [...pointers.current.values()];
    if (points.length >= 2 && start.distance > 0) {
      onChange({ zoom: Math.max(100, Math.min(500, start.zoom * distance(points[0], points[1]) / start.distance)) });
      return;
    }

    const scale = Math.max(0.01, start.zoom / 100);
    onChange({
      x: Math.max(0, Math.min(100, start.frameX - (event.clientX - start.x) / bounds.width * 100 / scale)),
      y: Math.max(0, Math.min(100, start.frameY - (event.clientY - start.y) / bounds.height * 100 / scale)),
    });
  };

  const end = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    gesture.current = null;
    const points = [...pointers.current.values()];
    if (points.length) {
      const first = points[0];
      gesture.current = {
        x: first.x, y: first.y, frameX: frame.x, frameY: frame.y,
        zoom: frame.zoom,
        distance: points.length >= 2 ? distance(points[0], points[1]) : 0,
      };
    }
  };

  const image = src && !isMediaVideo(src)
    ? `url("${src.replace(/["\\\\\n\r]/g, "")}")`
    : "none";

  return (
    <div
      ref={boxRef}
      className="splash-framing-preview"
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      role="img"
      aria-label="Imagem completa com recorte central interativo da splash"
    >
      {image !== "none" ? (
        <img
          className="splash-framing-art"
          src={src}
          alt=""
          draggable={false}
          style={{
            objectPosition: `${frame.x}% ${frame.y}%`,
            opacity: (frame.opacity ?? 50) / 100,
            WebkitMaskImage: `radial-gradient(ellipse ${frame.radialSize ?? 65}% ${frame.radialSize ?? 65}% at ${frame.radialX ?? 50}% ${frame.radialY ?? 50}%, #000 0%, rgb(0 0 0 / ${1 - (frame.radialIntensity ?? 60) / 100}) 100%)`,
            maskImage: `radial-gradient(ellipse ${frame.radialSize ?? 65}% ${frame.radialSize ?? 65}% at ${frame.radialX ?? 50}% ${frame.radialY ?? 50}%, #000 0%, rgb(0 0 0 / ${1 - (frame.radialIntensity ?? 60) / 100}) 100%)`,
            transform: `scale(${Math.max(100, frame.zoom) / 100})`,
            transformOrigin: `${frame.x}% ${frame.y}%`,
          }}
        />
      ) : null}
    </div>
  );
}

function Preview({
  src,
  variant,
}: {
  src: string;
  variant: "loading" | "circle" | "splash" | "player";
}) {
  const styles = {
    loading: {
      width: "min(100%, 180px)", aspectRatio: "308 / 560",
      height: "auto", objectFit: "cover" as const, borderRadius: 0,
    },
    circle: {
      width: 120, height: 120, aspectRatio: "1",
      objectFit: "cover" as const, borderRadius: "50%",
    },
    splash: {
      width: "min(100%, 240px)", aspectRatio: "9 / 16",
      height: "auto", objectFit: "contain" as const, borderRadius: 0,
    },
    player: {
      width: 120, height: 120, aspectRatio: "1",
      objectFit: "cover" as const, borderRadius: 8,
    },
  }[variant];

  return (
    <img
      src={src}
      alt=""
      style={{
        display: "block",
        margin: "8px auto",
        ...styles,
        border: "1px solid var(--color-gold-line)",
      }}
    />
  );
}

function TransferEditor() {
  const champions = useWiki((state) => state.champions);
  const champId = useWiki((state) => state.champId);
  const skinIndex = useWiki((state) => state.skinIndex);
  const skins = champions.find((item) => item.id === champId)?.skins ?? [];
  const [from, setFrom] = useState(String(skinIndex));
  const [to, setTo] = useState(String(skinIndex === 0 ? Math.min(1, skins.length - 1) : 0));
  const [action, setAction] = useState<"copy" | "move">("copy");

  return (
    <Shell title="Copiar ou mover falas">
      <Field label="Skin de origem">
        <select value={from} onChange={(event) => setFrom(event.target.value)}>
          {skins.map((skin, index) => (
            <option key={index} value={index}>
              {skin.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Skin de destino">
        <select value={to} onChange={(event) => setTo(event.target.value)}>
          {skins.map((skin, index) => (
            <option key={index} value={index}>
              {skin.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ação">
        <select value={action} onChange={(event) => setAction(event.target.value === "move" ? "move" : "copy")}>
          <option value="copy">Copiar categorias e falas</option>
          <option value="move">Mover categorias e falas</option>
        </select>
      </Field>
      <button
        type="button"
        className="modal-btn"
        onClick={() => void useWiki.getState().transfer(Number(from), Number(to), action)}
      >
        Executar
      </button>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="form-group">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}

function FilePick({
  accept,
  onUrl,
  maxBytes = 4_000_000,
}: {
  accept: string;
  onUrl: (url: string) => void;
  maxBytes?: number;
}) {
  return (
    <input
      className="file-line"
      type="file"
      accept={accept}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        void readAsDataUrl(file, maxBytes)
          .then(onUrl)
          .catch(() => useWiki.getState().flash("Arquivo grande demais para guardar aqui."));
      }}
    />
  );
}

function RichEditor({ initial, onChange }: { initial: string; onChange: (html: string) => void }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (node && node.innerHTML !== initial) node.innerHTML = initial;
    // Only seed the editor when it mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);

  const format = (command: "bold" | "italic") => {
    node?.focus();
    document.execCommand(command);
    onChange(node?.innerHTML ?? "");
  };

  return (
    <div className="editor-container">
      <div
        ref={setNode}
        className="rich-editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
        onInput={() => onChange(node?.innerHTML ?? "")}
      />
      <div className="editor-toolbar-bottom">
        <button type="button" className="tb-btn" aria-label="Negrito" onMouseDown={(event) => event.preventDefault()} onClick={() => format("bold")}>
          <Bold size={14} />
        </button>
        <button type="button" className="tb-btn" aria-label="Itálico" onMouseDown={(event) => event.preventDefault()} onClick={() => format("italic")}>
          <Italic size={14} />
        </button>
        <label className="tb-btn">
          Imagem
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file || !node) return;
              void readAsDataUrl(file, 2_500_000)
                .then((url) => {
                  node.focus();
                  document.execCommand("insertHTML", false, `<img src="${url}" class="inline-icon" alt="">`);
                  onChange(node.innerHTML);
                })
                .catch(() => useWiki.getState().flash("Imagem grande demais (máx. 2,5 MB)."));
            }}
          />
        </label>
      </div>
    </div>
  );
}
