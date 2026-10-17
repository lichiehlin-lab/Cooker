import React, { useState } from 'react';
import {
  User,
  ShieldAlert,
  Check,
  History,
  LogOut,
  Trash2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  COMMON_ALLERGENS,
  COMMON_PANTRY_STAPLES,
  COMMON_RESTRICTIONS,
  DIET_STYLE_OPTIONS,
  DietStyle,
  EQUIPMENT_OPTIONS,
  EquipmentType,
} from '../types';

export const AccountPage: React.FC = () => {
  const {
    currentUser,
    preference,
    updateProfile,
    savePreference,
    logout,
    deleteAccount,
    usage,
    globalAiPaused,
    setGlobalAiPaused,
    navigate,
    showToast,
  } = useApp();

  const [nickname, setNickname] = useState(currentUser?.nickname || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Preferences state
  const [dietStyles, setDietStyles] = useState<DietStyle[]>(
    preference?.dietStyles || ['一般']
  );
  const [excludedInput, setExcludedInput] = useState(
    (preference?.excludedFoods || []).join('、')
  );
  const [allergens, setAllergens] = useState<string[]>(
    preference?.allergens || []
  );
  const [restrictions, setRestrictions] = useState<string[]>(
    preference?.dietaryRestrictions || []
  );
  const [equipment, setEquipment] = useState<EquipmentType[]>(
    preference?.equipment || []
  );
  const [defaultServings, setDefaultServings] = useState<number>(
    preference?.defaultServings || 2
  );
  const [pantryStaples, setPantryStaples] = useState<string[]>(
    preference?.pantryStaples || []
  );

  // Delete Account Modal / Step state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmedCheck, setDeleteConfirmedCheck] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const toggleItem = <T extends string>(
    list: T[],
    item: T,
    setter: (val: T[]) => void
  ) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateProfile(nickname, email);
    if (!res.ok) {
      setProfileMsg(res.error || '更新失敗');
      return;
    }
    if (res.emailChanged) {
      showToast('Email 已變更，請重新完成信箱驗證。');
      navigate('/verify-email');
    } else {
      setProfileMsg('個人資料已更新');
      showToast('已更新個人資料');
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const excludedFoods = excludedInput
      .split(/[、,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    savePreference({
      dietStyles: dietStyles.length > 0 ? dietStyles : ['一般'],
      excludedFoods,
      allergens,
      dietaryRestrictions: restrictions,
      equipment,
      defaultServings,
      pantryStaples,
    });
    // Rule 5.13: 偏好儲存成功只更新設定，不改寫歷史食譜與紀錄。
    showToast('飲食偏好與設備設定已儲存（不影響歷史料理紀錄與食譜快照）。');
  };

  const handleExecuteDeleteAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError('請輸入目前密碼以重新驗證身分。');
      return;
    }
    if (!deleteConfirmedCheck) {
      setDeleteError('請勾選確認了解帳號與資料清除範圍。');
      return;
    }
    const res = deleteAccount(deletePassword);
    if (!res.ok) {
      setDeleteError(res.error || '驗證失敗');
    } else {
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[28px] lg:text-[36px] font-bold leading-[1.35] text-[#2E2925]">
            會員中心
          </h1>
          <p className="text-sm text-[#655A50]">
            管理你的個人資料、飲食限制、常用設備與今日配額。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] font-semibold text-base flex items-center gap-2 cursor-pointer"
          >
            <History className="w-5 h-5" aria-hidden="true" />
            <span>料理紀錄</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={logout}
            className="min-h-[48px] px-5 py-2.5 rounded-[14px] border border-[#88796B] bg-white text-[#2E2925] hover:bg-[#FAF7F2] font-semibold text-base flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#655A50]" aria-hidden="true" />
            <span>登出</span>
          </button>
        </div>
      </div>

      {/* 1. 個人資料與配額狀態 */}
      <section className="bg-white rounded-[20px] p-5 lg:p-6 border border-[#DED3C7] card-shadow space-y-5">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-[#A8462D]" aria-hidden="true" />
          <h2 className="text-[22px] font-bold text-[#2E2925]">個人資料與今日配額</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label htmlFor="acc-nickname" className="block text-sm font-semibold text-[#2E2925] mb-1">
              暱稱
            </label>
            <input
              id="acc-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full min-h-[48px] px-4 py-2 rounded-[12px] border border-[#88796B] bg-white text-base"
            />
          </div>

          <div className="md:col-span-5">
            <label htmlFor="acc-email" className="block text-sm font-semibold text-[#2E2925] mb-1">
              Email（變更後須重新驗證）
            </label>
            <input
              id="acc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[48px] px-4 py-2 rounded-[12px] border border-[#88796B] bg-white text-base"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              className="w-full min-h-[48px] px-4 py-2 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
            >
              儲存個人資料
            </button>
          </div>
        </form>
        {profileMsg && <p className="text-sm text-[#52603C] font-medium">{profileMsg}</p>}

        {/* Quota & Global AI Pause Toggle */}
        <div className="pt-4 border-t border-[#DED3C7] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
          <div className="space-y-1 tabular-nums">
            <p className="font-semibold text-[#2E2925]">
              今日（{usage.date} 台北時間）AI 免費配額使用狀況：
            </p>
            <p className="text-[#655A50]">
              拍照盤點：已用 {usage.scanCount} / {usage.scanLimit} 次 · 料理推薦與換菜：已用{' '}
              {usage.generationCount} / {usage.generationLimit} 次
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#655A50] bg-[#FAF7F2] px-3.5 py-2.5 rounded-[12px] border border-[#DED3C7] cursor-pointer">
            <input
              type="checkbox"
              checked={globalAiPaused}
              onChange={(e) => setGlobalAiPaused(e.target.checked)}
              className="w-4 h-4 accent-[#A8462D]"
            />
            <span>模擬「全站 AI 達成本上限暫停」（不影響庫存與收藏）</span>
          </label>
        </div>
      </section>

      {/* 2. 飲食偏好、過敏原與禁忌、常用設備、常備調味料、預設人數 */}
      <form
        onSubmit={handleSavePreferences}
        className="bg-white rounded-[20px] p-5 lg:p-6 border border-[#DED3C7] card-shadow space-y-6"
      >
        <div className="flex items-center justify-between border-b border-[#DED3C7] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#A8462D]" aria-hidden="true" />
            <h2 className="text-[22px] font-bold text-[#2E2925]">
              飲食偏好、過敏原與廚房設備
            </h2>
          </div>
          <span className="text-xs text-[#655A50]">修改設定不會改寫歷史紀錄</span>
        </div>

        {/* 過敏原（獨立安全區塊） */}
        <div className="p-4 rounded-[16px] bg-[#FEECE8]/40 border border-[#B42318]/40 space-y-3">
          <div className="flex items-center gap-2 text-[#B42318] font-bold text-base">
            <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>過敏原（必要排除）</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGENS.map((al) => {
              const selected = allergens.includes(al);
              return (
                <button
                  key={al}
                  type="button"
                  onClick={() => toggleItem(allergens, al, setAllergens)}
                  aria-pressed={selected}
                  className={`min-h-[42px] px-3.5 py-1.5 rounded-full border text-sm font-semibold flex items-center gap-1.5 cursor-pointer ${
                    selected
                      ? 'bg-[#B42318] border-[#B42318] text-white'
                      : 'bg-white border-[#88796B] text-[#2E2925]'
                  }`}
                >
                  {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                  <span>{al}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 飲食禁忌 */}
        <div className="space-y-2">
          <label className="block text-base font-semibold text-[#2E2925]">
            飲食禁忌
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_RESTRICTIONS.map((item) => {
              const selected = restrictions.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(restrictions, item, setRestrictions)}
                  aria-pressed={selected}
                  className={`min-h-[42px] px-3.5 py-1.5 rounded-full border text-sm font-semibold flex items-center gap-1.5 cursor-pointer ${
                    selected
                      ? 'bg-[#A8462D] border-[#A8462D] text-white'
                      : 'bg-white border-[#88796B] text-[#2E2925]'
                  }`}
                >
                  {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                  <span>{item}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 飲食風格與不喜歡食材 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-base font-semibold text-[#2E2925]">
              飲食風格偏好
            </label>
            <div className="flex flex-wrap gap-2">
              {DIET_STYLE_OPTIONS.map((ds) => {
                const selected = dietStyles.includes(ds);
                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => toggleItem(dietStyles, ds, setDietStyles)}
                    aria-pressed={selected}
                    className={`min-h-[42px] px-3.5 py-1.5 rounded-full border text-sm font-semibold flex items-center gap-1.5 cursor-pointer ${
                      selected
                        ? 'bg-[#A8462D] border-[#A8462D] text-white'
                        : 'bg-white border-[#88796B] text-[#2E2925]'
                    }`}
                  >
                    {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                    <span>{ds}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="acc-excluded" className="block text-base font-semibold text-[#2E2925] mb-1.5">
              不喜歡的食材（以頓號分隔）
            </label>
            <input
              id="acc-excluded"
              type="text"
              value={excludedInput}
              onChange={(e) => setExcludedInput(e.target.value)}
              placeholder="例如：苦瓜、香菜"
              className="w-full min-h-[48px] px-4 py-2 rounded-[12px] border border-[#88796B] bg-white text-base"
            />
          </div>
        </div>

        {/* 常用設備與預設人數 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-8 space-y-2">
            <label className="block text-base font-semibold text-[#2E2925]">
              常用烹調設備
            </label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const selected = equipment.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleItem(equipment, eq, setEquipment)}
                    aria-pressed={selected}
                    className={`min-h-[42px] px-3.5 py-1.5 rounded-full border text-sm font-semibold flex items-center gap-1.5 cursor-pointer ${
                      selected
                        ? 'bg-[#A8462D] border-[#A8462D] text-white'
                        : 'bg-white border-[#88796B] text-[#2E2925]'
                    }`}
                  >
                    {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                    <span>{eq}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-4">
            <label htmlFor="acc-servings" className="block text-base font-semibold text-[#2E2925] mb-1.5">
              預設用餐人數
            </label>
            <select
              id="acc-servings"
              value={defaultServings}
              onChange={(e) => setDefaultServings(Number(e.target.value))}
              className="w-full min-h-[48px] px-4 py-2 rounded-[12px] border border-[#88796B] bg-white text-base tabular-nums"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} 人份
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 常備調味料 */}
        <div className="space-y-2">
          <label className="block text-base font-semibold text-[#2E2925]">
            已確認常備調味料
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_PANTRY_STAPLES.map((st) => {
              const selected = pantryStaples.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => toggleItem(pantryStaples, st, setPantryStaples)}
                  aria-pressed={selected}
                  className={`min-h-[42px] px-3.5 py-1.5 rounded-full border text-sm font-semibold flex items-center gap-1.5 cursor-pointer ${
                    selected
                      ? 'bg-[#52603C] border-[#52603C] text-white'
                      : 'bg-white border-[#88796B] text-[#2E2925]'
                  }`}
                >
                  {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                  <span>{st}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-[#DED3C7] flex justify-end">
          <button
            type="submit"
            className="min-h-[48px] px-8 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
          >
            儲存飲食與設備設定
          </button>
        </div>
      </form>

      {/* 3. 獨立底部危險區：刪除帳號與個人資料清除 (Rule 5.13 & AC-17) */}
      <section className="bg-[#FEECE8]/40 rounded-[20px] p-5 lg:p-6 border border-[#B42318]/40 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-[#B42318] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#B42318]">
              帳號管理：永久刪除帳號與個人資料
            </h2>
            <p className="text-sm text-[#2E2925] leading-relaxed">
              刪除帳號後將立即停止存取權限。你的個人資料、冰箱庫存、收藏食譜、料理紀錄與私有圖片將於{' '}
              <span className="font-bold">7 日內完全清除</span>，系統備份則依{' '}
              <span className="font-bold">30 日輪替機制自動清除</span>。此操作無法復原。
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          {/* 不以一般儲存按鈕樣式呈現刪除帳號 */}
          <button
            type="button"
            onClick={() => {
              setDeletePassword('');
              setDeleteConfirmedCheck(false);
              setDeleteError(null);
              setDeleteDialogOpen(true);
            }}
            className="min-h-[48px] px-5 py-2.5 rounded-[14px] border-2 border-[#B42318] bg-white text-[#B42318] hover:bg-[#B42318] hover:text-white font-semibold text-base flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>申請刪除帳號…</span>
          </button>
        </div>
      </section>

      {/* Re-authentication & Explicit Account Deletion Modal */}
      {deleteDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-acc-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-[20px] max-w-lg w-full p-6 border border-[#DED3C7] card-shadow space-y-5">
            <div className="flex items-center gap-2.5 text-[#B42318]">
              <AlertTriangle className="w-6 h-6 shrink-0" aria-hidden="true" />
              <h2 id="delete-acc-title" className="text-xl font-bold text-[#2E2925]">
                重新驗證身分並確認刪除帳號
              </h2>
            </div>

            <div className="p-4 rounded-[14px] bg-[#FEECE8] text-[#B42318] text-sm space-y-1.5">
              <p className="font-bold">資料清除範圍與期限說明：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>確認後帳號將立即登出並停止一切存取。</li>
                <li>正式資料庫中的個人設定、庫存、料理紀錄與上傳照片將於 7 日內清除。</li>
                <li>加密備份資料將依 30 日輪替週期自動覆寫清除。</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 rounded-[12px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteDeleteAccount} className="space-y-4">
              <div>
                <label htmlFor="del-pw" className="block text-sm font-semibold text-[#2E2925] mb-1">
                  請輸入目前密碼以重新驗證身分（示範會員密碼為 demo12345678）
                </label>
                <input
                  id="del-pw"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="輸入密碼驗證身分"
                  className="w-full min-h-[48px] px-4 py-2 rounded-[12px] border border-[#88796B] bg-white text-base"
                />
              </div>

              <label className="flex items-start gap-2.5 text-sm text-[#2E2925] cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteConfirmedCheck}
                  onChange={(e) => setDeleteConfirmedCheck(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#B42318]"
                />
                <span>
                  我已清楚了解刪除後無法復原，並同意依上述範圍與期限清除所有個人資料。
                </span>
              </label>

              <div className="pt-3 border-t border-[#DED3C7] flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setDeleteDialogOpen(false)}
                  className="min-h-[48px] px-5 py-2.5 rounded-[14px] border border-[#88796B] text-[#2E2925] font-semibold text-base cursor-pointer"
                >
                  取消保留帳號
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] px-6 py-2.5 rounded-[14px] bg-[#B42318] hover:bg-[#911B12] text-white font-semibold text-base cursor-pointer"
                >
                  確認永久刪除帳號
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
