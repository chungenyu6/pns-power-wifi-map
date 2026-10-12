# PNS Wi-Fi & Outlet Map — 專案計畫書

> 狀態：**規劃中（尚未開始實作）** · 最後更新：2026-10-12
> 進度追蹤請看 [PROGRESS.md](PROGRESS.md)

---

## 1. 一句話目標

做一個給 **Pensacola 在地人**用的極簡地圖網站：快速找到「有 Wi-Fi、有插座、可以帶筆電坐久一點」的咖啡店，資訊由社群持續更新，並清楚標示「多久以前被確認過」。

- 網站內容：**英文**（給在地人看）
- 給你看的文件（README、docs/）：**繁體中文**
- 範圍：先只做 Pensacola 一帶（見 §5）

參考網站 [Happy Toy Scout](https://happytoyscout.com/zh/collections/hello-kitty-friends-godzilla-2026) 值得借鏡的地方：

| 它做的事 | 我們對應的做法 |
|---|---|
| 社群回報、不是官方庫存，並明講 | 每間店標「最後確認日期」+ 資料來源，並有「資料方法」頁 |
| 資料快照更新時間 | 全站顯示「Data updated …」，每間店有新鮮度徽章 |
| 地圖是主角，一鍵打開 | 首頁就是地圖 + 清單 |
| 卡片格狀清單 + 每個項目有自己的頁面 | 每間店一個頁面（也有利 Google 搜尋 "pensacola coffee wifi"） |
| FAQ、免責聲明 | About / FAQ / 免責聲明（資料以現場為準） |

---

## 2. ⚠️ 先講清楚：Facebook 社團 / IG 自動抓資料「不建議、而且大多做不到」

你想從 Pensacola FB 社團、咖啡店 IG/FB 粉專自動抓最新資訊。實際狀況：

| 來源 | 能不能自動抓？ | 原因 |
|---|---|---|
| FB 社團（例如 Pensacola 在地社團） | ❌ | Meta 已在 2024 年移除 Groups API；爬蟲違反 Meta 服務條款，且多為私人社團、牽涉成員個資 |
| 咖啡店 IG | ❌（除非店家授權） | Instagram Graph API 只能讀「你自己管理」的商業帳號；Basic Display API 已於 2024 年底停用；爬蟲違反條款、常被封、很不穩 |
| 咖啡店 FB 粉專 | ❌（實務上） | Page Public Content Access 需要 Meta 審核，個人專案幾乎不會通過 |
| **OpenStreetMap（OSM）** | ✅ 免費、合法 | 開放資料。**我已實測**：Pensacola 範圍內 37 間咖啡店，其中 10 間已有 Wi-Fi 標記、20 間有營業時間 |
| Google Places API | ⚠️ 可以但有成本 | 有營業時間等資料，但超過免費額度要付費，且條款限制不能長期快取資料 |

### 建議改用「三層資料策略」（合法、可持續、而且一樣能拿到最新資訊）

1. **種子資料（自動）**：用 OSM 抓出 Pensacola 所有咖啡店的名稱、位置、營業時間、官網、IG 連結 → 自動產生初始清單。
2. **人工整理（半自動）**：你（或我協助）讀 FB 社團裡大家的分享，手動輸入成「社群回報」，**只記內容與日期，不記發文者姓名**。
3. **社群回報（持續）**：網站上讓在地人一鍵回報「今天 Wi-Fi 能用 ✓ / 插座在靠窗位」。
   → **把 FB 社團變成「宣傳管道」而不是「爬蟲目標」**：在社團發文請大家到網站回報，資料就會自己長大。

> 加碼：店家頁面放 IG / FB 連結，讓使用者自己點過去看最新貼文；之後可以加「店家認領」功能讓老闆自己更新。

---

## 3. 推薦技術架構（最好、也最簡單的做法）

```
┌────────────────────────────── GitHub repo ──────────────────────────────┐
│  data/shops/*.yaml   ← 每間店一個檔案（人可以直接讀、直接改）              │
│  src/                ← Astro 網站程式碼                                   │
│  scripts/            ← 抓 OSM、檢查資料新鮮度的腳本                         │
│  .github/workflows/  ← GitHub Actions                                    │
└─────────────────────────────────────────────────────────────────────────┘
        │ push                         │ 每週排程
        ▼                              ▼
  [Action: build + deploy]      [Action: 抓 OSM 新店 / 標記過期資料 / 檢查壞連結]
        │                              │
        ▼                              ▼
  GitHub Pages（靜態網站）       自動開 PR / Issue 給你審核
        ▲
        │ 瀏覽器直接呼叫（Phase 2）
  Supabase（免費方案）：存社群即時回報、留言
```

| 元件 | 選擇 | 為什麼 |
|---|---|---|
| 網站框架 | **Astro** | 產出純靜態 HTML，速度快、預設幾乎零 JavaScript；內建資料 schema 驗證；每間店自動生成一頁 |
| 地圖 | **MapLibre GL JS + OpenFreeMap 圖磚** | 完全免費、不用 API key；向量地圖可以自訂顏色，做出極簡、配合 UWF 藍綠的地圖風格 |
| 資料儲存 | **repo 裡的 YAML 檔** | 不用資料庫；改資料 = 改檔案 = 有版本紀錄；未來雲端 Claude 也能直接改 |
| 部署 | **GitHub Actions → GitHub Pages** | 你原本就習慣，免費、穩定。👍 我同意這個選擇 |
| 社群回報 / 留言 | Phase 1：表單（Tally 或 Google Form）<br>Phase 2：Supabase | 見下方比較 |

### 關於你用 GitHub Actions 部署靜態網站
很適合這個專案。只有一點要注意：**免費 GitHub 帳號的 Pages 需要 repo 是 public**（private repo 要 GitHub Pro）。這個專案資料本來就是公開的，所以 public 沒問題，只要不要把任何金鑰 commit 進去（Supabase 的 anon key 本來就設計成可公開，安全靠資料庫權限規則）。

### 社群回報方案比較

| 方案 | 在地人要註冊嗎？ | 即時顯示？ | 你要做什麼 | 評價 |
|---|---|---|---|---|
| Giscus（GitHub Discussions 留言） | 要 GitHub 帳號 ❌ | ✅ | 幾乎不用 | 在地人不會有 GitHub，**不推** |
| Tally / Google Form | 不用 ✅ | ❌（審核後才上） | 定期看回覆、更新資料 | **MVP 最簡單** |
| Supabase + 防機器人驗證（Cloudflare Turnstile） | 不用 ✅ | ✅ | 註冊 Supabase（免費）、偶爾刪垃圾 | **最像 Happy Toy Scout 的體驗**，Phase 2 |

---

## 4. 網站功能規劃

### 頁面

| 頁面 | 內容 |
|---|---|
| `/` 首頁地圖 | 全螢幕地圖 + 側邊（手機版是下方抽屜）店家清單；篩選器；搜尋 |
| `/shops/[slug]` 店家頁 | Wi-Fi、插座、座位、吵鬧程度、筆電友善政策、營業時間、IG/FB/官網連結、新鮮度、近期社群回報、「Report an update」按鈕 |
| `/submit` | 新增店家 / 回報更新 |
| `/about` | 資料方法（資料從哪來、多久更新）、FAQ、免責聲明 |
| `/guides`（Phase 3） | 例如 "Best study spots near UWF"、"Late-night spots"、"Quiet places downtown" |

### 篩選器
- Wi-Fi：有 / 免密碼
- 插座：很多 / 有一些
- **Open now**（依營業時間計算）
- 筆電友善（有些店週末禁筆電）
- 安靜
- 區域：Downtown、East Hill、UWF/University、Cordova、Perdido、Pensacola Beach…

### 新鮮度徽章（核心！解決「資訊是否最新」）
- 🟢 **Verified** — 30 天內有人確認
- 🟡 **Getting old** — 30–90 天
- ⚪ **Unverified** — 超過 90 天或從未確認

### 每間店的資料格式（草案）
```yaml
name: Bodacious Brew
slug: bodacious-brew
area: downtown
location: { lat: 30.41, lng: -87.21, address: "..." }
wifi:
  available: yes          # yes | no | unknown
  password: on-receipt    # none | ask-staff | on-receipt | posted — 不公開實際密碼
  speed: good             # optional
power:
  outlets: some           # none | few | some | many | unknown
  notes: "Along the window bar"
laptop_policy: "No laptops on weekends after 10am"
noise: moderate
hours: "Mo-Fr 07:00-17:00; Sa-Su 08:00-15:00"   # OSM 格式，方便算 Open now
links: { website: "...", instagram: "...", facebook: "..." }
last_verified: 2026-10-01
sources:
  - { type: osm, date: 2026-10-12 }
  - { type: community, date: 2026-09-28, note: "Local FB group post" }
```
> **不公開 Wi-Fi 密碼**：避免店家反感，只標「免密碼 / 問店員 / 印在收據上」。

---

## 5. 範圍（Phase 1）

Pensacola 市區 + 周邊：Downtown、East Hill、North Hill、Cordova Mall 一帶、UWF 周邊、Perdido Key、Pensacola Beach、Gulf Breeze。
（地圖範圍約 北緯 30.33–30.55、西經 87.10–87.35，之後要擴大到 Navarre / Milton 很容易。）

---

## 6. 視覺設計

**方向：Claude/Anthropic 那種溫暖、留白多、像紙張的極簡感 + UWF 藍綠配色。**

### 字型
Claude 官方用的字型是**商業授權字型**，不能直接用。改用外觀很接近的免費 Google Fonts：
- 標題：**Source Serif 4**（優雅襯線體，接近 Claude 的標題氣質）
- 內文 / 介面：**Inter**（乾淨易讀）

### 配色（UWF 官方品牌色，來源：[UWF Brand – Color](https://uwf.edu/brand/color/)）

| 用途 | 顏色 | Hex |
|---|---|---|
| 主色（標題、按鈕、地圖標記） | Argo Navy | `#00205B` |
| 正向狀態（有 Wi-Fi / 插座、Verified） | Argo Green | `#00A346` |
| 連結 | Heritage Blue | `#005EA6` |
| 綠色文字（對比度較好） | Cannon Green | `#007A33` |
| 背景 | 暖象牙白（Claude 風） | `#F7F6F1` |
| 主要文字 | 近黑 | `#1F1E1D` |

- 支援深色模式（深藍底）
- 手機優先設計（大部分人會在路上用手機查）
- 地圖本身用淡色、低彩度，讓藍綠標記跳出來

### Logo（已決定）
**自製極簡 logo**：咖啡杯 + Wi-Fi 波紋 + 插頭，用 Argo Navy / Green 配色。
網站上**不提 UWF**，只是配色採用這組藍綠（顏色本身不是商標）。

---

## 7. 自動化（GitHub Actions）

| Workflow | 觸發 | 做什麼 |
|---|---|---|
| `deploy.yml` | push 到 main | 驗證資料格式 → build → 部署到 GitHub Pages |
| `ci.yml` | 開 PR | 資料 schema 驗證、build、自動測試 |
| `refresh.yml` | 每週一次 | 抓 OSM 找新開的咖啡店 → 自動開 PR；標記超過 90 天未確認的店 → 開 Issue；檢查官網 / IG 連結是否失效 |

---

## 8. 驗證方式（怎麼確認做出來的東西是對的）

每個階段完成都要通過：
1. **資料驗證**：Astro content schema（zod）— 格式錯就 build 失敗
2. **Build 成功**：`npm run build` 無錯誤
3. **自動化測試**：Playwright 煙霧測試（首頁能載入、地圖有標記、篩選器有效、店家頁能開）
4. **瀏覽器實測**：我用內建瀏覽器打開，檢查桌機 + 手機寬度、深色模式
5. **Lighthouse**：效能 / 無障礙 / SEO 都 ≥ 90
6. **上線檢查**：GitHub Pages 網址實際打開確認

所有項目會在 [PROGRESS.md](PROGRESS.md) 打勾並記錄驗證結果。

---

## 9. 需要安裝 / 註冊的東西（會先問你）

你的電腦目前已有：Node.js v24.4.1、npm 11.4.2、git 2.50、gh CLI（已登入 `chungenyu6`）、Python 3.11 ✅

| 項目 | 何時需要 | 說明 |
|---|---|---|
| Astro、MapLibre 等 npm 套件 | Phase 1 開始 | `npm install`，只裝在專案資料夾 `node_modules/`，不影響系統 |
| `@playwright/test` npm 套件 | Phase 1 驗證 | 你機器上已有 Playwright 的 Chromium（`~/Library/Caches/ms-playwright/chromium-1234`），只需在專案裡裝 npm 套件（很小）；若版本不符需要重新下載瀏覽器，會先問你 |
| Tally 或 Google Form | Phase 1 | 你建表單（Google Form 用你的 Gmail 就好） |
| Supabase 帳號 | Phase 2 | 免費方案；你自己註冊，我不能代你建帳號 |
| 網域（可選） | 任何時候 | 例如 `pnswifi.com` 約 US$12/年；不買也可以用 `chungenyu6.github.io/pns-power-wifi-map` |

**不需要安裝任何全域工具。**

---

## 10. 分階段路線圖

| 階段 | 內容 | 產出 |
|---|---|---|
| **Phase 0 — 準備** | git、GitHub remote repo、Astro 骨架、Pages 部署流程打通 | 一個能上線的空白網站 |
| **Phase 1 — MVP** | OSM 種子資料 + 人工補資料（目標 25+ 間）、地圖、清單、篩選、店家頁、About、表單回報 | 可以分享到 FB 社團的第一版 |
| **Phase 2 — 社群即時回報** | Supabase：一鍵「Wi-Fi works today ✓」、留言、防垃圾、即時新鮮度 | 資料自己長大 |
| **Phase 3 — 加分功能** | 指南頁、PWA（加到手機主畫面）、店家認領、每週自動 refresh、自訂網域 | 更完整的在地工具 |

---

## 11. 未來搬到雲端

只要 repo 推上 GitHub，之後就可以：
- 在 claude.ai/code 開雲端 session 直接接著做
- 用排程雲端 agent 每週自動整理社群回報、更新資料

---

## 12. 決定事項

| # | 問題 | 決定 |
|---|---|---|
| 1 | 網站名稱 | ⏸️ 待定（候選：**Sip & Plug PNS**、**PNS Work Spots**、**Outlet & Espresso**）— 先用 repo 名稱 `pns-power-wifi-map` |
| 2 | 社群回報 | ✅ 先用表單（Google Form / Tally），Phase 2 再加 Supabase |
| 3 | Logo | ✅ 自製極簡 logo，網站不提 UWF |
| 4 | GitHub repo | ✅ 建立 public repo `chungenyu6/pns-power-wifi-map` |
| 5 | 自動化測試 | ✅ 用本機已有的 Playwright；需要額外安裝時再通知你 |
