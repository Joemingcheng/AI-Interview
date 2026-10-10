"use client";
// 這整支檔案要用到 useState、onClick、onChange 等瀏覽器端互動，
// 所以必須標記 "use client"，讓 Next.js 把它當成 Client Component 而不是 Server Component。

import Link from "next/link";
import { useEffect, useState } from "react";

// 這三個常數要跟後端 /api/interview/route.ts 裡的設定一致，
// 用來限制與顯示「題數輸入框」的預設值與上下限。
const DEFAULT_TOTAL_QUESTIONS = 3;
const MIN_TOTAL_QUESTIONS = 1;
const MAX_TOTAL_QUESTIONS = 10;

// 這個工具採用 BYOK（Bring Your Own Key）模式：
// 使用者自己的 OpenAI API Key 只會存在瀏覽器的 localStorage，
// 用這個 key 名稱存取，每次打 /api/interview 時用 Authorization header 帶過去。
const API_KEY_STORAGE_KEY = "ai-interview:openai-api-key";

// 對話紀錄裡一筆資料的型別：
// assistant = 面試官的提問、user = 應徵者的回答
type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

// 這個頁面有三個畫面狀態：
// setup        → 還在填職缺描述、選題數的設定畫面
// interviewing → 面試進行中，正在一問一答
// done         → 題目都答完了，顯示最終評估報告
type Phase = "setup" | "interviewing" | "done";

