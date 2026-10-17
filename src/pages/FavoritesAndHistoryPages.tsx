import React, { useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  ArrowRight,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  ShieldAlert,
} from 'lucide-react';
import { useApp, formatTaipeiDateTime } from '../context/AppContext';
import { DishVisual } from '../components/DishVisual';
import { DEMO_RECIPES, buildAndValidateRecipe } from '../utils/recipeEngine';
import { Recipe } from '../types';

export const FavoritesPage: React.FC = () => {
  const {
    favorites,
    toggleFavorite,
    inventory,
    preference,
    activeConstraints,
    navigate,
    showToast,
  } = useApp();

  // Map of favoriteId -> freshly re-validated result against current inventory & preferences
  const [recheckedMap, setRecheckedMap] = useState<
    Record<
      string,
      {
        recipe: Recipe;
        preferenceConflictWarning?: string;
      }
    >
  >({});

  const handleRecheckWithCurrentInventory = (favId: string, savedSnapshot: Recipe) => {
    const baseTpl =
      DEMO_RECIPES.find((d) => savedSnapshot.id.startsWith(d.id)) ||
      DEMO_RECIPES[0];

    const currentAllergens = preference?.allergens || activeConstraints.allergens;
    const currentEquipment = preference?.equipment || activeConstraints.equipment;
    const currentPantry = preference?.pantryStaples || activeConstraints.pantryStaples;

    const hitAllergen = baseTpl.containsAllergens.find((a) =>
      currentAllergens.some((ua) => ua.includes(a) || a.includes(ua.split('／')[0]))
    );
    const hasCompatibleEq =
      currentEquipment.length === 0 ||
      baseTpl.equipment.some((eq) => currentEquipment.includes(eq));

    const warnings: string[] = [];
    if (hitAllergen) {
      warnings.push(`包含你目前設定的必要排除過敏原「${hitAllergen}」`);
    }
    if (!hasCompatibleEq) {
      warnings.push(`需要設備「${baseTpl.equipment.join('／')}」，不在你目前可用設備中`);
    }

    const freshlyBuilt = buildAndValidateRecipe(
      {
        ...baseTpl,
        id: savedSnapshot.id,
        title: savedSnapshot.title,
        summary: savedSnapshot.summary,
      },
      savedSnapshot.servings,
      inventory,
      currentPantry,
      `fav-recheck-${Date.now()}`
    );

    setRecheckedMap((prev) => ({
      ...prev,
      [favId]: {
        recipe: freshlyBuilt,
        preferenceConflictWarning:
          warnings.length > 0 ? warnings.join('；') : undefined,
      },
    }));

    showToast(`已完成「${savedSnapshot.title}」的目前庫存與偏好檢查`);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-[28px] lg:text-[36px] font-bold leading-[1.35] text-[#2E2925]">
          我的收藏
        </h1>
        <p className="text-sm text-[#655A50]">
          為避免沿用過期的庫存狀態，收藏食譜在再次料理前須點擊「以目前庫存檢查」重新驗證。取消收藏不會刪除已存在的料理紀錄。
        </p>
      </div>

      {favorites.length === 0 ? (
        /* Empty State (Section 5.11) */
        <div className="bg-white rounded-[20px] p-8 lg:p-12 border border-[#DED3C7] card-shadow text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#F8E6DF] text-[#A8462D] flex items-center justify-center mx-auto">
            <Bookmark className="w-7 h-7" aria-hidden="true" />
          </div>
          <p className="text-xl font-bold text-[#2E2925]">
            把喜歡的料理收藏起來，下次更快找到。
          </p>
          <button
            type="button"
            onClick={() => navigate('/recipes')}
            className="min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base inline-flex items-center gap-2 cursor-pointer"
          >
            <UtensilsCrossed className="w-5 h-5" aria-hidden="true" />
            <span>去找料理</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((fav) => {
            const rechecked = recheckedMap[fav.id];
            const displayRecipe = rechecked ? rechecked.recipe : fav.recipeSnapshot;

            return (
              <article
                key={fav.id}
                className="bg-white rounded-[20px] border border-[#DED3C7] overflow-hidden card-shadow flex flex-col justify-between"
              >
                <div>
                  <DishVisual
                    visualKey={displayRecipe.imageKey}
                    alt={displayRecipe.title}
                    aspectRatio="4:3"
                  />

                  <div className="p-4 lg:p-5 space-y-3.5">
                    {/* Top Row: Never carries over stale "食材齊全" badge before recheck (Rule 5.11 & AC-16) */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {!rechecked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#DED3C7] text-[#655A50] text-xs font-semibold">
                          <span>尚未以今日庫存檢查</span>
                        </span>
                      ) : rechecked.preferenceConflictWarning ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEECE8] text-[#B42318] text-xs font-bold">
                          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>與目前飲食／設備設定衝突</span>
                        </span>
                      ) : rechecked.recipe.isAllSufficient ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EAF0E3] text-[#52603C] text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>已檢查：目前食材齊全</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF1D6] text-[#835300] text-xs font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>
                            已檢查：缺 {rechecked.recipe.missingCount} 項或有待確認項目
                          </span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleFavorite(displayRecipe)}
                        className="min-h-[38px] px-3 py-1 rounded-[10px] border border-[#88796B] bg-white text-[#655A50] hover:text-[#B42318] text-xs font-semibold cursor-pointer"
                      >
                        取消收藏
                      </button>
                    </div>

                    <h2 className="text-[18px] lg:text-[20px] font-semibold text-[#2E2925]">
                      {displayRecipe.title}
                    </h2>

                    <div className="text-sm text-[#655A50] flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        {displayRecipe.durationMinutes} 分鐘
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        {displayRecipe.servings} 人份
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{displayRecipe.equipment.join('／')}</span>
                    </div>

                    {rechecked && rechecked.preferenceConflictWarning && (
                      <div className="p-3 rounded-[12px] bg-[#FEECE8] text-[#B42318] text-xs font-semibold">
                        提醒：{rechecked.preferenceConflictWarning}
                      </div>
                    )}

                    {rechecked && (
                      <div className="p-3 rounded-[12px] bg-[#FAF7F2] border border-[#DED3C7] text-xs space-y-1">
                        {rechecked.recipe.ingredients
                          .filter((i) => !i.isSeasoning)
                          .map((ing, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="font-medium text-[#2E2925]">{ing.name}</span>
                              <span
                                className={
                                  ing.status === 'sufficient'
                                    ? 'text-[#52603C] font-semibold'
                                    : ing.status === 'missing'
                                    ? 'text-[#B42318] font-semibold'
                                    : 'text-[#835300] font-semibold'
                                }
                              >
                                需 {ing.quantityText}（{ing.availableText}）
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 lg:px-5 lg:pb-5 pt-0 space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleRecheckWithCurrentInventory(fav.id, fav.recipeSnapshot)
                    }
                    className="w-full min-h-[44px] px-4 py-2 rounded-[12px] bg-white border border-[#88796B] text-[#A8462D] hover:bg-[#F8E6DF]/40 font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    <span>{rechecked ? '重新以目前庫存檢查' : '以目前庫存檢查'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!rechecked}
                    onClick={() =>
                      navigate('/recipe-detail', { recipeId: displayRecipe.id })
                    }
                    className="w-full min-h-[48px] px-4 py-2.5 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] disabled:bg-[#88796B] text-white font-semibold text-base flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>
                      {rechecked ? '查看步驟與開始料理' : '請先點擊上方檢查目前庫存'}
                    </span>
                    {rechecked && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const HistoryPage: React.FC = () => {
  const { history, undoCookingEvent, navigate } = useApp();

  const [expandedId, setExpandedId] = useState<string | null>(
    history[0]?.id || null
  );
  const [confirmUndoEventId, setConfirmUndoEventId] = useState<string | null>(null);
  const [recreateBatchPrompt, setRecreateBatchPrompt] = useState<{
    eventId: string;
    deletedBatchNames: string[];
  } | null>(null);

  const handleConfirmUndo = (eventId: string) => {
    const res = undoCookingEvent(eventId, false);
    if (res.needsRecreateConfirm) {
      setConfirmUndoEventId(null);
      setRecreateBatchPrompt({
        eventId,
        deletedBatchNames: res.deletedBatchNames || [],
      });
      return;
    }
    setConfirmUndoEventId(null);
  };

  const handleConfirmRecreateUndo = () => {
    if (!recreateBatchPrompt) return;
    undoCookingEvent(recreateBatchPrompt.eventId, true);
    setRecreateBatchPrompt(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-[28px] lg:text-[36px] font-bold leading-[1.35] text-[#2E2925]">
          料理紀錄
        </h1>
        <p className="text-sm text-[#655A50]">
          依完成時間倒序排列，保存當次食譜快照與實際扣除量。每筆紀錄僅可撤銷一次，且不會覆蓋後續庫存異動。
        </p>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-[20px] p-8 border border-[#DED3C7] card-shadow text-center space-y-4">
          <p className="text-lg font-bold text-[#2E2925]">目前還沒有完成的料理紀錄</p>
          <button
            type="button"
            onClick={() => navigate('/recipes')}
            className="min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] text-white font-semibold text-base cursor-pointer"
          >
            去找料理
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((evt) => {
            const isUndone = evt.status === 'undone';
            const isExpanded = expandedId === evt.id;

            return (
              <article
                key={evt.id}
                className="bg-white rounded-[20px] p-5 lg:p-6 border border-[#DED3C7] card-shadow space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isUndone ? (
                        <span className="px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#88796B] text-[#655A50] text-xs font-bold">
                          已撤銷
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-[#EAF0E3] text-[#52603C] text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>已完成並更新庫存</span>
                        </span>
                      )}
                      <span className="text-xs text-[#655A50] tabular-nums">
                        完成時間：{formatTaipeiDateTime(evt.completedAt)}（Asia/Taipei）
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-[#2E2925]">
                      {evt.recipeSnapshot.title}
                    </h2>
                    <p className="text-sm text-[#655A50] tabular-nums">
                      料理人數：{evt.servingsCooked} 人份 · 實際記錄食材：
                      {evt.actualUsage.map((u) => u.ingredientName).join('、')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Rule 5.12: 入口「撤銷本次扣除」；成功後標示「已撤銷」，按鈕不再可用 */}
                    <button
                      type="button"
                      disabled={isUndone}
                      onClick={() => setConfirmUndoEventId(evt.id)}
                      className="min-h-[44px] px-4 py-2 rounded-[12px] border border-[#88796B] bg-white text-[#B42318] disabled:text-[#655A50] disabled:opacity-50 font-semibold text-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      <span>{isUndone ? '已撤銷' : '撤銷本次扣除'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate('/recipe-detail', {
                          recipeId: evt.recipeSnapshot.id,
                        })
                      }
                      className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#FAF7F2] border border-[#88796B] text-[#A8462D] font-semibold text-sm cursor-pointer"
                    >
                      再次料理
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((curr) => (curr === evt.id ? null : evt.id))
                      }
                      aria-expanded={isExpanded}
                      className="min-h-[44px] px-3 py-2 rounded-[12px] text-sm font-medium text-[#655A50] hover:text-[#2E2925] flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? '收合詳情' : '查看快照與異動'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-4 border-t border-[#DED3C7] grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#DED3C7] space-y-2">
                      <h3 className="font-bold text-[#2E2925]">當次庫存異動明細</h3>
                      {evt.transactions.length === 0 ? (
                        <p className="text-[#655A50]">無扣除庫存批次（僅使用外購食材）</p>
                      ) : (
                        <ul className="space-y-1.5 tabular-nums">
                          {evt.transactions.map((tx) => (
                            <li key={tx.id} className="flex items-center justify-between">
                              <span>
                                {tx.type === 'undo_restore' ? '[撤銷恢復] ' : ''}
                                {tx.batchName}
                              </span>
                              <span className="font-semibold">
                                {tx.quantityDelta !== null
                                  ? `${tx.quantityBefore} → ${tx.quantityAfter} ${tx.unit} (${
                                      tx.quantityDelta > 0
                                        ? `+${tx.quantityDelta}`
                                        : tx.quantityDelta
                                    })`
                                  : `「${tx.noteBefore}」→「${tx.noteAfter}」`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#DED3C7] space-y-2">
                      <h3 className="font-bold text-[#2E2925]">食譜快照摘要</h3>
                      <p className="text-[#655A50]">{evt.recipeSnapshot.summary}</p>
                      <p className="text-xs text-[#655A50]">
                        使用設備：{evt.recipeSnapshot.equipment.join('／')} · 時間：
                        {evt.recipeSnapshot.durationMinutes} 分鐘
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Undo Confirmation Modal */}
      {confirmUndoEventId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="undo-confirm-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-[20px] max-w-md w-full p-6 border border-[#DED3C7] card-shadow space-y-4">
            <h2 id="undo-confirm-title" className="text-xl font-bold text-[#2E2925]">
              確認撤銷本次庫存扣除？
            </h2>
            <p className="text-sm text-[#655A50] leading-relaxed">
              撤銷操作只會以反向異動恢復該次料理實際扣除的數量，不會覆蓋你在那之後對冰箱庫存做的其他新增或修改。每筆料理紀錄僅可撤銷一次。
            </p>
            <div className="pt-3 border-t border-[#DED3C7] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmUndoEventId(null)}
                className="min-h-[48px] px-5 py-2 rounded-[14px] border border-[#88796B] text-[#2E2925] font-semibold text-base cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleConfirmUndo(confirmUndoEventId)}
                className="min-h-[48px] px-6 py-2 rounded-[14px] bg-[#B42318] hover:bg-[#911B12] text-white font-semibold text-base cursor-pointer"
              >
                確認撤銷扣除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deleted Batch Restoration Confirmation Modal (Rule 5.12) */}
      {recreateBatchPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="recreate-batch-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-[20px] max-w-md w-full p-6 border border-[#DED3C7] card-shadow space-y-4">
            <div className="flex items-center gap-2 text-[#835300]">
              <AlertTriangle className="w-6 h-6 shrink-0" aria-hidden="true" />
              <h2 id="recreate-batch-title" className="text-xl font-bold text-[#2E2925]">
                原食材批次已刪除，可恢復為新批次
              </h2>
            </div>
            <p className="text-sm text-[#655A50] leading-relaxed">
              原本扣除的批次（{recreateBatchPrompt.deletedBatchNames.join('、')}）已從你的冰箱中刪除。是否要將本次扣除量恢復為新的食材批次？
            </p>
            <div className="pt-3 border-t border-[#DED3C7] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRecreateBatchPrompt(null)}
                className="min-h-[48px] px-5 py-2 rounded-[14px] border border-[#88796B] text-[#2E2925] font-semibold text-base cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmRecreateUndo}
                className="min-h-[48px] px-6 py-2 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
              >
                確認恢復為新批次
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
