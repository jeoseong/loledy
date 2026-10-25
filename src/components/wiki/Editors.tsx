import { useEffect, useState, type ReactNode } from "react";
import { Bold, Italic, X } from "lucide-react";
import { readAsDataUrl } from "@/lib/wiki/files";
import { useWiki, type QuoteDraft, type TitleDraft } from "@/lib/wiki/store";
import { isMediaVideo, plainText } from "@/lib/wiki/text";
import type { ElementLevel, Skin } from "@/lib/wiki/types";

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
  const [tags, setTags] = useState(existing?.tags ?? (id == null ? "MEIO, MAGO" : ""));
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [skins, setSkins] = useState<Skin[]>(
    existing?.skins?.length ? existing.skins.map((skin) => ({ ...skin })) : [emptySkin()],
  );

  const patchSkin = (index: number, partial: Partial<Skin>) => {
    setSkins((current) => current.map((skin, skinIndex) => (skinIndex === index ? { ...skin, ...partial } : skin)));
  };

  return (
    <Shell title={id == null ? "Novo campeão" : "Editar campeão e skins"}>
      <Field label="Nome do campeão">
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Título / epíteto">
        <input value={title} placeholder="a Guardiã do Eco" onChange={(event) => setTitle(event.target.value)} />
      </Field>
      <Field label="Tags / posições">
        <input value={tags} placeholder="MEIO, MAGO" onChange={(event) => setTags(event.target.value)} />
      </Field>
      <Field label="Sinopse">
        <textarea rows={4} value={bio} onChange={(event) => setBio(event.target.value)} />
      </Field>
      <p className="field-label">Skins</p>
      {skins.map((skin, index) => (
        <div className="skin-editor-card" key={index}>
          <Field label="Nome da skin">
            <input
              value={skin.name}
              placeholder="Clássica"
              onChange={(event) => patchSkin(index, { name: event.target.value })}
            />
          </Field>
          <Field label="Miniatura do carrossel">
            <input
              value={skin.thumb}
              placeholder="URL da imagem"
              onChange={(event) => patchSkin(index, { thumb: event.target.value })}
            />
            <FilePick accept="image/*" onUrl={(url) => patchSkin(index, { thumb: url })} />
            <div className="pos-controls-row">
              <label>
                Posição X %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={skin.posX}
                  onChange={(event) => patchSkin(index, { posX: Number(event.target.value) })}
                />
              </label>
              <label>
                Posição Y %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={skin.posY}
                  onChange={(event) => patchSkin(index, { posY: Number(event.target.value) })}
                />
              </label>
            </div>
          </Field>
          <Field label="Moldura (imagem ou vídeo)">
            <input
              value={skin.frameImg}
              placeholder="URL de imagem ou .mp4"
              onChange={(event) => patchSkin(index, { frameImg: event.target.value })}
            />
            <FilePick accept="image/*,video/*" maxBytes={12_000_000} onUrl={(url) => patchSkin(index, { frameImg: url })} />
          </Field>
          <Field label="Splash de fundo">
            <input
              value={skin.splash}
              placeholder="URL da arte"
              onChange={(event) => patchSkin(index, { splash: event.target.value })}
            />
            <FilePick accept="image/*" onUrl={(url) => patchSkin(index, { splash: url })} />
          </Field>
          <button
            type="button"
            className="btn delete-btn"
            onClick={() => setSkins((current) => current.filter((_, skinIndex) => skinIndex !== index))}
          >
            Remover skin
          </button>
        </div>
      ))}
      <button type="button" className="btn" onClick={() => setSkins((current) => [...current, emptySkin()])}>
        + Adicionar skin
      </button>
      <button
        type="button"
        className="modal-btn"
        onClick={() =>
          void useWiki.getState().saveChampion({
            id: id ?? undefined,
            name,
            title,
            tags,
            bio,
            skins: skins.length ? skins : [emptySkin()],
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
  const [thumb, setThumb] = useState(skin?.thumb ?? "");
  const [frame, setFrame] = useState(skin?.frameImg ?? "");
  const [splash, setSplash] = useState(skin?.splash ?? "");

  return (
    <Shell title="Imagens e vídeo">
      <p className="hint">Arquivos ficam só neste aparelho. URLs continuam apontando para a internet.</p>
      <Field label="1. Miniatura da skin">
        <input value={thumb} placeholder="URL da imagem" onChange={(event) => setThumb(event.target.value)} />
        <FilePick accept="image/*" onUrl={setThumb} />
        {thumb && !isMediaVideo(thumb) ? <Preview src={thumb} /> : null}
      </Field>
      <Field label="2. Moldura retangular">
        <input value={frame} placeholder="URL de imagem ou vídeo" onChange={(event) => setFrame(event.target.value)} />
        <FilePick accept="image/*,video/*" maxBytes={12_000_000} onUrl={setFrame} />
      </Field>
      <Field label="3. Splash de fundo">
        <input value={splash} placeholder="URL da arte" onChange={(event) => setSplash(event.target.value)} />
        <FilePick accept="image/*" onUrl={setSplash} />
        {splash && !isMediaVideo(splash) ? <Preview src={splash} wide /> : null}
      </Field>
      <button type="button" className="modal-btn" onClick={() => void useWiki.getState().saveQuickMedia(thumb, frame, splash)}>
        Salvar alterações
      </button>
    </Shell>
  );
}

function Preview({ src, wide }: { src: string; wide?: boolean }) {
  return (
    <img
      src={src}
      alt=""
      style={{
        display: "block",
        marginTop: 8,
        width: wide ? "100%" : 72,
        height: wide ? 96 : 72,
        objectFit: "cover",
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