export default function InterviewPage() {
  // 使用者填的職缺描述
  const [jobDescription, setJobDescription] = useState("");
  // 使用者選擇的面試題數，預設 3 題
  const [totalQuestions, setTotalQuestions] = useState(
    DEFAULT_TOTAL_QUESTIONS,
  );
  // 完整的對話紀錄（面試官問題 + 應徵者回答交錯存放），
  // 這是整個頁面狀態機最重要的資料來源，因為後端是無狀態的，
  // 每次呼叫 API 都要把這包完整資料傳回去，讓後端能判斷目前進度。
  const [history, setHistory] = useState<ChatTurn[]>([]);
  // 目前輸入框裡、使用者正在打的這一題回答（還沒送出）
  const [answer, setAnswer] = useState("");
  // 目前畫面處於哪個階段，用來決定要渲染哪一段 UI
  const [phase, setPhase] = useState<Phase>("setup");
  // 目前是第幾題，純粹用來顯示「第 X / Y 題」
  const [questionNumber, setQuestionNumber] = useState(0);
  // 面試結束後，後端回傳的評估報告文字
  const [evaluation, setEvaluation] = useState("");
  // 是否正在等待 API 回應中，用來鎖住按鈕、顯示 loading 文字，避免重複送出
  const [loading, setLoading] = useState(false);
  // 呼叫 API 失敗時的錯誤訊息，null 代表目前沒有錯誤
  const [error, setError] = useState<string | null>(null);

  // 使用者自己的 OpenAI API Key（BYOK）。
  // 初始值先給空字串，實際的值要等瀏覽器端的 useEffect 從 localStorage 讀出來才會填入，
  // 這樣才不會在伺服器端渲染（SSR）時去存取只存在瀏覽器裡的 localStorage。
  const [apiKey, setApiKey] = useState("");
  // 設定面板目前輸入到一半、還沒按下「儲存」的草稿值，
  // 跟 apiKey 分開存是為了避免使用者打字打到一半，就有未儲存的字串被拿去打 API
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  // 右上角「API Key 設定」面板是否展開
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 頁面載入後（只在瀏覽器端執行一次），嘗試從 localStorage 讀出之前存過的 API Key。
  // localStorage 是瀏覽器才有的外部系統，伺服器端渲染時讀不到，
  // 所以必須等 mount 後才能同步這個值，這裡用 effect 屬於合理例外，故關掉下面這條 lint 規則。
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(API_KEY_STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount 後讀取 localStorage 這個外部系統，必須用 effect 同步
        setApiKey(stored);
        setApiKeyDraft(stored);
      }
    } catch {
      // localStorage 在某些情境下可能讀不到（例如無痕模式、瀏覽器設定封鎖），
      // 讀不到就當作使用者還沒設定過，不用特別處理錯誤
    }
  }, []);

  // 使用者在設定面板按下「儲存」時觸發：把草稿值存進 state 跟 localStorage，並關閉面板
  function handleSaveApiKey() {
    const trimmed = apiKeyDraft.trim();
    setApiKey(trimmed);
    try {
      if (trimmed) {
        window.localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
      } else {
        window.localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch {
      // 存不進 localStorage 也沒關係，apiKey state 這次 session 內還是可以正常使用
    }
    setSettingsOpen(false);
  }

  // 使用者在設定面板按下「清除」時觸發：清掉已儲存的 key
  function handleClearApiKey() {
    setApiKey("");
    setApiKeyDraft("");
    try {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch {
      // 同上，清不掉 localStorage 也不影響這次 session 的狀態
    }
  }

  // 呼叫 API 前先確認使用者有沒有設定 API Key，
  // 沒有的話就跳出錯誤訊息，並自動展開設定面板引導使用者輸入
  function ensureApiKey(): boolean {
    if (apiKey.trim()) return true;
    setError("請先在右上角設定輸入你的 OpenAI API Key");
    setSettingsOpen(true);
    return false;
  }

  // 統一封裝「呼叫 /api/interview」的邏輯，避免在 handleStart / handleSubmitAnswer
  // 重複寫 fetch 的程式碼。
  // 參數 nextHistory：呼叫當下「最新」的對話紀錄（因為 setState 是非同步的，
  // 不能直接讀 state 裡的 history，所以呼叫端要自己組好最新版本再傳進來）。
  async function callInterviewApi(nextHistory: ChatTurn[]) {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 使用者自己的 OpenAI API Key 透過這個 header 帶給後端，
        // 後端收到後只會在這次請求裡用一下，不會儲存
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        jobDescription,
        history: nextHistory,
        totalQuestions,
      }),
    });

    const data = await res.json();

    // 後端回傳非 2xx（例如缺職缺描述、OpenAI 呼叫失敗）時，
    // 直接丟出例外，交給呼叫端的 try/catch 統一處理成 error 訊息
    if (!res.ok) {
      throw new Error(data?.error ?? "發生未知錯誤");
    }

    // 這裡用型別斷言告訴 TypeScript 回傳資料的形狀，
    // phase 是 "question"（下一題）或 "evaluation"（最終評估報告）
    return data as {
      phase: "question" | "evaluation";
      message: string;
      questionNumber?: number;
      totalQuestions?: number;
    };
  }

  // 使用者在設定畫面按下「開始模擬面試」時觸發
  async function handleStart() {
    // 職缺描述是空白或正在 loading 中就不處理，避免重複點擊
    if (!jobDescription.trim() || loading) return;
    setError(null);
    if (!ensureApiKey()) return;
    setLoading(true);
    try {
      // 一開始對話紀錄是空陣列，後端看到空陣列就知道「這是第一次呼叫」，
      // 會回傳第 1 題
      const data = await callInterviewApi([]);
      // 把面試官出的第一題放進對話紀錄，角色是 assistant
      setHistory([{ role: "assistant", content: data.message }]);
      setQuestionNumber(data.questionNumber ?? 1);
      // 後端可能會把題數夾在 1~10 之間（例如使用者傳了奇怪的值），
      // 這裡用後端回傳的 totalQuestions 校正前端畫面顯示的題數，確保前後端一致
      setTotalQuestions(data.totalQuestions ?? totalQuestions);
      // 切換到「面試進行中」畫面
      setPhase("interviewing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "發生未知錯誤");
    } finally {
      setLoading(false);
    }
  }

  // 使用者在面試進行中按下「送出回答」時觸發
  async function handleSubmitAnswer() {
    if (!answer.trim() || loading) return;
    setError(null);
    if (!ensureApiKey()) return;
    setLoading(true);

    // 先把這次的回答（role: "user"）接到既有的對話紀錄後面，
    // 組成「呼叫 API 當下」最新的完整紀錄
    const nextHistory: ChatTurn[] = [
      ...history,
      { role: "user", content: answer.trim() },
    ];
    // 先把使用者剛剛的回答顯示到畫面上（樂觀更新），
    // 不用等 API 回來才顯示，使用者體驗比較即時
    setHistory(nextHistory);
    // 清空輸入框，準備讓使用者打下一題的回答
    setAnswer("");

    try {
      // 把包含「這次回答」的最新對話紀錄送給後端，
      // 後端會算出目前已回答題數，決定要出下一題還是給評估報告
      const data = await callInterviewApi(nextHistory);

      if (data.phase === "evaluation") {
        // 後端判斷題數已經答滿，這次回傳的是最終評估報告
        // → 存報告內容，並切換畫面到「done」
        setEvaluation(data.message);
        setPhase("done");
      } else {
        // 題數還沒答滿，這次回傳的是下一題
        // → 把新問題（role: "assistant"）接到對話紀錄後面，畫面上就會多一個面試官的提問泡泡
        setHistory([
          ...nextHistory,
          { role: "assistant", content: data.message },
        ]);
        setQuestionNumber(data.questionNumber ?? questionNumber + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "發生未知錯誤");
    } finally {
      setLoading(false);
    }
  }

  // 使用者在評估報告畫面按下「重新開始」時觸發，
  // 把所有 state 重設回初始值，回到設定畫面
  function handleRestart() {
    setJobDescription("");
    setTotalQuestions(DEFAULT_TOTAL_QUESTIONS);
    setHistory([]);
    setAnswer("");
    setPhase("setup");
    setQuestionNumber(0);
    setEvaluation("");
    setError(null);
  }

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-indigo-50/60 via-white to-white dark:from-indigo-950/20 dark:via-black dark:to-black">
      {/* App 內的頂部列：跟行銷首頁共用品牌識別，但這裡是精簡版工具列，
          方便使用者隨時回到首頁，以及隨時打開右上角的 API Key 設定 */}
      <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800/70 dark:bg-black/60">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-xs font-bold text-white">
              AI
            </span>
            面試模擬器
          </Link>

          <div className="flex items-center gap-4">
            {/* API Key 設定按鈕 + 下拉面板。relative 容器讓面板可以用 absolute 定位在按鈕下方 */}
            <div className="relative">
              <button
                onClick={() => {
                  // 打開面板時，把草稿值重設成目前已儲存的 key，避免殘留上次沒存的草稿
                  setApiKeyDraft(apiKey);
                  setSettingsOpen((open) => !open);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    apiKey.trim() ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                API Key
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                  <label
                    htmlFor="openai-api-key"
                    className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    OpenAI API Key
                  </label>
                  <input
                    id="openai-api-key"
                    type="password"
                    autoComplete="off"
                    value={apiKeyDraft}
                    onChange={(e) => setApiKeyDraft(e.target.value)}
                    placeholder="sk-..."
                    className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-400"
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    只會存在你瀏覽器的 localStorage，不會上傳或儲存到我們的伺服器；呼叫
                    OpenAI 的費用依你的帳號用量計算。
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleSaveApiKey}
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      儲存
                    </button>
                    <button
                      onClick={handleClearApiKey}
                      className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      清除
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/"
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              ← 返回首頁
            </Link>
          </div>
        </div>
      </header>

      <main className="flex w-full flex-1 justify-center">
        <div className="flex w-full max-w-2xl flex-col gap-6 px-6 py-10 sm:py-16">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              AI 面試模擬器
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              輸入職缺描述並選擇題數，AI 面試官將提出模擬面試問題，並於結束後給予評分、建議，以及每一題更好的回答方式。
            </p>
          </header>

          {/* 全域錯誤訊息：不管在哪個 phase，只要 error 有值就顯示在最上方 */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {/* === 畫面一：setup，填職缺描述 + 選題數 === */}
          {phase === "setup" && (
            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {/* 還沒設定 API Key 時，提醒使用者先去右上角設定 */}
              {!apiKey.trim() && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  請先點選右上角「API Key」設定你的 OpenAI API Key，才能開始模擬面試。
                </div>
              )}

              <label
                htmlFor="job-description"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                職缺描述
              </label>
              <textarea
                id="job-description"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="請貼上或輸入職缺的工作內容、所需技能與經驗等描述..."
                rows={8}
                className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-400"
              />

              <label
                htmlFor="total-questions"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                面試題數（{MIN_TOTAL_QUESTIONS}-{MAX_TOTAL_QUESTIONS} 題）
              </label>
              <input
                id="total-questions"
                type="number"
                min={MIN_TOTAL_QUESTIONS}
                max={MAX_TOTAL_QUESTIONS}
                value={totalQuestions}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  // 使用者清空輸入框或輸入非數字時，value 會是 NaN，
                  // 這種情況先不更新 state，避免畫面出現奇怪的數字
                  if (!Number.isFinite(value)) return;
                  // 前端也做一次夾值（跟後端 resolveTotalQuestions 邏輯一致），
                  // 讓使用者輸入超出範圍的數字時能立刻在畫面上被修正，
                  // 而不是等到呼叫 API 才被後端校正回來
                  setTotalQuestions(
                    Math.min(
                      Math.max(Math.round(value), MIN_TOTAL_QUESTIONS),
                      MAX_TOTAL_QUESTIONS,
                    ),
                  );
                }}
                className="w-24 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-400"
              />

              <button
                onClick={handleStart}
                disabled={!jobDescription.trim() || !apiKey.trim() || loading}
                className="group mt-2 inline-flex w-fit items-center gap-2 self-start rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "準備題目中..." : "開始模擬面試"}
                {!loading && (
                  <span className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                )}
              </button>
            </div>
          )}

          {/* === 畫面二 / 三共用區塊：interviewing（面試中）跟 done（已結束）
              都需要顯示「職缺描述」+「目前為止的對話紀錄」，所以共用同一個 if === */}
          {(phase === "interviewing" || phase === "done") && (
            <div className="flex flex-col gap-4">
              {/* 顯示一開始填的職缺描述，方便使用者對照 */}
              <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                  職缺描述：
                </span>{" "}
                {jobDescription}
              </div>

              {/* 把 history 陣列逐筆渲染成聊天氣泡：
                  assistant（面試官）靠左、灰底；user（應徵者）靠右、品牌漸層底 */}
              <div className="flex flex-col gap-3">
                {history.map((turn, i) => (
                  <div
                    key={i}
                    className={
                      turn.role === "assistant"
                        ? "self-start max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-200 px-4 py-2.5 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                        : "self-end max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600 to-fuchsia-500 px-4 py-2.5 text-sm text-white"
                    }
                  >
                    {/* 只有面試官的泡泡才加上「面試官」的小標籤 */}
                    {turn.role === "assistant" && (
                      <div className="mb-1 text-xs font-medium opacity-60">
                        面試官
                      </div>
                    )}
                    {/* whitespace-pre-wrap 讓後端回傳文字裡的換行符號能正確顯示出來 */}
                    <p className="whitespace-pre-wrap">{turn.content}</p>
                  </div>
                ))}
              </div>

              {/* 面試進行中：顯示「第 X / Y 題」+ 回答輸入框 + 送出按鈕 */}
              {phase === "interviewing" && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    第 {questionNumber} / {totalQuestions} 題
                  </div>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="輸入你的回答..."
                    rows={4}
                    disabled={loading}
                    className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-indigo-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-400"
                  />
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!answer.trim() || loading}
                    className="inline-flex w-fit items-center gap-2 self-start rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? "思考中..." : "送出回答"}
                  </button>
                </div>
              )}

              {/* 面試已結束：顯示最終評估報告 + 重新開始按鈕 */}
              {phase === "done" && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                    <div className="mb-2 text-sm font-semibold">
                      面試評估報告
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {evaluation}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleRestart}
                      className="self-start rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      重新開始
                    </button>
                    <Link
                      href="/"
                      className="self-start rounded-full px-5 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      返回首頁
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
