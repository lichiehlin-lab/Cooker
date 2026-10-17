import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ActualUsageItem,
  CookingEvent,
  FavoriteItem,
  IngredientBatch,
  InventoryTransaction,
  Recipe,
  RecipeConstraints,
  ScanDraftItem,
  UsageCounter,
  UserPreference,
  UserProfile,
} from '../types';
import { DEMO_RECIPES, buildAndValidateRecipe } from '../utils/recipeEngine';

export type RoutePath =
  | '/'
  | '/register'
  | '/verify-email'
  | '/login'
  | '/forgot-password'
  | '/reset-password'
  | '/onboarding'
  | '/inventory'
  | '/scan'
  | '/recipes'
  | '/recipe-detail'
  | '/favorites'
  | '/history'
  | '/account';

interface StoredAccount {
  profile: UserProfile;
  passwordHash: string;
  preference: UserPreference;
  inventory: IngredientBatch[];
  favorites: FavoriteItem[];
  history: CookingEvent[];
  usage: UsageCounter;
}

interface AppContextType {
  currentPath: RoutePath;
  selectedRecipeId: string | null;
  intendedPath: RoutePath | null;
  navigate: (path: RoutePath, options?: { recipeId?: string; requireAuth?: boolean }) => void;

  // Auth & User
  currentUser: UserProfile | null;
  preference: UserPreference | null;
  sessionExpiredNotice: boolean;
  setSessionExpiredNotice: (val: boolean) => void;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  loginAsDemoMember: () => void;
  register: (nickname: string, email: string, password: string) => { ok: boolean; error?: string };
  verifyCurrentEmail: () => void;
  updateUnverifiedEmail: (newEmail: string) => { ok: boolean; error?: string };
  logout: () => void;
  deleteAccount: (passwordConfirm: string) => { ok: boolean; error?: string };
  updateProfile: (nickname: string, email?: string) => { ok: boolean; emailChanged?: boolean; error?: string };
  savePreference: (pref: Partial<UserPreference>, markOnboardingDone?: boolean) => void;

  // Inventory
  inventory: IngredientBatch[];
  lastInventoryUpdatedAt: string | null;
  addBatch: (batch: Omit<IngredientBatch, 'id' | 'userId' | 'version' | 'createdAt' | 'updatedAt'>) => IngredientBatch;
  updateBatch: (id: string, updates: Partial<IngredientBatch>) => { ok: boolean; error?: string };
  deleteBatch: (id: string) => void;
  mergeBatches: (sourceId: string, targetId: string) => { ok: boolean; error?: string };
  commitScanDraft: (
    drafts: ScanDraftItem[],
    requestId: string
  ) => { ok: boolean; addedCount: number; updatedCount: number; error?: string };
  simulateExternalInventoryChange: () => void;

  // Recipes & Recommendation State
  activeConstraints: RecipeConstraints;
  setActiveConstraints: React.Dispatch<React.SetStateAction<RecipeConstraints>>;
  recommendedRecipes: Recipe[];
  setRecommendedRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  lastValidatedConstraintsJson: string;
  markConstraintsValidated: (constraints: RecipeConstraints) => void;
  hasConfirmedConstraintsThisSession: boolean;
  setHasConfirmedConstraintsThisSession: (val: boolean) => void;
  getRecipeById: (id: string) => Recipe | null;

  // Favorites & History
  favorites: FavoriteItem[];
  toggleFavorite: (recipe: Recipe) => boolean;
  isFavorite: (recipeId: string) => boolean;
  history: CookingEvent[];
  completeCooking: (
    recipe: Recipe,
    servingsCooked: number,
    usageItems: ActualUsageItem[],
    requestId: string
  ) => {
    ok: boolean;
    event?: CookingEvent;
    conflictError?: boolean;
    error?: string;
  };
  undoCookingEvent: (
    eventId: string,
    allowRecreateDeletedBatch?: boolean
  ) => {
    ok: boolean;
    needsRecreateConfirm?: boolean;
    deletedBatchNames?: string[];
    error?: string;
  };

  // Quota & Global AI Status
  usage: UsageCounter;
  consumeQuota: (type: 'scan' | 'generation', requestId: string) => { ok: boolean; error?: string };
  globalAiPaused: boolean;
  setGlobalAiPaused: (val: boolean) => void;

  // Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const STORAGE_KEY = 'fridge_good_cooking_db_v1';

export function getTaipeiDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function formatTaipeiDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function createInitialDemoAccount(): StoredAccount {
  const now = '2026-10-17T08:30:00.000Z';
  const userId = 'user-demo-01';
  const profile: UserProfile = {
    userId,
    email: 'lichieh.lin@gmail.com',
    nickname: '小安',
    emailVerified: true,
    onboardingCompleted: true,
    timezone: 'Asia/Taipei',
    accountStatus: 'active',
    createdAt: now,
    updatedAt: now,
  };

  const preference: UserPreference = {
    userId,
    dietStyles: ['一般', '高蛋白'],
    dietaryRestrictions: ['不吃牛'],
    excludedFoods: ['苦瓜', '香菜'],
    allergens: ['花生', '甲殼類海鮮'],
    equipment: ['電鍋', '單口瓦斯爐', '微波爐', '不加熱'],
    defaultServings: 2,
    pantryStaples: ['食用油', '鹽', '醬油', '白胡椒'],
    updatedAt: now,
  };

  const inventory: IngredientBatch[] = [
    {
      id: 'batch-egg-a',
      userId,
      canonicalName: '雞蛋',
      displayName: '雞蛋',
      category: '蛋奶',
      quantity: 4,
      unit: '顆',
      quantityNote: '',
      location: '冷藏',
      expiryDate: '2026-10-24',
      note: '冷藏批次A（白殼鮮蛋）',
      source: 'manual',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'batch-cabbage-a',
      userId,
      canonicalName: '高麗菜',
      displayName: '高麗菜',
      category: '蔬菜',
      quantity: 0.5,
      unit: '顆',
      quantityNote: '半顆',
      location: '冷藏',
      expiryDate: '2026-10-21',
      note: '高山高麗菜',
      source: 'manual',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'batch-tofu-a',
      userId,
      canonicalName: '板豆腐',
      displayName: '板豆腐',
      category: '豆製品',
      quantity: 1,
      unit: '盒',
      quantityNote: '',
      location: '冷藏',
      expiryDate: '2026-10-19',
      note: '傳統板豆腐',
      source: 'manual',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'batch-tomato-a',
      userId,
      canonicalName: '牛番茄',
      displayName: '牛番茄',
      category: '蔬菜',
      quantity: 2,
      unit: '顆',
      quantityNote: '',
      location: '冷藏',
      expiryDate: '2026-10-22',
      note: '',
      source: 'scan',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'batch-pork-a',
      userId,
      canonicalName: '豬梅花肉片',
      displayName: '豬梅花肉片',
      category: '肉類',
      quantity: 1,
      unit: '盒',
      quantityNote: '',
      location: '冷凍',
      expiryDate: '2026-11-05',
      note: '約 250 克盒裝',
      source: 'manual',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'batch-scallion-a',
      userId,
      canonicalName: '青蔥',
      displayName: '青蔥',
      category: '蔬菜',
      quantity: null,
      unit: '把',
      quantityNote: '少量',
      location: '冷藏',
      note: '已洗淨切段保存',
      source: 'scan',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'batch-milk-used',
      userId,
      canonicalName: '鮮奶',
      displayName: '鮮奶',
      category: '蛋奶',
      quantity: 0,
      unit: '盒',
      quantityNote: '',
      location: '冷藏',
      note: '早上已喝完',
      source: 'manual',
      version: 2,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const initialRecipe = buildAndValidateRecipe(
    DEMO_RECIPES[0],
    2,
    inventory,
    preference.pantryStaples,
    'session-init'
  );

  const favorites: FavoriteItem[] = [
    {
      id: 'fav-init-1',
      userId,
      recipeId: initialRecipe.id,
      recipeSnapshot: initialRecipe,
      createdAt: '2026-10-15T11:20:00.000Z',
    },
  ];

  const history: CookingEvent[] = [
    {
      id: 'cook-evt-demo-1',
      userId,
      recipeSnapshot: initialRecipe,
      servingsCooked: 2,
      actualUsage: [
        {
          ingredientName: '雞蛋',
          batchId: 'batch-egg-a',
          batchLabel: '冷藏批次A',
          location: '冷藏',
          currentQuantity: 6,
          currentNote: '',
          unit: '顆',
          usedQuantity: 2,
          remainingQuantity: 4,
          remainingNote: '',
          isUnstocked: false,
          selected: true,
        },
      ],
      transactions: [
        {
          id: 'tx-demo-1',
          userId,
          batchId: 'batch-egg-a',
          batchName: '雞蛋（冷藏批次A）',
          cookingEventId: 'cook-evt-demo-1',
          quantityBefore: 6,
          quantityDelta: -2,
          quantityAfter: 4,
          noteBefore: '',
          noteAfter: '',
          unit: '顆',
          type: 'cooking_deduct',
          createdAt: '2026-10-16T10:30:00.000Z',
        },
      ],
      requestId: 'req-demo-init-1',
      status: 'completed',
      completedAt: '2026-10-16T10:30:00.000Z',
    },
  ];

  const usage: UsageCounter = {
    userId,
    date: getTaipeiDateString(),
    scanCount: 1,
    scanLimit: 10,
    generationCount: 2,
    generationLimit: 30,
  };

  return {
    profile,
    passwordHash: 'demo12345678',
    preference,
    inventory,
    favorites,
    history,
    usage,
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PROTECTED_ROUTES: RoutePath[] = [
  '/onboarding',
  '/inventory',
  '/scan',
  '/recipes',
  '/favorites',
  '/history',
  '/account',
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Record<string, StoredAccount>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore storage error
    }
    const demo = createInitialDemoAccount();
    return { [demo.profile.userId]: demo };
  });

  // Default to logged in as Demo Member so the reviewer can immediately explore all P0 features,
  // OR log out to view the Visitor Home and full registration flow!
  const [activeUserId, setActiveUserId] = useState<string | null>('user-demo-01');
  const [currentPath, setCurrentPath] = useState<RoutePath>('/');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [intendedPath, setIntendedPath] = useState<RoutePath | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const [globalAiPaused, setGlobalAiPaused] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  const currentAccount = activeUserId ? accounts[activeUserId] || null : null;
  const currentUser = currentAccount?.profile || null;
  const preference = currentAccount?.preference || null;
  const inventory = currentAccount?.inventory || [];
  const favorites = currentAccount?.favorites || [];
  const history = currentAccount?.history || [];

  const [hasConfirmedConstraintsThisSession, setHasConfirmedConstraintsThisSession] = useState(true);

  const [activeConstraints, setActiveConstraints] = useState<RecipeConstraints>(() => ({
    servings: preference?.defaultServings || 2,
    maxDuration: 30,
    equipment: preference?.equipment || ['電鍋', '單口瓦斯爐', '微波爐', '不加熱'],
    dietStyles: preference?.dietStyles || ['一般'],
    dietaryRestrictions: preference?.dietaryRestrictions || ['不吃牛'],
    excludedFoods: preference?.excludedFoods || ['苦瓜', '香菜'],
    allergens: preference?.allergens || ['花生', '甲殼類海鮮'],
    pantryStaples: preference?.pantryStaples || ['食用油', '鹽', '醬油', '白胡椒'],
    missingMode: 'only_existing',
  }));

  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>(() => {
    return [
      buildAndValidateRecipe(DEMO_RECIPES[0], 2, inventory, activeConstraints.pantryStaples, 'init-s1'),
      buildAndValidateRecipe(DEMO_RECIPES[1], 2, inventory, activeConstraints.pantryStaples, 'init-s1'),
      buildAndValidateRecipe(DEMO_RECIPES[2], 2, inventory, activeConstraints.pantryStaples, 'init-s1'),
    ];
  });

  const [lastValidatedConstraintsJson, setLastValidatedConstraintsJson] = useState<string>(() =>
    JSON.stringify(activeConstraints)
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // ignore quota
    }
  }, [accounts]);

