# AI 面試模擬器

貼上職缺描述，AI 面試官會根據職缺內容出題、追問你的回答，面試結束後給你整體評分、逐題評語，以及每一題「更好的回答方式」建議。

- `/`：產品介紹首頁
- `/interview`：實際可以操作的模擬面試工具

## 技術架構

- [Next.js](https://nextjs.org)（App Router）+ TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [OpenAI API](https://platform.openai.com/docs)（`/api/interview` 後端路由）

## 開始開發

### 1. 安裝套件

```bash
npm install
```

### 2.（選填）設定模型

本專案採用 **BYOK（Bring Your Own Key）模式**：不需要在伺服器設定 `OPENAI_API_KEY`，每位使用者在 `/interview` 右上角的設定面板輸入自己的 OpenAI API Key，Key 只會存在使用者瀏覽器的 `localStorage`，呼叫 `/api/interview` 時透過 `Authorization: Bearer <key>` header 帶過去，伺服器不會保存任何人的 key。

如果想變更後端呼叫 OpenAI 用的模型（預設 `gpt-4o-mini`），可以在 `.env.local` 設定：

```bash
# 選填
OPENAI_MODEL=gpt-4o-mini
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看首頁，或直接前往 `/interview`，在右上角設定自己的 OpenAI API Key 後開始模擬面試。

## 專案結構

```
src/app/
├── page.tsx                 # 產品介紹首頁
├── interview/page.tsx       # 模擬面試工具（前端互動邏輯）
└── api/interview/route.ts   # 呼叫 OpenAI 的後端 API
```

`/api/interview` 是無狀態的：前端每次呼叫都會把目前為止的完整對話紀錄、以及使用者的 OpenAI API Key（透過 `Authorization` header）傳回去，後端依「已回答題數」判斷要出下一題，還是已達使用者設定的題數、該產生最終評估報告。

## 其他指令

```bash
npm run build   # production build
npm run start   # 啟動 production server
npm run lint    # ESLint 檢查
```
