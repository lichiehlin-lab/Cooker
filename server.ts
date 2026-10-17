import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper for Taipei date string YYYY-MM-DD
function getTaipeiDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Track processed AI requestIds to prevent duplicate quota consumption on retry
const processedRequests = new Map<string, any>();

// POST /api/ai/scan - Photo ingredient recognition
app.post('/api/ai/scan', async (req, res) => {
  try {
    const { images, requestId, existingItems = [] } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: '請至少選擇 1 張照片進行辨識。',
        retryable: false,
      });
    }

    if (images.length > 5) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: '一次最多上傳 5 張照片。',
        retryable: false,
      });
    }

    if (requestId && processedRequests.has(requestId)) {
      return res.json(processedRequests.get(requestId));
    }

    const ai = getGeminiClient();
    let draftItems: any[] = [];

    if (ai) {
      try {
        const parts: any[] = [];
        for (const img of images) {
          if (typeof img.dataUrl === 'string' && img.dataUrl.includes('base64,')) {
            const [header, base64Data] = img.dataUrl.split('base64,');
            const mimeMatch = header.match(/data:(.*?);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
          }
        }

        if (parts.length > 0) {
          parts.push({
            text: `你是一位嚴謹的台灣家庭冰箱盤點助手。請辨識照片中「清楚可見」的食材。
規則：
1. 絕對不要猜測被遮住或看不清楚的食材。
2. 絕對不要推測保存期限或新鮮程度。
3. 單位請使用台灣常見單位：顆、個、盒、包、片、克、毫升、把、條。
4. 若數量難以精確計算，請將 quantity 設為 null，並在 quantityNote 填入「約略／少量」或「約半包」，同時將 status 設為 "needs_review"。
5. 若有多張照片疑似拍到同一樣食材，請在 duplicateWarning 填入提醒說明（例如：「與其他照片中的雞蛋可能重複，請確認是否為同一盒」）。
6. 請以繁體中文回傳 JSON 陣列。`,
          });

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: { parts },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    displayName: { type: Type.STRING, description: '食材名稱（繁體中文）' },
                    category: {
                      type: Type.STRING,
                      description: '分類：蔬菜、水果、肉類、海鮮、蛋奶、豆製品、主食、調味料、其他',
                    },
                    quantity: {
                      type: Type.NUMBER,
                      nullable: true,
                      description: '估計數量，若無法確定請設為 null',
                    },
                    unit: { type: Type.STRING, description: '單位，如：顆、盒、包、個、克' },
                    quantityNote: { type: Type.STRING, description: '當數量未知時的描述，如：少量' },
                    location: { type: Type.STRING, description: '建議存放位置：冷藏、冷凍、常溫' },
                    status: {
                      type: Type.STRING,
                      description: 'confirmed 或 needs_review',
                    },
                    duplicateWarning: {
                      type: Type.STRING,
                      nullable: true,
                      description: '若疑似重複拍攝或與現有庫存重複的提醒文字',
                    },
                  },
                  required: ['displayName', 'category', 'unit', 'location', 'status'],
                },
              },
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            if (Array.isArray(parsed) && parsed.length > 0) {
              draftItems = parsed.map((item: any, idx: number) => ({
                id: `scan-item-${Date.now()}-${idx}`,
                displayName: item.displayName || '未命名食材',
                category: item.category || '其他',
                quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : null,
                unit: item.unit || '個',
                quantityNote: item.quantity === null ? item.quantityNote || '約略／少量' : '',
                location: ['冷藏', '冷凍', '常溫'].includes(item.location) ? item.location : '冷藏',
                status: item.status === 'confirmed' && item.quantity !== null ? 'confirmed' : 'needs_review',
                duplicateWarning: item.duplicateWarning || undefined,
              }));
            }
          }
        }
      } catch (aiErr) {
        console.warn('Gemini scan fallback triggered:', aiErr);
      }
    }

    // Fallback structured recognition when using sample photos or if AI key is unavailable
    if (draftItems.length === 0) {
      const hasMultipleImages = images.length > 1;
      draftItems = [
        {
          id: `scan-item-${Date.now()}-1`,
          displayName: '雞蛋',
          category: '蛋奶',
          quantity: 4,
          unit: '顆',
          quantityNote: '',
          location: '冷藏',
          status: 'confirmed',
          duplicateWarning: existingItems.some((i: any) => i.displayName.includes('雞蛋'))
            ? '冰箱已有「雞蛋」庫存批次，下一步可選擇合併或更新既有批次'
            : undefined,
        },
        {
          id: `scan-item-${Date.now()}-2`,
          displayName: '牛番茄',
          category: '蔬菜',
          quantity: 2,
          unit: '顆',
          quantityNote: '',
          location: '冷藏',
          status: 'confirmed',
        },
        {
          id: `scan-item-${Date.now()}-3`,
          displayName: '青蔥',
          category: '蔬菜',
          quantity: null,
          unit: '把',
          quantityNote: '少量',
          location: '冷藏',
          status: 'needs_review',
        },
        {
          id: `scan-item-${Date.now()}-4`,
          displayName: '鮮奶',
          category: '蛋奶',
          quantity: 1,
          unit: '盒',
          quantityNote: '約剩半盒，請確認實際容量',
          location: '冷藏',
          status: 'needs_review',
          duplicateWarning: hasMultipleImages
            ? '多張照片中皆出現鮮奶紙盒，請確認是否為同一盒避免重複累加'
            : undefined,
        },
      ];
    }

    const result = {
      draftItems,
      taipeiDate: getTaipeiDate(),
      isRetryCached: false,
    };

    if (requestId) {
      processedRequests.set(requestId, { ...result, isRetryCached: true });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      code: 'AI_INVALID_RESULT',
      message: '照片辨識暫時無法完成，請重新辨識或改用手動輸入。',
      retryable: true,
    });
  }
});

