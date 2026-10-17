import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Mail,
  X,
  Check,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DishVisual } from '../components/DishVisual';
import {
  COMMON_ALLERGENS,
  COMMON_PANTRY_STAPLES,
  COMMON_RESTRICTIONS,
  DIET_STYLE_OPTIONS,
  DietStyle,
  EQUIPMENT_OPTIONS,
  EquipmentType,
} from '../types';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export const RegisterPage: React.FC = () => {
  const { register, navigate } = useApp();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    nickname?: string;
    email?: string;
    password?: string;
    agreedTerms?: string;
    form?: string;
  }>({});

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errors: typeof fieldErrors = {};
    if (!nickname.trim()) {
      errors.nickname = '請輸入你的暱稱。';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = '請輸入有效的 Email 地址格式。';
    }
    if (password.length < 12) {
      errors.password = '密碼長度不足，請輸入至少 12 個字元。';
    }
    if (!agreedTerms) {
      errors.agreedTerms = '請先閱讀並勾選同意服務條款與隱私說明。';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    setTimeout(() => {
      const res = register(nickname, email, password);
      setIsSubmitting(false);
      if (!res.ok) {
        setFieldErrors({ form: res.error });
        setTimeout(() => errorSummaryRef.current?.focus(), 50);
      }
    }, 350);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        {/* Desktop Left Column: Warm Dish Photo & Product Tagline */}
        <div className="hidden lg:flex lg:col-span-6 bg-[#F4E8DB] rounded-[28px] p-8 flex-col justify-between border border-[#DED3C7] card-shadow">
          <div className="space-y-4">
            <span className="text-sm font-semibold text-[#A8462D]">
              冰箱好料理 · 個人廚房管理
            </span>
            <h2 className="text-[36px] font-bold leading-[1.35] text-[#2E2925]">
              把冰箱裡的食材，變成今天的好料理。
            </h2>
            <p className="text-base text-[#655A50]">
              建立個人專屬冰箱清單，保留你的過敏原與常用設備設定，讓每次下廚都從容不迫。
            </p>
          </div>

          <div className="rounded-[20px] overflow-hidden border border-[#DED3C7] my-6">
            <DishVisual
              visualKey="hero_kitchen"
              alt="溫暖自然光下的台灣家常料理與新鮮食材"
              aspectRatio="16:9"
            />
          </div>

          <div className="text-sm text-[#655A50] space-y-1">
            <p>· 拍照辨識先確認再入庫，不擅自改動數量</p>
            <p>· 嚴格遵守你的過敏原與設備限制</p>
            <p>· 煮完確認實際用量，支援單次撤銷</p>
          </div>
        </div>

        {/* Mobile Compact Brand Area */}
        <div className="lg:hidden bg-[#F4E8DB] rounded-[20px] p-4 border border-[#DED3C7]">
          <p className="text-sm font-semibold text-[#A8462D]">冰箱好料理</p>
          <p className="text-base font-bold text-[#2E2925]">
            把冰箱裡的食材，變成今天的好料理。
          </p>
        </div>

        {/* Right Column: Registration Form */}
        <div className="lg:col-span-6 bg-white rounded-[20px] p-5 md:p-8 border border-[#DED3C7] card-shadow">
          <h1 className="text-[28px] lg:text-[36px] font-bold leading-[1.35] text-[#2E2925] mb-2">
            建立帳號
          </h1>
          <p className="text-base text-[#655A50] mb-6">
            填寫基本資料，開始管理你的個人冰箱與專屬食譜推薦。
          </p>

          {Object.keys(fieldErrors).length > 0 && (
            <div
              ref={errorSummaryRef}
              tabIndex={-1}
              role="alert"
              className="mb-6 p-4 rounded-[14px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] space-y-1"
            >
              <div className="flex items-center gap-2 font-semibold text-base">
                <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>請檢查以下表單項目：</span>
              </div>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {Object.values(fieldErrors).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* 1. 暱稱 */}
            <div>
              <label
                htmlFor="reg-nickname"
                className="block text-base font-semibold text-[#2E2925] mb-1.5"
              >
                1. 暱稱
              </label>
              <input
                id="reg-nickname"
                type="text"
                autoComplete="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例如：小安"
                aria-invalid={!!fieldErrors.nickname}
                aria-describedby={fieldErrors.nickname ? 'err-nickname' : undefined}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-[#2E2925] text-base"
              />
              {fieldErrors.nickname && (
                <p id="err-nickname" className="mt-1.5 text-sm text-[#B42318] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{fieldErrors.nickname}</span>
                </p>
              )}
            </div>

            {/* 2. Email */}
            <div>
              <label
                htmlFor="reg-email"
                className="block text-base font-semibold text-[#2E2925] mb-1.5"
              >
                2. Email
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'err-email' : undefined}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-[#2E2925] text-base"
              />
              {fieldErrors.email && (
                <p id="err-email" className="mt-1.5 text-sm text-[#B42318] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>

            {/* 3. 密碼與顯示／隱藏按鈕 */}
            <div>
              <label
                htmlFor="reg-password"
                className="block text-base font-semibold text-[#2E2925] mb-1"
              >
                3. 密碼
              </label>
              <p id="password-hint" className="text-sm text-[#655A50] mb-1.5">
                密碼要求：請設定至少 12 個字元（支援貼上與密碼管理器）。
              </p>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入至少 12 個字元的密碼"
                  aria-describedby="password-hint err-password"
                  aria-invalid={!!fieldErrors.password}
                  className="w-full min-h-[48px] pl-4 pr-24 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-[#2E2925] text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[40px] px-3 rounded-[10px] text-sm font-medium text-[#655A50] hover:text-[#2E2925] hover:bg-[#FAF7F2] flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                      <span>隱藏</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" aria-hidden="true" />
                      <span>顯示</span>
                    </>
                  )}
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-[#655A50]">
                <span className="tabular-nums">目前字元數：{password.length} / 12</span>
                {password.length >= 12 && (
                  <span className="text-[#52603C] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    符合長度要求
                  </span>
                )}
              </div>
              {fieldErrors.password && (
                <p id="err-password" className="mt-1.5 text-sm text-[#B42318] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{fieldErrors.password}</span>
                </p>
              )}
            </div>

            {/* 4. 同意服務條款與隱私說明 */}
            <div className="pt-1">
              <div className="flex items-start gap-3">
                <input
                  id="reg-terms"
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-[#A8462D] rounded cursor-pointer"
                />
                <label htmlFor="reg-terms" className="text-base text-[#2E2925] cursor-pointer">
                  我已閱讀並同意{' '}
                  <button
                    type="button"
                    onClick={() => setTermsModalOpen(true)}
                    className="font-semibold text-[#A8462D] underline underline-offset-4 hover:text-[#8D3824] cursor-pointer"
                  >
                    服務條款與隱私說明
                  </button>
                </label>
              </div>
              {fieldErrors.agreedTerms && (
                <p className="mt-1.5 text-sm text-[#B42318] flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{fieldErrors.agreedTerms}</span>
                </p>
              )}
            </div>

            {/* 5. 主按鈕「建立帳號」 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] disabled:bg-[#88796B] text-white font-semibold text-base transition-colors cursor-pointer"
            >
              {isSubmitting ? '建立中…' : '建立帳號'}
            </button>

            {/* 6. 「已經有帳號？登入」 */}
            <div className="pt-3 border-t border-[#DED3C7] text-center">
              <span className="text-base text-[#655A50]">已經有帳號？</span>{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="min-h-[44px] px-2 font-semibold text-base text-[#A8462D] underline underline-offset-4 hover:text-[#8D3824] cursor-pointer"
              >
                登入
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Terms & Privacy Modal */}
      {termsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-[20px] max-w-lg w-full p-6 border border-[#DED3C7] card-shadow space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DED3C7] pb-3">
              <h2 id="terms-modal-title" className="text-xl font-bold text-[#2E2925]">
                服務條款與隱私說明
              </h2>
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                aria-label="關閉條款視窗"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-[#FAF7F2] text-[#655A50] cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-[#2E2925] leading-relaxed">
              <p className="font-semibold">1. 食材辨識與食品安全免責說明</p>
              <p className="text-[#655A50]">
                本服務提供之 AI 照片盤點與食譜推薦僅供家常料理規劃參考，不提供外觀食品安全判定，亦不構成醫療飲食處方或精確營養數值保證。所有辨識結果請由本人確認後再入庫。
              </p>
              <p className="font-semibold">2. 私有圖片與草稿保留期限</p>
              <p className="text-[#655A50]">
                你上傳的冰箱照片僅以短效私有授權處理，上傳時自動移除 EXIF 定位資料。原圖與未完成之盤點草稿預設於 24 小時內自動清除，絕不公開列出。
              </p>
              <p className="font-semibold">3. 飲食限制與帳號資料清除</p>
              <p className="text-[#655A50]">
                你的過敏原與飲食禁忌僅供你本人的食譜推薦驗證使用。當你於會員中心申請刪除帳號時，帳號將立即停止存取，正式資料與圖片於 7 日內清除，備份依 30 日輪替清除。
              </p>
            </div>
            <div className="pt-3 border-t border-[#DED3C7] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setAgreedTerms(true);
                  setTermsModalOpen(false);
                }}
                className="min-h-[48px] px-6 py-2.5 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
              >
                我已了解並同意
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const VerifyEmailPage: React.FC = () => {
  const { currentUser, verifyCurrentEmail, updateUnverifiedEmail, showToast } = useApp();
  const [countdown, setCountdown] = useState(60);
  const [resendCount, setResendCount] = useState(0);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = () => {
    if (countdown > 0) return;
    if (resendCount >= 3) {
      showToast('已達每小時重寄驗證信上限（3次），請稍後再試。');
      return;
    }
    setResendCount((c) => c + 1);
    setCountdown(60);
    showToast('驗證信已重新寄出，請檢查收件匣。');
  };

  const handleUpdateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateUnverifiedEmail(newEmail);
    if (!res.ok) {
      setEmailError(res.error || '格式錯誤');
    } else {
      setEmailError(null);
      setEditingEmail(false);
      setCountdown(60);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="bg-white rounded-[20px] p-6 md:p-8 border border-[#DED3C7] card-shadow space-y-6">
        <div className="w-14 h-14 rounded-full bg-[#F8E6DF] text-[#A8462D] flex items-center justify-center">
          <Mail className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-[28px] font-bold text-[#2E2925]">請完成 Email 驗證</h1>
          <p className="text-base text-[#655A50]">
            我們已將驗證信寄送至{' '}
            <span className="font-semibold text-[#2E2925] tabular-nums">
              {maskEmail(currentUser?.email || 'user@example.com')}
            </span>
            。為保障個人配額與資料安全，未驗證會員暫不開放個人 AI 拍照盤點與推薦功能。
          </p>
        </div>

        {editingEmail ? (
          <form onSubmit={handleUpdateEmail} className="p-4 rounded-[14px] bg-[#FAF7F2] border border-[#DED3C7] space-y-3">
            <label htmlFor="new-verify-email" className="block text-sm font-semibold text-[#2E2925]">
              修改接收驗證信的 Email 地址
            </label>
            <input
              id="new-verify-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full min-h-[48px] px-4 py-2 rounded-[12px] border border-[#88796B] bg-white text-base"
            />
            {emailError && <p className="text-sm text-[#B42318]">{emailError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#A8462D] text-white font-semibold text-sm cursor-pointer"
              >
                儲存並重寄驗證信
              </button>
              <button
                type="button"
                onClick={() => setEditingEmail(false)}
                className="min-h-[44px] px-4 py-2 rounded-[12px] border border-[#88796B] text-[#655A50] font-semibold text-sm cursor-pointer"
              >
                取消
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[14px] bg-[#FAF7F2] border border-[#DED3C7]">
            <div className="text-sm text-[#655A50]">
              <span>沒收到信件？每 60 秒可重寄一次（每小時上限 3 次）</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={countdown > 0 || resendCount >= 3}
                onClick={handleResend}
                className="min-h-[44px] px-4 py-2 rounded-[12px] border border-[#88796B] bg-white text-[#A8462D] disabled:text-[#655A50] disabled:bg-[#FAF7F2] font-semibold text-sm tabular-nums cursor-pointer"
              >
                {resendCount >= 3
                  ? '已達重寄上限'
                  : countdown > 0
                  ? `重寄驗證信 (${countdown}s)`
                  : '重寄驗證信'}
              </button>
              <button
                type="button"
                onClick={() => setEditingEmail(true)}
                className="min-h-[44px] px-3 py-2 text-sm font-semibold text-[#655A50] underline underline-offset-4 hover:text-[#2E2925] cursor-pointer"
              >
                修改地址
              </button>
            </div>
          </div>
        )}

        {/* Interactive Verification Trigger for Preview */}
        <div className="pt-4 border-t border-[#DED3C7] space-y-3">
          <button
            type="button"
            onClick={verifyCurrentEmail}
            className="w-full min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base transition-colors cursor-pointer"
          >
            模擬點擊驗證信連結（立即完成驗證）
          </button>
        </div>
      </div>
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const {
    login,
    loginAsDemoMember,
    navigate,
    sessionExpiredNotice,
    setSessionExpiredNotice,
    intendedPath,
  } = useApp();

  const [email, setEmail] = useState('lichieh.lin@gmail.com');
  const [password, setPassword] = useState('demo12345678');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('請輸入 Email 與密碼。');
      return;
    }
    const res = login(email, password);
    if (!res.ok) {
      setError(res.error || 'Email或密碼不正確');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 lg:py-12">
      <div className="bg-white rounded-[20px] p-6 md:p-8 border border-[#DED3C7] card-shadow space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] lg:text-[36px] font-bold text-[#2E2925]">會員登入</h1>
          <button
            type="button"
            onClick={() => setSessionExpiredNotice(!sessionExpiredNotice)}
            className="text-xs text-[#655A50] underline hover:text-[#2E2925] cursor-pointer"
          >
            {sessionExpiredNotice ? '隱藏逾時提示' : '預覽工作階段逾時'}
          </button>
        </div>

        {/* Rule 5.3: 工作階段逾期顯示「登入已逾時，請重新登入」 */}
        {sessionExpiredNotice && (
          <div
            role="alert"
            className="p-4 rounded-[14px] bg-[#FFF1D6] border border-[#835300] text-[#835300] flex items-center gap-2.5 text-base font-medium"
          >
            <Clock className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>登入已逾時，請重新登入</span>
          </div>
        )}

        {intendedPath && (
          <div className="p-3.5 rounded-[14px] bg-[#FAF7F2] border border-[#DED3C7] text-sm text-[#655A50]">
            請先登入帳號，登入成功後將為你返回預計前往的頁面。
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-4 rounded-[14px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] flex items-center gap-2 text-base font-medium"
          >
            <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-base font-semibold text-[#2E2925] mb-1.5">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-[#2E2925] text-base"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="text-base font-semibold text-[#2E2925]">
                密碼
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm font-semibold text-[#A8462D] hover:underline cursor-pointer"
              >
                忘記密碼？
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[48px] pl-4 pr-24 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-[#2E2925] text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[40px] px-3 rounded-[10px] text-sm font-medium text-[#655A50] hover:text-[#2E2925] flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                    <span>隱藏</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    <span>顯示</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base transition-colors cursor-pointer"
          >
            登入
          </button>
        </form>

        <div className="pt-4 border-t border-[#DED3C7] flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div>
            <span className="text-[#655A50]">還沒有帳號？</span>{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="font-semibold text-[#A8462D] underline underline-offset-4 cursor-pointer"
            >
              前往註冊
            </button>
          </div>
          <button
            type="button"
            onClick={loginAsDemoMember}
            className="font-medium text-[#52603C] hover:underline cursor-pointer"
          >
            一鍵填入並登入示範會員
          </button>
        </div>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { navigate } = useApp();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('請輸入有效的 Email 地址。');
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="bg-white rounded-[20px] p-6 md:p-8 border border-[#DED3C7] card-shadow space-y-6">
        <h1 className="text-[28px] font-bold text-[#2E2925]">重設密碼申請</h1>

        {submitted ? (
          <div className="space-y-5">
            {/* Rule 5.3: 提交後統一提示：「若此Email已註冊，你將收到密碼重設信。」 */}
            <div
              role="status"
              className="p-4 rounded-[14px] bg-[#EAF0E3] border border-[#52603C] text-[#52603C] flex items-start gap-2.5 text-base font-medium"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>若此Email已註冊，你將收到密碼重設信。</span>
            </div>
            <p className="text-sm text-[#655A50]">
              重設連結為單次有效且具有時效限制。你可在下方預覽點擊重設連結後的畫面：
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-[#A8462D] text-white font-semibold text-base cursor-pointer"
              >
                模擬開啟密碼重設連結
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="min-h-[48px] px-5 py-2.5 rounded-[14px] border border-[#88796B] text-[#2E2925] font-semibold text-base cursor-pointer"
              >
                返回登入
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <p className="text-base text-[#655A50]">
              請輸入你註冊時使用的 Email，我們將寄送單次有效的密碼重設連結。
            </p>
            <div>
              <label htmlFor="forgot-email" className="block text-base font-semibold text-[#2E2925] mb-1.5">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base"
              />
              {error && <p className="mt-1.5 text-sm text-[#B42318]">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
            >
              寄送重設連結
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-base font-semibold text-[#655A50] hover:text-[#2E2925] cursor-pointer"
              >
                返回登入
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const { navigate, showToast } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenExpiredMode, setTokenExpiredMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      setError('新密碼長度至少需 12 個字元。');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('兩次輸入的新密碼不一致，請重新確認。');
      return;
    }
    setError(null);
    // Rule 5.3: 重設成功導向登入；不把密碼顯示於完成頁。
    showToast('密碼已成功重設，請使用新密碼登入。');
    navigate('/login');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="bg-white rounded-[20px] p-6 md:p-8 border border-[#DED3C7] card-shadow space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-[#2E2925]">設定新密碼</h1>
          <button
            type="button"
            onClick={() => setTokenExpiredMode((m) => !m)}
            className="text-xs text-[#655A50] underline cursor-pointer"
          >
            {tokenExpiredMode ? '切換為有效連結狀態' : '預覽連結過期狀態'}
          </button>
        </div>

        {tokenExpiredMode ? (
          <div className="space-y-5">
            <div
              role="alert"
              className="p-4 rounded-[14px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] space-y-1"
            >
              <div className="flex items-center gap-2 font-semibold text-base">
                <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>此密碼重設連結已過期或已被使用</span>
              </div>
              <p className="text-sm">
                為了保護你的帳號安全，重設連結僅供單次使用且有時效限制。請重新申請密碼重設信。
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="w-full min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
            >
              重新申請密碼重設連結
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {error && (
              <div
                role="alert"
                className="p-4 rounded-[14px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] flex items-center gap-2 text-sm font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="reset-new-pw" className="block text-base font-semibold text-[#2E2925] mb-1">
                新密碼（至少 12 字元）
              </label>
              <input
                id="reset-new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="請輸入至少 12 字元新密碼"
                className="w-full min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base"
              />
            </div>

            <div>
              <label htmlFor="reset-confirm-pw" className="block text-base font-semibold text-[#2E2925] mb-1">
                再次輸入新密碼
              </label>
              <input
                id="reset-confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="請再次輸入新密碼"
                className="w-full min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
            >
              更新密碼
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// Section 5.4: 首次設定 (Three-section skippable onboarding form)
export const OnboardingPage: React.FC = () => {
  const { preference, savePreference, navigate, setHasConfirmedConstraintsThisSession, showToast } =
    useApp();

  const [dietStyles, setDietStyles] = useState<DietStyle[]>(
    preference?.dietStyles || ['一般']
  );
  const [excludedInput, setExcludedInput] = useState(
    (preference?.excludedFoods || []).join('、')
  );
  const [allergens, setAllergens] = useState<string[]>(preference?.allergens || []);
  const [restrictions, setRestrictions] = useState<string[]>(
    preference?.dietaryRestrictions || []
  );
  const [equipment, setEquipment] = useState<EquipmentType[]>(
    preference?.equipment || []
  );
  const [defaultServings, setDefaultServings] = useState<number>(
    preference?.defaultServings || 1
  );
  // Rule 5.4: 油、鹽、醬油不預設勾選
  const [pantryStaples, setPantryStaples] = useState<string[]>(
    preference?.pantryStaples || []
  );

  const toggleItem = <T extends string>(list: T[], item: T, setter: (val: T[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const excludedFoods = excludedInput
      .split(/[、,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    savePreference(
      {
        dietStyles: dietStyles.length > 0 ? dietStyles : ['一般'],
        excludedFoods,
        allergens,
        dietaryRestrictions: restrictions,
        equipment,
        defaultServings,
        pantryStaples,
      },
      true
    );
    showToast('已儲存你的飲食與設備設定！');
    navigate('/inventory');
  };

  const handleSkip = () => {
    setHasConfirmedConstraintsThisSession(false);
    showToast('已略過首次設定，推薦料理前再確認當次條件即可。');
    navigate('/inventory');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 lg:py-10">
      <form onSubmit={handleSave} className="space-y-8">
        <div className="space-y-2">
          <span className="text-sm font-semibold text-[#A8462D]">首次個人化設定（可隨時修改或略過）</span>
          <h1 className="text-[28px] lg:text-[36px] font-bold text-[#2E2925]">
            設定你的廚房設備與飲食限制
          </h1>
          <p className="text-base text-[#655A50]">
            讓系統在推薦食譜時自動避開不適合的食材與你沒有的廚具。
          </p>
        </div>

        {/* Section 1: 飲食風格與不喜歡食材 */}
        <section className="bg-white rounded-[20px] p-5 md:p-6 border border-[#DED3C7] card-shadow space-y-5">
          <h2 className="text-[22px] font-bold text-[#2E2925]">
            第一段：飲食風格與不喜歡食材
          </h2>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-[#2E2925]">
              飲食風格偏好（可複選）
            </label>
            <div className="flex flex-wrap gap-2.5">
              {DIET_STYLE_OPTIONS.map((style) => {
                const selected = dietStyles.includes(style);
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleItem(dietStyles, style, setDietStyles)}
                    aria-pressed={selected}
                    className={`min-h-[44px] px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#A8462D] border-[#A8462D] text-white'
                        : 'bg-white border-[#88796B] text-[#2E2925] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                    <span>{style}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="onboard-excluded" className="block text-base font-semibold text-[#2E2925] mb-1">
              不喜歡的食材（選填，以頓號或逗號分隔）
            </label>
            <input
              id="onboard-excluded"
              type="text"
              value={excludedInput}
              onChange={(e) => setExcludedInput(e.target.value)}
              placeholder="例如：香菜、苦瓜、青椒"
              className="w-full min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base"
            />
          </div>
        </section>

        {/* Section 2: 過敏原及飲食禁忌（獨立區塊，不混在風格標籤中） */}
        <section className="bg-white rounded-[20px] p-5 md:p-6 border border-[#B42318]/40 card-shadow space-y-5">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-6 h-6 text-[#B42318] shrink-0 mt-1" aria-hidden="true" />
            <div>
              <h2 className="text-[22px] font-bold text-[#2E2925]">
                第二段：過敏原與飲食禁忌（獨立安全排除區）
              </h2>
              <p className="text-sm text-[#655A50]">
                勾選的過敏原與飲食禁忌屬於「必要排除條件」，在推薦與動態換菜時皆嚴格排除。
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-[#2E2925]">
              過敏原（必要排除）
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COMMON_ALLERGENS.map((item) => {
                const selected = allergens.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleItem(allergens, item, setAllergens)}
                    aria-pressed={selected}
                    className={`min-h-[44px] px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#B42318] border-[#B42318] text-white'
                        : 'bg-white border-[#88796B] text-[#2E2925] hover:bg-[#FEECE8]/40'
                    }`}
                  >
                    {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-[#2E2925]">
              飲食禁忌
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COMMON_RESTRICTIONS.map((item) => {
                const selected = restrictions.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleItem(restrictions, item, setRestrictions)}
                    aria-pressed={selected}
                    className={`min-h-[44px] px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#A8462D] border-[#A8462D] text-white'
                        : 'bg-white border-[#88796B] text-[#2E2925] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 3: 常用設備、預設人數與已確認常備調味料 */}
        <section className="bg-white rounded-[20px] p-5 md:p-6 border border-[#DED3C7] card-shadow space-y-5">
          <h2 className="text-[22px] font-bold text-[#2E2925]">
            第三段：常用設備、預設人數與常備調味料
          </h2>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-[#2E2925]">
              可用烹調設備（可複選）
            </label>
            <div className="flex flex-wrap gap-2.5">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const selected = equipment.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleItem(equipment, eq, setEquipment)}
                    aria-pressed={selected}
                    className={`min-h-[44px] px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#A8462D] border-[#A8462D] text-white'
                        : 'bg-white border-[#88796B] text-[#2E2925] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                    <span>{eq}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="onboard-servings" className="block text-base font-semibold text-[#2E2925] mb-1.5">
              預設用餐人數（1–10 人）
            </label>
            <select
              id="onboard-servings"
              value={defaultServings}
              onChange={(e) => setDefaultServings(Number(e.target.value))}
              className="w-48 min-h-[48px] px-4 py-2.5 rounded-[12px] border border-[#88796B] bg-white text-base tabular-nums"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} 人份
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-[#2E2925]">
              已確認家中現有的常備調味料
            </label>
            <p className="text-sm text-[#655A50]">
              系統不會預設你有油、鹽或醬油；請親自勾選目前手邊確定有的調味料：
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {COMMON_PANTRY_STAPLES.map((staple) => {
                const selected = pantryStaples.includes(staple);
                return (
                  <button
                    key={staple}
                    type="button"
                    onClick={() => toggleItem(pantryStaples, staple, setPantryStaples)}
                    aria-pressed={selected}
                    className={`min-h-[44px] px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#52603C] border-[#52603C] text-white'
                        : 'bg-white border-[#88796B] text-[#2E2925] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                    <span>{staple}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={handleSkip}
            className="min-h-[48px] px-6 py-3 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] font-semibold text-base hover:bg-[#FAF7F2] cursor-pointer"
          >
            稍後設定
          </button>
          <button
            type="submit"
            className="min-h-[48px] px-8 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
          >
            儲存並開始
          </button>
        </div>
      </form>
    </div>
  );
};
