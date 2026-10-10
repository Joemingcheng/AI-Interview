import Link from "next/link";
import type { ReactNode } from "react";

// ============================================================================
// 行銷首頁（Landing Page）
// 這支檔案不需要任何瀏覽器端互動（沒有 useState / onClick 之類的邏輯），
// 所以刻意不加 "use client"，讓它維持 Server Component，載入更快、也不用送 JS 給瀏覽器。
// 實際「可以操作的面試工具」在 /interview（src/app/interview/page.tsx），
// 這裡只負責介紹產品，並用按鈕把使用者導過去。
// ============================================================================

// 小工具：畫一個裝飾用的模糊漸層光斑，純視覺效果，不帶任何語意
function GradientBlob({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`absolute rounded-full blur-3xl ${className}`}
    />
  );
}

// 小工具：三個 Feature 卡片共用的圖示容器，裡面放一個簡單的線條 SVG
function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white">
      {children}
    </div>
  );
}

const FEATURES = [
  {
    title: "貼上職缺，AI 幫你量身出題",
    description:
      "不是固定題庫。貼上任何職缺描述、選擇想練習的題數，AI 會針對這份職缺的技能與職責出題，而不是隨機亂問。",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
      >
        <path
          d="M9 12.75l2 2 4-4M4.5 5.5h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "像真人面試官一樣追問",
    description:
      "每一題都根據你剛剛的回答延伸提問，而不是照稿念下一題。細節交代不清楚，就會被接著問下去——跟真實面試一樣。",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
      >
        <path
          d="M7 9h10M7 13h6m-9 7 2.5-3H19a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h0Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "逐題評語 + 更好的回答方式",
    description:
      "面試結束立刻拿到整體評分、每一題的評語，以及「這題怎麼回答會更出色」的具體建議，不是只給一個分數就結束。",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
      >
        <path
          d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2 2m-9 9-2 2m0-13 2 2m9 9 2 2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    no: "01",
    title: "貼上職缺描述、選擇題數",
    description:
      "把你想投遞的職缺描述貼進去，再選擇要練習幾題（1-10 題都可以），接著按下開始。",
  },
  {
    no: "02",
    title: "一題一題回答 AI 面試官",
    description:
      "AI 會根據職缺與你前面的回答出題，一次一題、循序漸進，就像真實面試一來一往的節奏。",
  },
  {
    no: "03",
    title: "拿到評分報告，知道怎麼答更好",
    description:
      "答完最後一題，立刻取得整體評分、每一題的評語，以及更好的回答方式建議，可以馬上重練一次。",
  },
];

const FAQS = [
  {
    q: "我的回答會被存起來或拿去做其他用途嗎？",
    a: "不會。你的回答只會在當次的面試對話中，用來產生下一題提問與最終評估報告，結束後不會額外保存。",
  },
  {
    q: "需要自己申請 OpenAI API Key 或額外付費嗎？",
    a: "需要。本工具採用 BYOK（Bring Your Own Key）模式，請在 /interview 右上角的設定輸入你自己的 OpenAI API Key，費用依你 OpenAI 帳號的實際用量計費，我們不會向你額外收費。",
  },
  {
    q: "我的 API Key 安全嗎？會不會被你們存起來？",
    a: "Key 只會存在你瀏覽器的 localStorage，不會傳到我們的伺服器保存；每次出題或評分時才會用 Authorization header 帶給我們的 API，用完即丟。",
  },
  {
    q: "只能練習工程師職缺嗎？",
    a: "不限職類。行銷、業務、設計、數據分析等任何職缺描述都可以貼上來練習，AI 會依照內容出題。",
  },
  {
    q: "評估報告只有一個分數嗎？",
    a: "不是。報告會包含整體評分、逐題評語、每一題「更好的回答方式」建議，以及整體優缺點與準備建議。",
  },
];