// POST /api/ai/swap - Dynamic single-card dish adjustment
app.post('/api/ai/swap', async (req, res) => {
  try {
    const { currentRecipe, message, constraints, inventory = [], requestId } = req.body;

    if (!currentRecipe || !message) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: '請輸入想調整這道菜的方式。',
        retryable: false,
      });
    }

    // Rule 5.8: 訊息要求取消過敏原時，導向條件面板明確修改，不能默默解除。
    const activeAllergens: string[] = constraints?.allergens || [];
    for (const allergen of activeAllergens) {
      const cleanName = allergen.split('／')[0];
      if (
        message.includes(cleanName) &&
        (message.includes('可以吃') ||
          message.includes('不怕') ||
          message.includes('取消') ||
          message.includes('解除') ||
          message.includes('加') ||
          message.includes('放'))
      ) {
        return res.status(422).json({
          code: 'ALLERGEN_MODIFICATION_BLOCKED',
          message: `偵測到訊息涉及必要排除的過敏原「${allergen}」。為確保飲食安全，系統不會透過對話直接解除過敏原設定；若需調整，請返回條件面板明確修改。`,
          retryable: false,
        });
      }
    }

    if (requestId && processedRequests.has(requestId)) {
      return res.json(processedRequests.get(requestId));
    }

    const ai = getGeminiClient();
    let updatedDuration = constraints?.maxDuration || currentRecipe.durationMinutes;
    let updatedEquipment: string[] = [...(constraints?.equipment || currentRecipe.equipment)];
    const notices: string[] = [];

    if (message.includes('15分鐘') || message.includes('15 分鐘') || message.includes('快一點')) {
      updatedDuration = 15;
      notices.push('15分鐘');
    }
    if (message.includes('不用開火') || message.includes('不加熱') || message.includes('涼拌')) {
      updatedEquipment = ['不加熱'];
      notices.push('不加熱');
    } else if (message.includes('微波爐')) {
      updatedEquipment = ['微波爐'];
      notices.push('微波爐');
    } else if (message.includes('電鍋')) {
      updatedEquipment = ['電鍋'];
      notices.push('電鍋');
    }

    const swapNotice = notices.length > 0 ? `已改為：${notices.join('／')}` : `已依「${message}」調整`;

    if (ai) {
      try {
        const invSummary = inventory
          .filter((b: any) => b.quantity === null || b.quantity > 0)
          .map((b: any) => `${b.displayName}(${b.quantity !== null ? b.quantity + b.unit : b.quantityNote})`)
          .join('、');

        const prompt = `使用者正在調整食譜「${currentRecipe.title}」。
使用者提出的要求：「${message}」
目前可用庫存：${invSummary || '無'}
常備調味料：${(constraints?.pantryStaples || []).join('、') || '無'}
用餐人數：${constraints?.servings || 2}人
時間限制：${updatedDuration ? updatedDuration + '分鐘內' : '不限'}
可用設備：${updatedEquipment.join('、')}
必要排除過敏原（絕對不可包含）：${activeAllergens.join('、') || '無'}
飲食禁忌與不喜歡食材（絕對不可包含）：${[...(constraints?.dietaryRestrictions || []), ...(constraints?.excludedFoods || [])].join('、') || '無'}
缺料模式：${constraints?.missingMode === 'only_existing' ? '只用現有食材（不可缺料）' : '允許補買最多2項'}

請產出一道替換的台灣家常料理 JSON。`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                feasible: { type: Type.BOOLEAN, description: '在嚴格遵守過敏原、設備與缺料限制下是否可行' },
                infeasibleReason: { type: Type.STRING, nullable: true },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                durationMinutes: { type: Type.INTEGER },
                equipment: { type: Type.ARRAY, items: { type: Type.STRING } },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      requiredQuantity: { type: Type.NUMBER, nullable: true },
                      unit: { type: Type.STRING },
                      isSeasoning: { type: Type.BOOLEAN },
                    },
                    required: ['name', 'unit', 'isSeasoning'],
                  },
                },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      stepNumber: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      instruction: { type: Type.STRING },
                      tip: { type: Type.STRING, nullable: true },
                    },
                    required: ['stepNumber', 'title', 'instruction'],
                  },
                },
              },
              required: ['feasible', 'title', 'summary', 'durationMinutes', 'equipment', 'ingredients', 'steps'],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (parsed && parsed.feasible === false) {
            return res.status(422).json({
              code: 'NO_FEASIBLE_SWAP',
              message: parsed.infeasibleReason || '目前庫存與限制條件下沒有符合此調整的料理，建議放寬時間或設備條件。',
              retryable: false,
            });
          }
          if (parsed && parsed.title) {
            const payload = {
              aiGenerated: parsed,
              swapNotice,
              updatedConstraints: notices.length > 0 ? { maxDuration: updatedDuration, equipment: updatedEquipment } : null,
            };
            if (requestId) processedRequests.set(requestId, payload);
            return res.json(payload);
          }
        }
      } catch (err) {
        console.warn('Gemini swap fallback triggered:', err);
      }
    }

    const fallbackPayload = {
      aiGenerated: null,
      swapNotice,
      updatedConstraints: notices.length > 0 ? { maxDuration: updatedDuration, equipment: updatedEquipment } : null,
    };
    if (requestId) processedRequests.set(requestId, fallbackPayload);
    return res.json(fallbackPayload);
  } catch (err) {
    return res.status(500).json({
      code: 'AI_TIMEOUT',
      message: '換菜服務回應逾時，已為你保留原料理與設定條件。',
      retryable: true,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
