import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Refrigerator,
  UtensilsCrossed,
  Bookmark,
  User,
  ChevronDown,
  History,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { RoutePath, useApp } from '../context/AppContext';

export const Navigation: React.FC = () => {
  const {
    currentPath,
    navigate,
    currentUser,
    logout,
    toastMessage,
  } = useApp();

  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMemberMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { label: string; path: RoutePath; icon: React.ReactNode; requireAuth?: boolean }[] = [
    { label: '首頁', path: '/', icon: <Home className="w-5 h-5" aria-hidden="true" /> },
    {
      label: '我的冰箱',
      path: '/inventory',
      icon: <Refrigerator className="w-5 h-5" aria-hidden="true" />,
      requireAuth: true,
    },
    {
      label: '找料理',
      path: '/recipes',
      icon: <UtensilsCrossed className="w-5 h-5" aria-hidden="true" />,
      requireAuth: true,
    },
    {
      label: '收藏',
      path: '/favorites',
      icon: <Bookmark className="w-5 h-5" aria-hidden="true" />,
      requireAuth: true,
    },
  ];

  const isPathActive = (path: RoutePath) => {
    if (path === '/' && currentPath === '/') return true;
    if (path === '/inventory' && (currentPath === '/inventory' || currentPath === '/scan')) return true;
    if (path === '/recipes' && (currentPath === '/recipes' || currentPath === '/recipe-detail')) return true;
    if (path === '/favorites' && currentPath === '/favorites') return true;
    if (path === '/account' && (currentPath === '/account' || currentPath === '/history')) return true;
    return false;
  };

  return (
    <>
      {/* Top Bar: 64px on Mobile, 72px on Desktop */}
      <header className="sticky top-0 z-30 h-16 lg:h-[72px] bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#DED3C7]">
        <div className="max-w-[1200px] mx-auto h-full px-4 md:px-6 lg:px-8 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xl lg:text-2xl font-bold tracking-tight text-[#2E2925] whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            冰箱好料理
          </button>

          {/* Zone 2: Desktop Navigation Links */}
          <nav aria-label="主導覽列" className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const active = isPathActive(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path, { requireAuth: item.requireAuth })}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-2 text-base font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                    active
                      ? 'text-[#A8462D] border-[#A8462D] bg-[#F8E6DF]/60 rounded-t-lg font-semibold'
                      : 'text-[#655A50] border-transparent hover:text-[#2E2925] hover:border-[#DED3C7]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Right Member Menu or Visitor Login/Register */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMemberMenuOpen((o) => !o)}
                  aria-expanded={memberMenuOpen}
                  aria-haspopup="menu"
                  className={`min-h-[44px] px-3.5 py-2 rounded-[14px] border text-base font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isPathActive('/account')
                      ? 'bg-[#F8E6DF] border-[#A8462D] text-[#A8462D]'
                      : 'bg-white border-[#88796B] text-[#2E2925] hover:bg-[#F4E8DB]/50'
                  }`}
                >
                  <User className="w-4 h-4 text-[#A8462D]" aria-hidden="true" />
                  <span>{currentUser.nickname}</span>
                  <ChevronDown className="w-4 h-4 text-[#655A50]" aria-hidden="true" />
                </button>

                {memberMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-48 rounded-[20px] bg-white border border-[#DED3C7] card-shadow py-2 z-50"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMemberMenuOpen(false);
                        navigate('/account');
                      }}
                      className="w-full min-h-[44px] px-4 py-2.5 text-left text-base text-[#2E2925] hover:bg-[#FAF7F2] flex items-center gap-2.5 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#655A50]" aria-hidden="true" />
                      <span>會員中心</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMemberMenuOpen(false);
                        navigate('/history');
                      }}
                      className="w-full min-h-[44px] px-4 py-2.5 text-left text-base text-[#2E2925] hover:bg-[#FAF7F2] flex items-center gap-2.5 cursor-pointer"
                    >
                      <History className="w-4 h-4 text-[#655A50]" aria-hidden="true" />
                      <span>料理紀錄</span>
                    </button>
                    <div className="my-1 border-t border-[#DED3C7]" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMemberMenuOpen(false);
                        logout();
                      }}
                      className="w-full min-h-[44px] px-4 py-2.5 text-left text-base text-[#B42318] hover:bg-[#FEECE8]/60 flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-[#B42318]" aria-hidden="true" />
                      <span>登出</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="min-h-[44px] px-4 py-2 rounded-[14px] border border-[#88796B] bg-white text-[#A8462D] font-semibold text-base hover:bg-[#F8E6DF]/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  登入
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="min-h-[44px] px-4 py-2 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  註冊
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Non-blocking Toast notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 md:right-8 z-50 max-w-sm bg-[#2E2925] text-white px-4 py-3 rounded-[14px] shadow-lg flex items-center gap-2.5 text-sm font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-[#EAF0E3] shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (64px + safe area) */}
      <nav
        aria-label="行動版底部導覽列"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#DED3C7] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16 px-1">
          {navItems.map((item) => {
            const active = isPathActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path, { requireAuth: item.requireAuth })}
                aria-current={active ? 'page' : undefined}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#A8462D] bg-[#F8E6DF]/50 font-semibold border-t-2 border-[#A8462D]'
                    : 'text-[#655A50] hover:text-[#2E2925]'
                }`}
              >
                {item.icon}
                <span className="text-xs whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => navigate(currentUser ? '/account' : '/login')}
            aria-current={isPathActive('/account') ? 'page' : undefined}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              isPathActive('/account')
                ? 'text-[#A8462D] bg-[#F8E6DF]/50 font-semibold border-t-2 border-[#A8462D]'
                : 'text-[#655A50] hover:text-[#2E2925]'
            }`}
          >
            <User className="w-5 h-5" aria-hidden="true" />
            <span className="text-xs whitespace-nowrap">會員</span>
          </button>
        </div>
      </nav>
    </>
  );
};
