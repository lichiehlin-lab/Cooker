import React, { useState, useRef } from 'react';
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Check,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  RefreshCw,
  ArrowRight,
  Clock,
  Users,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  COMMON_ALLERGENS,
  COMMON_PANTRY_STAPLES,
  COMMON_RESTRICTIONS,
  DIET_STYLE_OPTIONS,
  DietStyle,
  DurationOption,
  EQUIPMENT_OPTIONS,
  EquipmentType,
  Recipe,
} from '../types';
import { recommendRecipes } from '../utils/recipeEngine';
import { DishVisual } from '../components/DishVisual';
import { SwapDishPanel } from '../components/SwapDishPanel';

export const RecipesPage: React.FC = () => {
  const {
    inventory,
    activeConstraints,
    setActiveConstraints,
    recommendedRecipes,
    setRecommendedRecipes,
    lastValidatedConstraintsJson,
    markConstraintsValidated,
    toggleFavorite,
    isFavorite,
    navigate,
    usage,
    consumeQuota,
    showToast,
  } = useApp();

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [swappingRecipe, setSwappingRecipe] = useState<Recipe | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const filterSidebarRef = useRef<HTMLDivElement>(null);

  // Rule 5.7: 條件改動後標示「條件已更新，請重新推薦」，舊結果不繼續顯示為已驗證。
  const isConstraintsDirty =
    JSON.stringify(activeConstraints) !== lastValidatedConstraintsJson;

  const toggleArrayItem = <T extends string>(
    list: T[],
    item: T,
    updater: (next: T[]) => void
  ) => {
    if (list.includes(item)) {
      updater(list.filter((i) => i !== item));
    } else {
      updater([...list, item]);
    }
  };

  const handleRunRecommendation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const reqId = `rec-gen-${Date.now()}`;
    const q = consumeQuota('generation', reqId);
    if (!q.ok) {
      setQuotaError(q.error || '配額已用完');
      return;
    }
    setQuotaError(null);

    const evalRes = recommendRecipes(activeConstraints, inventory);
    setRecommendedRecipes(evalRes.recipes);
    setRejectionReasons(evalRes.rejectionReasons);
    markConstraintsValidated(activeConstraints);
    setMobileFilterOpen(false);
    showToast(`已依最新條件與庫存產生 ${evalRes.recipes.length} 道推薦料理`);
  };

  const handleReplaceSingleRecipe = (
    oldRecipeId: string,
    newRecipe: Recipe,
    updatedPartialConstraints?: Partial<typeof activeConstraints>
  ) => {
    setRecommendedRecipes((prev) =>
      prev.map((r) => (r.id === oldRecipeId ? newRecipe : r))
    );
    if (updatedPartialConstraints) {
      const merged = { ...activeConstraints, ...updatedPartialConstraints };
      setActiveConstraints(merged);
      markConstraintsValidated(merged);
    }
    showToast(`已替換為「${newRecipe.title}」`);
  };

  const focusFilterPanel = () => {
    setMobileFilterOpen(true);
    setTimeout(() => {
      filterSidebarRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Page Title & Quota Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[28px] lg:text-[36px] font-bold leading-[1.35] text-[#2E2925]">
            找料理
          </h1>
          <p className="text-sm text-[#655A50]">
            推薦前讓條件清楚可見，換菜保留你的過敏原與飲食限制。
          </p>
        </div>

        <div className="text-sm text-[#655A50] bg-white px-4 py-2 rounded-[14px] border border-[#DED3C7] tabular-nums shrink-0">
          今日推薦與換菜剩餘：{Math.max(0, usage.generationLimit - usage.generationCount)} /{' '}
          {usage.generationLimit} 次
        </div>
      </div>

      {quotaError && (
        <div
          role="alert"
          className="p-4 rounded-[16px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] flex items-center justify-between gap-4"
        >
          <span className="font-semibold text-sm">{quotaError}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="min-h-[40px] px-3 py-1.5 rounded-[10px] bg-white border border-[#88796B] text-[#2E2925] text-xs font-semibold cursor-pointer"
            >
              管理庫存
            </button>
            <button
              type="button"
              onClick={() => navigate('/favorites')}
              className="min-h-[40px] px-3 py-1.5 rounded-[10px] bg-white border border-[#88796B] text-[#A8462D] text-xs font-semibold cursor-pointer"
            >
              查看收藏
            </button>
          </div>
        </div>
      )}

      {/* Mobile Collapsible Filter Trigger */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileFilterOpen((o) => !o)}
          aria-expanded={mobileFilterOpen}
          className="w-full min-h-[48px] px-4 py-3 rounded-[16px] bg-white border border-[#88796B] text-[#2E2925] font-semibold text-base flex items-center justify-between card-shadow cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#A8462D]" aria-hidden="true" />
            <span>展開／收合推薦條件設定</span>
          </span>
          {mobileFilterOpen ? (
            <ChevronUp className="w-5 h-5 text-[#655A50]" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#655A50]" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Main Layout: Desktop 280px Sidebar + Results Area (Section 4.1) */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* 280px Filter Sidebar on Desktop, Collapsible Block on Mobile */}
        <aside
          ref={filterSidebarRef}
          aria-label="料理推薦條件設定"
          className={`w-full lg:w-[280px] shrink-0 bg-white rounded-[20px] p-5 border border-[#DED3C7] card-shadow space-y-5 ${
            mobileFilterOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <form onSubmit={handleRunRecommendation} className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#DED3C7] pb-3">
              <h2 className="text-lg font-bold text-[#2E2925]">推薦條件</h2>
              <span className="text-xs text-[#655A50]">修改後請點擊推薦</span>
            </div>

            {/* 1. 用餐人數：1–10人 */}
            <div>
              <label
                htmlFor="filter-servings"
                className="block text-sm font-semibold text-[#2E2925] mb-1.5"
              >
                用餐人數（1–10 人）
              </label>
              <select
                id="filter-servings"
                value={activeConstraints.servings}
                onChange={(e) =>
                  setActiveConstraints((prev) => ({
                    ...prev,
                    servings: Number(e.target.value),
                  }))
                }
                className="w-full min-h-[48px] px-3.5 py-2 rounded-[12px] border border-[#88796B] bg-white text-base tabular-nums"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} 人份
                  </option>
                ))}
              </select>
            </div>

            {/* 2. 時間：15／30／60分鐘／不限（說明包含備料與烹調） */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#2E2925]">
                總時間上限（含備料與烹調）
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { val: 15, label: '15 分鐘' },
                    { val: 30, label: '30 分鐘' },
                    { val: 60, label: '60 分鐘' },
                    { val: 0, label: '不限時間' },
                  ] as { val: DurationOption; label: string }[]
                ).map((opt) => {
                  const selected = activeConstraints.maxDuration === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() =>
                        setActiveConstraints((prev) => ({
                          ...prev,
                          maxDuration: opt.val,
                        }))
                      }
                      aria-pressed={selected}
                      className={`min-h-[42px] px-3 py-1.5 rounded-[10px] border text-sm font-semibold tabular-nums cursor-pointer ${
                        selected
                          ? 'bg-[#A8462D] border-[#A8462D] text-white'
                          : 'bg-white border-[#88796B] text-[#2E2925] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. 缺料模式：「只用現有食材」「允許補買最多2項」 */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#2E2925]">
                缺料模式
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveConstraints((prev) => ({
                      ...prev,
                      missingMode: 'only_existing',
                    }))
                  }
                  aria-pressed={activeConstraints.missingMode === 'only_existing'}
                  className={`w-full min-h-[44px] px-3.5 py-2 rounded-[12px] border text-left text-sm font-semibold flex items-center justify-between cursor-pointer ${
                    activeConstraints.missingMode === 'only_existing'
                      ? 'bg-[#F8E6DF] border-[#A8462D] text-[#A8462D]'
                      : 'bg-white border-[#88796B] text-[#2E2925]'
                  }`}
                >
                  <span>只用現有食材</span>
                  {activeConstraints.missingMode === 'only_existing' && (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveConstraints((prev) => ({
                      ...prev,
                      missingMode: 'allow_up_to_2',
                    }))
                  }
                  aria-pressed={activeConstraints.missingMode === 'allow_up_to_2'}
                  className={`w-full min-h-[44px] px-3.5 py-2 rounded-[12px] border text-left text-sm font-semibold flex items-center justify-between cursor-pointer ${
                    activeConstraints.missingMode === 'allow_up_to_2'
                      ? 'bg-[#F8E6DF] border-[#A8462D] text-[#A8462D]'
                      : 'bg-white border-[#88796B] text-[#2E2925]'
                  }`}
                >
                  <span>允許補買最多 2 項</span>
                  {activeConstraints.missingMode === 'allow_up_to_2' && (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* 4. 設備複選與不加熱 */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#2E2925]">
                可用設備（必要條件）
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const selected = activeConstraints.equipment.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() =>
                        toggleArrayItem(activeConstraints.equipment, eq, (next) =>
                          setActiveConstraints((prev) => ({ ...prev, equipment: next }))
                        )
                      }
                      aria-pressed={selected}
                      className={`min-h-[38px] px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                        selected
                          ? 'bg-[#A8462D] border-[#A8462D] text-white'
                          : 'bg-white border-[#88796B] text-[#2E2925]'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                      <span>{eq}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. 過敏原（獨立標籤列，標記「必要排除」） */}
            <div className="p-3.5 rounded-[14px] bg-[#FEECE8]/50 border border-[#B42318]/40 space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#B42318]">
                <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>過敏原（必要排除）</span>
              </div>
              <p className="text-xs text-[#655A50]">
                不可被一般換菜清除；含此過敏原之料理將一律排除。
              </p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ALLERGENS.map((al) => {
                  const selected = activeConstraints.allergens.includes(al);
                  return (
                    <button
                      key={al}
                      type="button"
                      onClick={() =>
                        toggleArrayItem(activeConstraints.allergens, al, (next) =>
                          setActiveConstraints((prev) => ({ ...prev, allergens: next }))
                        )
                      }
                      aria-pressed={selected}
                      className={`min-h-[36px] px-2.5 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                        selected
                          ? 'bg-[#B42318] border-[#B42318] text-white'
                          : 'bg-white border-[#88796B] text-[#2E2925]'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" aria-hidden="true" />}
                      <span>{al}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. 飲食風格與飲食禁忌 */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#2E2925]">
                飲食風格
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DIET_STYLE_OPTIONS.map((ds) => {
                  const selected = activeConstraints.dietStyles.includes(ds);
                  return (
                    <button
                      key={ds}
                      type="button"
                      onClick={() =>
                        toggleArrayItem(activeConstraints.dietStyles, ds, (next) =>
                          setActiveConstraints((prev) => ({
                            ...prev,
                            dietStyles: next.length > 0 ? next : (['一般'] as DietStyle[]),
                          }))
                        )
                      }
                      aria-pressed={selected}
                      className={`min-h-[36px] px-2.5 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                        selected
                          ? 'bg-[#A8462D] border-[#A8462D] text-white'
                          : 'bg-white border-[#88796B] text-[#2E2925]'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" aria-hidden="true" />}
                      <span>{ds}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#2E2925]">
                飲食禁忌
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_RESTRICTIONS.map((res) => {
                  const selected = activeConstraints.dietaryRestrictions.includes(res);
                  return (
                    <button
                      key={res}
                      type="button"
                      onClick={() =>
                        toggleArrayItem(
                          activeConstraints.dietaryRestrictions,
                          res,
                          (next) =>
                            setActiveConstraints((prev) => ({
                              ...prev,
                              dietaryRestrictions: next,
                            }))
                        )
                      }
                      aria-pressed={selected}
                      className={`min-h-[36px] px-2.5 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                        selected
                          ? 'bg-[#A8462D] border-[#A8462D] text-white'
                          : 'bg-white border-[#88796B] text-[#2E2925]'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" aria-hidden="true" />}
                      <span>{res}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 7. 常備調味料確認 */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#2E2925]">
                已確認常備調味料
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PANTRY_STAPLES.slice(0, 6).map((st) => {
                  const selected = activeConstraints.pantryStaples.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        toggleArrayItem(activeConstraints.pantryStaples, st, (next) =>
                          setActiveConstraints((prev) => ({
                            ...prev,
                            pantryStaples: next,
                          }))
                        )
                      }
                      aria-pressed={selected}
                      className={`min-h-[36px] px-2.5 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                        selected
                          ? 'bg-[#52603C] border-[#52603C] text-white'
                          : 'bg-white border-[#88796B] text-[#2E2925]'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" aria-hidden="true" />}
                      <span>{st}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button: 推薦料理 */}
            <button
              type="submit"
              className="w-full min-h-[48px] px-5 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base transition-colors cursor-pointer"
            >
              推薦料理
            </button>
          </form>
        </aside>

        {/* Results Column */}
        <div className="flex-1 w-full space-y-6">
          {/* Visible Active Constraints Summary Bar (Section 5.7) */}
          <div className="bg-white rounded-[20px] p-4 lg:p-5 border border-[#DED3C7] card-shadow space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-[#2E2925]">
                <span className="font-bold">目前條件摘要：</span>
                <span className="tabular-nums font-medium">
                  {activeConstraints.servings} 人份
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums font-medium">
                  {activeConstraints.maxDuration > 0
                    ? `${activeConstraints.maxDuration} 分鐘內`
                    : '不限時間'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {activeConstraints.missingMode === 'only_existing'
                    ? '只用現有食材'
                    : '允許補買最多 2 項'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  設備：{activeConstraints.equipment.join('／') || '未選'}
                </span>
              </div>
            </div>

            {/* Independent Allergen Tag Row Marked "必要排除" */}
            <div className="pt-2 border-t border-[#DED3C7] flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-[#B42318] flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                <span>必要排除過敏原：</span>
              </span>
              {activeConstraints.allergens.length > 0 ? (
                activeConstraints.allergens.map((al) => (
                  <span
                    key={al}
                    className="px-2.5 py-0.5 rounded-full bg-[#FEECE8] text-[#B42318] font-semibold"
                  >
                    必要排除：{al}
                  </span>
                ))
              ) : (
                <span className="text-[#655A50]">未設定過敏原</span>
              )}
            </div>
          </div>

          {/* Dirty Constraints Warning Banner (Section 5.7) */}
          {isConstraintsDirty && (
            <div
              role="status"
              className="p-4 rounded-[16px] bg-[#FFF1D6] border border-[#835300] text-[#835300] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-bold text-base">條件已更新，請重新推薦</p>
                  <p className="text-sm">
                    你已調整左側篩選條件，下方舊結果不再標示為「食材齊全」或「已驗證」，請點擊重新推薦。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRunRecommendation()}
                className="min-h-[44px] px-5 py-2 rounded-[12px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-sm shrink-0 cursor-pointer"
              >
                立即重新推薦
              </button>
            </div>
          )}

          {/* Recipe Cards Grid (3 columns on Desktop, 2 on Tablet, 1 on Mobile) */}
          {recommendedRecipes.length === 0 ? (
            /* Empty Result State (Section 5.7) */
            <div className="bg-white rounded-[20px] p-6 md:p-8 border border-[#DED3C7] card-shadow space-y-5">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="w-7 h-7 text-[#835300] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-[#2E2925]">
                    目前沒有符合全部條件的料理。
                  </h2>
                  <p className="text-sm text-[#655A50]">
                    系統嚴格遵守你的過敏原、設備與缺料模式，不會私自放寬限制或以「補買少許即可」冒充合格結果。
                  </p>
                </div>
              </div>

              {rejectionReasons.length > 0 && (
                <div className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#DED3C7] space-y-2">
                  <p className="text-sm font-bold text-[#2E2925]">無法滿足的原因：</p>
                  <ul className="list-disc list-inside text-sm text-[#655A50] space-y-1">
                    {rejectionReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {activeConstraints.missingMode === 'only_existing' && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = {
                        ...activeConstraints,
                        missingMode: 'allow_up_to_2' as const,
                      };
                      setActiveConstraints(next);
                      const evalRes = recommendRecipes(next, inventory);
                      setRecommendedRecipes(evalRes.recipes);
                      setRejectionReasons(evalRes.rejectionReasons);
                      markConstraintsValidated(next);
                    }}
                    className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-[#A8462D] text-white font-semibold text-base cursor-pointer"
                  >
                    改為「允許補買最多 2 項」並重新推薦
                  </button>
                )}
                {activeConstraints.maxDuration > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = {
                        ...activeConstraints,
                        maxDuration: 0 as DurationOption,
                      };
                      setActiveConstraints(next);
                      const evalRes = recommendRecipes(next, inventory);
                      setRecommendedRecipes(evalRes.recipes);
                      setRejectionReasons(evalRes.rejectionReasons);
                      markConstraintsValidated(next);
                    }}
                    className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] font-semibold text-base cursor-pointer"
                  >
                    放寬時間限制為「不限」
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {recommendedRecipes.map((rec) => {
                const fav = isFavorite(rec.id);
                const missingItems = rec.ingredients.filter(
                  (i) => i.status === 'missing'
                );
                const checkItems = rec.ingredients.filter(
                  (i) => i.status === 'needs_check'
                );

                return (
                  <article
                    key={rec.id}
                    className="bg-white rounded-[20px] border border-[#DED3C7] overflow-hidden card-shadow flex flex-col justify-between"
                  >
                    <div>
                      <DishVisual
                        visualKey={rec.imageKey}
                        alt={rec.title}
                        aspectRatio="4:3"
                      />

                      <div className="p-4 lg:p-5 space-y-3.5">
                        {/* Top Status Row (Not pill sandwich - functional status with icon + text) */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {isConstraintsDirty ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF1D6] text-[#835300] text-xs font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>條件已變更待重驗</span>
                            </span>
                          ) : rec.isAllSufficient ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EAF0E3] text-[#52603C] text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>食材齊全</span>
                            </span>
                          ) : missingItems.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEECE8] text-[#B42318] text-xs font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>缺少 {missingItems.length} 項食材</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF1D6] text-[#835300] text-xs font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>部分數量／調味料待確認</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleFavorite(rec)}
                            aria-label={fav ? `取消收藏 ${rec.title}` : `收藏 ${rec.title}`}
                            aria-pressed={fav}
                            className={`min-h-[40px] px-3 py-1 rounded-[10px] border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              fav
                                ? 'bg-[#F8E6DF] border-[#A8462D] text-[#A8462D]'
                                : 'bg-white border-[#DED3C7] text-[#655A50] hover:text-[#2E2925]'
                            }`}
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${fav ? 'fill-[#A8462D]' : ''}`}
                              aria-hidden="true"
                            />
                            <span>{fav ? '已收藏' : '收藏'}</span>
                          </button>
                        </div>

                        {rec.swapNotice && (
                          <div className="px-3 py-1.5 rounded-[10px] bg-[#F8E6DF] text-[#A8462D] text-xs font-semibold">
                            {rec.swapNotice}
                          </div>
                        )}

                        <div className="space-y-1">
                          {rec.prioritizesExisting && (
                            <div className="text-xs font-semibold text-[#52603C] flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>優先使用現有食材</span>
                            </div>
                          )}
                          <h2 className="text-[18px] lg:text-[20px] font-semibold text-[#2E2925]">
                            {rec.title}
                          </h2>
                        </div>

                        {/* Metadata line with · separators */}
                        <div className="text-sm text-[#655A50] flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            {rec.durationMinutes} 分鐘
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Users className="w-3.5 h-3.5" aria-hidden="true" />
                            {rec.servings} 人份
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{rec.equipment.join('／')}</span>
                        </div>

                        {/* Stock & Missing Summary */}
                        <div className="p-3 rounded-[12px] bg-[#FAF7F2] border border-[#DED3C7] text-xs space-y-1.5">
                          <div className="text-[#2E2925]">
                            <span className="font-semibold">主要食材：</span>
                            {rec.ingredients
                              .filter((i) => !i.isSeasoning)
                              .map((i) => `${i.name} ${i.quantityText}`)
                              .join('、')}
                          </div>
                          {missingItems.length > 0 && (
                            <div className="text-[#B42318] font-medium">
                              缺料：{missingItems.map((m) => `${m.name}（需 ${m.quantityText}）`).join('、')}
                            </div>
                          )}
                          {checkItems.length > 0 && (
                            <div className="text-[#835300] font-medium">
                              待確認：{checkItems.map((c) => `${c.name}（${c.availableText}）`).join('、')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fixed Action Footer on Recipe Card */}
                    <div className="p-4 lg:px-5 lg:pb-5 pt-0 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSwappingRecipe(rec)}
                          className="min-h-[44px] px-3 py-2 rounded-[12px] bg-white border border-[#88796B] text-[#A8462D] hover:bg-[#F8E6DF]/40 font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" aria-hidden="true" />
                          <span>換一道／微調</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate('/recipe-detail', { recipeId: rec.id })
                          }
                          className="min-h-[44px] px-3 py-2 rounded-[12px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-sm flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>查看步驟</span>
                          <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Dish Swap Drawer/Full-Page Modal */}
      {swappingRecipe && (
        <SwapDishPanel
          recipe={swappingRecipe}
          constraints={activeConstraints}
          inventory={inventory}
          onClose={() => setSwappingRecipe(null)}
          onReplaceRecipe={handleReplaceSingleRecipe}
          onFocusFilterPanel={focusFilterPanel}
          consumeGenerationQuota={(reqId) => consumeQuota('generation', reqId)}
        />
      )}
    </div>
  );
};
