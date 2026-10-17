import {
  EquipmentType,
  IngredientBatch,
  Recipe,
  RecipeConstraints,
  RecipeIngredient,
} from '../types';

export function getTaipeiTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Calculates days remaining until expiryDate based on Asia/Taipei today.
 * Returns null if no expiryDate is set.
 * Negative number = already expired; 0 = expires today; 1..3 = expiring within 3 days.
 */
export function getDaysUntilExpiry(expiryDate?: string): number | null {
  if (!expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) return null;
  const todayStr = getTaipeiTodayStr();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [ey, em, ed] = expiryDate.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const expiryUtc = Date.UTC(ey, em - 1, ed);
  return Math.round((expiryUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

export function getExpiryStatusInfo(expiryDate?: string): {
  status: 'none' | 'expired' | 'expiring_soon' | 'normal';
  daysLeft: number | null;
  relativeText: string;
  fullText: string;
} {
  const days = getDaysUntilExpiry(expiryDate);
  if (days === null || !expiryDate) {
    return {
      status: 'none',
      daysLeft: null,
      relativeText: '未設定',
      fullText: '未設定保存期限',
    };
  }
  if (days < 0) {
    const overdue = Math.abs(days);
    return {
      status: 'expired',
      daysLeft: days,
      relativeText: `已過期 ${overdue} 天`,
      fullText: `已過期 ${overdue} 天（${expiryDate}）`,
    };
  }
  if (days === 0) {
    return {
      status: 'expiring_soon',
      daysLeft: 0,
      relativeText: '今日到期',
      fullText: `今日到期（${expiryDate}）`,
    };
  }
  if (days === 1) {
    return {
      status: 'expiring_soon',
      daysLeft: 1,
      relativeText: '明日到期',
      fullText: `明日到期（${expiryDate}）`,
    };
  }
  if (days <= 3) {
    return {
      status: 'expiring_soon',
      daysLeft: days,
      relativeText: `${days} 日後到期`,
      fullText: `${days} 日後到期（${expiryDate}）`,
    };
  }
  return {
    status: 'normal',
    daysLeft: days,
    relativeText: `剩 ${days} 天`,
    fullText: `${expiryDate}（剩 ${days} 天）`,
  };
}

export interface BaseRecipeTemplate {
  id: string;
  title: string;
  summary: string;
  baseServings: number;
  durationMinutes: number;
  equipment: EquipmentType[];
  dietTags: string[];
  containsAllergens: string[];
  containsRestrictions: string[];
  imageKey: Recipe['imageKey'];
  rawIngredients: {
    name: string;
    canonicalName: string;
    baseQuantity: number | null; // per baseServings
    unit: string;
    isSeasoning: boolean;
  }[];
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
}

export const DEMO_RECIPES: BaseRecipeTemplate[] = [
  {
    id: 'rec-tomato-egg-tofu',
    title: '家常番茄滑蛋燒板豆腐',
    summary: '利用板豆腐的豆香吸附微酸甜的番茄湯汁，搭配滑嫩雞蛋，一鍋到底快速上桌。',
    baseServings: 2,
    durationMinutes: 15,
    equipment: ['單口瓦斯爐'],
    dietTags: ['一般', '蛋奶素', '高蛋白', '低醣'],
    containsAllergens: ['雞蛋', '大豆'],
    containsRestrictions: [],
    imageKey: 'tomato_egg_tofu',
    rawIngredients: [
      { name: '雞蛋', canonicalName: '雞蛋', baseQuantity: 2, unit: '顆', isSeasoning: false },
      { name: '板豆腐', canonicalName: '板豆腐', baseQuantity: 1, unit: '盒', isSeasoning: false },
      { name: '牛番茄', canonicalName: '牛番茄', baseQuantity: 1, unit: '顆', isSeasoning: false },
      { name: '青蔥', canonicalName: '青蔥', baseQuantity: 1, unit: '把', isSeasoning: false },
      { name: '食用油', canonicalName: '食用油', baseQuantity: null, unit: '適量', isSeasoning: true },
      { name: '鹽', canonicalName: '鹽', baseQuantity: null, unit: '少許', isSeasoning: true },
      { name: '醬油', canonicalName: '醬油', baseQuantity: null, unit: '少許', isSeasoning: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: '備料切塊',
        instruction: '將板豆腐瀝乾切厚片，牛番茄洗淨切塊，青蔥切花，雞蛋打入碗中加少許鹽打散備用。',
        tip: '板豆腐先用紙巾壓乾表面水分，下鍋煎時才不會噴油。',
      },
      {
        stepNumber: 2,
        title: '香煎板豆腐',
        instruction: '平底鍋倒入食用油熱鍋，放入板豆腐以中火煎至兩面金黃微焦，先盛起或推至鍋邊。',
      },
      {
        stepNumber: 3,
        title: '翻炒番茄出汁',
        instruction: '原鍋放入牛番茄塊翻炒約 2 分鐘至果肉軟化釋出茄紅素湯汁，加入少許水與醬油調味。',
      },
      {
        stepNumber: 4,
        title: '淋入蛋液與收汁',
        instruction: '將豆腐回鍋煨煮 2 分鐘，轉小火淋入蛋液，待蛋液半凝固時輕輕推動，撒上蔥花即可起鍋。',
      },
    ],
    substitutions: [
      { original: '板豆腐', substitute: '嫩豆腐或百頁豆腐', note: '若改用嫩豆腐，切塊後於步驟 3 直接下鍋煨煮即可，不需先煎。' },
      { original: '青蔥', substitute: '九層塔或芹菜末', note: '若不吃蔥或剛好用完，可省略或改撒白胡椒提味。' },
    ],
  },
  {
    id: 'rec-cabbage-pork-pot',
    title: '電鍋千層高麗菜蒸梅花豬',
    summary: '免顧火的電鍋懶人料理，高麗菜的清甜與豬肉油脂完美融合，清爽不油膩。',
    baseServings: 2,
    durationMinutes: 30,
    equipment: ['電鍋'],
    dietTags: ['一般', '高蛋白', '低醣', '生酮偏好'],
    containsAllergens: ['大豆'],
    containsRestrictions: ['不吃豬'],
    imageKey: 'cabbage_pork_pot',
    rawIngredients: [
      { name: '高麗菜', canonicalName: '高麗菜', baseQuantity: 0.5, unit: '顆', isSeasoning: false },
      { name: '豬梅花肉片', canonicalName: '豬梅花肉片', baseQuantity: 1, unit: '盒', isSeasoning: false },
      { name: '雞蛋', canonicalName: '雞蛋', baseQuantity: 1, unit: '顆', isSeasoning: false },
      { name: '鹽', canonicalName: '鹽', baseQuantity: null, unit: '少許', isSeasoning: true },
      { name: '醬油', canonicalName: '醬油', baseQuantity: null, unit: '少許', isSeasoning: true },
      { name: '白胡椒', canonicalName: '白胡椒', baseQuantity: null, unit: '少許', isSeasoning: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: '洗切高麗菜',
        instruction: '將半顆高麗菜洗淨瀝乾，手撕或切成適口大片鋪在深碗或電鍋內鍋底部。',
      },
      {
        stepNumber: 2,
        title: '疊放豬肉片',
        instruction: '將豬梅花肉片均勻鋪在高麗菜上，一層菜、一層肉交錯疊放，撒上少許鹽與白胡椒。',
      },
      {
        stepNumber: 3,
        title: '電鍋蒸煮',
        instruction: '外鍋加入 1 杯水，放入內鍋蓋上鍋蓋，按下電鍋開關蒸約 20 分鐘。',
        tip: '蒸至最後 5 分鐘可打入 1 顆雞蛋做成半熟水波蛋。',
      },
      {
        stepNumber: 4,
        title: '淋醬享用',
        instruction: '開關跳起後燜 3 分鐘，依個人口味淋上少許醬油即可趁熱享用。',
      },
    ],
    substitutions: [
      { original: '豬梅花肉片', substitute: '雞腿肉片或板豆腐片', note: '可替換為去骨雞腿切薄片，蒸煮時間相同。' },
    ],
  },
  {
    id: 'rec-cold-tofu-egg',
    title: '免開火和風胡麻嫩拌豆腐佐溏心蛋',
    summary: '炎熱或不想開火時的 15 分鐘快速料理，利用現有板豆腐與雞蛋完成清爽高蛋白主菜。',
    baseServings: 1,
    durationMinutes: 15,
    equipment: ['不加熱', '微波爐'],
    dietTags: ['一般', '蛋奶素', '高蛋白', '低醣'],
    containsAllergens: ['大豆', '雞蛋'],
    containsRestrictions: [],
    imageKey: 'cold_tofu_salad',
    rawIngredients: [
      { name: '板豆腐', canonicalName: '板豆腐', baseQuantity: 0.5, unit: '盒', isSeasoning: false },
      { name: '雞蛋', canonicalName: '雞蛋', baseQuantity: 1, unit: '顆', isSeasoning: false },
      { name: '醬油', canonicalName: '醬油', baseQuantity: null, unit: '少許', isSeasoning: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: '處理豆腐',
        instruction: '將板豆腐取出瀝乾水分，切塊擺入淺盤中；若使用微波爐可先以中火溫熱 1 分鐘。',
      },
      {
        stepNumber: 2,
        title: '準備熟蛋',
        instruction: '將雞蛋打入馬克杯加入少許水（蓋過蛋黃）並用牙籤在蛋黃戳小孔，微波 50 秒成水波蛋，或搭配現有熟蛋。',
        tip: '若選擇完全不加熱，可省略雞蛋或直接使用現有即食配料。',
      },
      {
        stepNumber: 3,
        title: '淋醬完成',
        instruction: '將熟蛋鋪在豆腐上，淋上少許醬油即可享用。',
      },
    ],
    substitutions: [
      { original: '醬油', substitute: '和風柚子醬或鹽麴', note: '清爽酸甜更開胃。' },
    ],
  },
  {
    id: 'rec-cabbage-tofu-stirfry',
    title: '家常清炒高麗菜燒板豆腐',
    summary: '全素可食的暖胃家常菜，板豆腐煎香後與爽脆高麗菜同炒，簡單美味。',
    baseServings: 2,
    durationMinutes: 15,
    equipment: ['單口瓦斯爐'],
    dietTags: ['一般', '全素', '蛋奶素', '低醣'],
    containsAllergens: ['大豆'],
    containsRestrictions: [],
    imageKey: 'mushroom_chicken_rice',
    rawIngredients: [
      { name: '高麗菜', canonicalName: '高麗菜', baseQuantity: 0.5, unit: '顆', isSeasoning: false },
      { name: '板豆腐', canonicalName: '板豆腐', baseQuantity: 1, unit: '盒', isSeasoning: false },
      { name: '食用油', canonicalName: '食用油', baseQuantity: null, unit: '適量', isSeasoning: true },
      { name: '鹽', canonicalName: '鹽', baseQuantity: null, unit: '少許', isSeasoning: true },
      { name: '醬油', canonicalName: '醬油', baseQuantity: null, unit: '少許', isSeasoning: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: '備料',
        instruction: '板豆腐切塊，高麗菜洗淨撕成適口大小。',
      },
      {
        stepNumber: 2,
        title: '香煎豆腐',
        instruction: '熱鍋下食用油，將板豆腐煎至兩面金黃。',
      },
      {
        stepNumber: 3,
        title: '大火快炒高麗菜',
        instruction: '放入高麗菜與少許水、鹽、醬油，翻炒 3 分鐘至高麗菜脆甜入味即可起鍋。',
      },
    ],
    substitutions: [
      { original: '高麗菜', substitute: '青江菜或小白菜', note: '葉菜類皆可替換，快炒時間縮短 1 分鐘。' },
    ],
  },
  {
    id: 'rec-steamed-egg-tofu',
    title: '電鍋滑嫩鮮蔬豆腐蒸蛋',
    summary: '用電鍋就能做出布丁般滑順的家常蒸蛋，鋪上板豆腐與高麗菜絲，營養飽足。',
    baseServings: 2,
    durationMinutes: 15,
    equipment: ['電鍋', '微波爐'],
    dietTags: ['一般', '蛋奶素', '高蛋白', '低醣'],
    containsAllergens: ['雞蛋', '大豆'],
    containsRestrictions: [],
    imageKey: 'tomato_egg_tofu',
    rawIngredients: [
      { name: '雞蛋', canonicalName: '雞蛋', baseQuantity: 2, unit: '顆', isSeasoning: false },
      { name: '板豆腐', canonicalName: '板豆腐', baseQuantity: 0.5, unit: '盒', isSeasoning: false },
      { name: '高麗菜', canonicalName: '高麗菜', baseQuantity: 0.25, unit: '顆', isSeasoning: false },
      { name: '鹽', canonicalName: '鹽', baseQuantity: null, unit: '少許', isSeasoning: true },
      { name: '醬油', canonicalName: '醬油', baseQuantity: null, unit: '少許', isSeasoning: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: '切丁鋪底',
        instruction: '板豆腐切小丁、高麗菜切細絲，鋪於耐溫深盤底部。',
      },
      {
        stepNumber: 2,
        title: '調製蛋液',
        instruction: '雞蛋打散，加入約 1.5 倍溫水與少許鹽、醬油攪拌均勻，淋入深盤中。',
      },
      {
        stepNumber: 3,
        title: '加熱蒸熟',
        instruction: '電鍋外鍋放半杯水，鍋蓋夾一根筷子留縫，蒸約 10 分鐘至凝固即可。',
      },
    ],
    substitutions: [
      { original: '高麗菜', substitute: '玉米粒或鴻喜菇', note: '增加不同口感層次。' },
    ],
  },
];

export function formatQuantity(num: number | null): string {
  if (num === null) return '';
  const rounded = Math.round(num * 100) / 100;
  return String(rounded);
}

/**
 * Evaluates a recipe template against user's current inventory, pantry staples, and target servings.
 * Respects PRD Section 5.8: 期限已過項目不自動推薦使用。
 */
export function buildAndValidateRecipe(
  template: BaseRecipeTemplate,
  servings: number,
  inventory: IngredientBatch[],
  pantryStaples: string[],
  sessionId: string,
  swapNotice?: string
): Recipe {
  const ratio = servings / (template.baseServings || 1);
  // Available active batches (quantity > 0 or null approximate, AND not expired!)
  const availableBatches = inventory.filter((b) => {
    const hasStock = b.quantity === null || b.quantity > 0;
    const daysLeft = getDaysUntilExpiry(b.expiryDate);
    const isExpired = daysLeft !== null && daysLeft < 0;
    return hasStock && !isExpired;
  });

  let missingCount = 0;
  let needsCheckCount = 0;
  let matchedExistingCount = 0;

  const ingredients: RecipeIngredient[] = template.rawIngredients.map((raw) => {
    const scaledQty =
      raw.baseQuantity !== null
        ? Math.round(raw.baseQuantity * ratio * 10) / 10
        : null;
    const quantityText =
      scaledQty !== null ? `${formatQuantity(scaledQty)} ${raw.unit}` : raw.unit;

    if (raw.isSeasoning) {
      const inPantry = pantryStaples.some(
        (p) => p.includes(raw.name) || raw.name.includes(p.split('／')[0])
      );
      const inInventory = availableBatches.find(
        (b) =>
          b.displayName.includes(raw.name) ||
          b.canonicalName.includes(raw.canonicalName)
      );

      if (inPantry || inInventory) {
        return {
          name: raw.name,
          canonicalName: raw.canonicalName,
          requiredQuantity: scaledQty,
          unit: raw.unit,
          quantityText,
          isSeasoning: true,
          status: 'sufficient',
          matchedBatchId: inInventory?.id,
          availableText: inPantry ? '常備調味料已確認' : `庫存充足`,
        };
      } else {
        needsCheckCount++;
        return {
          name: raw.name,
          canonicalName: raw.canonicalName,
          requiredQuantity: scaledQty,
          unit: raw.unit,
          quantityText,
          isSeasoning: true,
          status: 'needs_check',
          availableText: '未勾選常備調味料',
          note: '請確認家中是否有此調味料',
        };
      }
    }

    // Main ingredient matching against non-expired inventory batches
    const matchingBatches = availableBatches
      .filter(
        (b) =>
          b.displayName.includes(raw.name) ||
          raw.name.includes(b.displayName) ||
          b.canonicalName === raw.canonicalName
      )
      // Prioritize batches expiring soonest (FEFO: First Expired, First Out)
      .sort((a, b) => {
        const da = getDaysUntilExpiry(a.expiryDate) ?? 9999;
        const db = getDaysUntilExpiry(b.expiryDate) ?? 9999;
        return da - db;
      });

    if (matchingBatches.length === 0) {
      missingCount++;
      return {
        name: raw.name,
        canonicalName: raw.canonicalName,
        requiredQuantity: scaledQty,
        unit: raw.unit,
        quantityText,
        isSeasoning: false,
        status: 'missing',
        availableText: '庫存無可用批次',
      };
    }

    // Check if there are batches with identical unit
    const sameUnitBatches = matchingBatches.filter((b) => b.unit === raw.unit);
    if (sameUnitBatches.length > 0) {
      const numericBatches = sameUnitBatches.filter((b) => b.quantity !== null);
      if (numericBatches.length > 0) {
        const totalAvailable = numericBatches.reduce(
          (sum, b) => sum + (b.quantity || 0),
          0
        );
        if (scaledQty === null || totalAvailable >= scaledQty) {
          matchedExistingCount++;
          return {
            name: raw.name,
            canonicalName: raw.canonicalName,
            requiredQuantity: scaledQty,
            unit: raw.unit,
            quantityText,
            isSeasoning: false,
            status: 'sufficient',
            matchedBatchId: numericBatches[0].id,
            availableText: `現有 ${formatQuantity(totalAvailable)} ${raw.unit}`,
          };
        } else {
          const shortage = Math.round((scaledQty - totalAvailable) * 10) / 10;
          missingCount++;
          return {
            name: raw.name,
            canonicalName: raw.canonicalName,
            requiredQuantity: scaledQty,
            unit: raw.unit,
            quantityText,
            isSeasoning: false,
            status: 'missing',
            matchedBatchId: numericBatches[0].id,
            availableText: `現有 ${formatQuantity(totalAvailable)} ${raw.unit}（不足 ${formatQuantity(shortage)} ${raw.unit}）`,
          };
        }
      } else {
        matchedExistingCount++;
        needsCheckCount++;
        return {
          name: raw.name,
          canonicalName: raw.canonicalName,
          requiredQuantity: scaledQty,
          unit: raw.unit,
          quantityText,
          isSeasoning: false,
          status: 'needs_check',
          matchedBatchId: sameUnitBatches[0].id,
          availableText: `現有「${sameUnitBatches[0].quantityNote || '約略／少量'}」`,
          note: '庫存為約略數量，請確認是否足夠',
        };
      }
    } else {
      const firstBatch = matchingBatches[0];
      matchedExistingCount++;
      needsCheckCount++;
      return {
        name: raw.name,
        canonicalName: raw.canonicalName,
        requiredQuantity: scaledQty,
        unit: raw.unit,
        quantityText,
        isSeasoning: false,
        status: 'needs_check',
        matchedBatchId: firstBatch.id,
        availableText:
          firstBatch.quantity !== null
            ? `現有 ${formatQuantity(firstBatch.quantity)} ${firstBatch.unit}（單位不同待確認）`
            : `現有「${firstBatch.quantityNote || '少量'}」`,
        note: '單位不同不自動換算，請人工確認',
      };
    }
  });

  const isAllSufficient = missingCount === 0 && needsCheckCount === 0;

  return {
    id: template.id,
    sessionId,
    title: template.title,
    summary: template.summary,
    servings,
    baseServings: template.baseServings,
    durationMinutes: template.durationMinutes,
    equipment: template.equipment,
    dietTags: template.dietTags,
    ingredients,
    missingCount,
    isAllSufficient,
    prioritizesExisting: matchedExistingCount >= 2,
    steps: template.steps,
    substitutions: template.substitutions,
    imageKey: template.imageKey,
    swapNotice,
    createdAt: new Date().toISOString(),
  };
}

export interface FilterEvaluationResult {
  recipes: Recipe[];
  rejectionReasons: string[];
  conflictError?: string;
}

export function recommendRecipes(
  constraints: RecipeConstraints,
  inventory: IngredientBatch[]
): FilterEvaluationResult {
  const sessionId = `session-${Date.now()}`;
  const rejectionReasons: string[] = [];

  if (constraints.equipment.length === 0) {
    return {
      recipes: [],
      rejectionReasons: ['尚未選擇任何可用烹調設備或「不加熱」選項。'],
      conflictError: '請至少勾選一項可用設備（或勾選「不加熱」）。',
    };
  }

  if (
    constraints.dietStyles.includes('全素') &&
    constraints.allergens.includes('大豆') &&
    constraints.missingMode === 'only_existing'
  ) {
    rejectionReasons.push('同時勾選「全素」與排除過敏原「大豆」，且限制只用現有食材。');
  }

  const candidates: Recipe[] = [];

  for (const tpl of DEMO_RECIPES) {
    const hitAllergen = tpl.containsAllergens.find((a) =>
      constraints.allergens.some((ua) => ua.includes(a) || a.includes(ua.split('／')[0]))
    );
    const ingredientHitAllergen = tpl.rawIngredients.find((ing) =>
      constraints.allergens.some((ua) => ing.name.includes(ua.split('／')[0]))
    );
    if (hitAllergen || ingredientHitAllergen) {
      rejectionReasons.push(`已排除含過敏原（${hitAllergen || ingredientHitAllergen?.name}）的食譜`);
      continue;
    }

    const hitRestriction = tpl.containsRestrictions.find((r) =>
      constraints.dietaryRestrictions.includes(r)
    );
    const hitExcluded = tpl.rawIngredients.find((ing) =>
      [...constraints.dietaryRestrictions, ...constraints.excludedFoods].some(
        (ex) => ex && ing.name.includes(ex.replace('不吃', ''))
      )
    );
    if (hitRestriction || hitExcluded) {
      rejectionReasons.push(`已排除含飲食禁忌或不喜歡食材的料理`);
      continue;
    }

    if (constraints.dietStyles.includes('全素') && !tpl.dietTags.includes('全素')) {
      rejectionReasons.push('部分食譜不符合「全素」條件');
      continue;
    }
    if (constraints.dietStyles.includes('蛋奶素') && !tpl.dietTags.includes('蛋奶素') && !tpl.dietTags.includes('全素')) {
      rejectionReasons.push('部分食譜不符合「蛋奶素」條件');
      continue;
    }

    const hasCompatibleEquipment = tpl.equipment.some((eq) =>
      constraints.equipment.includes(eq)
    );
    if (!hasCompatibleEquipment) {
      rejectionReasons.push(`部分食譜需要「${tpl.equipment.join('或')}」，不在目前勾選設備中`);
      continue;
    }

    if (constraints.maxDuration > 0 && tpl.durationMinutes > constraints.maxDuration) {
      rejectionReasons.push(`部分食譜烹調時間超過 ${constraints.maxDuration} 分鐘`);
      continue;
    }

    const built = buildAndValidateRecipe(
      tpl,
      constraints.servings,
      inventory,
      constraints.pantryStaples,
      sessionId
    );

    if (constraints.missingMode === 'only_existing' && built.missingCount > 0) {
      rejectionReasons.push(`「${built.title}」缺少 ${built.missingCount} 項主要食材（目前設定為只用現有食材）`);
      continue;
    }
    if (constraints.missingMode === 'allow_up_to_2' && built.missingCount > 2) {
      rejectionReasons.push(`「${built.title}」缺少超過 2 項食材`);
      continue;
    }

    candidates.push(built);
  }

  candidates.sort((a, b) => {
    if (a.isAllSufficient !== b.isAllSufficient) return a.isAllSufficient ? -1 : 1;
    if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount;
    return a.durationMinutes - b.durationMinutes;
  });

  return {
    recipes: candidates.slice(0, 3),
    rejectionReasons: Array.from(new Set(rejectionReasons)),
  };
}
