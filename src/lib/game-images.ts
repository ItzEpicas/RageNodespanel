const STEAM_HEADER = (appId: number) =>
  `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;

const GAME_IMAGE_MAP: Record<string, string> = {
  minecraft:
    "https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/key-art/Global-Header_Image-Tile_MC-Java-Bedrock_570x321.jpg",
  cs2: STEAM_HEADER(730),
  "counter-strike-2": STEAM_HEADER(730),
  rust: STEAM_HEADER(252490),
  "ark-survival-evolved": STEAM_HEADER(346110),
  "ark-survival-ascended": STEAM_HEADER(2399830),
  palworld: STEAM_HEADER(1623730),
  valheim: "https://a.storyblok.com/f/157036/3200x1834/c6f67b02d7/key-art-logo-s.png",
  "7-days-to-die": STEAM_HEADER(251570),
  dayz: STEAM_HEADER(221100),
  "garry-s-mod": STEAM_HEADER(4000),
  "garrys-mod": STEAM_HEADER(4000),
  "team-fortress-2": STEAM_HEADER(440),
  "left-4-dead-2": STEAM_HEADER(550),
  "killing-floor-2": STEAM_HEADER(232090),
  unturned: STEAM_HEADER(304930),
  terraria: "https://terraria.org/TerrariaLogoOG.png",
  factorio: STEAM_HEADER(427520),
  satisfactory: STEAM_HEADER(526870),
  "conan-exiles": STEAM_HEADER(440900),
  squad: STEAM_HEADER(393380),
  "insurgency-sandstorm": STEAM_HEADER(581320),
  "hell-let-loose": STEAM_HEADER(686810),
  "project-zomboid": STEAM_HEADER(108600),
  "space-engineers": STEAM_HEADER(244850),
  eco: STEAM_HEADER(382310),
  "vintage-story":
    "https://media.vintagestory.at/monthly_2024_12/2023-01-25_17-01-33.thumb.jpg.06eb8537dbae3d1efd0142817a1d5256.jpg",
  "fivem-gta-v-rp":
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg",
  rimworld: STEAM_HEADER(294100),
  "don-t-starve-together": STEAM_HEADER(322330),
  openttd: STEAM_HEADER(1536610),
  "assetto-corsa": STEAM_HEADER(244210),
  "american-truck-simulator": STEAM_HEADER(270880),
  "euro-truck-simulator-2": STEAM_HEADER(227300),
};

function slugifyGameName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getGameImageUrl(name: string, imageUrl?: string | null) {
  if (imageUrl) return imageUrl;
  return GAME_IMAGE_MAP[slugifyGameName(name)] ?? null;
}