  // Sync activeConstraints when user switches account
  useEffect(() => {
    if (preference) {
      const next: RecipeConstraints = {
        servings: preference.defaultServings || 2,
        maxDuration: 30,
        equipment: preference.equipment.length > 0 ? preference.equipment : ['電鍋', '單口瓦斯爐'],
        dietStyles: preference.dietStyles.length > 0 ? preference.dietStyles : ['一般'],
        dietaryRestrictions: preference.dietaryRestrictions,
        excludedFoods: preference.excludedFoods,
        allergens: preference.allergens,
        pantryStaples: preference.pantryStaples,
        missingMode: 'only_existing',
      };
      setActiveConstraints(next);
      setLastValidatedConstraintsJson(JSON.stringify(next));
    }
  }, [activeUserId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const navigate = (
    path: RoutePath,
    options?: { recipeId?: string; requireAuth?: boolean }
  ) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (options?.recipeId) {
      setSelectedRecipeId(options.recipeId);
    }

    // Check auth protection
    if ((PROTECTED_ROUTES.includes(path) || options?.requireAuth) && !currentUser) {
      setIntendedPath(path);
      setCurrentPath('/login');
      return;
    }

    // Rule 5.2: 未驗證會員不得直接進入個人AI功能
    if (
      currentUser &&
      !currentUser.emailVerified &&
      (path === '/scan' || path === '/recipes')
    ) {
      showToast('請先完成 Email 驗證，即可使用 AI 拍照盤點與推薦料理功能。');
      setCurrentPath('/verify-email');
      return;
    }

    setCurrentPath(path);
  };

  const updateCurrentAccount = (updater: (acc: StoredAccount) => StoredAccount) => {
    if (!activeUserId) return;
    setAccounts((prev) => {
      const curr = prev[activeUserId];
      if (!curr) return prev;
      return {
        ...prev,
        [activeUserId]: updater(curr),
      };
    });
  };

  const login = (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const found = (Object.values(accounts) as StoredAccount[]).find(
      (a) =>
        a.profile.email.toLowerCase() === cleanEmail &&
        a.profile.accountStatus === 'active'
    );
    // Rule 5.3: 登入失敗使用「Email或密碼不正確」，不指出帳號是否存在。
    if (!found || found.passwordHash !== password) {
      return { ok: false, error: 'Email或密碼不正確' };
    }
    setActiveUserId(found.profile.userId);
    setSessionExpiredNotice(false);
    if (!found.profile.emailVerified) {
      setCurrentPath('/verify-email');
    } else if (intendedPath) {
      const target = intendedPath;
      setIntendedPath(null);
      setCurrentPath(target);
    } else {
      setCurrentPath('/');
    }
    return { ok: true };
  };

  const loginAsDemoMember = () => {
    if (!accounts['user-demo-01']) {
      const demo = createInitialDemoAccount();
      setAccounts((prev) => ({ ...prev, [demo.profile.userId]: demo }));
    }
    setActiveUserId('user-demo-01');
    setSessionExpiredNotice(false);
    setHasConfirmedConstraintsThisSession(true);
    setCurrentPath('/');
    showToast('已切換為示範會員「小安」');
  };

  const register = (nickname: string, email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const existing = (Object.values(accounts) as StoredAccount[]).find(
      (a) =>
        a.profile.email.toLowerCase() === cleanEmail &&
        a.profile.accountStatus === 'active'
    );
    if (existing) {
      return { ok: false, error: '此 Email 已註冊，請直接登入或使用忘記密碼。' };
    }

    const now = new Date().toISOString();
    const userId = `user-${Date.now()}`;
    const newProfile: UserProfile = {
      userId,
      email: cleanEmail,
      nickname: nickname.trim(),
      emailVerified: false,
      onboardingCompleted: false,
      timezone: 'Asia/Taipei',
      accountStatus: 'active',
      createdAt: now,
      updatedAt: now,
    };

    // Rule 5.4: 油、鹽、醬油不預設勾選；預設用餐人數1人
    const newPref: UserPreference = {
      userId,
      dietStyles: ['一般'],
      dietaryRestrictions: [],
      excludedFoods: [],
      allergens: [],
      equipment: [],
      defaultServings: 1,
      pantryStaples: [],
      updatedAt: now,
    };

    const newAccount: StoredAccount = {
      profile: newProfile,
      passwordHash: password,
      preference: newPref,
      inventory: [],
      favorites: [],
      history: [],
      usage: {
        userId,
        date: getTaipeiDateString(),
        scanCount: 0,
        scanLimit: 10,
        generationCount: 0,
        generationLimit: 30,
      },
    };

    setAccounts((prev) => ({ ...prev, [userId]: newAccount }));
    setActiveUserId(userId);
    setHasConfirmedConstraintsThisSession(false);
    setCurrentPath('/verify-email');
    return { ok: true };
  };

  const verifyCurrentEmail = () => {
    if (!currentAccount) return;
    updateCurrentAccount((acc) => ({
      ...acc,
      profile: {
        ...acc.profile,
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      },
    }));
    showToast('Email 驗證成功！');
    if (!currentAccount.profile.onboardingCompleted) {
      setCurrentPath('/onboarding');
    } else {
      setCurrentPath('/');
    }
  };

  const updateUnverifiedEmail = (newEmail: string) => {
    const clean = newEmail.trim().toLowerCase();
    if (!clean.includes('@')) {
      return { ok: false, error: '請輸入有效的 Email 格式。' };
    }
    updateCurrentAccount((acc) => ({
      ...acc,
      profile: {
        ...acc.profile,
        email: clean,
        emailVerified: false,
        updatedAt: new Date().toISOString(),
      },
    }));
    showToast('已更新 Email 地址並重新寄送驗證信。');
    return { ok: true };
  };

  const logout = () => {
    setActiveUserId(null);
    setCurrentPath('/');
    showToast('你已安全登出。');
  };

  const deleteAccount = (passwordConfirm: string) => {
    if (!currentAccount) return { ok: false, error: '尚未登入' };
    if (currentAccount.passwordHash !== passwordConfirm) {
      return { ok: false, error: '密碼驗證不正確，無法執行刪除。' };
    }
    const deletingId = currentAccount.profile.userId;
    setAccounts((prev) => {
      const next = { ...prev };
      delete next[deletingId];
      return next;
    });
    setActiveUserId(null);
    setCurrentPath('/');
    showToast('帳號已停用並排入清除程序，正式資料與圖片將於 7 日內清除。');
    return { ok: true };
  };

  const updateProfile = (nickname: string, email?: string) => {
    if (!currentAccount) return { ok: false, error: '未登入' };
    const cleanNickname = nickname.trim();
    if (!cleanNickname) return { ok: false, error: '暱稱不可為空' };

    let emailChanged = false;
    const cleanEmail = email ? email.trim().toLowerCase() : currentAccount.profile.email;
    if (cleanEmail !== currentAccount.profile.email.toLowerCase()) {
      emailChanged = true;
    }

    updateCurrentAccount((acc) => ({
      ...acc,
      profile: {
        ...acc.profile,
        nickname: cleanNickname,
        email: cleanEmail,
        emailVerified: emailChanged ? false : acc.profile.emailVerified,
        updatedAt: new Date().toISOString(),
      },
    }));

    return { ok: true, emailChanged };
  };

  const savePreference = (pref: Partial<UserPreference>, markOnboardingDone?: boolean) => {
    if (!currentAccount) return;
    const now = new Date().toISOString();
    updateCurrentAccount((acc) => {
      const updatedPref: UserPreference = {
        ...acc.preference,
        ...pref,
        updatedAt: now,
      };
      return {
        ...acc,
        profile: {
          ...acc.profile,
          onboardingCompleted: markOnboardingDone ? true : acc.profile.onboardingCompleted,
          updatedAt: now,
        },
        preference: updatedPref,
      };
    });

    setActiveConstraints((prev) => ({
      ...prev,
      servings: pref.defaultServings ?? prev.servings,
      equipment: pref.equipment ?? prev.equipment,
      dietStyles: pref.dietStyles ?? prev.dietStyles,
      dietaryRestrictions: pref.dietaryRestrictions ?? prev.dietaryRestrictions,
      excludedFoods: pref.excludedFoods ?? prev.excludedFoods,
      allergens: pref.allergens ?? prev.allergens,
      pantryStaples: pref.pantryStaples ?? prev.pantryStaples,
    }));
    setHasConfirmedConstraintsThisSession(true);
  };

  const addBatch = (
    batch: Omit<IngredientBatch, 'id' | 'userId' | 'version' | 'createdAt' | 'updatedAt'>
  ): IngredientBatch => {
    const now = new Date().toISOString();
    const newBatch: IngredientBatch = {
      ...batch,
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: activeUserId || 'guest',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    updateCurrentAccount((acc) => ({
      ...acc,
      inventory: [newBatch, ...acc.inventory],
    }));
    return newBatch;
  };

  const updateBatch = (id: string, updates: Partial<IngredientBatch>) => {
    if (updates.quantity !== undefined && updates.quantity !== null && updates.quantity < 0) {
      return { ok: false, error: '數量不得為負值' };
    }
    const now = new Date().toISOString();
    updateCurrentAccount((acc) => ({
      ...acc,
      inventory: acc.inventory.map((b) =>
        b.id === id
          ? {
              ...b,
              ...updates,
              version: b.version + 1,
              updatedAt: now,
            }
          : b
      ),
    }));
    return { ok: true };
  };

  const deleteBatch = (id: string) => {
    updateCurrentAccount((acc) => ({
      ...acc,
      inventory: acc.inventory.filter((b) => b.id !== id),
    }));
  };

  const mergeBatches = (sourceId: string, targetId: string) => {
    const source = inventory.find((b) => b.id === sourceId);
    const target = inventory.find((b) => b.id === targetId);
    if (!source || !target) {
      return { ok: false, error: '找不到要合併的食材批次。' };
    }
    // Rule 5.2 & 5.6: 僅對同單位做加減；無法換算單位時禁止自動合併
    if (source.unit !== target.unit) {
      return {
        ok: false,
        error: `單位不同（「${source.unit}」與「${target.unit}」），系統禁止自動換算合併，請先修改單位或保留獨立批次。`,
      };
    }
    if (source.quantity === null || target.quantity === null) {
      return {
        ok: false,
        error: '包含「約略／少量」的批次無法自動相加，請直接編輯目標批次的數量。',
      };
    }

    const combinedQty = Math.round((source.quantity + target.quantity) * 100) / 100;
    const now = new Date().toISOString();
    updateCurrentAccount((acc) => ({
      ...acc,
      inventory: acc.inventory
        .map((b) =>
          b.id === targetId
            ? {
                ...b,
                quantity: combinedQty,
                version: b.version + 1,
                updatedAt: now,
              }
            : b
        )
        .filter((b) => b.id !== sourceId),
    }));
    return { ok: true };
  };

  const commitScanDraft = (drafts: ScanDraftItem[], requestId: string) => {
    // Rule 5.6 & AC-06: 重送同一請求不能重複加入
    if (processedIds.has(requestId)) {
      return { ok: true, addedCount: 0, updatedCount: 0 };
    }

    let addedCount = 0;
    let updatedCount = 0;
    const now = new Date().toISOString();

    for (const d of drafts) {
      if (d.mergeAction === 'merge_existing' && d.targetBatchId) {
        const target = inventory.find((b) => b.id === d.targetBatchId);
        if (!target) {
          return { ok: false, addedCount: 0, updatedCount: 0, error: `找不到目標批次：${d.displayName}` };
        }
        if (target.unit !== d.unit) {
          return {
            ok: false,
            addedCount: 0,
            updatedCount: 0,
            error: `「${d.displayName}」單位（${d.unit}）與既有庫存單位（${target.unit}）不相容，禁止自動合併。`,
          };
        }
        if (target.quantity === null || d.quantity === null) {
          return {
            ok: false,
            addedCount: 0,
            updatedCount: 0,
            error: `「${d.displayName}」為約略／少量，無法自動合併相加，請改選「新增批次」或「更新指定批次」。`,
          };
        }
      }
    }

    updateCurrentAccount((acc) => {
      let nextInv = [...acc.inventory];

      for (const d of drafts) {
        if (d.mergeAction === 'merge_existing' && d.targetBatchId) {
          nextInv = nextInv.map((b) =>
            b.id === d.targetBatchId
              ? {
                  ...b,
                  quantity: Math.round(((b.quantity || 0) + (d.quantity || 0)) * 100) / 100,
                  version: b.version + 1,
                  updatedAt: now,
                }
              : b
          );
          updatedCount++;
        } else if (d.mergeAction === 'overwrite_existing' && d.targetBatchId) {
          nextInv = nextInv.map((b) =>
            b.id === d.targetBatchId
              ? {
                  ...b,
                  quantity: d.quantity,
                  unit: d.unit,
                  quantityNote: d.quantity === null ? d.quantityNote || '少量' : '',
                  location: d.location,
                  version: b.version + 1,
                  updatedAt: now,
                }
              : b
          );
          updatedCount++;
        } else {
          nextInv.unshift({
            id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            userId: acc.profile.userId,
            canonicalName: d.displayName.trim(),
            displayName: d.displayName.trim(),
            category: d.category,
            quantity: d.quantity,
            unit: d.unit,
            quantityNote: d.quantity === null ? d.quantityNote || '少量' : '',
            location: d.location,
            source: 'scan',
            version: 1,
            createdAt: now,
            updatedAt: now,
          });
          addedCount++;
        }
      }

      return {
        ...acc,
        inventory: nextInv,
      };
    });

    setProcessedIds((prev) => new Set(prev).add(requestId));
    return { ok: true, addedCount, updatedCount };
  };

  const simulateExternalInventoryChange = () => {
    const now = new Date().toISOString();
    updateCurrentAccount((acc) => ({
      ...acc,
      inventory: acc.inventory.map((b, idx) =>
        idx === 0
          ? {
              ...b,
              quantity: b.quantity !== null ? Math.max(1, b.quantity - 1) : b.quantity,
              version: b.version + 1,
              updatedAt: now,
            }
          : b
      ),
    }));
    showToast('已模擬另一台裝置修改了第一項庫存批次的版本號。');
  };

  const markConstraintsValidated = (constraints: RecipeConstraints) => {
    setLastValidatedConstraintsJson(JSON.stringify(constraints));
    setHasConfirmedConstraintsThisSession(true);
  };

  const getRecipeById = (id: string): Recipe | null => {
    const fromRec = recommendedRecipes.find((r) => r.id === id);
    if (fromRec) return fromRec;
    const fromFav = favorites.find((f) => f.recipeId === id);
    if (fromFav) return fromFav.recipeSnapshot;
    const fromHist = history.find((h) => h.recipeSnapshot.id === id);
    if (fromHist) return fromHist.recipeSnapshot;
    const fromDemo = DEMO_RECIPES.find((d) => d.id === id);
    if (fromDemo) {
      return buildAndValidateRecipe(
        fromDemo,
        activeConstraints.servings,
        inventory,
        activeConstraints.pantryStaples,
        'demo-lookup'
      );
    }
    return null;
  };

  const toggleFavorite = (recipe: Recipe): boolean => {
    if (!currentAccount) return false;
    const exists = favorites.some((f) => f.recipeId === recipe.id);
    if (exists) {
      updateCurrentAccount((acc) => ({
        ...acc,
        favorites: acc.favorites.filter((f) => f.recipeId !== recipe.id),
      }));
      showToast(`已從收藏移除「${recipe.title}」`);
      return false;
    } else {
      const newFav: FavoriteItem = {
        id: `fav-${Date.now()}`,
        userId: currentAccount.profile.userId,
        recipeId: recipe.id,
        recipeSnapshot: recipe,
        createdAt: new Date().toISOString(),
      };
      updateCurrentAccount((acc) => ({
        ...acc,
        favorites: [newFav, ...acc.favorites],
      }));
      showToast(`已收藏「${recipe.title}」`);
      return true;
    }
  };

  const isFavorite = (recipeId: string): boolean => {
    return favorites.some((f) => f.recipeId === recipeId);
  };

  const completeCooking = (
    recipe: Recipe,
    servingsCooked: number,
    usageItems: ActualUsageItem[],
    requestId: string
  ) => {
    if (!currentAccount) return { ok: false, error: '請先登入' };

    // Rule 5.7 & AC-11: 連點與重試僅產生一次扣除
    const existingEvent = history.find((h) => h.requestId === requestId);
    if (existingEvent) {
      return { ok: true, event: existingEvent };
    }

    const selectedItems = usageItems.filter((u) => u.selected);

    // 1. Validate versions & stock sufficiency before transaction
    for (const item of selectedItems) {
      if (item.isUnstocked || !item.batchId) {
        continue; // 採買但未入庫的食材標示「僅記錄使用，不扣庫存」
      }
      const latestBatch = inventory.find((b) => b.id === item.batchId);
      if (!latestBatch) {
        return {
          ok: false,
          conflictError: true,
          error: `食材批次「${item.ingredientName}」已在其他地方被移除，請重新確認。`,
        };
      }
      // Rule 5.10 & AC-12: 多裝置版本衝突顯示「庫存已在其他地方更新，請重新確認」
      if (item.batchVersion !== undefined && latestBatch.version !== item.batchVersion) {
        return {
          ok: false,
          conflictError: true,
          error: '庫存已在其他地方更新，請重新確認最新數量後再送出。',
        };
      }
      if (latestBatch.unit !== item.unit) {
        return {
          ok: false,
          error: `「${item.ingredientName}」單位（${item.unit}）與庫存批次單位（${latestBatch.unit}）不相容，請修正。`,
        };
      }
      if (latestBatch.quantity !== null) {
        const used = item.usedQuantity ?? 0;
        if (used < 0) {
          return { ok: false, error: `「${item.ingredientName}」使用量不可為負數。` };
        }
        if (used > latestBatch.quantity) {
          return {
            ok: false,
            error: `「${item.ingredientName}」庫存不足（目前可用 ${latestBatch.quantity} ${latestBatch.unit}，欲扣除 ${used} ${item.unit}）。`,
          };
        }
      } else {
        // Approximate ("少量") requires manual remaining note
        if (!item.remainingNote || !item.remainingNote.trim()) {
          return {
            ok: false,
            error: `「${item.ingredientName}」原為約略數量，請填寫使用後的剩餘狀態文字（例如：已用完、剩少許）。`,
          };
        }
      }
    }

    // 2. Execute atomic inventory update & cooking event creation
    const now = new Date().toISOString();
    const eventId = `cook-evt-${Date.now()}`;
    const transactions: InventoryTransaction[] = [];

    const nextInventory = inventory.map((batch) => {
      const usedItem = selectedItems.find(
        (u) => !u.isUnstocked && u.batchId === batch.id
      );
      if (!usedItem) return batch;

      if (batch.quantity !== null) {
        const used = usedItem.usedQuantity ?? 0;
        const after = Math.max(0, Math.round((batch.quantity - used) * 100) / 100);
        transactions.push({
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userId: currentAccount.profile.userId,
          batchId: batch.id,
          batchName: `${batch.displayName}（${batch.location}）`,
          cookingEventId: eventId,
          quantityBefore: batch.quantity,
          quantityDelta: -used,
          quantityAfter: after,
          noteBefore: batch.quantityNote,
          noteAfter: batch.quantityNote,
          unit: batch.unit,
          type: 'cooking_deduct',
          createdAt: now,
        });
        return {
          ...batch,
          quantity: after,
          version: batch.version + 1,
          updatedAt: now,
        };
      } else {
        const isDepleted = usedItem.remainingNote.trim() === '已用完' || usedItem.remainingNote.trim() === '0';
        transactions.push({
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userId: currentAccount.profile.userId,
          batchId: batch.id,
          batchName: `${batch.displayName}（${batch.location}）`,
          cookingEventId: eventId,
          quantityBefore: null,
          quantityDelta: null,
          quantityAfter: isDepleted ? 0 : null,
          noteBefore: batch.quantityNote || '少量',
          noteAfter: usedItem.remainingNote.trim(),
          unit: batch.unit,
          type: 'cooking_deduct',
          createdAt: now,
        });
        return {
          ...batch,
          quantity: isDepleted ? 0 : null,
          quantityNote: isDepleted ? '' : usedItem.remainingNote.trim(),
          version: batch.version + 1,
          updatedAt: now,
        };
      }
    });

    const newEvent: CookingEvent = {
      id: eventId,
      userId: currentAccount.profile.userId,
      recipeSnapshot: { ...recipe, servings: servingsCooked },
      servingsCooked,
      actualUsage: selectedItems,
      transactions,
      requestId,
      status: 'completed',
      completedAt: now,
    };

    updateCurrentAccount((acc) => ({
      ...acc,
      inventory: nextInventory,
      history: [newEvent, ...acc.history],
    }));

    return { ok: true, event: newEvent };
  };

  const undoCookingEvent = (eventId: string, allowRecreateDeletedBatch = false) => {
    if (!currentAccount) return { ok: false, error: '請先登入' };
    const event = history.find((h) => h.id === eventId);
    if (!event) return { ok: false, error: '找不到此筆料理紀錄。' };
    if (event.status === 'undone') {
      return { ok: false, error: '此筆料理紀錄已經撤銷過，無法重複撤銷。' };
    }

    // Check if any affected batch was deleted
    const deletedBatches = event.transactions.filter(
      (tx) => !inventory.some((b) => b.id === tx.batchId)
    );

    if (deletedBatches.length > 0 && !allowRecreateDeletedBatch) {
      return {
        ok: false,
        needsRecreateConfirm: true,
        deletedBatchNames: deletedBatches.map((d) => d.batchName),
        error: '原食材批次已刪除，可恢復為新批次',
      };
    }

    const now = new Date().toISOString();

    updateCurrentAccount((acc) => {
      let nextInv = [...acc.inventory];
      const undoTransactions: InventoryTransaction[] = [];

      for (const tx of event.transactions) {
        const existingIdx = nextInv.findIndex((b) => b.id === tx.batchId);
        if (existingIdx >= 0) {
          const curr = nextInv[existingIdx];
          // Rule 5.12 & AC-13: 只恢復該事件實際扣量，不覆蓋其他後續異動
          if (tx.quantityDelta !== null) {
            const restoredDelta = Math.abs(tx.quantityDelta);
            const baseQty = curr.quantity ?? 0;
            const afterQty = Math.round((baseQty + restoredDelta) * 100) / 100;
            nextInv[existingIdx] = {
              ...curr,
              quantity: afterQty,
              version: curr.version + 1,
              updatedAt: now,
            };
            undoTransactions.push({
              id: `tx-undo-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              userId: acc.profile.userId,
              batchId: curr.id,
              batchName: tx.batchName,
              cookingEventId: event.id,
              quantityBefore: curr.quantity,
              quantityDelta: restoredDelta,
              quantityAfter: afterQty,
              noteBefore: curr.quantityNote,
              noteAfter: curr.quantityNote,
              unit: curr.unit,
              type: 'undo_restore',
              reversalOf: tx.id,
              createdAt: now,
            });
          } else {
            nextInv[existingIdx] = {
              ...curr,
              quantity: null,
              quantityNote: tx.noteBefore || '少量',
              version: curr.version + 1,
              updatedAt: now,
            };
          }
        } else if (allowRecreateDeletedBatch) {
          const restoredQty = tx.quantityDelta !== null ? Math.abs(tx.quantityDelta) : null;
          const cleanName = tx.batchName.split('（')[0];
          const recreatedBatch: IngredientBatch = {
            id: `batch-restored-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            userId: acc.profile.userId,
            canonicalName: cleanName,
            displayName: cleanName,
            category: '其他',
            quantity: restoredQty,
            unit: tx.unit,
            quantityNote: restoredQty === null ? tx.noteBefore || '少量' : '',
            location: '冷藏',
            note: '由料理紀錄撤銷恢復之新批次',
            source: 'manual',
            version: 1,
            createdAt: now,
            updatedAt: now,
          };
          nextInv.unshift(recreatedBatch);
        }
      }

      const nextHistory = acc.history.map((h) =>
        h.id === eventId
          ? {
              ...h,
              status: 'undone' as const,
              undoneAt: now,
              transactions: [...h.transactions, ...undoTransactions],
            }
          : h
      );

      return {
        ...acc,
        inventory: nextInv,
        history: nextHistory,
      };
    });

    showToast('已撤銷本次扣除並恢復實際扣量。');
    return { ok: true };
  };

  const todayTaipei = getTaipeiDateString();
  const rawUsage = currentAccount?.usage || {
    userId: 'guest',
    date: todayTaipei,
    scanCount: 0,
    scanLimit: 10,
    generationCount: 0,
    generationLimit: 30,
  };

  const usage: UsageCounter =
    rawUsage.date === todayTaipei
      ? rawUsage
      : {
          ...rawUsage,
          date: todayTaipei,
          scanCount: 0,
          generationCount: 0,
        };

  const consumeQuota = (type: 'scan' | 'generation', requestId: string) => {
    if (globalAiPaused) {
      return {
        ok: false,
        error: '目前全站 AI 服務已達今日成本上限暫停提供，你仍可手動管理冰箱庫存與查看收藏食譜。',
      };
    }
    if (processedIds.has(`quota-${requestId}`)) {
      return { ok: true };
    }
    if (type === 'scan' && usage.scanCount >= usage.scanLimit) {
      return {
        ok: false,
        error: `今日拍照盤點配額已用完（剩餘 0 次），將於台北時間次日 00:00 重設。你仍可手動新增庫存或查看收藏。`,
      };
    }
    if (type === 'generation' && usage.generationCount >= usage.generationLimit) {
      return {
        ok: false,
        error: `今日 AI 推薦與換菜配額已用完（剩餘 0 次），將於台北時間次日 00:00 重設。你仍可管理庫存與查看收藏。`,
      };
    }

    setProcessedIds((prev) => new Set(prev).add(`quota-${requestId}`));
    updateCurrentAccount((acc) => ({
      ...acc,
      usage: {
        ...usage,
        scanCount: type === 'scan' ? usage.scanCount + 1 : usage.scanCount,
        generationCount: type === 'generation' ? usage.generationCount + 1 : usage.generationCount,
      },
    }));
    return { ok: true };
  };

  const lastInventoryUpdatedAt =
    inventory.length > 0
      ? inventory.reduce(
          (latest, b) => (b.updatedAt > latest ? b.updatedAt : latest),
          inventory[0].updatedAt
        )
      : null;

  return (
    <AppContext.Provider
      value={{
        currentPath,
        selectedRecipeId,
        intendedPath,
        navigate,
        currentUser,
        preference,
        sessionExpiredNotice,
        setSessionExpiredNotice,
        login,
        loginAsDemoMember,
        register,
        verifyCurrentEmail,
        updateUnverifiedEmail,
        logout,
        deleteAccount,
        updateProfile,
        savePreference,
        inventory,
        lastInventoryUpdatedAt,
        addBatch,
        updateBatch,
        deleteBatch,
        mergeBatches,
        commitScanDraft,
        simulateExternalInventoryChange,
        activeConstraints,
        setActiveConstraints,
        recommendedRecipes,
        setRecommendedRecipes,
        lastValidatedConstraintsJson,
        markConstraintsValidated,
        hasConfirmedConstraintsThisSession,
        setHasConfirmedConstraintsThisSession,
        getRecipeById,
        favorites,
        toggleFavorite,
        isFavorite,
        history,
        completeCooking,
        undoCookingEvent,
        usage,
        consumeQuota,
        globalAiPaused,
        setGlobalAiPaused,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