export default function LandingPage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-x-clip bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* ============================ HEADER ============================ */}
      <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800/70 dark:bg-black/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-xs font-bold text-white">
              AI
            </span>
            <span className="text-sm font-semibold tracking-tight">
              AI 面試模擬器
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-600 sm:flex dark:text-zinc-400">
            <a
              href="#features"
              className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              功能特色
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              使用方式
            </a>
            <a
              href="#faq"
              className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              常見問題
            </a>
          </nav>

          <Link
            href="/interview"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:text-sm"
          >
            免費開始
            <span aria-hidden>→</span>
          </Link>
        </div>
      </header>

      <main>
        {/* ============================ HERO ============================ */}
        <section className="relative overflow-hidden">
          <GradientBlob className="-top-24 -left-24 h-80 w-80 bg-indigo-300/40 dark:bg-indigo-700/20" />
          <GradientBlob className="top-10 right-[-6rem] h-72 w-72 bg-fuchsia-300/40 dark:bg-fuchsia-700/20" />
          <GradientBlob className="bottom-[-8rem] left-1/3 h-72 w-72 bg-amber-200/40 dark:bg-amber-600/10" />

          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 pt-16 pb-24 sm:pt-24 sm:pb-32 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                AI 模擬面試教練
              </span>

              <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
                每一次作答，
                <br />
                都是{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                  離錄取更近
                </span>
                的一步。
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
                貼上職缺描述、選擇題數，AI
                面試官就會像真人一樣追問、挑戰你。面試結束立刻拿到逐題評語，以及每一題更好的回答方式。
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/interview"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-opacity hover:opacity-90"
                >
                  免費開始模擬面試
                  <span className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  看看怎麼運作
                </a>
              </div>

              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                不用註冊，輸入你自己的 OpenAI API Key 即可開始，Key 只存在你的瀏覽器。
              </p>
            </div>

            {/* 產品預覽卡：用跟實際工具一致的聊天氣泡樣式，做一個靜態的小型示意畫面 */}
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-1.5 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="ml-3 text-xs text-zinc-400">
                    AI 面試模擬器
                  </span>
                </div>
                <div className="flex flex-col gap-3 p-5">
                  <div className="self-start max-w-[80%] rounded-2xl rounded-tl-sm bg-zinc-200 px-4 py-2.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <div className="mb-1 text-[10px] font-medium opacity-60">
                      面試官
                    </div>
                    請分享一次你在專案中遇到瓶頸，並如何解決的經驗。
                  </div>
                  <div className="self-end max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600 to-fuchsia-500 px-4 py-2.5 text-xs text-white">
                    我透過拆解問題、找出根因，並與團隊討論後導入新的解決方案⋯
                  </div>
                  <div className="self-start max-w-[80%] rounded-2xl rounded-tl-sm bg-zinc-200 px-4 py-2.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <div className="mb-1 text-[10px] font-medium opacity-60">
                      面試官
                    </div>
                    那在這個過程中，你是如何評估方案的優先順序？
                  </div>
                  <div className="mt-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                    <span className="font-semibold">評估報告預覽　</span>
                    整體評分 88 分・更好的回答方式：可補充具體的評估標準⋯
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-5 -right-5 hidden rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs shadow-lg sm:block dark:border-zinc-800 dark:bg-zinc-950">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  第 2 / 3 題
                </span>
                <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                  即時追問中
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= 介紹區塊（大字報） ======================= */}
        <section className="relative px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white px-8 py-14 text-center shadow-sm sm:px-16 dark:border-zinc-800 dark:from-zinc-950 dark:to-black">
            <p className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl lg:text-4xl">
              不是題庫，不是罐頭問題。
              <br />
              AI 會讀懂你貼的職缺，順著你的回答繼續追問
              <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">
                ——跟真實面試一樣，會被問到詞窮。
              </span>
            </p>
            <div className="mt-8">
              <Link
                href="/interview"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-zinc-900"
              >
                立即試一次
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ============================ FEATURES ============================ */}
        <section id="features" className="scroll-mt-20 px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-semibold tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
                Features
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                為什麼不只是「題庫練習」
              </h2>
              <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                一般的面試題庫只能照稿背答案。AI
                面試模擬器會真的「聽」你的回答，給出屬於這場面試的提問與建議。
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-lg hover:shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <FeatureIcon>{feature.icon}</FeatureIcon>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ HOW IT WORKS ============================ */}
        <section
          id="how-it-works"
          className="scroll-mt-20 bg-zinc-50 px-6 py-20 sm:py-28 dark:bg-zinc-950/40"
        >
          <div className="mx-auto max-w-4xl">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-semibold tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
                How it works
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                三個步驟，開始練習
              </h2>
            </div>

            <ol className="mt-14 flex flex-col gap-10">
              {STEPS.map((step) => (
                <li
                  key={step.no}
                  className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <span className="bg-gradient-to-br from-indigo-600 to-fuchsia-500 bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl">
                    {step.no}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ============================ FAQ ============================ */}
        <section id="faq" className="scroll-mt-20 px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-semibold tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
                FAQ
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                常見問題
              </h2>
            </div>

            <div className="mt-12 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
              {FAQS.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold sm:text-base">
                    {item.q}
                    <span className="shrink-0 text-zinc-400 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ CTA BANNER ============================ */}
        <section className="relative overflow-hidden px-6 py-24 sm:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500" />
          <GradientBlob className="-top-20 right-10 h-64 w-64 bg-white/10" />
          <GradientBlob className="bottom-[-6rem] left-10 h-72 w-72 bg-amber-200/20" />

          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center text-white">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              準備好了嗎？
              <br />
              下一場真實面試之前，先在這裡演練一次。
            </h2>
            <p className="max-w-xl text-indigo-100">
              不用註冊、不用安裝，準備好你的 OpenAI API Key，三分鐘內開始你的第一場模擬面試。
            </p>
            <Link
              href="/interview"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-indigo-700 shadow-lg transition-opacity hover:opacity-90"
            >
              免費開始模擬面試
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>

      {/* ============================ FOOTER ============================ */}
      <footer className="border-t border-zinc-200 px-6 py-14 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-xs font-bold text-white">
                AI
              </span>
              <span className="text-sm font-semibold tracking-tight">
                AI 面試模擬器
              </span>
            </Link>
            <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              貼上職缺描述，讓 AI 面試官帶你演練，答完就給評分與更好的回答方式。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
                產品
              </span>
              <a
                href="#features"
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                功能特色
              </a>
              <a
                href="#how-it-works"
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                使用方式
              </a>
              <a
                href="#faq"
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                常見問題
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
                開始使用
              </span>
              <Link
                href="/interview"
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                立即模擬面試
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 w-full max-w-6xl border-t border-zinc-200 pt-6 text-xs text-zinc-400 dark:border-zinc-800">
          © 2026 AI 面試模擬器
        </div>
      </footer>
    </div>
  );
}
