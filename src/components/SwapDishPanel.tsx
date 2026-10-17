import React, { useState } from 'react';
import {
  ArrowLeft,
  X,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Send,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  EquipmentType,
  IngredientBatch,
  Recipe,
  RecipeConstraints,
} from '../types';
import {
  BaseRecipeTemplate,
  DEMO_RECIPES,
  buildAndValidateRecipe,
} from '../utils/recipeEngine';

interface SwapDishPanelProps {
  recipe: Recipe;
  constraints: RecipeConstraints;
  inventory: IngredientBatch[];
  onClose: () => void;
  onReplaceRecipe: (
    oldRecipeId: string,
    newRecipe: Recipe,
    updatedPartialConstraints?: Partial<RecipeConstraints>
  ) => void;
  onFocusFilterPanel: () => void;
  consumeGenerationQuota: (reqId: string) => { ok: boolean; error?: string };
}

const QUICK_SWAP_CHIPS = ['換一道', '不要辣', '改成15分鐘', '不用開火'];

export const SwapDishPanel: React.FC<SwapDishPanelProps> = ({
  recipe,
  constraints,
  inventory,
  onClose,
  onReplaceRecipe,
  onFocusFilterPanel,
  consumeGenerationQuota,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [allergenBlockedNotice, setAllergenBlockedNotice] = useState<string | null>(null);

  const executeSwap = async (promptText: string) => {
    const cleanMsg = promptText.trim();
    if (!cleanMsg || isLoading) return;

    setErrorReason(null);
    setAllergenBlockedNotice(null);

    // Client-side pre-check for Rule 5.8: 訊息要求取消過敏原時，導向條件面板明確修改，不能默默解除。
    for (const allergen of constraints.allergens) {
      const shortName = allergen.split('／')[0];
      if (
        cleanMsg.includes(shortName) &&
        (cleanMsg.includes('可以') ||
          cleanMsg.includes('取消') ||
          cleanMsg.includes('解除') ||
          cleanMsg.includes('不怕') ||
          cleanMsg.includes('加'))
      ) {
        setAllergenBlockedNotice(
          `你的訊息提及解除必要排除過敏原「${allergen}」。為確保飲食安全，換菜對話不會默默取消過敏原；請返回條件面板明確修改過敏原設定。`
        );
        return;
      }
    }

    const reqId = `swap-${Date.now()}`;
    const quota = consumeGenerationQuota(reqId);
    if (!quota.ok) {
      setErrorReason(quota.error || '今日推薦與換菜配額已用完');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentRecipe: recipe,
          message: cleanMsg,
          constraints,
          inventory,
          requestId: reqId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.code === 'ALLERGEN_MODIFICATION_BLOCKED') {
          setAllergenBlockedNotice(data.message);
        } else {
          setErrorReason(
            data.message || '目前沒有符合此微調與限制條件的替代方案，建議保留原料理或調整條件。'
          );
        }
        setIsLoading(false);
        return;
      }

      // Compute updated constraints if user requested 15分鐘 or 不用開火
      let nextDuration = constraints.maxDuration;
      let nextEquipment: EquipmentType[] = [...constraints.equipment];
      const notices: string[] = [];

      if (cleanMsg.includes('15分鐘') || cleanMsg.includes('15 分鐘')) {
        nextDuration = 15;
        notices.push('15分鐘');
      }
      if (cleanMsg.includes('不用開火') || cleanMsg.includes('不加熱')) {
        nextEquipment = ['不加熱'];
        notices.push('不加熱');
      }

      const swapNotice =
        data.swapNotice ||
        (notices.length > 0 ? `已改為：${notices.join('／')}` : `已依「${cleanMsg}」微調`);

      // Find a matching alternate template that strictly satisfies allergens, restrictions, and updated equipment/duration
      const alternateTemplates = DEMO_RECIPES.filter((tpl) => {
        if (tpl.id === recipe.id && cleanMsg === '換一道') return false;
        // Strict allergen check
        const hitAllergen = tpl.containsAllergens.some((a) =>
          constraints.allergens.some((ua) => ua.includes(a) || a.includes(ua.split('／')[0]))
        );
        if (hitAllergen) return false;

        // Strict restriction check
        const hitRestriction = tpl.containsRestrictions.some((r) =>
          constraints.dietaryRestrictions.includes(r)
        );
        if (hitRestriction) return false;

        // Equipment check
        if (!tpl.equipment.some((eq) => nextEquipment.includes(eq))) {
          return false;
        }

        // Duration check
        if (nextDuration > 0 && tpl.durationMinutes > nextDuration) {
          return false;
        }

        return true;
      });

      if (alternateTemplates.length === 0) {
        setErrorReason(
          `在目前設定（${nextDuration ? nextDuration + '分鐘內 · ' : ''}設備：${nextEquipment.join('／')} · 排除過敏原：${constraints.allergens.join('、') || '無'}）下，找不到可替換的合格料理。系統不會私自放寬限制。`
        );
        setIsLoading(false);
        return;
      }

      const chosenTemplate: BaseRecipeTemplate =
        alternateTemplates.find((t) => t.id !== recipe.id) || alternateTemplates[0];

      const customizedTemplate: BaseRecipeTemplate = {
        ...chosenTemplate,
        id: `${chosenTemplate.id}-swap-${Date.now().toString().slice(-4)}`,
        title:
          cleanMsg === '不要辣' && !chosenTemplate.title.includes('不辣')
            ? `${chosenTemplate.title}（溫和不辣版）`
            : chosenTemplate.title,
      };

      const builtNewRecipe = buildAndValidateRecipe(
        customizedTemplate,
        constraints.servings,
        inventory,
        constraints.pantryStaples,
        recipe.sessionId,
        swapNotice
      );

      // Verify missingMode constraint
      if (constraints.missingMode === 'only_existing' && builtNewRecipe.missingCount > 0) {
        setErrorReason(
          `找到候選料理「${builtNewRecipe.title}」，但缺少 ${builtNewRecipe.missingCount} 項食材，不符合「只用現有食材」設定。`
        );
        setIsLoading(false);
        return;
      }

      onReplaceRecipe(
        recipe.id,
        builtNewRecipe,
        notices.length > 0
          ? { maxDuration: nextDuration, equipment: nextEquipment }
          : undefined
      );
      setIsLoading(false);
      onClose();
    } catch {
      setIsLoading(false);
      setErrorReason('網路或 AI 服務連線異常，請重試或保留原料理。');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="swap-panel-title"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
    >
      {/* Full page on mobile, 440px side drawer on desktop */}
      <div className="w-full md:max-w-[440px] h-full bg-[#FAF7F2] md:border-l border-[#DED3C7] flex flex-col justify-between overflow-y-auto">
        <div className="p-4 md:p-6 space-y-5">
          {/* Top Bar with Back on Mobile & Close on Desktop */}
          <div className="flex items-center justify-between border-b border-[#DED3C7] pb-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-2 flex items-center gap-1.5 text-base font-semibold text-[#2E2925] hover:text-[#A8462D] cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              <span>返回</span>
            </button>
            <h2 id="swap-panel-title" className="text-lg font-bold text-[#2E2925]">
              動態換菜與微調
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉換菜面板"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white text-[#655A50] cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Currently Adjusting Recipe Info */}
          <div className="bg-white rounded-[16px] p-4 border border-[#DED3C7] space-y-2">
            <span className="text-xs font-semibold text-[#A8462D]">正在調整的料理</span>
            <h3 className="text-lg font-bold text-[#2E2925]">{recipe.title}</h3>
            <p className="text-xs text-[#655A50]">
              送出後只會替換這張料理卡，其他推薦料理與你的冰箱庫存皆保持不變。
            </p>
          </div>

          {/* Current Constraints Summary (Retained automatically) */}
          <div className="bg-white rounded-[16px] p-4 border border-[#DED3C7] space-y-2.5 text-sm">
            <div className="font-semibold text-[#2E2925]">目前保留的限制條件：</div>
            <div className="flex items-center justify-between text-[#655A50]">
              <span>用餐人數：</span>
              <span className="font-semibold text-[#2E2925] tabular-nums">
                {constraints.servings} 人份
              </span>
            </div>
            <div className="flex items-center justify-between text-[#655A50]">
              <span>時間限制：</span>
              <span className="font-semibold text-[#2E2925] tabular-nums">
                {constraints.maxDuration > 0 ? `${constraints.maxDuration} 分鐘內` : '不限時間'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#655A50]">
              <span>可用設備：</span>
              <span className="font-semibold text-[#2E2925]">
                {constraints.equipment.join('／')}
              </span>
            </div>
            <div className="pt-2 border-t border-[#DED3C7] flex items-start justify-between gap-2">
              <span className="text-[#B42318] font-semibold flex items-center gap-1 shrink-0">
                <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                <span>必要排除過敏原：</span>
              </span>
              <span className="font-bold text-[#B42318] text-right">
                {constraints.allergens.length > 0
                  ? constraints.allergens.join(' · ')
                  : '無'}
              </span>
            </div>
          </div>

          {/* Quick Chips */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#2E2925]">
              快捷微調選項
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_SWAP_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={isLoading}
                  onClick={() => executeSwap(chip)}
                  className="min-h-[44px] px-4 py-2 rounded-[12px] bg-white border border-[#88796B] text-[#A8462D] hover:bg-[#F8E6DF]/50 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Allergen Blocked Warning */}
          {allergenBlockedNotice && (
            <div
              role="alert"
              className="p-4 rounded-[14px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] space-y-3"
            >
              <div className="flex items-start gap-2 text-sm font-semibold">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{allergenBlockedNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFocusFilterPanel();
                }}
                className="w-full min-h-[44px] px-4 py-2 rounded-[10px] bg-[#B42318] text-white font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                <span>前往條件面板修改過敏原</span>
              </button>
            </div>
          )}

          {/* No Feasible Recipe / Error State */}
          {errorReason && (
            <div
              role="alert"
              className="p-4 rounded-[14px] bg-[#FFF1D6] border border-[#835300] text-[#835300] space-y-3"
            >
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-bold">無法產生符合全部限制的替換料理</p>
                  <p className="mt-1">{errorReason}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[42px] px-4 py-2 rounded-[10px] bg-[#A8462D] text-white font-semibold text-sm cursor-pointer"
                >
                  保留原料理
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onFocusFilterPanel();
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-[10px] bg-white border border-[#88796B] text-[#2E2925] font-semibold text-sm cursor-pointer"
                >
                  調整篩選條件
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div
              role="status"
              className="p-4 rounded-[14px] bg-[#F4E8DB] text-[#2E2925] flex items-center gap-3 text-sm font-semibold"
            >
              <Loader2 className="w-5 h-5 text-[#A8462D] animate-spin shrink-0" aria-hidden="true" />
              <span>正在依現有庫存與限制重新驗證新料理…</span>
            </div>
          )}
        </div>

        {/* Bottom Custom Message Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSwap(inputMessage);
          }}
          className="p-4 bg-white border-t border-[#DED3C7] space-y-2 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <label htmlFor="swap-msg-input" className="block text-sm font-semibold text-[#2E2925]">
            想怎麼調整這道菜？
          </label>
          <div className="flex items-center gap-2">
            <input
              id="swap-msg-input"
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="例如：改成15分鐘、不要辣、不用開火"
              className="flex-1 min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base text-[#2E2925]"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              aria-label="送出換菜要求"
              className="min-h-[48px] px-5 py-2.5 rounded-[12px] bg-[#A8462D] hover:bg-[#8D3824] disabled:bg-[#88796B] text-white font-semibold text-base flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>送出</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
