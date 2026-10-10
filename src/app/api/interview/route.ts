import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// 沒有指定題數時的預設面試題數
const DEFAULT_TOTAL_QUESTIONS = 3;
// 使用者可設定的題數下限，避免傳入 0 或負數
const MIN_TOTAL_QUESTIONS = 1;
// 使用者可設定的題數上限，避免有人傳入超大數字狂刷 OpenAI 額度
const MAX_TOTAL_QUESTIONS = 10;
// 呼叫 OpenAI 用的模型，可用環境變數 OPENAI_MODEL 覆寫，沒設定就用 gpt-4o-mini
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// 一輪對話紀錄的型別：面試官的提問算 assistant，應徵者的回答算 user
type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

// 這支 API 是「無狀態」的：前端每次呼叫都要把目前為止的完整對話紀錄（history）傳回來，
// 伺服器不會在記憶體或資料庫保存任何面試進度。
// 因為 history 是從前端傳進來的 JSON，型別是 unknown，所以要先檢查格式對不對，
// 防止有人亂傳奇怪的資料把後面的邏輯弄壞。
function isChatTurn(value: unknown): value is ChatTurn {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.role === "user" || v.role === "assistant") &&
    typeof v.content === "string"
  );
}

// 把前端傳來的 totalQuestions 轉成一個「可信任」的安全數字：
// - 不是數字、是 NaN/Infinity 之類的異常值 → 用預設值 3
// - 是數字就四捨五入，並夾在 [MIN_TOTAL_QUESTIONS, MAX_TOTAL_QUESTIONS] 範圍內
function resolveTotalQuestions(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TOTAL_QUESTIONS;
  }
  const rounded = Math.round(value);
  return Math.min(Math.max(rounded, MIN_TOTAL_QUESTIONS), MAX_TOTAL_QUESTIONS);
}

