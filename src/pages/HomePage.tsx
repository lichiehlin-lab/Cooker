import React, { useRef } from 'react';
import {
  Camera,
  Plus,
  UtensilsCrossed,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Refrigerator,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp, formatTaipeiDateTime } from '../context/AppContext';
import { DishVisual } from '../components/DishVisual';
import { DEMO_RECIPES } from '../utils/recipeEngine';
import { formatQuantity } from '../utils/recipeEngine';

export const HomePage: React.FC = () => {
  const {
    currentUser,
    preference,
    inventory,
    lastInventoryUpdatedAt,
    navigate,
    loginAsDemoMember,
    hasConfirmedConstraintsThisSession,
  } = useApp();

  const demoSectionRef = useRef<HTMLElement>(null);

  const availableInventory = inventory.filter(
    (b) => b.quantity === null || b.quantity > 0
  );

  const needsPreferenceSetup =
    !preference ||
    preference.equipment.length === 0 ||
    !hasConfirmedConstraintsThisSession;

  if (!currentUser) {
    // Visitor Home (Section 5.1)
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-12 space-y-12 lg:space-y-16">
        {/* Hero Split: 60% Text & Actions, 40% Dish Visual */}
        <section className="bg-[#F4E8DB] rounded-[28px] p-6 md:p-8 lg:p-12 card-shadow">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <p className="text-sm font-semibold text-[#A8462D] tracking-wide">
                溫暖家常 · 減少食材浪費的廚房助手
              </p>
              <h1 className="text-[32px] lg:text-[48px] font-bold leading-[1.3] text-[#2E2925]">
                把冰箱裡的食材，變成今天的好料理。
              </h1>
              <p className="text-base lg:text-lg text-[#655A50] leading-[1.7] max-w-xl">
                拍照盤點食材，依你的設備與口味，找到今天想做的菜。所有辨識結果與實際用量都經你確認才更新，安心好管理。
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
                >
                  <span>註冊開始使用</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    demoSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="min-h-[48px] px-6 py-3 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] hover:bg-[#FAF7F2] font-semibold text-base transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  瀏覽示範食譜
                </button>
              </div>

              <div className="pt-2 border-t border-[#DED3C7] flex flex-wrap items-center justify-between gap-2 text-sm text-[#655A50]">
                <span>想直接體驗已建立庫存的會員流程？</span>
                <button
                  type="button"
                  onClick={loginAsDemoMember}
                  className="font-semibold text-[#A8462D] underline underline-offset-4 hover:text-[#8D3824] cursor-pointer whitespace-nowrap"
                >
                  切換為示範會員「小安」立即體驗
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-[20px] overflow-hidden border border-[#DED3C7] bg-[#FAF7F2]">
                <DishVisual
                  visualKey="hero_kitchen"
                  alt="自然光下的家常番茄滑蛋燒豆腐與新鮮雞蛋、高麗菜"
                  aspectRatio="16:9"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Three-Step Workflow Explanation */}
        <section aria-labelledby="steps-heading" className="space-y-6">
          <div className="space-y-2">
            <h2
              id="steps-heading"
              className="text-[22px] lg:text-[26px] font-bold leading-[1.4] text-[#2E2925]"
            >
              簡單三步，讓下廚更輕鬆
            </h2>
            <p className="text-base text-[#655A50]">
              不替你做未經確認的決定，每一步都清楚透明。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-[20px] p-4 lg:p-6 border border-[#DED3C7] card-shadow space-y-3">
              <span className="text-sm font-semibold text-[#A8462D] tabular-nums">
                01. 確認食材
              </span>
              <h3 className="text-[18px] lg:text-[20px] font-semibold text-[#2E2925]">
                拍照後先確認，容易修改
              </h3>
              <p className="text-base text-[#655A50]">
                上傳冰箱或採買食材照片產生待確認草稿，修改名稱、數量與單位後再寫入個人庫存。
              </p>
            </div>

            <div className="bg-white rounded-[20px] p-4 lg:p-6 border border-[#DED3C7] card-shadow space-y-3">
              <span className="text-sm font-semibold text-[#A8462D] tabular-nums">
                02. 挑選料理
              </span>
              <h3 className="text-[18px] lg:text-[20px] font-semibold text-[#2E2925]">
                條件可見，換菜保留限制
              </h3>
              <p className="text-base text-[#655A50]">
                依你的電鍋、微波爐或單口爐與過敏原推薦最多 3 道家常菜；單道換菜不遺失既有飲食限制。
              </p>
            </div>

            <div className="bg-white rounded-[20px] p-4 lg:p-6 border border-[#DED3C7] card-shadow space-y-3">
              <span className="text-sm font-semibold text-[#A8462D] tabular-nums">
                03. 煮完更新
              </span>
              <h3 className="text-[18px] lg:text-[20px] font-semibold text-[#2E2925]">
                確認實際用量，可追溯可撤銷
              </h3>
              <p className="text-base text-[#655A50]">
                瀏覽與開始料理不自動扣庫存；按下「煮好了」確認實際使用量才更新，並支援單次撤銷。
              </p>
            </div>
          </div>
        </section>

        {/* Demo Recipes Section (Clearly Marked as Demo) */}
        <section
          ref={demoSectionRef}
          aria-labelledby="demo-recipes-heading"
          className="space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2
                id="demo-recipes-heading"
                className="text-[22px] lg:text-[26px] font-bold leading-[1.4] text-[#2E2925]"
              >
                示範食譜預覽
              </h2>
              <p className="text-sm text-[#655A50]">
                以下為系統公開示範食譜，尚未依個人庫存或過敏原條件篩選。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEMO_RECIPES.slice(0, 3).map((rec) => (
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
                  <div className="p-4 lg:p-6 space-y-3">
                    <div className="text-xs font-medium text-[#835300] bg-[#FFF1D6] px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>示範食譜（未依個人條件篩選）</span>
                    </div>
                    <h3 className="text-[18px] lg:text-[20px] font-semibold text-[#2E2925]">
                      {rec.title}
                    </h3>
                    <p className="text-sm text-[#655A50] line-clamp-2">
                      {rec.summary}
                    </p>
                    <div className="text-sm text-[#655A50] flex items-center gap-2 flex-wrap">
                      <span className="tabular-nums">{rec.durationMinutes} 分鐘</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{rec.baseServings} 人份</span>
                      <span aria-hidden="true">·</span>
                      <span>{rec.equipment.join('／')}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 lg:px-6 lg:pb-6 pt-0">
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="w-full min-h-[48px] px-4 py-2.5 rounded-[14px] border border-[#88796B] text-[#A8462D] font-semibold text-base hover:bg-[#F8E6DF]/40 transition-colors cursor-pointer"
                  >
                    註冊以依個人冰箱推薦
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Member Home (Section 5.1)
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-10 space-y-8 lg:space-y-12">
      {/* Member Hero Section: 60% Text & Actions, 40% Dish Visual on Desktop */}
      <section className="bg-[#F4E8DB] rounded-[28px] p-6 md:p-8 lg:p-10 card-shadow">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-base font-medium text-[#655A50]">
              早安，{currentUser.nickname}
            </p>
            <h1 className="text-[32px] lg:text-[48px] font-bold leading-[1.3] text-[#2E2925]">
              今天，冰箱裡有什麼好料理？
            </h1>
            <p className="text-base text-[#655A50] max-w-xl">
              先盤點或確認現有食材，再依今天的時間與設備挑選想煮的家常菜。
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => navigate('/scan')}
                className="min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-5 h-5" aria-hidden="true" />
                <span>拍照盤點</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="min-h-[48px] px-6 py-3 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] hover:bg-[#FAF7F2] font-semibold text-base transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
                <span>手動新增</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-[20px] overflow-hidden border border-[#DED3C7] bg-[#FAF7F2]">
              <DishVisual
                visualKey="hero_kitchen"
                alt="今日廚房家常料理主視覺"
                aspectRatio="16:9"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Dashboard: My Fridge Summary + Find Recipes Entry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Left: My Fridge Summary (7 cols) */}
        <section
          aria-labelledby="fridge-summary-heading"
          className="lg:col-span-7 bg-white rounded-[20px] p-5 lg:p-6 border border-[#DED3C7] card-shadow flex flex-col justify-between space-y-6"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Refrigerator className="w-6 h-6 text-[#A8462D]" aria-hidden="true" />
                <h2
                  id="fridge-summary-heading"
                  className="text-[22px] lg:text-[26px] font-bold leading-[1.4] text-[#2E2925]"
                >
                  我的冰箱摘要
                </h2>
              </div>
              {lastInventoryUpdatedAt && (
                <span className="text-sm text-[#655A50] flex items-center gap-1.5">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span>最近更新：{formatTaipeiDateTime(lastInventoryUpdatedAt)}</span>
                </span>
              )}
            </div>

            {availableInventory.length === 0 ? (
              <div className="bg-[#FAF7F2] rounded-[16px] p-6 border border-[#DED3C7] text-center space-y-4">
                <p className="text-base text-[#2E2925] font-medium">
                  冰箱清單還是空的，先加入幾樣食材吧。
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/scan')}
                    className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
                  >
                    拍照盤點新增
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/inventory')}
                    className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] font-semibold text-base cursor-pointer"
                  >
                    手動建立食材
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-[#655A50]">
                  目前共有{' '}
                  <span className="font-semibold text-[#2E2925] tabular-nums">
                    {availableInventory.length} 批
                  </span>{' '}
                  可用食材：
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableInventory.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 rounded-[14px] bg-[#FAF7F2] border border-[#DED3C7]"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-base text-[#2E2925]">
                          {item.displayName}
                        </div>
                        <div className="text-xs text-[#655A50]">
                          {item.location} · {item.category}
                        </div>
                      </div>
                      {/* Rule 3.2: 數量與價格類數值使用等寬數字特性；數量和單位不得在不同視覺區塊中分離 */}
                      <span className="text-base font-semibold text-[#52603C] bg-[#EAF0E3] px-3 py-1 rounded-full tabular-nums whitespace-nowrap">
                        {item.quantity !== null
                          ? `${formatQuantity(item.quantity)} ${item.unit}`
                          : item.quantityNote || '約略／少量'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#DED3C7] flex items-center justify-between">
            <span className="text-sm text-[#655A50]">
              同名不同批次皆獨立保存，可隨時檢查與合併
            </span>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="min-h-[44px] px-3 py-1.5 text-base font-semibold text-[#A8462D] hover:text-[#8D3824] flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>管理全部庫存</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* Right: Find Recipes by Current Ingredients & Preferences (5 cols) */}
        <section
          aria-labelledby="find-recipes-heading"
          className="lg:col-span-5 bg-white rounded-[20px] p-5 lg:p-6 border border-[#DED3C7] card-shadow flex flex-col justify-between space-y-6"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <UtensilsCrossed className="w-6 h-6 text-[#A8462D]" aria-hidden="true" />
                <h2
                  id="find-recipes-heading"
                  className="text-[22px] lg:text-[26px] font-bold leading-[1.4] text-[#2E2925]"
                >
                  用現有食材找料理
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/account')}
                className="min-h-[44px] px-3 py-1.5 text-sm font-medium text-[#655A50] hover:text-[#2E2925] flex items-center gap-1 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                <span>偏好設定</span>
              </button>
            </div>

            {needsPreferenceSetup ? (
              <div
                role="alert"
                className="p-4 rounded-[14px] bg-[#FFF1D6] border border-[#835300]/30 text-[#835300] space-y-2"
              >
                <div className="flex items-center gap-2 font-semibold text-base">
                  <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>先確認今天的設備與飲食限制</span>
                </div>
                <p className="text-sm leading-relaxed">
                  你尚未完成常用設備與飲食限制確認。推薦料理前請先確認當次條件，減少不符合設備的食譜。
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-[14px] bg-[#EAF0E3] text-[#52603C] flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>已套用你的個人飲食與設備設定</span>
              </div>
            )}

            {/* Current Preference Summary */}
            <div className="space-y-3 text-sm bg-[#FAF7F2] p-4 rounded-[16px] border border-[#DED3C7]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#655A50] shrink-0">預設人數：</span>
                <span className="font-semibold text-[#2E2925] tabular-nums">
                  {preference?.defaultServings || 1} 人份
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#655A50] shrink-0">可用設備：</span>
                <span className="font-medium text-[#2E2925] text-right">
                  {preference && preference.equipment.length > 0
                    ? preference.equipment.join(' · ')
                    : '尚未設定'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#655A50] shrink-0">飲食風格與禁忌：</span>
                <span className="font-medium text-[#2E2925] text-right">
                  {[
                    ...(preference?.dietStyles || []),
                    ...(preference?.dietaryRestrictions || []),
                  ].join(' · ') || '一般'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 pt-2 border-t border-[#DED3C7]">
                <span className="text-[#B42318] font-semibold shrink-0">
                  必要排除過敏原：
                </span>
                <span className="font-semibold text-[#B42318] text-right">
                  {preference && preference.allergens.length > 0
                    ? preference.allergens.join(' · ')
                    : '無設定'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/recipes')}
            className="w-full min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>前往設定條件並推薦料理</span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </section>
      </div>
    </div>
  );
};
