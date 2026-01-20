
import { RarityKey, Rarity, Biome, ShopItem, FishData, Challenge } from './types';

export const RARITIES: Record<RarityKey, Rarity> = {
  [RarityKey.SUPER_COMMON]: { name: 'Super Common', color: '#94a3b8', multiplier: 1, weight: 1 },
  [RarityKey.COMMON]: { name: 'Common', color: '#4ade80', multiplier: 2, weight: 2 },
  [RarityKey.UNCOMMON]: { name: 'Uncommon', color: '#60a5fa', multiplier: 5, weight: 3 },
  [RarityKey.RARE]: { name: 'Rare', color: '#c084fc', multiplier: 12, weight: 4 },
  [RarityKey.LEGENDARY]: { name: 'Legendary', color: '#fbbf24', multiplier: 30, weight: 5 },
  [RarityKey.MYTHICAL]: { name: 'Mythical', color: '#f472b6', multiplier: 100, weight: 6 },
  [RarityKey.ASTROL]: { name: 'Astrol', color: '#22d3ee', multiplier: 500, weight: 7 }
};

export const BIOMES: Biome[] = [
  { id: 0, name: 'Sunlit Shallows', bg: '#0ea5e9', particle: '#bae6fd', minRank: 1 },
  { id: 1, name: 'Coral Gardens', bg: '#0284c7', particle: '#f472b6', minRank: 11 },
  { id: 2, name: 'Kelp Forest', bg: '#065f46', particle: '#34d399', minRank: 31 },
  { id: 3, name: 'Shipwreck Cove', bg: '#292524', particle: '#a8a29e', minRank: 61 },
  { id: 4, name: 'Twilight Zone', bg: '#1e1b4b', particle: '#818cf8', minRank: 101 },
  { id: 5, name: 'Midnight Trench', bg: '#000000', particle: '#312e81', minRank: 151 },
  { id: 6, name: 'Glass Reef', bg: '#0f172a', particle: '#f0f9ff', minRank: 211 },
  { id: 7, name: 'Crystal Caves', bg: '#312e81', particle: '#e879f9', minRank: 281 },
  { id: 8, name: 'Void Singularity', bg: '#000000', particle: '#ffffff', minRank: 361 }
];

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'rare_pot', name: 'Rare Potion', price: 100000, duration: 60, desc: 'Increases Rare fish spawns.' },
  { id: 'magnet', name: 'Magnetic Field', price: 25000, duration: 30, desc: 'Large auto-catch field around you.' },
  { id: 'power_pot', name: 'Power Potion', price: 50000, duration: 45, desc: 'Fixed 20 XP per catch.' },
  { id: 'speed_pot', name: 'Speed Potion', price: 100000, duration: 120, desc: '3x Submarine Speed.' },
  { id: 'slow_pot', name: 'Stasis Potion', price: 100000, duration: 120, desc: '3x Slower Fish.' }
];

export const CHALLENGES: Challenge[] = [
  { id: 'c1', tier: 1, title: 'Freshwater Start', desc: 'Catch 25 fish total.', targetType: 'catch_total', targetValue: 25, rewardCoins: 1000 },
  { id: 'c2', tier: 1, title: 'Ascending', desc: 'Reach Rank 5.', targetType: 'rank', targetValue: 5, rewardCoins: 2500 },
  { id: 'c3', tier: 1, title: 'New Discoveries', desc: 'Register 10 unique species.', targetType: 'registry_total', targetValue: 10, rewardCoins: 5000 },
  { id: 'c4', tier: 2, title: 'Ambitious', desc: 'Reach Rank 15.', targetType: 'rank', targetValue: 15, rewardCoins: 15000 },
  { id: 'c5', tier: 2, title: 'Proficient Fisher', desc: 'Catch 100 fish total.', targetType: 'catch_total', targetValue: 100, rewardCoins: 20000 },
  { id: 'c6', tier: 3, title: 'Encyclopedia', desc: 'Register 50 unique species.', targetType: 'registry_total', targetValue: 50, rewardCoins: 50000 },
  { id: 'c7', tier: 10, title: 'Abyssal Lord', desc: 'Reach Rank 100.', targetType: 'rank', targetValue: 100, rewardCoins: 250000 },
  { id: 'c8', tier: 4, title: 'Millionaire', desc: 'Accumulate 1,000,000 credits.', targetType: 'coins_total', targetValue: 1000000, rewardCoins: 500000 },
];

const SPECIES_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', 
  '#f43f5e', '#ec4899', '#78716c', '#475569', '#0891b2', 
  '#ea580c', '#65a30d', '#16a34a', '#2563eb', '#9333ea'
];

const PREFIXES = ["Neon", "Silver", "Golden", "Ghost", "Dark", "Spotted", "Striped", "Giant", "Mini", "Electric", "Abyssal", "Crystalline", "Volcanic", "Arctic", "Ancient", "Cyber", "Void", "Spectral", "Prismatic", "Majestic"];
const ADJECTIVES = ["Radiant", "Lurid", "Shimmering", "Fabled", "Ethereal", "Grim", "Swift", "Silent", "Luminous", "Frost", "Magma", "Stellar", "Glass", "Chrome", "Opal", "Shadow", "Brilliant", "Glow", "Sun", "Moon"];
const BODIES = ["Tetra", "Guppy", "Molly", "Angelfish", "Catfish", "Shark", "Ray", "Tuna", "Cod", "Eel", "Bass", "Snapper", "Mackerel", "Swordfish", "Salmon", "Trout", "Carp", "Goby", "Blenny", "Puffer"];

// Generate exactly 1000 unique species
export const GENERATED_FISH_DATA: FishData[] = Array.from({ length: 1000 }, (_, i) => {
  const rarityKeys = Object.keys(RARITIES) as RarityKey[];
  
  // Create a predictable but varied name using modulo to cycle through different combinations
  const pIdx = i % PREFIXES.length;
  const aIdx = Math.floor(i / PREFIXES.length) % ADJECTIVES.length;
  const bIdx = Math.floor(i / (PREFIXES.length * ADJECTIVES.length)) % BODIES.length;
  
  const name = `${PREFIXES[pIdx]} ${ADJECTIVES[aIdx]} ${BODIES[bIdx]}`;
  
  return {
    id: i + 1,
    name,
    rarity: rarityKeys[Math.floor(Math.random() * rarityKeys.length)],
    color: SPECIES_COLORS[Math.floor(Math.random() * SPECIES_COLORS.length)],
    habitats: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => Math.floor(Math.random() * 9))
  };
});

export const BASE_FISH_SPEED = 4.2;
export const GLOBAL_FISH_RADIUS = 12;
export const BASE_XP_VALUE = 5;
export const BASE_PLAYER_SPEED = 7.0;
