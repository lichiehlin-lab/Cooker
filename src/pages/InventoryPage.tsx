import React, { useState, useMemo } from 'react';
import {
  Camera,
  Plus,
  Search,
  Edit3,
  MoreVertical,
  Trash2,
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  X,
  AlertCircle,
  Clock,
  Calendar,
  UtensilsCrossed,
  ArrowUpDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  CATEGORIES,
  IngredientBatch,
  IngredientCategory,
  LOCATIONS,
  STANDARD_UNITS,
  StorageLocation,
} from '../types';
import {
  formatQuantity,
  getDaysUntilExpiry,
  getExpiryStatusInfo,
  getTaipeiTodayStr,
} from '../utils/recipeEngine';

function addDaysToTaipeiToday(daysToAdd: number): string {
  const todayStr = getTaipeiTodayStr();
  const [y, m, d] = todayStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysToAdd));
  return dt.toISOString().slice(0, 10);
}

export const InventoryPage: React.FC = () => {
  const {
    inventory,
    addBatch,
    updateBatch,
    deleteBatch,
    mergeBatches,
    navigate,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<'全部' | StorageLocation>('全部');
  const [categoryFilter, setCategoryFilter] = useState<'全部' | IngredientCategory>('全部');
  const [expiryFilter, setExpiryFilter] = useState<
    '全部' | 'expiring_soon' | 'expired' | 'unset'
  >('全部');
  const [sortByExpiry, setSortByExpiry] = useState<boolean>(true);
  const [showDepleted, setShowDepleted] = useState(false);

  // Menu & Modals state
  const [openMenuBatchId, setOpenMenuBatchId] = useState<string | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<IngredientBatch | null>(null);
  const [mergingSourceBatch, setMergingSourceBatch] = useState<IngredientBatch | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [mergeError, setMergeError] = useState<string | null>(null);

  // Add / Edit Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<IngredientBatch | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<IngredientCategory>('蔬菜');
  const [quantityMode, setQuantityMode] = useState<'exact' | 'approximate'>('exact');
  const [quantityStr, setQuantityStr] = useState('1');
  const [quantityNote, setQuantityNote] = useState('少量');
  const [unit, setUnit] = useState('顆');
  const [customUnit, setCustomUnit] = useState('');
  const [location, setLocation] = useState<StorageLocation>('冷藏');
  const [expiryDate, setExpiryDate] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openAddForm = () => {
    setEditingBatch(null);
    setDisplayName('');
    setCategory('蔬菜');
    setQuantityMode('exact');
    setQuantityStr('1');
    setQuantityNote('少量');
    setUnit('顆');
    setCustomUnit('');
    setLocation('冷藏');
    setExpiryDate('');
    setNote('');
    setFormError(null);
    setFormDirty(false);
    setIsFormOpen(true);
  };

  const openEditForm = (batch: IngredientBatch) => {
    setEditingBatch(batch);
    setDisplayName(batch.displayName);
    setCategory(batch.category);
    setQuantityMode(batch.quantity === null ? 'approximate' : 'exact');
    setQuantityStr(batch.quantity !== null ? String(batch.quantity) : '1');
    setQuantityNote(batch.quantityNote || '少量');
    if (STANDARD_UNITS.includes(batch.unit)) {
      setUnit(batch.unit);
      setCustomUnit('');
    } else {
      setUnit('自訂單位');
      setCustomUnit(batch.unit);
    }
    setLocation(batch.location);
    setExpiryDate(batch.expiryDate || '');
    setNote(batch.note || '');
    setFormError(null);
    setFormDirty(false);
    setOpenMenuBatchId(null);
    setIsFormOpen(true);
  };

  const handleRequestCloseForm = () => {
    if (formDirty) {
      setConfirmDiscardOpen(true);
    } else {
      setIsFormOpen(false);
    }
  };

  const handleSaveBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    if (!cleanName) {
      setFormError('請輸入食材名稱。');
      return;
    }

    const finalUnit = unit === '自訂單位' ? customUnit.trim() : unit;
    if (!finalUnit) {
      setFormError('請選擇或輸入單位。');
      return;
    }

    let parsedQty: number | null = null;
    if (quantityMode === 'exact') {
      const num = Number(quantityStr);
      if (isNaN(num) || num < 0) {
        setFormError('請輸入大於或等於 0 的有效數字（支援小數如 0.5）。');
        return;
      }
      parsedQty = Math.round(num * 100) / 100;
    } else {
      if (!quantityNote.trim()) {
        setFormError('切換為「約略／少量」時，請填寫數量描述（如：少量、約半包）。');
        return;
      }
    }

    if (editingBatch) {
      const res = updateBatch(editingBatch.id, {
        canonicalName: cleanName,
        displayName: cleanName,
        category,
        quantity: parsedQty,
        unit: finalUnit,
        quantityNote:
          quantityMode === 'approximate'
            ? quantityNote.trim()
            : parsedQty === 0.5
            ? '半' + finalUnit
            : '',
        location,
        expiryDate: expiryDate || undefined,
        note: note.trim() || undefined,
      });
      if (!res.ok) {
        setFormError(res.error || '更新失敗');
        return;
      }
      showToast(`已更新「${cleanName}」`);
    } else {
      addBatch({
        canonicalName: cleanName,
        displayName: cleanName,
        category,
        quantity: parsedQty,
        unit: finalUnit,
        quantityNote:
          quantityMode === 'approximate'
            ? quantityNote.trim()
            : parsedQty === 0.5
            ? '半' + finalUnit
            : '',
        location,
        expiryDate: expiryDate || undefined,
        note: note.trim() || undefined,
        source: 'manual',
      });
      showToast(`已新增「${cleanName}」至我的冰箱`);
    }

    setFormDirty(false);
    setConfirmDiscardOpen(false);
    setIsFormOpen(false);
  };

  // Distinct ingredient names & active batches
  const activeBatches = useMemo(
    () => inventory.filter((b) => b.quantity === null || b.quantity > 0),
    [inventory]
  );

  const activeBatchesCount = activeBatches.length;
  const distinctTypesCount = new Set(activeBatches.map((b) => b.canonicalName)).size;

  // Expiring soon (within 3 days: 0 <= daysLeft <= 3) and Expired (daysLeft < 0) active batches
  const expiringSoonBatches = useMemo(() => {
    return activeBatches
      .filter((b) => {
        const info = getExpiryStatusInfo(b.expiryDate);
        return info.status === 'expiring_soon';
      })
      .sort((a, b) => (getDaysUntilExpiry(a.expiryDate) ?? 99) - (getDaysUntilExpiry(b.expiryDate) ?? 99));
  }, [activeBatches]);

  const expiredBatches = useMemo(() => {
    return activeBatches
      .filter((b) => {
        const info = getExpiryStatusInfo(b.expiryDate);
        return info.status === 'expired';
      })
      .sort((a, b) => (getDaysUntilExpiry(a.expiryDate) ?? 0) - (getDaysUntilExpiry(b.expiryDate) ?? 0));
  }, [activeBatches]);

  const filteredBatches = useMemo(() => {
    const list = inventory.filter((b) => {
      if (!showDepleted && b.quantity === 0) return false;
      if (locationFilter !== '全部' && b.location !== locationFilter) return false;
      if (categoryFilter !== '全部' && b.category !== categoryFilter) return false;

      if (expiryFilter !== '全部') {
        const info = getExpiryStatusInfo(b.expiryDate);
        if (expiryFilter === 'expiring_soon' && info.status !== 'expiring_soon') return false;
        if (expiryFilter === 'expired' && info.status !== 'expired') return false;
        if (expiryFilter === 'unset' && info.status !== 'none') return false;
      }

      if (
        searchQuery.trim() &&
        !b.displayName.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
        !(b.note || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    if (sortByExpiry) {
      return [...list].sort((a, b) => {
        // Put depleted items at the bottom
        const aDepleted = a.quantity === 0 ? 1 : 0;
        const bDepleted = b.quantity === 0 ? 1 : 0;
        if (aDepleted !== bDepleted) return aDepleted - bDepleted;

        const da = getDaysUntilExpiry(a.expiryDate);
        const db = getDaysUntilExpiry(b.expiryDate);
        const valA = da === null ? 99999 : da;
        const valB = db === null ? 99999 : db;
        return valA - valB;
      });
    }
    return list;
  }, [
    inventory,
    showDepleted,
    locationFilter,
    categoryFilter,
    expiryFilter,
    searchQuery,
    sortByExpiry,
  ]);

  // Group counts to show if an ingredient has multiple batches
  const nameBatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of inventory) {
      counts[b.canonicalName] = (counts[b.canonicalName] || 0) + 1;
    }
    return counts;
  }, [inventory]);

  const handleConfirmMerge = () => {
    if (!mergingSourceBatch || !mergeTargetId) return;
    const res = mergeBatches(mergingSourceBatch.id, mergeTargetId);
    if (!res.ok) {
      setMergeError(res.error || '無法合併批次');
    } else {
      showToast(`已將「${mergingSourceBatch.displayName}」合併完成`);
      setMergingSourceBatch(null);
      setMergeTargetId('');
      setMergeError(null);
    }
  };

  const formExpiryInfo = getExpiryStatusInfo(expiryDate || undefined);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[28px] lg:text-[36px] font-bold leading-[1.35] text-[#2E2925]">
            我的冰箱
          </h1>
          <p className="text-sm text-[#655A50] tabular-nums">
            可用食材種類 {distinctTypesCount} 種 · 共 {activeBatchesCount} 批可用庫存
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] hover:bg-[#F8E6DF]/40 font-semibold text-base flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Camera className="w-5 h-5" aria-hidden="true" />
            <span>拍照盤點</span>
          </button>
          <button
            type="button"
            onClick={openAddForm}
            className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            <span>新增食材</span>
          </button>
        </div>
      </div>

      {/* Top Expiring Soon & Expired Warning Banner (Helps reduce food waste) */}
      {(expiringSoonBatches.length > 0 || expiredBatches.length > 0) && (
        <section
          aria-labelledby="expiry-alert-heading"
          className="rounded-[20px] p-5 lg:p-6 bg-[#FFF1D6] border border-[#835300]/40 card-shadow space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#835300]/15 text-[#835300] flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <h2
                  id="expiry-alert-heading"
                  className="text-lg lg:text-xl font-bold text-[#2E2925] flex flex-wrap items-center gap-2"
                >
                  <span>優先使用提醒：減少食材浪費</span>
                  {expiringSoonBatches.length > 0 && (
                    <span className="text-sm font-bold text-[#835300] tabular-nums">
                      · {expiringSoonBatches.length} 批即將在 3 日內到期
                    </span>
                  )}
                  {expiredBatches.length > 0 && (
                    <span className="text-sm font-bold text-[#B42318] tabular-nums">
                      · {expiredBatches.length} 批已超過設定期限
                    </span>
                  )}
                </h2>
                <p className="text-sm text-[#655A50]">
                  依你手動設定的保存期限（Asia/Taipei）排列；快到期的食材建議優先入菜，已過期批次將不自動納入食譜推薦。
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/recipes')}
              className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UtensilsCrossed className="w-4 h-4" aria-hidden="true" />
              <span>用快到期食材找料理</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...expiredBatches, ...expiringSoonBatches].map((item) => {
              const expInfo = getExpiryStatusInfo(item.expiryDate);
              const isExpired = expInfo.status === 'expired';
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-[14px] border flex items-center justify-between gap-3 ${
                    isExpired
                      ? 'bg-[#FEECE8] border-[#B42318]/50 text-[#B42318]'
                      : 'bg-white border-[#835300]/30 text-[#2E2925]'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      {isExpired ? (
                        <AlertCircle className="w-4 h-4 text-[#B42318] shrink-0" aria-hidden="true" />
                      ) : (
                        <Clock className="w-4 h-4 text-[#835300] shrink-0" aria-hidden="true" />
                      )}
                      <span className="font-bold text-base text-[#2E2925] truncate">
                        {item.displayName}
                      </span>
                      <span className="text-xs text-[#655A50] shrink-0">
                        （{item.location}）
                      </span>
                    </div>
                    <div
                      className={`text-xs font-semibold tabular-nums ${
                        isExpired ? 'text-[#B42318]' : 'text-[#835300]'
                      }`}
                    >
                      {expInfo.fullText}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-[#2E2925] tabular-nums whitespace-nowrap">
                      {item.quantity !== null
                        ? `${formatQuantity(item.quantity)} ${item.unit}`
                        : item.quantityNote || '少量'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      aria-label={`調整「${item.displayName}」數量或過期時間`}
                      className="min-h-[38px] px-2.5 py-1 rounded-[10px] border border-[#88796B] bg-[#FAF7F2] hover:bg-white text-xs font-semibold text-[#2E2925] cursor-pointer"
                    >
                      處理
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Search & Filter Controls */}
      <section
        aria-label="庫存搜尋與篩選"
        className="bg-white rounded-[20px] p-4 lg:p-6 border border-[#DED3C7] card-shadow space-y-4"
      >
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-5 h-5 text-[#655A50] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋食材名稱或備註（例如：雞蛋、高麗菜）"
              aria-label="搜尋食材名稱"
              className="w-full min-h-[48px] pl-11 pr-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base text-[#2E2925]"
            />
          </div>

          <button
            type="button"
            onClick={() => setSortByExpiry((s) => !s)}
            aria-pressed={sortByExpiry}
            className={`min-h-[48px] px-4 py-2 rounded-[12px] border text-sm font-semibold flex items-center gap-2 shrink-0 transition-colors cursor-pointer ${
              sortByExpiry
                ? 'bg-[#F8E6DF] border-[#A8462D] text-[#A8462D]'
                : 'bg-[#FAF7F2] border-[#DED3C7] text-[#2E2925]'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" aria-hidden="true" />
            <span>{sortByExpiry ? '排序：到期日由近到遠' : '排序：預設建立順序'}</span>
          </button>

          <label className="min-h-[48px] px-4 py-2 rounded-[12px] border border-[#DED3C7] bg-[#FAF7F2] flex items-center gap-2.5 text-sm font-medium text-[#2E2925] cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={showDepleted}
              onChange={(e) => setShowDepleted(e.target.checked)}
              className="w-4 h-4 accent-[#A8462D]"
            />
            <span>顯示已用完 (0)</span>
          </label>
        </div>

        {/* Location Filter + Expiry Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-1.5 p-1 bg-[#FAF7F2] rounded-[14px] border border-[#DED3C7] overflow-x-auto">
            {(['全部', ...LOCATIONS] as const).map((loc) => {
              const active = locationFilter === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocationFilter(loc)}
                  className={`min-h-[40px] px-4 py-1.5 rounded-[10px] text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#A8462D] text-white'
                      : 'text-[#655A50] hover:text-[#2E2925]'
                  }`}
                >
                  {loc}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-sm text-[#655A50] shrink-0">期限篩選：</span>
            {(
              [
                { id: '全部', label: '全部狀態' },
                { id: 'expiring_soon', label: `即將過期 (${expiringSoonBatches.length})` },
                { id: 'expired', label: `已過期 (${expiredBatches.length})` },
                { id: 'unset', label: '未設定期限' },
              ] as const
            ).map((tab) => {
              const active = expiryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setExpiryFilter(tab.id)}
                  className={`min-h-[38px] px-3 py-1 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap tabular-nums cursor-pointer ${
                    active
                      ? 'bg-[#A8462D] border-[#A8462D] text-white'
                      : 'bg-white border-[#DED3C7] text-[#655A50] hover:text-[#2E2925]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-[#DED3C7]/60">
          <span className="text-sm text-[#655A50] shrink-0">食材分類：</span>
          {(['全部', ...CATEGORIES] as const).map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`min-h-[38px] px-3 py-1 rounded-full text-sm font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#F8E6DF] border-[#A8462D] text-[#A8462D] font-semibold'
                    : 'bg-white border-[#DED3C7] text-[#655A50] hover:text-[#2E2925]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Inventory Grid or Empty State */}
      {inventory.length === 0 ? (
        <div className="bg-white rounded-[20px] p-8 lg:p-12 border border-[#DED3C7] card-shadow text-center space-y-5">
          <p className="text-xl font-bold text-[#2E2925]">
            冰箱清單還是空的，先加入幾樣食材吧。
          </p>
          <p className="text-base text-[#655A50] max-w-md mx-auto">
            你可以直接拍照辨識採買收據與冰箱食材，或手動輸入常備食材與保存期限。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-5 h-5" aria-hidden="true" />
              <span>拍照盤點</span>
            </button>
            <button
              type="button"
              onClick={openAddForm}
              className="min-h-[48px] px-6 py-3 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] font-semibold text-base flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span>手動新增</span>
            </button>
          </div>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="bg-white rounded-[20px] p-8 border border-[#DED3C7] text-center space-y-3">
          <p className="text-lg font-semibold text-[#2E2925]">
            沒有符合目前搜尋或篩選條件的食材批次
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setLocationFilter('全部');
              setCategoryFilter('全部');
              setExpiryFilter('全部');
              setShowDepleted(true);
            }}
            className="min-h-[44px] px-4 py-2 rounded-[12px] border border-[#88796B] text-[#A8462D] font-semibold text-sm cursor-pointer"
          >
            重設篩選條件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBatches.map((batch) => {
            const isDepleted = batch.quantity === 0;
            const isApproximate = batch.quantity === null;
            const hasSameNamePeers = (nameBatchCounts[batch.canonicalName] || 0) > 1;
            const expInfo = getExpiryStatusInfo(batch.expiryDate);

            return (
              <article
                key={batch.id}
                className={`rounded-[20px] p-4 lg:p-6 border transition-colors card-shadow flex flex-col justify-between gap-4 ${
                  isDepleted
                    ? 'bg-[#FAF7F2] border-[#DED3C7] opacity-85'
                    : expInfo.status === 'expired'
                    ? 'bg-white border-[#B42318]/60'
                    : expInfo.status === 'expiring_soon'
                    ? 'bg-white border-[#835300]/60'
                    : 'bg-white border-[#DED3C7]'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Row: Name, Category/Location metadata, and Quantity */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[18px] lg:text-[20px] font-semibold text-[#2E2925]">
                        {batch.displayName}
                      </h2>
                      <div className="text-sm text-[#655A50] flex items-center gap-1.5 mt-0.5">
                        <span>{batch.location}</span>
                        <span aria-hidden="true">·</span>
                        <span>{batch.category}</span>
                        {hasSameNamePeers && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#A8462D] font-medium">獨立批次</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quantity Badge - Tabular Numerals, Quantity & Unit Never Separated */}
                    {isDepleted ? (
                      <span className="px-3 py-1.5 rounded-full bg-[#FEECE8] text-[#B42318] text-sm font-semibold flex items-center gap-1 whitespace-nowrap shrink-0">
                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                        <span>已用完 (0 {batch.unit})</span>
                      </span>
                    ) : isApproximate ? (
                      <span className="px-3 py-1.5 rounded-full bg-[#FFF1D6] text-[#835300] text-sm font-semibold flex items-center gap-1 whitespace-nowrap shrink-0">
                        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                        <span>{batch.quantityNote || '約略／少量'}（{batch.unit}）</span>
                      </span>
                    ) : (
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#EAF0E3] text-[#52603C] text-base font-bold tabular-nums whitespace-nowrap">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          <span>
                            {formatQuantity(batch.quantity)} {batch.unit}
                          </span>
                        </span>
                        {batch.quantity === 0.5 && (
                          <div className="text-xs text-[#655A50] mt-0.5">
                            （半{batch.unit}）
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expiry Date Status Box & Notes */}
                  <div className="pt-2 border-t border-[#DED3C7]/70 text-sm space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#655A50] flex items-center gap-1 shrink-0">
                        <Calendar className="w-4 h-4" aria-hidden="true" />
                        <span>過期時間：</span>
                      </span>

                      {!isDepleted && expInfo.status === 'expired' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEECE8] text-[#B42318] text-xs font-bold tabular-nums">
                          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{expInfo.fullText}</span>
                        </span>
                      ) : !isDepleted && expInfo.status === 'expiring_soon' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF1D6] text-[#835300] text-xs font-bold tabular-nums">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{expInfo.fullText}</span>
                        </span>
                      ) : expInfo.status === 'normal' ? (
                        <span className="font-medium text-[#2E2925] tabular-nums">
                          {expInfo.fullText}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEditForm(batch)}
                          className="text-xs font-semibold text-[#A8462D] underline underline-offset-2 hover:text-[#8D3824] cursor-pointer"
                        >
                          未設定（點擊設定期限）
                        </button>
                      )}
                    </div>

                    {batch.note && (
                      <div className="flex items-center justify-between text-[#655A50]">
                        <span>批次備註：</span>
                        <span className="text-[#2E2925] truncate max-w-[180px]">
                          {batch.note}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Row: Edit + More Menu (Delete never on whole card tap) */}
                <div className="pt-2 border-t border-[#DED3C7] flex items-center justify-between gap-2 relative">
                  <button
                    type="button"
                    onClick={() => openEditForm(batch)}
                    className="min-h-[44px] px-4 py-2 rounded-[12px] border border-[#88796B] bg-white hover:bg-[#FAF7F2] text-[#2E2925] font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-[#A8462D]" aria-hidden="true" />
                    <span>編輯數量／過期時間</span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuBatchId((curr) => (curr === batch.id ? null : batch.id))
                      }
                      aria-label={`更多「${batch.displayName}」批次操作`}
                      aria-expanded={openMenuBatchId === batch.id}
                      className="min-h-[44px] min-w-[44px] rounded-[12px] border border-[#DED3C7] hover:bg-[#FAF7F2] flex items-center justify-center text-[#655A50] cursor-pointer"
                    >
                      <MoreVertical className="w-5 h-5" aria-hidden="true" />
                    </button>

                    {openMenuBatchId === batch.id && (
                      <div className="absolute right-0 bottom-12 w-52 bg-white rounded-[16px] border border-[#DED3C7] card-shadow py-1.5 z-20">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuBatchId(null);
                            setMergingSourceBatch(batch);
                            setMergeTargetId('');
                            setMergeError(null);
                          }}
                          className="w-full min-h-[44px] px-4 py-2 text-left text-sm font-medium text-[#2E2925] hover:bg-[#FAF7F2] flex items-center gap-2 cursor-pointer"
                        >
                          <GitMerge className="w-4 h-4 text-[#A8462D]" aria-hidden="true" />
                          <span>合併至其他批次…</span>
                        </button>
                        <div className="my-1 border-t border-[#DED3C7]" />
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuBatchId(null);
                            setDeletingBatch(batch);
                          }}
                          className="w-full min-h-[44px] px-4 py-2 text-left text-sm font-medium text-[#B42318] hover:bg-[#FEECE8]/60 flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-[#B42318]" aria-hidden="true" />
                          <span>刪除此批次…</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Ingredient Modal */}
      {isFormOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-form-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-[20px] max-w-lg w-full p-6 border border-[#DED3C7] card-shadow space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DED3C7] pb-3">
              <h2 id="batch-form-title" className="text-xl font-bold text-[#2E2925]">
                {editingBatch ? `編輯食材：${editingBatch.displayName}` : '手動新增食材'}
              </h2>
              <button
                type="button"
                onClick={handleRequestCloseForm}
                aria-label="關閉表單"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[#FAF7F2] text-[#655A50] cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3.5 rounded-[12px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] text-sm font-medium flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={handleSaveBatch}
              onChange={() => setFormDirty(true)}
              className="space-y-4"
            >
              <div>
                <label htmlFor="batch-name" className="block text-base font-semibold text-[#2E2925] mb-1">
                  食材名稱
                </label>
                <input
                  id="batch-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例如：雞蛋、高麗菜、板豆腐"
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="batch-category" className="block text-base font-semibold text-[#2E2925] mb-1">
                    分類
                  </label>
                  <select
                    id="batch-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as IngredientCategory)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="batch-location" className="block text-base font-semibold text-[#2E2925] mb-1">
                    存放位置
                  </label>
                  <select
                    id="batch-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value as StorageLocation)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base"
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity Mode Toggle: 已知數量 vs 約略／少量 */}
              <div className="space-y-2 pt-1">
                <span className="block text-base font-semibold text-[#2E2925]">
                  數量記錄方式
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF7F2] rounded-[14px] border border-[#DED3C7]">
                  <button
                    type="button"
                    onClick={() => {
                      setQuantityMode('exact');
                      setFormDirty(true);
                    }}
                    className={`min-h-[44px] rounded-[10px] text-sm font-semibold transition-colors cursor-pointer ${
                      quantityMode === 'exact'
                        ? 'bg-[#A8462D] text-white'
                        : 'text-[#655A50] hover:text-[#2E2925]'
                    }`}
                  >
                    已知數量（支援小數）
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuantityMode('approximate');
                      setFormDirty(true);
                    }}
                    className={`min-h-[44px] rounded-[10px] text-sm font-semibold transition-colors cursor-pointer ${
                      quantityMode === 'approximate'
                        ? 'bg-[#A8462D] text-white'
                        : 'text-[#655A50] hover:text-[#2E2925]'
                    }`}
                  >
                    約略／少量（以文字保存）
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quantityMode === 'exact' ? (
                  <div>
                    <label htmlFor="batch-qty" className="block text-base font-semibold text-[#2E2925] mb-1">
                      數量（可輸入 0.5 等小數）
                    </label>
                    <input
                      id="batch-qty"
                      type="number"
                      step="any"
                      min="0"
                      value={quantityStr}
                      onChange={(e) => setQuantityStr(e.target.value)}
                      className="w-full min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base tabular-nums"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="batch-note-qty" className="block text-base font-semibold text-[#2E2925] mb-1">
                      約略數量描述（不顯示為 0）
                    </label>
                    <input
                      id="batch-note-qty"
                      type="text"
                      value={quantityNote}
                      onChange={(e) => setQuantityNote(e.target.value)}
                      placeholder="例如：少量、約半包"
                      className="w-full min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="batch-unit" className="block text-base font-semibold text-[#2E2925] mb-1">
                    單位
                  </label>
                  <select
                    id="batch-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base"
                  >
                    {STANDARD_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="自訂單位">自訂單位…</option>
                  </select>
                </div>
              </div>

              {unit === '自訂單位' && (
                <div>
                  <label htmlFor="batch-custom-unit" className="block text-sm font-semibold text-[#2E2925] mb-1">
                    輸入自訂單位
                  </label>
                  <input
                    id="batch-custom-unit"
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="例如：袋、罐、塊"
                    className="w-full min-h-[48px] px-4 py-2 rounded-[12px] border border-[#88796B] bg-white text-base"
                  />
                </div>
              )}

              {/* Highlighted Expiry Date Field with Quick Presets */}
              <div className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#DED3C7] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="batch-expiry" className="text-base font-semibold text-[#2E2925]">
                    過期時間／保存期限（選填）
                  </label>
                  {expiryDate && (
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums ${
                        formExpiryInfo.status === 'expired'
                          ? 'bg-[#FEECE8] text-[#B42318]'
                          : formExpiryInfo.status === 'expiring_soon'
                          ? 'bg-[#FFF1D6] text-[#835300]'
                          : 'bg-[#EAF0E3] text-[#52603C]'
                      }`}
                    >
                      {formExpiryInfo.relativeText}
                    </span>
                  )}
                </div>

                <input
                  id="batch-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => {
                    setExpiryDate(e.target.value);
                    setFormDirty(true);
                  }}
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base tabular-nums"
                />

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-[#655A50] mr-1">快速設定：</span>
                  {[
                    { label: '明日 (+1天)', days: 1 },
                    { label: '+3天', days: 3 },
                    { label: '+7天', days: 7 },
                    { label: '+14天', days: 14 },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => {
                        setExpiryDate(addDaysToTaipeiToday(preset.days));
                        setFormDirty(true);
                      }}
                      className="min-h-[34px] px-2.5 py-1 rounded-[8px] border border-[#88796B] bg-white hover:bg-[#F8E6DF]/50 text-xs font-semibold text-[#2E2925] cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                  {expiryDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpiryDate('');
                        setFormDirty(true);
                      }}
                      className="min-h-[34px] px-2.5 py-1 rounded-[8px] text-xs font-semibold text-[#655A50] underline hover:text-[#2E2925] cursor-pointer"
                    >
                      清除期限
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="batch-memo" className="block text-base font-semibold text-[#2E2925] mb-1">
                  備註（選填）
                </label>
                <input
                  id="batch-memo"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例如：傳統市場買的、開封後請盡快使用"
                  className="w-full min-h-[48px] px-3.5 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base"
                />
              </div>

              <div className="pt-4 border-t border-[#DED3C7] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleRequestCloseForm}
                  className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] font-semibold text-base cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] px-6 py-2.5 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
                >
                  儲存食材
                </button>
              </div>
            </form>

            {/* Unsaved Changes Confirmation Sub-Dialog */}
            {confirmDiscardOpen && (
              <div className="p-4 rounded-[14px] bg-[#FFF1D6] border border-[#835300] space-y-3">
                <p className="text-sm font-semibold text-[#835300]">
                  你有尚未儲存的修改，確定要放棄變更並離開嗎？
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDiscardOpen(false)}
                    className="min-h-[40px] px-4 py-1.5 rounded-[10px] bg-white border border-[#88796B] text-[#2E2925] font-semibold text-sm cursor-pointer"
                  >
                    保留編輯
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDiscardOpen(false);
                      setFormDirty(false);
                      setIsFormOpen(false);
                    }}
                    className="min-h-[40px] px-4 py-1.5 rounded-[10px] bg-[#B42318] text-white font-semibold text-sm cursor-pointer"
                  >
                    放棄修改
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch Merge Modal */}
      {mergingSourceBatch && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="merge-modal-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-[20px] max-w-md w-full p-6 border border-[#DED3C7] card-shadow space-y-4">
            <h2 id="merge-modal-title" className="text-xl font-bold text-[#2E2925]">
              合併食材批次
            </h2>
            <p className="text-sm text-[#655A50]">
              將「{mergingSourceBatch.displayName}（
              {mergingSourceBatch.quantity !== null
                ? `${mergingSourceBatch.quantity} ${mergingSourceBatch.unit}`
                : mergingSourceBatch.quantityNote}
              ）」合併至其他批次。僅支援相同單位且已知數量的批次相加。
            </p>

            {mergeError && (
              <div className="p-3 rounded-[12px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] text-sm">
                {mergeError}
              </div>
            )}

            <div>
              <label htmlFor="merge-target" className="block text-sm font-semibold text-[#2E2925] mb-1.5">
                選擇目標批次
              </label>
              <select
                id="merge-target"
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2 rounded-[12px] border border-[#88796B] bg-white text-base"
              >
                <option value="">請選擇要併入的批次…</option>
                {inventory
                  .filter((b) => b.id !== mergingSourceBatch.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.displayName}（{b.location} ·{' '}
                      {b.quantity !== null ? `${b.quantity} ${b.unit}` : b.quantityNote}）
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-3 border-t border-[#DED3C7] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMergingSourceBatch(null)}
                className="min-h-[48px] px-4 py-2 rounded-[14px] border border-[#88796B] text-[#655A50] font-semibold text-base cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!mergeTargetId}
                onClick={handleConfirmMerge}
                className="min-h-[48px] px-5 py-2 rounded-[14px] bg-[#A8462D] disabled:bg-[#88796B] text-white font-semibold text-base cursor-pointer"
              >
                確認合併
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBatch && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-[20px] max-w-md w-full p-6 border border-[#DED3C7] card-shadow space-y-5">
            <h2 id="delete-modal-title" className="text-xl font-bold text-[#2E2925]">
              確認刪除食材批次？
            </h2>
            <p className="text-base text-[#655A50]">
              確定要從冰箱清單中刪除「
              <span className="font-semibold text-[#2E2925]">
                {deletingBatch.displayName}（
                {deletingBatch.quantity !== null
                  ? `${deletingBatch.quantity} ${deletingBatch.unit}`
                  : deletingBatch.quantityNote}
                ）
              </span>
              」嗎？
            </p>
            <div className="pt-2 border-t border-[#DED3C7] flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setDeletingBatch(null)}
                className="min-h-[48px] px-5 py-2.5 rounded-[14px] border border-[#88796B] text-[#2E2925] font-semibold text-base cursor-pointer"
              >
                取消保留
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBatch(deletingBatch.id);
                  showToast(`已刪除「${deletingBatch.displayName}」批次`);
                  setDeletingBatch(null);
                }}
                className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-[#B42318] hover:bg-[#911B12] text-white font-semibold text-base cursor-pointer"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
