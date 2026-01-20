
export enum RarityKey {
  SUPER_COMMON = 'SUPER_COMMON',
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  LEGENDARY = 'LEGENDARY',
  MYTHICAL = 'MYTHICAL',
  ASTROL = 'ASTROL'
}

export interface Rarity {
  name: string;
  color: string;
  multiplier: number;
  weight: number;
}

export interface Biome {
  id: number;
  name: string;
  bg: string;
  particle: string;
  minRank: number;
}

export interface FishData {
  id: number;
  name: string;
  rarity: RarityKey;
  color: string;
  habitats: number[];
}

export interface ActiveFish {
  x: number;
  y: number;
  r: number;
  data: FishData;
  osc: number;
  speed: number;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  duration: number;
  desc: string;
}

export interface UserStats {
  [key: number]: {
    count: number;
  };
}

export interface Challenge {
  id: string;
  tier: number;
  title: string;
  desc: string;
  targetType: 'catch_total' | 'rank' | 'coins_total' | 'registry_total';
  targetValue: number;
  rewardCoins: number;
}

export interface GameState {
  lvl: number;
  xp: number;
  coins: number;
  stats: UserStats;
  biome: Biome;
  activeBuffs: { [key: string]: number };
  activeChallenges: Challenge[];
  completedChallengeIds: string[];
  claimedChallengeIds: string[];
  challengeCooldowns: { [id: string]: number };
  submarineName: string;
  friends: string[];
}

export interface SocialInteraction {
  type: 'trade' | 'battle' | 'maze';
  targetFriend: string;
  status: 'requesting' | 'accepted' | 'declined' | 'in_progress' | 'completed';
}