// 前端只會打這一支 POST，依照目前對話進度決定要做什麼事：
// 1. 還沒問滿題數 → 出下一題
// 2. 已經問滿題數 → 改成給評分報告
export async function POST(req: NextRequest) {
  // 先檢查伺服器有沒有設定 OPENAI_API_KEY（讀自 .env.local），
  // 沒有的話就直接回 500，不用浪費力氣往下執行
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "伺服器未設定 OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  // 嘗試把 request body 解析成 JSON，如果前端傳的不是合法 JSON 就回 400
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  // 從 body 取出三個欄位，先當作 unknown，後面再逐一驗證
  // jobDescription: 使用者填的職缺描述
  // history: 目前為止的完整問答紀錄（面試官問題 + 應徵者回答交錯）
  // totalQuestions: 使用者想要的面試題數
  const { jobDescription, history, totalQuestions } = (body ?? {}) as {
    jobDescription?: unknown;
    history?: unknown;
    totalQuestions?: unknown;
  };

  // 職缺描述是必填欄位，沒有就不知道要問什麼問題，直接擋掉
  if (typeof jobDescription !== "string" || !jobDescription.trim()) {
    return NextResponse.json({ error: "請提供職缺描述" }, { status: 400 });
  }

  // history 可能是 undefined、不是陣列，或陣列裡混了格式錯誤的物件，
  // 用 isChatTurn 把不合法的項目過濾掉，確保後面處理的都是乾淨資料
  const safeHistory: ChatTurn[] = Array.isArray(history)
    ? history.filter(isChatTurn)
    : [];
  // 把題數也清洗成一個安全的數字
  const safeTotalQuestions = resolveTotalQuestions(totalQuestions);

  // 核心邏輯：用「使用者已經回答了幾題」來判斷目前面試進行到哪個階段。
  // history 裡 role 是 "user" 的筆數，就是應徵者已經回答的題數。
  // 例如：answeredCount = 2，代表應徵者已經回答了第 1、2 題。
  const answeredCount = safeHistory.filter((h) => h.role === "user").length;

  // 建立 OpenAI 的 client，用伺服器端的 API 金鑰（不會暴露給前端瀏覽器）
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 把自訂的 ChatTurn 格式轉成 OpenAI chat.completions 要求的訊息格式
  // （其實欄位長得一樣，這裡主要是確保型別符合 SDK 的要求）
  const conversation = safeHistory.map((h) => ({
    role: h.role,
    content: h.content,
  }));

  try {
    // 分支一：已經回答的題數 >= 使用者要求的總題數
    // → 代表 3 題（或自訂題數）都答完了，這次呼叫要產生「評估報告」而不是出新題目
    if (answeredCount >= safeTotalQuestions) {
      // 組一段 system prompt，讓模型扮演「資深面試官」，
      // 並且把職缺描述放進去，讓評分能緊扣這個職缺的需求
      const systemPrompt = `你是一位資深的面試官，剛剛針對以下職缺對一位應徵者完成了 ${safeTotalQuestions} 題模擬面試問答：

職缺描述：
"""
${jobDescription}
"""

請根據完整的問答紀錄，給予應徵者一份面試評估報告，內容請包含：
1. 整體評分（滿分 100 分，給一個分數）
2. 逐題分析：請針對「每一題」依序說明，每題包含：
   - 簡短評語（應徵者這題回答得如何）
   - 更好的回答方式（具體說明這一題怎麼回答會更出色，例如可以補充的重點、結構、或範例角度，讓應徵者知道理想的回答方向）
3. 應徵者展現的優點
4. 應徵者可以改進的地方
5. 具體的建議（例如可以如何準備類似面試、回答時可以補強哪些細節）

請使用清楚的繁體中文撰寫，並遵守以下格式規則：
- 不要使用 Markdown 語法（不要用 #、*、- 等符號），只能用純文字。
- 段落標題直接用文字表示（例如「整體評分」「第 1 題」），並換行分隔各段落。
- 條列項目請用「1.」「2.」這種數字加句點的純文字編號，每項獨立一行。
語氣請專業且具建設性。`;

      // 呼叫 OpenAI：
      // - system 訊息放評分規則與職缺描述
      // - 接著放整個對話紀錄（每一題問題 + 應徵者的回答），
      //   讓模型有完整的上下文可以針對「每一題」給評語
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.7, // 評分報告希望穩定、不要太天馬行空，溫度給中等偏低
        messages: [
          { role: "system", content: systemPrompt },
          ...conversation,
        ],
      });

      // 取出模型回覆的文字內容，拿不到就給空字串避免噴錯
      const message = completion.choices[0]?.message?.content?.trim() ?? "";

      // 回傳給前端：phase 設為 "evaluation"，前端收到這個會顯示最終報告、結束面試
      return NextResponse.json({ phase: "evaluation", message });
    }

    // 分支二：題數還沒問完，要產生「下一題」
    // 第幾題 = 已經回答的題數 + 1（例如回答了 1 題，這次要出的是第 2 題）
    const questionNumber = answeredCount + 1;

    // 出題用的 system prompt：同樣帶入職缺描述、目前題號/總題數，
    // 並明確要求「只能輸出一個問題」、不要重複之前問過的題目
    const systemPrompt = `你是一位專業的面試官，正在針對以下職缺對應徵者進行模擬面試：

職缺描述：
"""
${jobDescription}
"""

面試共有 ${safeTotalQuestions} 題，現在是第 ${questionNumber} 題。請根據職缺內容與先前的問答紀錄，提出一個切題、有深度的面試問題。

規則：
- 只能輸出「一個」問題本身，不要編號、不要加上開場白或結語、不要自問自答。
- 問題需與前面問過的題目不同，並盡量涵蓋不同面向（例如專業技能、過往經驗、情境判斷、團隊合作等）。
- 使用繁體中文。`;

    // 一樣把 system prompt + 既有對話紀錄丟給模型，
    // 模型看得到前面已經問過哪些題目、應徵者怎麼回答，才能避免問重複的題目
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.8, // 出題希望有點變化、不要每次都問一樣的東西，溫度給高一點
      messages: [{ role: "system", content: systemPrompt }, ...conversation],
    });

    const message = completion.choices[0]?.message?.content?.trim() ?? "";

    // 回傳給前端：phase 設為 "question"，附上這是第幾題、總共幾題，
    // 前端收到後會把這段文字當作新的面試官提問顯示出來
    return NextResponse.json({
      phase: "question",
      message,
      questionNumber,
      totalQuestions: safeTotalQuestions,
    });
  } catch (err) {
    // 呼叫 OpenAI 失敗（例如額度用完、網路問題、金鑰錯誤等）時，
    // 記錄錯誤到伺服器 log，並回傳 502 讓前端顯示錯誤訊息，而不是讓整個請求掛掉
    console.error("/api/interview error", err);
    return NextResponse.json(
      { error: "呼叫 OpenAI API 時發生錯誤，請稍後再試" },
      { status: 502 },
    );
  }
}
