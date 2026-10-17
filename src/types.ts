export type IngredientCategory =
  | '蔬菜'
  | '水果'
  | '肉類'
  | '海鮮'
  | '蛋奶'
  | '豆製品'
  | '主食'
  | '調味料'
  | '其他';

export type StorageLocation = '冷藏' | '冷凍' | '常溫';

export type StandardUnit = '顆' | '個' | '盒' | '包' | '片' | '克' | '毫升' | string;

export type EquipmentType =
  | '電鍋'
  | '氣炸鍋'
  | '微波爐'
  | '單口瓦斯爐'
  | '烤箱'
  | '不加熱';

export type DietStyle =
  | '一般'
  | '全素'
  | '蛋奶素'
  | '高蛋白'
  | '低醣'
  | '生酮偏好';

export type MissingMode = 'only_existing' | 'allow_up_to_2';

export type DurationOption = 15 | 30 | 60 | 0; // 0 means 不限

export interface UserProfile {
  userId: string;
  email: string;
  nickname: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  timezone: string;
  accountStatus: 'active' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface UserPreference {
  userId: string;
  dietStyles: DietStyle[];
  dietaryRestrictions: string[]; // 飲食禁忌 (e.g. 不吃牛、不吃豬)
  excludedFoods: string[]; // 不喜歡食材 (e.g. 香菜、苦瓜、青椒)
  allergens: string[]; // 過敏原 (必要排除 e.g. 花生、甲殼類海鮮、堅果、麩質)
  equipment: EquipmentType[];
  defaultServings: number;
  pantryStaples: string[]; // 已確認常備調味料 (e.g. 鹽、醬油、食用油、白胡椒、米酒、糖、香油)
  updatedAt: string;
}

export interface IngredientBatch {
  id: string;
  userId: string;
  canonicalName: string;
  displayName: string;
  category: IngredientCategory;
  quantity: number | null; // null when quantityMode is 'approximate' (約略／少量)
  unit: StandardUnit;
  quantityNote: string; // e.g., '少量' or '約半包' when quantity is null
  location: StorageLocation;
  expiryDate?: string; // YYYY-MM-DD optional
  note?: string;
  source: 'manual' | 'scan';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScanDraftItem {
  id: string;
  displayName: string;
  category: IngredientCategory;
  quantity: number | null;
  unit: StandardUnit;
  quantityNote: string;
  location: StorageLocation;
  status: 'confirmed' | 'needs_review';
  duplicateWarning?: string;
  mergeAction?: 'new_batch' | 'merge_existing' | 'overwrite_existing';
  targetBatchId?: string;
}

export interface RecipeIngredient {
  name: string;
  canonicalName: string;
  requiredQuantity: number | null; // null if 適量/少許
  unit: string;
  quantityText: string; // e.g. "2 顆" or "少許"
  isSeasoning: boolean;
  status: 'sufficient' | 'missing' | 'needs_check';
  matchedBatchId?: string;
  availableText?: string;
  note?: string;
}

export interface Recipe {
  id: string;
  sessionId: string;
  title: string;
  summary: string;
  servings: number;
  baseServings: number;
  durationMinutes: number;
  equipment: EquipmentType[];
  dietTags: string[];
  ingredients: RecipeIngredient[];
  missingCount: number;
  isAllSufficient: boolean;
  prioritizesExisting: boolean;
  steps: {
    stepNumber: number;
    title: string;
    instruction: string;
    tip?: string;
  }[];
  substitutions: {
    original: string;
    substitute: string;
    note: string;
  }[];
  imageKey: 'tomato_egg_tofu' | 'cabbage_pork_pot' | 'mushroom_chicken_rice' | 'cold_tofu_salad' | 'garlic_greens' | 'steamed_egg';
  swapNotice?: string; // e.g. "已改為：15分鐘／不加熱"
  createdAt: string;
}

export interface RecipeConstraints {
  servings: number;
  maxDuration: DurationOption;
  equipment: EquipmentType[];
  dietStyles: DietStyle[];
  dietaryRestrictions: string[];
  excludedFoods: string[];
  allergens: string[];
  pantryStaples: string[];
  missingMode: MissingMode;
}

export interface FavoriteItem {
  id: string;
  userId: string;
  recipeId: string;
  recipeSnapshot: Recipe;
  createdAt: string;
}

export interface ActualUsageItem {
  ingredientName: string;
  batchId: string | null; // null if unstocked / bought outside
  batchLabel: string;
  location?: StorageLocation;
  currentQuantity: number | null;
  currentNote: string;
  unit: string;
  usedQuantity: number | null;
  remainingQuantity: number | null;
  remainingNote: string; // required when currentQuantity is null ("少量")
  isUnstocked: boolean; // true for missing items bought externally: "僅記錄使用，不扣庫存"
  selected: boolean;
  batchVersion?: number;
}

export interface InventoryTransaction {
  id: string;
  userId: string;
  batchId: string;
  batchName: string;
  cookingEventId: string;
  quantityBefore: number | null;
  quantityDelta: number | null;
  quantityAfter: number | null;
  noteBefore: string;
  noteAfter: string;
  unit: string;
  type: 'cooking_deduct' | 'undo_restore';
  reversalOf?: string;
  createdAt: string;
}

export interface CookingEvent {
  id: string;
  userId: string;
  recipeSnapshot: Recipe;
  servingsCooked: number;
  actualUsage: ActualUsageItem[];
  transactions: InventoryTransaction[];
  requestId: string;
  status: 'completed' | 'undone';
  completedAt: string;
  undoneAt?: string;
}

export interface UsageCounter {
  userId: string;
  date: string; // YYYY-MM-DD in Asia/Taipei
  scanCount: number;
  scanLimit: number;
  generationCount: number;
  generationLimit: number;
}

export const CATEGORIES: IngredientCategory[] = [
  '蔬菜',
  '水果',
  '肉類',
  '海鮮',
  '蛋奶',
  '豆製品',
  '主食',
  '調味料',
  '其他',
];

export const LOCATIONS: StorageLocation[] = ['冷藏', '冷凍', '常溫'];

export const STANDARD_UNITS: StandardUnit[] = ['顆', '個', '盒', '包', '片', '克', '毫升', '條', '把', '匙'];

export const EQUIPMENT_OPTIONS: EquipmentType[] = [
  '電鍋',
  '氣炸鍋',
  '微波爐',
  '單口瓦斯爐',
  '烤箱',
  '不加熱',
];

export const DIET_STYLE_OPTIONS: DietStyle[] = [
  '一般',
  '全素',
  '蛋奶素',
  '高蛋白',
  '低醣',
  '生酮偏好',
];

export const COMMON_ALLERGENS = [
  '花生',
  '堅果',
  '甲殼類海鮮',
  '魚類',
  '雞蛋',
  '牛奶／乳製品',
  '大豆',
  '小麥／麩質',
  '芝麻',
];

export const COMMON_RESTRICTIONS = [
  '不吃牛',
  '不吃豬',
  '不吃羊',
  '不吃內臟',
  '不吃生食',
  '無酒精',
];

export const COMMON_PANTRY_STAPLES = [
  '食用油',
  '鹽',
  '醬油',
  '白胡椒',
  '黑胡椒',
  '糖',
  '米酒',
  '香油／麻油',
  '烏醋／白醋',
  '蒜頭',
];
