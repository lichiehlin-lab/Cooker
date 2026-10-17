/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import {
  RegisterPage,
  VerifyEmailPage,
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  OnboardingPage,
} from './pages/AuthPages';
import { InventoryPage } from './pages/InventoryPage';
import { ScanPage } from './pages/ScanPage';
import { RecipesPage } from './pages/RecipesPage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { FavoritesPage, HistoryPage } from './pages/FavoritesAndHistoryPages';
import { AccountPage } from './pages/AccountPage';

const MainRouter: React.FC = () => {
  const { currentPath, navigate, currentUser, loginAsDemoMember } = useApp();

  const renderPage = () => {
    switch (currentPath) {
      case '/':
        return <HomePage />;
      case '/register':
        return <RegisterPage />;
      case '/verify-email':
        return <VerifyEmailPage />;
      case '/login':
        return <LoginPage />;
      case '/forgot-password':
        return <ForgotPasswordPage />;
      case '/reset-password':
        return <ResetPasswordPage />;
      case '/onboarding':
        return <OnboardingPage />;
      case '/inventory':
        return <InventoryPage />;
      case '/scan':
        return <ScanPage />;
      case '/recipes':
        return <RecipesPage />;
      case '/recipe-detail':
        return <RecipeDetailPage />;
      case '/favorites':
        return <FavoritesPage />;
      case '/history':
        return <HistoryPage />;
      case '/account':
        return <AccountPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2E2925]">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-12">{renderPage()}</main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#DED3C7] bg-[#FAF7F2] py-8 pb-24 md:pb-8 text-sm text-[#655A50]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-bold text-[#2E2925]">
              冰箱好料理 · 把冰箱裡的食材，變成今天的好料理
            </p>
            <p className="text-xs text-[#655A50]">
              時區顯示：Asia/Taipei · 照片辨識與料理建議僅供家常備餐參考，不作為食品安全或醫療依據。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="hover:text-[#2E2925] cursor-pointer"
            >
              首頁
            </button>
            {!currentUser ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="hover:text-[#2E2925] cursor-pointer"
                >
                  註冊帳號
                </button>
                <button
                  type="button"
                  onClick={loginAsDemoMember}
                  className="text-[#A8462D] font-semibold hover:underline cursor-pointer"
                >
                  切換示範會員
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/onboarding')}
                  className="hover:text-[#2E2925] cursor-pointer"
                >
                  首次設定導覽
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="hover:text-[#2E2925] cursor-pointer"
                >
                  料理紀錄
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
