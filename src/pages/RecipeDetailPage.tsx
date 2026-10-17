import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Check,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEMO_RECIPES, buildAndValidateRecipe } from '../utils/recipeEngine';
import { DishVisual } from '../components/DishVisual';
import { SwapDishPanel } from '../components/SwapDishPanel';
import { CookingConfirmModal } from '../components/CookingConfirmModal';
import { Recipe } from '../types';

export const RecipeDetailPage: React.FC = () => {
  const {
    selectedRecipeId,
    getRecipeById,
    inventory,
    activeConstraints,
    setRecommendedRecipes,
    toggleFavorite,
    isFavorite,
    navigate,
    consumeQuota,
    showToast,
  } = useApp();

  const initialRecipe = useMemo(() => {
    if (selectedRecipeId) {
      const found = getRecipeById(selectedRecipeId);
      if (found) return found;
    }
    return buildAndValidateRecipe(
      DEMO_RECIPES[0],
      activeConstraints.servings,
      inventory,
      activeConstraints.pantryStaples,
      'detail-fallback'
    );
  }, [selectedRecipeId, inventory, activeConstraints]);

  const [currentRecipe, setCurrentRecipe] = useState<Recipe>(initialRecipe);
  const [servings, setServings] = useState<number>(initialRecipe.servings);
  const [isRevalidatingServings, setIsRevalidatingServings] = useState(false);

  // Rule 5.9: 「開始料理」僅切換烹飪閱讀狀態，不扣庫存。進入烹飪閱讀狀態可收合裝飾主圖。
  const [cookingReadingMode, setCookingReadingMode] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);

  // Modals
  const [swapOpen, setSwapOpen] = useState(false);
  const [confirmUsageOpen, setConfirmUsageOpen] = useState(false);

  // Re-evaluate ingredient quantities whenever servings or inventory changes (AC-08)
  const evaluatedRecipe = useMemo(() => {
    const baseTpl =
      DEMO_RECIPES.find((t) => currentRecipe.id.startsWith(t.id)) ||
      DEMO_RECIPES[0];

    return buildAndValidateRecipe(
      {
        ...baseTpl,
        id: currentRecipe.id,
        title: currentRecipe.title,
        summary: currentRecipe.summary,
      },
      servings,
      inventory,
      activeConstraints.pantryStaples,
      currentRecipe.sessionId,
      currentRecipe.swapNotice
    );
  }, [currentRecipe, servings, inventory, activeConstraints.pantryStaples]);

  const handleServingsChange = (newServings: number) => {
    setIsRevalidatingServings(true);
    setServings(newServings);
    setTimeout(() => {
      setIsRevalidatingServings(false);
    }, 180);
  };

  const toggleStepCheck = (stepNum: number) => {
    setCheckedSteps((prev) =>
      prev.includes(stepNum) ? prev.filter((n) => n !== stepNum) : [...prev, stepNum]
    );
  };

  const existingIngredients = evaluatedRecipe.ingredients.filter(
    (i) => i.status === 'sufficient'
  );
  const missingOrCheckIngredients = evaluatedRecipe.ingredients.filter(
    (i) => i.status !== 'sufficient'
  );

  const fav = isFavorite(evaluatedRecipe.id);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 pb-36 md:pb-16 space-y-8">
      {/* 1. 返回、名稱、收藏 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/recipes')}
            className="min-h-[44px] px-3 py-2 rounded-[12px] border border-[#88796B] bg-white text-[#2E2925] hover:bg-[#FAF7F2] font-semibold text-base flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span>返回找料理</span>
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(evaluatedRecipe)}
            aria-pressed={fav}
            className={`min-h-[44px] px-4 py-2 rounded-[12px] border font-semibold text-base flex items-center gap-2 transition-colors cursor-pointer ${
              fav
                ? 'bg-[#F8E6DF] border-[#A8462D] text-[#A8462D]'
                : 'bg-white border-[#88796B] text-[#2E2925] hover:bg-[#FAF7F2]'
            }`}
          >
            <Bookmark
              className={`w-4 h-4 ${fav ? 'fill-[#A8462D]' : ''}`}
              aria-hidden="true"
            />
            <span>{fav ? '已收藏食譜' : '收藏食譜'}</span>
          </button>
        </div>

        <div className="space-y-2">
          {evaluatedRecipe.swapNotice && (
            <span className="inline-block px-3 py-1 rounded-full bg-[#F8E6DF] text-[#A8462D] text-xs font-bold">
              {evaluatedRecipe.swapNotice}
            </span>
          )}
          <h1 className="text-[28px] lg:text-[36px] font-bold leading-[1.35] text-[#2E2925]">
            {evaluatedRecipe.title}
          </h1>
        </div>
      </div>

      {/* 2. 主圖 (16:9) 與簡介 (進入烹飪閱讀狀態可收合裝飾主圖) */}
      <section className="bg-white rounded-[20px] p-4 lg:p-6 border border-[#DED3C7] card-shadow space-y-4">
        {!cookingReadingMode ? (
          <div className="rounded-[16px] overflow-hidden border border-[#DED3C7]">
            <DishVisual
              visualKey={evaluatedRecipe.imageKey}
              alt={evaluatedRecipe.title}
              aspectRatio="16:9"
            />
          </div>
        ) : (
          <div className="p-3.5 rounded-[12px] bg-[#EAF0E3] text-[#52603C] flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>目前為「烹飪閱讀模式」（已收合主圖方便檢視步驟，尚未扣除庫存）</span>
            </span>
            <button
              type="button"
              onClick={() => setCookingReadingMode(false)}
              className="underline text-xs cursor-pointer"
            >
              展開主圖
            </button>
          </div>
        )}
        <p className="text-base text-[#655A50] leading-[1.7]">
          {evaluatedRecipe.summary}
        </p>
      </section>

      {/* 3. 人數、總時間、設備、條件摘要 */}
      <section className="bg-white rounded-[20px] p-5 lg:p-6 border border-[#DED3C7] card-shadow space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label
              htmlFor="detail-servings"
              className="text-base font-bold text-[#2E2925] flex items-center gap-1.5"
            >
              <Users className="w-5 h-5 text-[#A8462D]" aria-hidden="true" />
              <span>用餐人數：</span>
            </label>
            <select
              id="detail-servings"
              value={servings}
              onChange={(e) => handleServingsChange(Number(e.target.value))}
              className="min-h-[44px] px-3.5 py-1.5 rounded-[12px] border border-[#88796B] bg-white text-base font-semibold tabular-nums"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} 人份
                </option>
              ))}
            </select>
          </div>

          {/* Stock validation badge: suppressed while revalidating */}
          <div>
            {isRevalidatingServings ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF7F2] text-[#655A50] text-sm font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>重新換算並檢查庫存中…</span>
              </span>
            ) : evaluatedRecipe.isAllSufficient ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EAF0E3] text-[#52603C] text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>目前人數下食材與調味料齊全</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF1D6] text-[#835300] text-sm font-bold">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span>
                  {evaluatedRecipe.missingCount > 0
                    ? `${servings} 人份下有 ${evaluatedRecipe.missingCount} 項食材不足或缺料`
                    : '有部分食材或調味料待確認'}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-[#DED3C7] grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 text-[#655A50]">
            <Clock className="w-4 h-4 text-[#A8462D]" aria-hidden="true" />
            <span>總時間（含備料）：</span>
            <span className="font-semibold text-[#2E2925] tabular-nums">
              {evaluatedRecipe.durationMinutes} 分鐘
            </span>
          </div>
          <div className="text-[#655A50]">
            <span>使用設備：</span>
            <span className="font-semibold text-[#2E2925]">
              {evaluatedRecipe.equipment.join('／')}
            </span>
          </div>
          <div className="text-[#B42318] flex items-center gap-1 font-semibold">
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              已排除過敏原：
              {activeConstraints.allergens.length > 0
                ? activeConstraints.allergens.join('、')
                : '無'}
            </span>
          </div>
        </div>
      </section>

      {/* 4. 食材用量，分「現有」「缺少／待確認」 */}
      <section className="bg-white rounded-[20px] p-5 lg:p-6 border border-[#DED3C7] card-shadow space-y-6">
        <h2 className="text-[22px] lg:text-[26px] font-bold text-[#2E2925]">
          食材用量（{servings} 人份）
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 現有充足食材 */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-[#52603C] flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <span>現有充足（{existingIngredients.length} 項）</span>
            </h3>
            {existingIngredients.length === 0 ? (
              <p className="text-sm text-[#655A50] p-3 rounded-[12px] bg-[#FAF7F2]">
                目前沒有完全確認足夠的食材。
              </p>
            ) : (
              <ul className="space-y-2">
                {existingIngredients.map((ing, i) => (
                  <li
                    key={i}
                    className="p-3.5 rounded-[14px] bg-[#EAF0E3]/60 border border-[#52603C]/30 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-semibold text-[#2E2925]">{ing.name}</span>
                      <span className="block text-xs text-[#52603C]">
                        {ing.availableText}
                      </span>
                    </div>
                    <span className="font-bold text-[#2E2925] tabular-nums whitespace-nowrap">
                      需 {ing.quantityText}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 缺少／待確認食材 */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-[#835300] flex items-center gap-1.5">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              <span>缺少／待確認（{missingOrCheckIngredients.length} 項）</span>
            </h3>
            {missingOrCheckIngredients.length === 0 ? (
              <div className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#DED3C7] text-sm text-[#52603C] font-medium">
                所有主要食材與常備調味料皆已確認充足！
              </div>
            ) : (
              <ul className="space-y-2">
                {missingOrCheckIngredients.map((ing, i) => (
                  <li
                    key={i}
                    className={`p-3.5 rounded-[14px] border flex items-center justify-between gap-2 ${
                      ing.status === 'missing'
                        ? 'bg-[#FEECE8]/60 border-[#B42318]/40'
                        : 'bg-[#FFF1D6]/60 border-[#835300]/40'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-[#2E2925]">{ing.name}</span>
                      <span
                        className={`block text-xs font-medium ${
                          ing.status === 'missing' ? 'text-[#B42318]' : 'text-[#835300]'
                        }`}
                      >
                        {ing.status === 'missing' ? '缺料／不足：' : '待確認：'}
                        {ing.availableText}
                      </span>
                    </div>
                    <span className="font-bold text-[#2E2925] tabular-nums whitespace-nowrap">
                      需 {ing.quantityText}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* 5. 編號步驟，適合手機逐段閱讀 */}
      <section className="bg-white rounded-[20px] p-5 lg:p-6 border border-[#DED3C7] card-shadow space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] lg:text-[26px] font-bold text-[#2E2925]">
            烹飪步驟
          </h2>
          <span className="text-xs text-[#655A50]">點擊步驟可標記閱讀進度</span>
        </div>

        <ol className="space-y-4">
          {evaluatedRecipe.steps.map((step) => {
            const done = checkedSteps.includes(step.stepNumber);
            return (
              <li
                key={step.stepNumber}
                onClick={() => toggleStepCheck(step.stepNumber)}
                className={`p-4 lg:p-5 rounded-[16px] border transition-colors cursor-pointer ${
                  done
                    ? 'bg-[#EAF0E3]/50 border-[#52603C]'
                    : 'bg-[#FAF7F2] border-[#DED3C7] hover:border-[#88796B]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm tabular-nums shrink-0 mt-0.5 ${
                      done
                        ? 'bg-[#52603C] text-white'
                        : 'bg-[#A8462D] text-white'
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" aria-hidden="true" /> : step.stepNumber}
                  </span>
                  <div className="space-y-1.5 flex-1">
                    <h3 className="text-lg font-bold text-[#2E2925]">
                      {step.title}
                    </h3>
                    <p className="text-base text-[#2E2925] leading-[1.7]">
                      {step.instruction}
                    </p>
                    {step.tip && (
                      <p className="text-sm text-[#655A50] bg-white/80 p-2.5 rounded-[10px] border border-[#DED3C7]">
                        小撇步：{step.tip}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 6. 可行替代食材 */}
      {evaluatedRecipe.substitutions.length > 0 && (
        <section className="bg-white rounded-[20px] p-5 lg:p-6 border border-[#DED3C7] card-shadow space-y-4">
          <h2 className="text-[22px] font-bold text-[#2E2925]">可行替代食材建議</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evaluatedRecipe.substitutions.map((sub, i) => (
              <div
                key={i}
                className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#DED3C7] space-y-1"
              >
                <div className="text-base font-bold text-[#2E2925]">
                  {sub.original} → 可替換為「{sub.substitute}」
                </div>
                <p className="text-sm text-[#655A50]">{sub.note}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. 換菜入口 */}
      <section className="bg-[#F4E8DB] rounded-[20px] p-5 border border-[#DED3C7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#2E2925]">想微調做法或換一道菜？</h2>
          <p className="text-sm text-[#655A50]">
            支援「不要辣」、「改成15分鐘」、「不用開火」，並自動保留你的過敏原設定。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSwapOpen(true)}
          className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] font-semibold text-base flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          <span>動態換菜／微調</span>
        </button>
      </section>

      {/* 8. 「開始料理」與「煮好了」 Action Bar (Placed above mobile bottom nav) */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#DED3C7] p-3 md:p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setCookingReadingMode((m) => !m);
              showToast(
                !cookingReadingMode
                  ? '已切換為烹飪閱讀模式（不扣除庫存）'
                  : '已結束烹飪閱讀模式'
              );
            }}
            className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-[14px] border font-semibold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              cookingReadingMode
                ? 'bg-[#EAF0E3] border-[#52603C] text-[#52603C]'
                : 'bg-white border-[#88796B] text-[#A8462D] hover:bg-[#FAF7F2]'
            }`}
          >
            <BookOpen className="w-5 h-5" aria-hidden="true" />
            <span>{cookingReadingMode ? '閱讀模式中（不扣庫存）' : '開始料理'}</span>
          </button>

          {/* 主操作不使用「自動扣除」，而使用「煮好了」開啟用量確認 */}
          <button
            type="button"
            onClick={() => setConfirmUsageOpen(true)}
            className="flex-1 min-h-[48px] px-6 py-2.5 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            <span>煮好了（確認實際用量）</span>
          </button>
        </div>
      </div>

      {/* Dynamic Dish Swap Drawer */}
      {swapOpen && (
        <SwapDishPanel
          recipe={evaluatedRecipe}
          constraints={activeConstraints}
          inventory={inventory}
          onClose={() => setSwapOpen(false)}
          onReplaceRecipe={(oldId, newRec) => {
            setCurrentRecipe(newRec);
            setRecommendedRecipes((prev) =>
              prev.map((r) => (r.id === oldId ? newRec : r))
            );
            showToast(`已將此料理調整為「${newRec.title}」`);
          }}
          onFocusFilterPanel={() => navigate('/recipes')}
          consumeGenerationQuota={(reqId) => consumeQuota('generation', reqId)}
        />
      )}

      {/* Actual Usage Confirmation Modal */}
      {confirmUsageOpen && (
        <CookingConfirmModal
          recipe={evaluatedRecipe}
          servings={servings}
          onClose={() => setConfirmUsageOpen(false)}
        />
      )}
    </div>
  );
};
