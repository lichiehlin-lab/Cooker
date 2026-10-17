import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  RotateCcw,
  History,
  RefreshCw,
} from 'lucide-react';
import {
  ActualUsageItem,
  CookingEvent,
  IngredientBatch,
  Recipe,
} from '../types';
import { useApp } from '../context/AppContext';
import { formatQuantity } from '../utils/recipeEngine';

interface CookingConfirmModalProps {
  recipe: Recipe;
  servings: number;
  onClose: () => void;
}

export const CookingConfirmModal: React.FC<CookingConfirmModalProps> = ({
  recipe,
  servings,
  onClose,
}) => {
  const {
    inventory,
    completeCooking,
    undoCookingEvent,
    simulateExternalInventoryChange,
    navigate,
  } = useApp();

  // Stable requestId for idempotency (AC-11: 連點與重試僅產生一次扣除)
  const [requestId] = useState(() => `cook-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  const buildInitialUsageItems = (currentInv: IngredientBatch[]): ActualUsageItem[] => {
    const activeBatches = currentInv.filter(
      (b) => b.quantity === null || b.quantity > 0
    );

    return recipe.ingredients
      .filter((ing) => !ing.isSeasoning)
      .map((ing) => {
        const matched =
          activeBatches.find((b) => b.id === ing.matchedBatchId) ||
          activeBatches.find(
            (b) =>
              b.displayName.includes(ing.name) || ing.name.includes(b.displayName)
          );

        if (!matched) {
          // Rule 5.10: 採買但未入庫的食材標示「僅記錄使用，不扣庫存」
          return {
            ingredientName: ing.name,
            batchId: null,
            batchLabel: '採買／未登錄庫存',
            currentQuantity: null,
            currentNote: '未入庫',
            unit: ing.unit,
            usedQuantity: ing.requiredQuantity ?? 1,
            remainingQuantity: null,
            remainingNote: '',
            isUnstocked: true,
            selected: true,
          };
        }

        const currQty = matched.quantity;
        const usedQty = ing.requiredQuantity ?? (currQty !== null ? Math.min(1, currQty) : null);
        const remQty =
          currQty !== null && usedQty !== null
            ? Math.round((currQty - usedQty) * 100) / 100
            : null;

        return {
          ingredientName: ing.name,
          batchId: matched.id,
          batchLabel: matched.note || `${matched.location}批次`,
          location: matched.location,
          currentQuantity: currQty,
          currentNote: matched.quantityNote || '少量',
          unit: matched.unit,
          usedQuantity: currQty !== null ? usedQty : null,
          remainingQuantity: remQty,
          remainingNote: currQty === null ? '剩少許' : '',
          isUnstocked: false,
          selected: true,
          batchVersion: matched.version,
        };
      });
  };

  const [usageItems, setUsageItems] = useState<ActualUsageItem[]>(() =>
    buildInitialUsageItems(inventory)
  );
  const [selectedSubstituteBatchId, setSelectedSubstituteBatchId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflictDetected, setConflictDetected] = useState(false);
  const [completedEvent, setCompletedEvent] = useState<CookingEvent | null>(null);
  const [isUndone, setIsUndone] = useState(false);

  // Per-row validation checks
  const rowErrors = useMemo(() => {
    const errs: Record<number, string> = {};
    usageItems.forEach((item, idx) => {
      if (!item.selected || item.isUnstocked) return;
      if (item.currentQuantity !== null) {
        if (item.usedQuantity === null || isNaN(item.usedQuantity) || item.usedQuantity < 0) {
          errs[idx] = '請輸入有效的使用數量';
        } else if (item.usedQuantity > item.currentQuantity) {
          errs[idx] = `庫存不足（目前可用 ${item.currentQuantity} ${item.unit}，欲使用 ${item.usedQuantity} ${item.unit}）`;
        }
      } else {
        if (!item.remainingNote.trim()) {
          errs[idx] = '此食材為「少量」，請人工輸入使用後的剩餘狀態文字（如：剩少許、已用完）';
        }
      }
    });
    return errs;
  }, [usageItems]);

  const hasRowErrors = Object.keys(rowErrors).length > 0;

  const handleUpdateItem = (idx: number, updates: Partial<ActualUsageItem>) => {
    setUsageItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const next = { ...item, ...updates };
        if (next.currentQuantity !== null && next.usedQuantity !== null) {
          next.remainingQuantity =
            Math.round((next.currentQuantity - next.usedQuantity) * 100) / 100;
        }
        return next;
      })
    );
  };

  const handleChangeBatch = (idx: number, newBatchId: string) => {
    if (newBatchId === 'unstocked') {
      handleUpdateItem(idx, {
        batchId: null,
        batchLabel: '採買／未登錄庫存',
        isUnstocked: true,
        currentQuantity: null,
        remainingQuantity: null,
      });
      return;
    }
    const batch = inventory.find((b) => b.id === newBatchId);
    if (!batch) return;
    setUsageItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const used = batch.quantity !== null ? Math.min(item.usedQuantity ?? 1, batch.quantity) : null;
        return {
          ...item,
          batchId: batch.id,
          batchLabel: batch.note || `${batch.location}批次`,
          location: batch.location,
          currentQuantity: batch.quantity,
          currentNote: batch.quantityNote || '少量',
          unit: batch.unit,
          usedQuantity: used,
          remainingQuantity:
            batch.quantity !== null && used !== null
              ? Math.round((batch.quantity - used) * 100) / 100
              : null,
          remainingNote: batch.quantity === null ? '剩少許' : '',
          isUnstocked: false,
          batchVersion: batch.version,
        };
      })
    );
  };

  const handleAddSubstitute = () => {
    if (!selectedSubstituteBatchId) return;
    const batch = inventory.find((b) => b.id === selectedSubstituteBatchId);
    if (!batch) return;

    const used = batch.quantity !== null ? Math.min(1, batch.quantity) : null;
    const newItem: ActualUsageItem = {
      ingredientName: `${batch.displayName}（替代食材）`,
      batchId: batch.id,
      batchLabel: batch.note || `${batch.location}批次`,
      location: batch.location,
      currentQuantity: batch.quantity,
      currentNote: batch.quantityNote || '少量',
      unit: batch.unit,
      usedQuantity: used,
      remainingQuantity:
        batch.quantity !== null && used !== null
          ? Math.round((batch.quantity - used) * 100) / 100
          : null,
      remainingNote: batch.quantity === null ? '剩少許' : '',
      isUnstocked: false,
      selected: true,
      batchVersion: batch.version,
    };

    setUsageItems((prev) => [...prev, newItem]);
    setSelectedSubstituteBatchId('');
  };

  const handleReloadLatestAfterConflict = () => {
    setUsageItems((prev) =>
      prev.map((item) => {
        if (item.isUnstocked || !item.batchId) return item;
        const latest = inventory.find((b) => b.id === item.batchId);
        if (!latest) return { ...item, isUnstocked: true, batchId: null };
        const used = item.usedQuantity ?? 1;
        return {
          ...item,
          currentQuantity: latest.quantity,
          currentNote: latest.quantityNote || '少量',
          unit: latest.unit,
          remainingQuantity:
            latest.quantity !== null
              ? Math.round((latest.quantity - used) * 100) / 100
              : null,
          batchVersion: latest.version,
        };
      })
    );
    setConflictDetected(false);
    setSubmitError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || hasRowErrors) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const res = completeCooking(recipe, servings, usageItems, requestId);
    setIsSubmitting(false);

    if (!res.ok) {
      if (res.conflictError) {
        setConflictDetected(true);
      }
      setSubmitError(res.error || '更新失敗，請檢查用量');
      return;
    }

    if (res.event) {
      setCompletedEvent(res.event);
    }
  };

  const handleUndo = () => {
    if (!completedEvent || isUndone) return;
    const res = undoCookingEvent(completedEvent.id, true);
    if (res.ok) {
      setIsUndone(true);
    } else if (res.error) {
      setSubmitError(res.error);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cooking-confirm-title"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-0 md:p-4 overflow-y-auto"
    >
      {/* Full page on mobile, wide dialog on desktop */}
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-[24px] p-5 md:p-8 border border-[#DED3C7] card-shadow overflow-y-auto space-y-6">
        {completedEvent ? (
          /* Success Screen (Section 5.10) */
          <div className="py-4 space-y-6">
            <div className="flex items-center justify-between border-b border-[#DED3C7] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#EAF0E3] text-[#52603C] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="cooking-confirm-title" className="text-2xl font-bold text-[#2E2925]">
                    {isUndone ? '已撤銷本次庫存扣除' : '料理完成！已更新冰箱庫存'}
                  </h2>
                  <p className="text-sm text-[#655A50]">
                    料理：{completedEvent.recipeSnapshot.title}（{completedEvent.servingsCooked} 人份）
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="關閉視窗"
                className="min-h-[44px] min-w-[44px] rounded-full hover:bg-[#FAF7F2] flex items-center justify-center text-[#655A50] cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Transaction Delta Summary */}
            <div className="bg-[#FAF7F2] rounded-[16px] p-4 md:p-5 border border-[#DED3C7] space-y-3">
              <h3 className="text-base font-bold text-[#2E2925]">本次庫存異動摘要</h3>
              {completedEvent.transactions.length === 0 ? (
                <p className="text-sm text-[#655A50]">
                  本次僅記錄使用外購／未登錄食材，未扣除冰箱庫存批次。
                </p>
              ) : (
                <div className="space-y-2">
                  {completedEvent.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-[12px] bg-white border border-[#DED3C7] text-sm tabular-nums"
                    >
                      <span className="font-semibold text-[#2E2925]">{tx.batchName}</span>
                      {tx.quantityDelta !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[#655A50]">
                            原 {tx.quantityBefore} {tx.unit}
                          </span>
                          <span aria-hidden="true">→</span>
                          <span className="text-[#A8462D] font-semibold">
                            使用 {Math.abs(tx.quantityDelta)} {tx.unit}
                          </span>
                          <span aria-hidden="true">→</span>
                          <span className="text-[#52603C] font-bold">
                            {isUndone
                              ? `已恢復為 ${tx.quantityBefore} ${tx.unit}`
                              : `剩 ${tx.quantityAfter} ${tx.unit}`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[#655A50]">原「{tx.noteBefore}」</span>
                          <span aria-hidden="true">→</span>
                          <span className="text-[#52603C] font-bold">
                            {isUndone ? `已恢復為「${tx.noteBefore}」` : `更新為「${tx.noteAfter}」`}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={isUndone}
                onClick={handleUndo}
                className="min-h-[48px] px-5 py-2.5 rounded-[14px] border border-[#88796B] bg-white text-[#B42318] disabled:text-[#655A50] disabled:opacity-50 font-semibold text-base flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>{isUndone ? '已撤銷本次扣除' : '撤銷本次扣除'}</span>
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/history');
                  }}
                  className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] font-semibold text-base flex items-center gap-2 cursor-pointer"
                >
                  <History className="w-4 h-4" aria-hidden="true" />
                  <span>查看料理紀錄</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[48px] px-6 py-2.5 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
                >
                  完成並返回
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Confirmation Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#DED3C7] pb-4">
              <div>
                <h2 id="cooking-confirm-title" className="text-[24px] md:text-[28px] font-bold text-[#2E2925]">
                  確認這次實際用量
                </h2>
                <p className="text-base text-[#655A50]">
                  確認後才會更新冰箱庫存。可修改實際用量、取消未使用的食材或加入替代品。
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="關閉並返回修改"
                className="min-h-[44px] min-w-[44px] rounded-full hover:bg-[#FAF7F2] flex items-center justify-center text-[#655A50] cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Multi-device version conflict simulation helper */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#655A50] bg-[#FAF7F2] px-3.5 py-2 rounded-[10px] border border-[#DED3C7]">
              <span>料理：{recipe.title}（{servings} 人份）</span>
              <button
                type="button"
                onClick={simulateExternalInventoryChange}
                className="text-[#A8462D] underline font-medium cursor-pointer"
              >
                模擬另一裝置同時修改庫存（測試版本衝突保護）
              </button>
            </div>

            {/* Version Conflict Banner (Section 5.10 & AC-12) */}
            {conflictDetected && (
              <div
                role="alert"
                className="p-4 rounded-[14px] bg-[#FFF1D6] border border-[#835300] text-[#835300] space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-base">
                      庫存已在其他地方更新，請重新確認
                    </p>
                    <p className="text-sm">
                      系統偵測到你的冰箱庫存版本已變更，為避免覆寫其他裝置的修改，請載入最新數量檢查後再送出。
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReloadLatestAfterConflict}
                  className="min-h-[44px] px-4 py-2 rounded-[10px] bg-[#A8462D] text-white font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  <span>載入最新庫存數量並重新確認</span>
                </button>
              </div>
            )}

            {submitError && !conflictDetected && (
              <div
                role="alert"
                className="p-4 rounded-[14px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] flex items-center gap-2 text-sm font-semibold"
              >
                <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Ingredient Usage List */}
            <div className="space-y-4">
              {usageItems.map((item, idx) => {
                const err = rowErrors[idx];
                return (
                  <div
                    key={`${item.ingredientName}-${idx}`}
                    className={`p-4 rounded-[16px] border space-y-3 ${
                      !item.selected
                        ? 'bg-[#FAF7F2]/60 border-[#DED3C7] opacity-65'
                        : err
                        ? 'bg-[#FEECE8]/40 border-[#B42318]'
                        : 'bg-[#FAF7F2] border-[#DED3C7]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2.5 font-bold text-base text-[#2E2925] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) =>
                            handleUpdateItem(idx, { selected: e.target.checked })
                          }
                          className="w-5 h-5 accent-[#A8462D] rounded cursor-pointer"
                        />
                        <span>{item.ingredientName}</span>
                      </label>

                      {item.isUnstocked ? (
                        <span className="px-3 py-1 rounded-full bg-[#FFF1D6] text-[#835300] text-xs font-bold">
                          僅記錄使用，不扣庫存
                        </span>
                      ) : (
                        /* Summary string matching Section 5.10: 例如：雞蛋／冷藏批次A／4顆／使用2顆／剩2顆 */
                        <span className="text-xs md:text-sm font-semibold text-[#52603C] bg-[#EAF0E3] px-3 py-1 rounded-full tabular-nums">
                          {item.ingredientName} ／ {item.batchLabel} ／{' '}
                          {item.currentQuantity !== null
                            ? `${formatQuantity(item.currentQuantity)} ${item.unit}`
                            : item.currentNote}{' '}
                          ／ 使用{' '}
                          {item.usedQuantity !== null
                            ? `${formatQuantity(item.usedQuantity)} ${item.unit}`
                            : '適量'}{' '}
                          ／ 剩{' '}
                          {item.currentQuantity !== null
                            ? `${formatQuantity(item.remainingQuantity)} ${item.unit}`
                            : item.remainingNote || '待填'}
                        </span>
                      )}
                    </div>

                    {item.selected && (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                        {/* Batch Selector */}
                        <div className="sm:col-span-5">
                          <label className="block text-xs font-semibold text-[#655A50] mb-1">
                            使用批次
                          </label>
                          <select
                            value={item.isUnstocked ? 'unstocked' : item.batchId || 'unstocked'}
                            onChange={(e) => handleChangeBatch(idx, e.target.value)}
                            className="w-full min-h-[44px] px-3 py-1.5 rounded-[10px] border border-[#88796B] bg-white text-sm text-[#2E2925]"
                          >
                            {inventory
                              .filter((b) => b.quantity === null || b.quantity > 0)
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.displayName}（{b.note || b.location} · 現有{' '}
                                  {b.quantity !== null
                                    ? `${b.quantity} ${b.unit}`
                                    : b.quantityNote}
                                  ）
                                </option>
                              ))}
                            <option value="unstocked">
                              外購／未登錄食材（僅記錄使用，不扣庫存）
                            </option>
                          </select>
                        </div>

                        {/* Used Quantity or Approximate Remaining Note */}
                        {item.isUnstocked ? (
                          <div className="sm:col-span-7 text-sm text-[#655A50] pb-2">
                            此項為外購或未入庫食材，完成後將記錄於料理紀錄中，不會扣除冰箱庫存。
                          </div>
                        ) : item.currentQuantity !== null ? (
                          <>
                            <div className="sm:col-span-4">
                              <label className="block text-xs font-semibold text-[#655A50] mb-1">
                                本次實際使用量（{item.unit}）
                              </label>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.usedQuantity ?? ''}
                                onChange={(e) =>
                                  handleUpdateItem(idx, {
                                    usedQuantity:
                                      e.target.value === '' ? null : Number(e.target.value),
                                  })
                                }
                                className="w-full min-h-[44px] px-3 py-1.5 rounded-[10px] border border-[#88796B] bg-white text-base tabular-nums"
                              />
                            </div>
                            <div className="sm:col-span-3 pb-2 text-sm tabular-nums">
                              <span className="text-[#655A50]">扣除後剩餘：</span>
                              <span
                                className={`font-bold block ${
                                  (item.remainingQuantity ?? 0) < 0
                                    ? 'text-[#B42318]'
                                    : 'text-[#52603C]'
                                }`}
                              >
                                {formatQuantity(item.remainingQuantity)} {item.unit}
                              </span>
                            </div>
                          </>
                        ) : (
                          /* Rule 5.10 & AC-14: 「少量」需人工更新剩餘文字 */
                          <div className="sm:col-span-7">
                            <label className="block text-xs font-semibold text-[#835300] mb-1">
                              原庫存為「{item.currentNote}」，請人工更新使用後的剩餘狀態文字：
                            </label>
                            <input
                              type="text"
                              value={item.remainingNote}
                              onChange={(e) =>
                                handleUpdateItem(idx, { remainingNote: e.target.value })
                              }
                              placeholder="例如：剩少許、已用完"
                              className="w-full min-h-[44px] px-3 py-1.5 rounded-[10px] border border-[#88796B] bg-white text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {err && (
                      <p className="text-xs font-semibold text-[#B42318] flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{err}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Actual Substitute Ingredient (Section 5.10: 加入實際替代品) */}
            <div className="p-4 rounded-[16px] bg-[#FAF7F2] border border-[#DED3C7] flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <label htmlFor="add-sub-select" className="block text-sm font-semibold text-[#2E2925] mb-1">
                  加入實際使用的替代食材（選填）
                </label>
                <select
                  id="add-sub-select"
                  value={selectedSubstituteBatchId}
                  onChange={(e) => setSelectedSubstituteBatchId(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-[10px] border border-[#88796B] bg-white text-sm"
                >
                  <option value="">從目前冰箱選擇其他實際有用到的食材…</option>
                  {inventory
                    .filter((b) => b.quantity === null || b.quantity > 0)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.displayName}（現有{' '}
                        {b.quantity !== null ? `${b.quantity} ${b.unit}` : b.quantityNote}）
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!selectedSubstituteBatchId}
                onClick={handleAddSubstitute}
                className="min-h-[44px] px-4 py-2 rounded-[12px] bg-white border border-[#88796B] text-[#A8462D] disabled:opacity-50 font-semibold text-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>加入實際替代品</span>
              </button>
            </div>

            {/* Footer Primary & Secondary CTAs */}
            <div className="pt-4 border-t border-[#DED3C7] flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] px-6 py-2.5 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] font-semibold text-base cursor-pointer"
              >
                返回修改
              </button>

              <button
                type="submit"
                disabled={isSubmitting || hasRowErrors}
                className="min-h-[48px] px-8 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] disabled:bg-[#88796B] text-white font-semibold text-base cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? '更新庫存中…' : '確認用量並更新庫存'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
