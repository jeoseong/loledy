export type Skin = {
  name: string;
  thumb: string;
  frameImg: string;
  splash: string;
  posX: number;
  posY: number;
  loadingImage?: string;
  circleImage?: string;
  playerIcon?: string;
  splashBgImage?: string;
  splashFrame?: ChampionSplashFrame;
};

export type ChampionSplashFrame = {
  x: number;
  y: number;
  zoom: number;
  opacity: number;
  radialX: number;
  radialY: number;
  radialSize: number;
  radialIntensity: number;
};

export type Champion = {
  id: number;
  name: string;
  title: string;
  tags: string;
  bio: string;
  imgUrl: string;
  splashUrl: string;
  loadingImage?: string;
  circleImage?: string;
  splashBgImage?: string;
  splashFrame?: ChampionSplashFrame;
  skins: Skin[];
};

export type ChampionInput = Omit<Champion, "id"> & { id?: number };

export type ElementLevel = "h2" | "h3" | "h4";

export type WikiElement = {
  id: number;
  champId: number;
  skinIndex: number;
  type: "title" | "quote";
  text: string;
  level?: ElementLevel;
  parentId?: number | null;
  categoryId?: number | null;
  audios?: string[];
  position?: "start" | "end";
  orderIndex: number;
};

export type ElementInput = Omit<WikiElement, "id"> & { id?: number };

export type Track = {
  url: string;
  title: string;
  quoteId: number;
};
