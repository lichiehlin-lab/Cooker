import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  CATEGORIES,
  IngredientCategory,
  LOCATIONS,
  STANDARD_UNITS,
  ScanDraftItem,
  StorageLocation,
} from '../types';
import { DishVisual } from '../components/DishVisual';
import { formatQuantity } from '../utils/recipeEngine';

interface UploadedPhoto {
  id: string;
  name: string;
  sizeBytes: number;
  dataUrl: string;
  isValid: boolean;
  errorReason?: string;
}

export const ScanPage: React.FC = () => {
  const {
    inventory,
    commitScanDraft,
    usage,
    consumeQuota,
    navigate,
    showToast,
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Recognition Status & Error Handling (Section 7)
  const [isScanning, setIsScanning] = useState(false);
  const [scanStageText, setScanStageText] = useState('正在上傳並移除 EXIF 定位資訊…');
  const [scanError, setScanError] = useState<string | null>(null);
  const [draftExpiredNotice, setDraftExpiredNotice] = useState(false);
  const activeScanTokenRef = useRef<number>(0);

  // Step 2 & 3 Draft Items
  const [draftItems, setDraftItems] = useState<ScanDraftItem[]>([]);
  const [commitRequestId, setCommitRequestId] = useState<string>('');
  const [commitResult, setCommitResult] = useState<{
    addedCount: number;
    updatedCount: number;
  } | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validPhotos = photos.filter((p) => p.isValid);

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const currentCount = photos.length;
    const incoming = Array.from(fileList);

    if (currentCount + incoming.length > 5) {
      setScanError('一次最多可上傳 5 張照片，請先移除部分照片再選取。');
      return;
    }

    setScanError(null);

    incoming.forEach((file) => {
      const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const isAcceptedType = acceptedTypes.includes(file.type.toLowerCase());
      const isUnder10MB = file.size <= 10 * 1024 * 1024;

      if (!isAcceptedType) {
        setPhotos((prev) => [
          ...prev,
          {
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            sizeBytes: file.size,
            dataUrl: '',
            isValid: false,
            errorReason:
              '不支援此圖片格式。請在手機相簿或電腦將檔案轉存為 JPG、PNG 或 WebP 格式後再重新選取。',
          },
        ]);
        return;
      }

      if (!isUnder10MB) {
        setPhotos((prev) => [
          ...prev,
          {
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            sizeBytes: file.size,
            dataUrl: '',
            isValid: false,
            errorReason: '單張照片超過 10MB 上限，請壓縮或裁切照片後再重新上傳。',
          },
        ]);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => [
          ...prev,
          {
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            sizeBytes: file.size,
            dataUrl: typeof reader.result === 'string' ? reader.result : '',
            isValid: true,
          },
        ]);
      };
      reader.onerror = () => {
        setPhotos((prev) => [
          ...prev,
          {
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            sizeBytes: file.size,
            dataUrl: '',
            isValid: false,
            errorReason: '圖片檔案損毀無法讀取，請重選或移除此照片。',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLoadSampleFridgePhoto = () => {
    if (photos.length >= 5) {
      setScanError('已達 5 張照片上限。');
      return;
    }
    setScanError(null);
    setPhotos((prev) => [
      ...prev,
      {
        id: `sample-photo-${Date.now()}`,
        name: '今日冰箱冷藏室盤點_範例.jpg',
        sizeBytes: 842000,
        dataUrl: 'hero_kitchen',
        isValid: true,
      },
    ]);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleStartScan = async () => {
    if (validPhotos.length === 0) return;

    const reqId = `scan-req-${Date.now()}`;
    const quotaCheck = consumeQuota('scan', reqId);
    if (!quotaCheck.ok) {
      setScanError(quotaCheck.error || '配額已用完');
      return;
    }

    setScanError(null);
    setDraftExpiredNotice(false);
    setIsScanning(true);
    setScanStageText('第一階段：檢查檔案與移除 EXIF 定位資料…');

    const token = Date.now();
    activeScanTokenRef.current = token;

    setTimeout(() => {
      if (activeScanTokenRef.current === token) {
        setScanStageText('第二階段：AI 正在辨識照片中清楚可見的食材與數量…');
      }
    }, 500);

    try {
      const response = await fetch('/api/ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: validPhotos.map((p) => ({ name: p.name, dataUrl: p.dataUrl })),
          requestId: reqId,
          existingItems: inventory,
        }),
      });

      // Rule 5.6: 工作進行中可取消，取消後晚到結果不得覆蓋新操作。
      if (activeScanTokenRef.current !== token) {
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || '照片辨識失敗');
      }

      const data = await response.json();
      const items: ScanDraftItem[] = (data.draftItems || []).map((item: ScanDraftItem) => {
        // Pre-populate default merge action in Step 3
        const existingMatch = inventory.find(
          (b) =>
            (b.quantity === null || b.quantity > 0) &&
            (b.displayName === item.displayName || b.canonicalName === item.displayName)
        );
        return {
          ...item,
          mergeAction: existingMatch
            ? existingMatch.unit === item.unit &&
              existingMatch.quantity !== null &&
              item.quantity !== null
              ? 'merge_existing'
              : 'overwrite_existing'
            : 'new_batch',
          targetBatchId: existingMatch?.id,
        };
      });

      setDraftItems(items);
      setCommitRequestId(`commit-${Date.now()}`);
      setCommitResult(null);
      setIsScanning(false);
      setStep(2);
    } catch (err: any) {
      if (activeScanTokenRef.current !== token) return;
      setIsScanning(false);
      setScanError(err.message || 'AI 辨識回應逾時或暫時無法使用，請重新辨識或改用手動輸入。');
    }
  };

  const handleCancelScan = () => {
    activeScanTokenRef.current = 0;
    setIsScanning(false);
    showToast('已取消辨識任務，不會覆蓋你目前的庫存。');
  };

  const updateDraftItem = (id: string, updates: Partial<ScanDraftItem>) => {
    setDraftItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeDraftItem = (id: string) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addMissingDraftItem = () => {
    const newItem: ScanDraftItem = {
      id: `draft-manual-${Date.now()}`,
      displayName: '新食材',
      category: '蔬菜',
      quantity: 1,
      unit: '個',
      quantityNote: '',
      location: '冷藏',
      status: 'confirmed',
      mergeAction: 'new_batch',
    };
    setDraftItems((prev) => [...prev, newItem]);
  };

  const handleConfirmCommit = () => {
    if (draftItems.length === 0) {
      setCommitError('請至少保留 1 項要入庫的食材。');
      return;
    }
    setCommitError(null);
    const res = commitScanDraft(draftItems, commitRequestId);
    if (!res.ok) {
      setCommitError(res.error || '更新冰箱庫存失敗，請檢查單位設定。');
      return;
    }
    setCommitResult({
      addedCount: res.addedCount,
      updatedCount: res.updatedCount,
    });
    showToast(`已成功更新冰箱：新增 ${res.addedCount} 項、更新 ${res.updatedCount} 項！`);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header & Quota Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[28px] lg:text-[36px] font-bold text-[#2E2925]">
            拍照盤點食材
          </h1>
          <p className="text-sm text-[#655A50]">
            上傳照片後先由你確認名稱與數量，確認前不會異動冰箱庫存。
          </p>
        </div>
        <div className="text-sm text-[#655A50] bg-white px-4 py-2 rounded-[14px] border border-[#DED3C7] tabular-nums shrink-0">
          今日剩餘辨識配額：{Math.max(0, usage.scanLimit - usage.scanCount)} / {usage.scanLimit} 次（台北時間次日重設）
        </div>
      </div>

      {/* Three-Step Progress Bar */}
      <nav aria-label="拍照盤點步驟" className="bg-white rounded-[20px] p-4 border border-[#DED3C7] card-shadow">
        <ol className="grid grid-cols-3 gap-2 md:gap-4">
          {[
            { num: 1, title: '上傳照片' },
            { num: 2, title: '確認辨識' },
            { num: 3, title: '更新冰箱' },
          ].map((s) => {
            const active = step === s.num;
            const completed = step > s.num;
            return (
              <li
                key={s.num}
                className={`flex items-center gap-2.5 p-2.5 rounded-[14px] text-sm md:text-base font-semibold ${
                  active
                    ? 'bg-[#F8E6DF] text-[#A8462D]'
                    : completed
                    ? 'bg-[#EAF0E3] text-[#52603C]'
                    : 'text-[#655A50]'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold tabular-nums shrink-0 ${
                    active
                      ? 'bg-[#A8462D] text-white'
                      : completed
                      ? 'bg-[#52603C] text-white'
                      : 'bg-[#FAF7F2] border border-[#DED3C7] text-[#655A50]'
                  }`}
                >
                  {completed ? '✓' : s.num}
                </span>
                <span className="truncate">{s.title}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* STEP 1: Upload Photos */}
      {step === 1 && (
        <section className="bg-white rounded-[20px] p-5 md:p-8 border border-[#DED3C7] card-shadow space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[22px] font-bold text-[#2E2925]">
              步驟一：拍攝或選擇冰箱食材照片
            </h2>
            <button
              type="button"
              onClick={() => setDraftExpiredNotice((d) => !d)}
              className="text-xs text-[#655A50] underline hover:text-[#2E2925] cursor-pointer"
            >
              {draftExpiredNotice ? '隱藏草稿過期提示' : '預覽草稿 24 小時過期提示'}
            </button>
          </div>

          {draftExpiredNotice && (
            <div
              role="alert"
              className="p-4 rounded-[14px] bg-[#FFF1D6] border border-[#835300] text-[#835300] flex items-start gap-2.5 text-sm"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">上次未完成的盤點照片與草稿已超過 24 小時到期清除</p>
                <p>為保護你的隱私，原圖與未確認草稿僅保留 24 小時，請重新上傳照片或手動輸入。</p>
              </div>
            </div>
          )}

          {scanError && (
            <div
              role="alert"
              className="p-4 rounded-[14px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-semibold text-base">{scanError}</p>
                  <p className="text-sm">辨識失敗不會影響你既有的冰箱庫存。</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {validPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleStartScan}
                    className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#A8462D] text-white font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    <span>重新辨識</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/inventory')}
                  className="min-h-[44px] px-4 py-2 rounded-[12px] bg-white border border-[#88796B] text-[#2E2925] font-semibold text-sm cursor-pointer"
                >
                  改用手動輸入
                </button>
              </div>
            </div>
          )}

          {/* Large Accessible Click & Drag-and-Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFilesSelected(e.dataTransfer.files);
            }}
            className={`rounded-[20px] border-2 border-dashed p-6 md:p-10 text-center transition-colors space-y-4 ${
              isDragging
                ? 'border-[#A8462D] bg-[#F8E6DF]/40'
                : 'border-[#88796B] bg-[#FAF7F2]'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-[#F4E8DB] text-[#A8462D] flex items-center justify-center mx-auto">
              <Upload className="w-7 h-7" aria-hidden="true" />
            </div>

            <div className="space-y-1">
              <p className="text-lg font-semibold text-[#2E2925]">
                點選下方按鈕或將食材照片拖放到此處
              </p>
              <p className="text-sm text-[#655A50]">
                接受格式：<span className="font-semibold text-[#2E2925]">JPG、PNG、WebP</span> · 每張最多{' '}
                <span className="font-semibold text-[#2E2925] tabular-nums">10MB</span> · 一次最多{' '}
                <span className="font-semibold text-[#2E2925] tabular-nums">5 張</span>
              </p>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-5 h-5" aria-hidden="true" />
                <span>拍照</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] hover:bg-[#F8E6DF]/40 font-semibold text-base flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-5 h-5" aria-hidden="true" />
                <span>選擇照片</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSampleFridgePhoto}
                className="min-h-[48px] px-5 py-2.5 rounded-[14px] bg-[#EAF0E3] text-[#52603C] hover:bg-[#dce6d1] font-semibold text-base cursor-pointer"
              >
                載入範例冰箱照片
              </button>
            </div>
          </div>

          {/* Selected Thumbnails List */}
          {photos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-[#2E2925] tabular-nums">
                已選擇的照片（{photos.length} / 5）
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`rounded-[16px] p-3 border flex flex-col justify-between gap-3 ${
                      photo.isValid
                        ? 'bg-[#FAF7F2] border-[#DED3C7]'
                        : 'bg-[#FEECE8] border-[#B42318]'
                    }`}
                  >
                    {photo.isValid ? (
                      <div className="rounded-[12px] overflow-hidden border border-[#DED3C7]">
                        <DishVisual
                          visualKey={photo.dataUrl}
                          alt={photo.name}
                          aspectRatio="4:3"
                        />
                      </div>
                    ) : (
                      <div className="p-3 rounded-[12px] bg-white/80 text-[#B42318] text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>圖片無法讀取或格式不支援</span>
                        </div>
                        <p>{photo.errorReason}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#2E2925] truncate">
                          {photo.name}
                        </p>
                        <p className="text-xs text-[#655A50] tabular-nums">
                          {Math.round(photo.sizeBytes / 1024)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        aria-label={`移除照片 ${photo.name}`}
                        className="min-h-[44px] px-3 py-1.5 rounded-[10px] border border-[#88796B] bg-white text-[#B42318] hover:bg-[#FEECE8] text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>刪除</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scanning Progress Overlay Box */}
          {isScanning && (
            <div
              role="status"
              aria-live="polite"
              className="p-5 rounded-[16px] bg-[#F4E8DB] border border-[#A8462D] flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-[#A8462D] animate-spin shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-bold text-base text-[#2E2925]">{scanStageText}</p>
                  <p className="text-sm text-[#655A50]">
                    系統正在產生待確認清單，隨時可取消且不影響目前庫存。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelScan}
                className="min-h-[44px] px-4 py-2 rounded-[12px] bg-white border border-[#88796B] text-[#2E2925] font-semibold text-sm shrink-0 cursor-pointer"
              >
                取消辨識
              </button>
            </div>
          )}

          {/* Step 1 Footer CTA (Disabled states must provide text reason per Section 5.6 & 6) */}
          <div className="pt-4 border-t border-[#DED3C7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-[#655A50]">
              {validPhotos.length === 0 ? (
                <span className="text-[#835300] font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>尚未選擇有效照片，請先拍照或選擇至少 1 張照片以開始辨識。</span>
                </span>
              ) : (
                <span>已準備好 {validPhotos.length} 張有效照片，點擊右側按鈕開始辨識。</span>
              )}
            </div>

            <button
              type="button"
              disabled={validPhotos.length === 0 || isScanning}
              onClick={handleStartScan}
              className="min-h-[48px] px-8 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] disabled:bg-[#88796B] text-white font-semibold text-base flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>{isScanning ? '辨識處理中…' : '開始辨識'}</span>
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 2: Review & Edit AI Recognition Results */}
      {step === 2 && (
        <section className="space-y-6">
          {/* Top Notice Banner */}
          <div
            role="status"
            className="p-4 rounded-[16px] bg-[#FFF1D6] border border-[#835300]/40 text-[#835300] flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="font-bold text-base">這是AI估計結果，請確認名稱與數量。</p>
              <p className="text-sm">
                系統不會由照片推測保存期限或新鮮程度；標示「待確認」或疑似重複的項目請先檢查後再進入下一步。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left on Desktop: Uploaded Photos Preview */}
            <div className="lg:col-span-4 bg-white rounded-[20px] p-4 lg:p-5 border border-[#DED3C7] card-shadow space-y-4">
              <h2 className="text-lg font-bold text-[#2E2925]">本次盤點照片</h2>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                {validPhotos.map((p) => (
                  <div key={p.id} className="rounded-[14px] overflow-hidden border border-[#DED3C7]">
                    <DishVisual visualKey={p.dataUrl} alt={p.name} aspectRatio="4:3" />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full min-h-[44px] px-4 py-2 rounded-[12px] border border-[#88796B] text-[#655A50] hover:text-[#2E2925] font-semibold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>返回重新選擇照片</span>
              </button>
            </div>

            {/* Right on Desktop: Editable Draft List */}
            <div className="lg:col-span-8 bg-white rounded-[20px] p-5 lg:p-6 border border-[#DED3C7] card-shadow space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DED3C7] pb-3">
                <h2 className="text-[22px] font-bold text-[#2E2925]">
                  待確認食材清單（{draftItems.length} 項）
                </h2>
                {/* Fixed Visible "新增漏掉的食材" button */}
                <button
                  type="button"
                  onClick={addMissingDraftItem}
                  className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#FAF7F2] border border-[#88796B] text-[#A8462D] hover:bg-[#F8E6DF]/50 font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>新增漏掉的食材</span>
                </button>
              </div>

              <div className="space-y-4">
                {draftItems.map((item) => {
                  const isNeedsReview = item.status === 'needs_review';
                  return (
                    <div
                      key={item.id}
                      className={`rounded-[16px] p-4 border space-y-3 ${
                        isNeedsReview
                          ? 'bg-[#FFF1D6]/40 border-[#835300]'
                          : 'bg-[#FAF7F2] border-[#DED3C7]'
                      }`}
                    >
                      {/* Status & Duplicate Warning Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {isNeedsReview ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1D6] text-[#835300] text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>待確認（請檢查數量或單位）</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF0E3] text-[#52603C] text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>已確認</span>
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          {isNeedsReview && (
                            <button
                              type="button"
                              onClick={() => updateDraftItem(item.id, { status: 'confirmed' })}
                              className="min-h-[38px] px-3 py-1 rounded-[10px] bg-[#52603C] text-white text-xs font-semibold cursor-pointer"
                            >
                              標記為已確認
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeDraftItem(item.id)}
                            aria-label={`刪除辨識項目 ${item.displayName}`}
                            className="min-h-[38px] px-3 py-1 rounded-[10px] border border-[#88796B] bg-white text-[#B42318] hover:bg-[#FEECE8] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>刪除</span>
                          </button>
                        </div>
                      </div>

                      {item.duplicateWarning && (
                        <div className="p-2.5 rounded-[10px] bg-[#FFF1D6] text-[#835300] text-xs font-medium flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>疑似重複提示：{item.duplicateWarning}</span>
                        </div>
                      )}

                      {/* Editable Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-4">
                          <label className="block text-xs font-semibold text-[#655A50] mb-1">
                            食材名稱
                          </label>
                          <input
                            type="text"
                            value={item.displayName}
                            onChange={(e) =>
                              updateDraftItem(item.id, { displayName: e.target.value })
                            }
                            className="w-full min-h-[44px] px-3 py-1.5 rounded-[10px] border border-[#88796B] bg-white text-base text-[#2E2925]"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-semibold text-[#655A50] mb-1">
                            估計數量（留空代表少量）
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.quantity !== null ? item.quantity : ''}
                            placeholder="約略／少量"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                updateDraftItem(item.id, {
                                  quantity: null,
                                  quantityNote: '少量',
                                });
                              } else {
                                updateDraftItem(item.id, {
                                  quantity: Number(val),
                                  quantityNote: '',
                                  status: 'confirmed',
                                });
                              }
                            }}
                            className="w-full min-h-[44px] px-3 py-1.5 rounded-[10px] border border-[#88796B] bg-white text-base tabular-nums"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-[#655A50] mb-1">
                            單位
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) =>
                              updateDraftItem(item.id, { unit: e.target.value })
                            }
                            className="w-full min-h-[44px] px-2.5 py-1.5 rounded-[10px] border border-[#88796B] bg-white text-base"
                          >
                            {STANDARD_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-semibold text-[#655A50] mb-1">
                            存放位置
                          </label>
                          <select
                            value={item.location}
                            onChange={(e) =>
                              updateDraftItem(item.id, {
                                location: e.target.value as StorageLocation,
                              })
                            }
                            className="w-full min-h-[44px] px-2.5 py-1.5 rounded-[10px] border border-[#88796B] bg-white text-base"
                          >
                            {LOCATIONS.map((loc) => (
                              <option key={loc} value={loc}>
                                {loc}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-[#DED3C7] flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={addMissingDraftItem}
                  className="min-h-[48px] px-5 py-2.5 rounded-[14px] border border-[#88796B] text-[#A8462D] font-semibold text-base flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>新增漏掉的食材</span>
                </button>

                <button
                  type="button"
                  disabled={draftItems.length === 0}
                  onClick={() => setStep(3)}
                  className="min-h-[48px] px-8 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] disabled:bg-[#88796B] text-white font-semibold text-base flex items-center gap-2 cursor-pointer"
                >
                  <span>下一步：選擇入庫與合併方式</span>
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STEP 3: Choose Batch Merge/Update Action & Confirm */}
      {step === 3 && (
        <section className="bg-white rounded-[20px] p-5 md:p-8 border border-[#DED3C7] card-shadow space-y-6">
          {commitResult ? (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-[#EAF0E3] text-[#52603C] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h2 className="text-[28px] font-bold text-[#2E2925]">
                  冰箱庫存已成功更新！
                </h2>
                <p className="text-base text-[#655A50] tabular-nums">
                  本次共新增 <span className="font-bold text-[#2E2925]">{commitResult.addedCount}</span> 個食材批次、更新或合併{' '}
                  <span className="font-bold text-[#2E2925]">{commitResult.updatedCount}</span> 個既有批次。
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/inventory')}
                  className="min-h-[48px] px-6 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base cursor-pointer"
                >
                  查看我的冰箱
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/recipes')}
                  className="min-h-[48px] px-6 py-3 rounded-[14px] bg-white border border-[#88796B] text-[#A8462D] font-semibold text-base cursor-pointer"
                >
                  用現有食材找料理
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-[22px] font-bold text-[#2E2925]">
                  步驟三：確認入庫方式與異動預覽
                </h2>
                <p className="text-sm text-[#655A50]">
                  請為每個項目選擇「新增批次」、「合併既有批次」或「更新指定批次」。單位不同或為約略數量時禁止自動合併。
                </p>
              </div>

              {commitError && (
                <div
                  role="alert"
                  className="p-4 rounded-[14px] bg-[#FEECE8] border border-[#B42318] text-[#B42318] flex items-center gap-2 text-sm font-medium"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{commitError}</span>
                </div>
              )}

              <div className="space-y-4">
                {draftItems.map((item) => {
                  const matchingBatches = inventory.filter(
                    (b) =>
                      (b.quantity === null || b.quantity > 0) &&
                      (b.displayName.includes(item.displayName) ||
                        item.displayName.includes(b.displayName))
                  );
                  const selectedTarget =
                    inventory.find((b) => b.id === item.targetBatchId) ||
                    matchingBatches[0] ||
                    null;

                  const unitMismatch =
                    selectedTarget && selectedTarget.unit !== item.unit;
                  const approximateConflict =
                    selectedTarget &&
                    (selectedTarget.quantity === null || item.quantity === null);
                  const canAutoMerge =
                    selectedTarget && !unitMismatch && !approximateConflict;

                  return (
                    <div
                      key={item.id}
                      className="p-4 lg:p-5 rounded-[16px] bg-[#FAF7F2] border border-[#DED3C7] space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-bold text-[#2E2925]">
                            {item.displayName}（{item.location}）
                          </h3>
                          <p className="text-sm text-[#655A50] tabular-nums">
                            本次辨識量：
                            <span className="font-semibold text-[#2E2925]">
                              {item.quantity !== null
                                ? `${formatQuantity(item.quantity)} ${item.unit}`
                                : `${item.quantityNote || '少量'}（${item.unit}）`}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateDraftItem(item.id, { mergeAction: 'new_batch' })
                            }
                            className={`min-h-[40px] px-3.5 py-1.5 rounded-[10px] text-sm font-semibold border cursor-pointer ${
                              item.mergeAction === 'new_batch'
                                ? 'bg-[#A8462D] border-[#A8462D] text-white'
                                : 'bg-white border-[#88796B] text-[#2E2925]'
                            }`}
                          >
                            新增獨立批次
                          </button>

                          {matchingBatches.length > 0 && (
                            <>
                              <button
                                type="button"
                                disabled={!canAutoMerge}
                                onClick={() =>
                                  updateDraftItem(item.id, {
                                    mergeAction: 'merge_existing',
                                    targetBatchId: selectedTarget?.id,
                                  })
                                }
                                className={`min-h-[40px] px-3.5 py-1.5 rounded-[10px] text-sm font-semibold border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                  item.mergeAction === 'merge_existing'
                                    ? 'bg-[#A8462D] border-[#A8462D] text-white'
                                    : 'bg-white border-[#88796B] text-[#2E2925]'
                                }`}
                              >
                                合併累加至既有批次
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateDraftItem(item.id, {
                                    mergeAction: 'overwrite_existing',
                                    targetBatchId: selectedTarget?.id,
                                  })
                                }
                                className={`min-h-[40px] px-3.5 py-1.5 rounded-[10px] text-sm font-semibold border cursor-pointer ${
                                  item.mergeAction === 'overwrite_existing'
                                    ? 'bg-[#A8462D] border-[#A8462D] text-white'
                                    : 'bg-white border-[#88796B] text-[#2E2925]'
                                }`}
                              >
                                以盤點結果覆寫既有批次
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {matchingBatches.length > 0 && unitMismatch && (
                        <div className="p-2.5 rounded-[10px] bg-[#FFF1D6] text-[#835300] text-xs font-medium flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>
                            既有批次單位為「{selectedTarget?.unit}」，與本次「{item.unit}」不同，系統禁止自動換算合併；請選擇「新增獨立批次」或「覆寫既有批次」，或返回上一步修改單位。
                          </span>
                        </div>
                      )}

                      {/* Preview: 原庫存 → 異動量 → 更新後庫存 */}
                      <div className="p-3 rounded-[12px] bg-white border border-[#DED3C7] grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm tabular-nums">
                        <div>
                          <span className="text-[#655A50]">原庫存：</span>
                          <span className="font-semibold text-[#2E2925]">
                            {item.mergeAction === 'new_batch' || !selectedTarget
                              ? '0（新批次）'
                              : selectedTarget.quantity !== null
                              ? `${selectedTarget.quantity} ${selectedTarget.unit}`
                              : selectedTarget.quantityNote || '少量'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#655A50]">異動方式：</span>
                          <span className="font-semibold text-[#A8462D]">
                            {item.mergeAction === 'new_batch'
                              ? `新增 +${item.quantity !== null ? item.quantity + ' ' + item.unit : item.quantityNote}`
                              : item.mergeAction === 'merge_existing'
                              ? `累加 +${item.quantity} ${item.unit}`
                              : `覆寫為盤點量`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#655A50]">更新後庫存：</span>
                          <span className="font-bold text-[#52603C]">
                            {item.mergeAction === 'merge_existing' &&
                            selectedTarget &&
                            selectedTarget.quantity !== null &&
                            item.quantity !== null
                              ? `${Math.round((selectedTarget.quantity + item.quantity) * 100) / 100} ${item.unit}`
                              : item.quantity !== null
                              ? `${item.quantity} ${item.unit}`
                              : `${item.quantityNote || '少量'}（${item.unit}）`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-[#DED3C7] flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[48px] px-5 py-2.5 rounded-[14px] border border-[#88796B] text-[#2E2925] font-semibold text-base flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span>返回修改辨識清單</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCommit}
                  className="min-h-[48px] px-8 py-3 rounded-[14px] bg-[#A8462D] hover:bg-[#8D3824] text-white font-semibold text-base flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                  <span>確認更新冰箱</span>
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
};
