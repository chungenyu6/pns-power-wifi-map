# 850 Sip & Charge Map — 專案計畫書

> 狀態：**實作中**（進度見 PROGRESS.md）· 最後更新：2026-10-12
> 進度追蹤：[PROGRESS.md](PROGRESS.md) · Repo：https://github.com/chungenyu6/pns-power-wifi-map

---

## 1. 一句話目標

做一個給 **Pensacola（850 區碼）在地人**用的極簡地圖網站：快速找到「有 Wi-Fi、有插座、可以帶筆電坐久一點」的咖啡店。資料持續更新，每間店都會標出「多久以前被確認過」。

- 網站名稱：**850 Sip & Charge Map**
- 網站內容：**英文**（給在地人看）
- 給你看的文件（README、docs/）：**繁體中文**
- 範圍：先只做 Pensacola 一帶（見 §8）

參考網站 [Happy Toy Scout](https://happytoyscout.com/zh/collections/hello-kitty-friends-godzilla-2026) 值得借鏡的地方：

| 它做的事 | 我們對應的做法 |
|---|---|
| 社群回報、不是官方庫存，並且明講 | 每間店標「最後確認日期」+ 資料來源，另有「資料方法」頁 |
| 顯示資料快照更新時間 | 全站顯示「Data updated …」，每間店有新鮮度徽章 |
| 地圖是主角，一鍵打開 | 首頁就是地圖 + 清單 |
| 每個項目有自己的頁面 | 每間店一頁（也有利於 Google 搜尋 "pensacola coffee wifi"） |
| FAQ、免責聲明 | About / FAQ / 免責聲明（資料以現場為準） |

---

## 2. 資料來源策略

### 2.1 為什麼不寫程式自動抓 FB / IG

| 來源 | 能不能自動抓？ | 原因 |
|---|---|---|
| FB 社團 | ❌ | Meta 在 2024 年移除了 Groups API；爬蟲違反服務條款，而且大多是私人社團，牽涉成員個資 |
| 咖啡店 IG | ❌（除非店家授權） | Graph API 只能讀「你自己管理」的商業帳號；Basic Display API 已在 2024 年底停用；爬蟲很容易被封 |
| 咖啡店 FB 粉專 | ❌（實務上） | 公開內容 API 要 Meta 審核，個人專案幾乎不會通過 |
| **OpenStreetMap（OSM）** | ✅ 免費、合法 | **已實測**：Pensacola 範圍內有 37 間咖啡店，10 間已標 Wi-Fi，20 間有營業時間 |

### 2.2 四個資料管道

| # | 管道 | 誰來做 | 用途 |
|---|---|---|---|
| A | **OSM 種子資料** | 腳本自動跑 | 一次產生所有咖啡店的名稱、位置、營業時間、官網 / IG 連結 |
| B | **⭐ FB 貼上更新（初期主力）** | 你貼、我整理 | 你在 FB 社團看到消息 → 貼給我 → 我更新網站（見 §2.3） |
| C | **網站上直接留言回報** | 在地人 | 每間店頁面有留言框，**不公開**，由我們審核後採用（見 §4） |
| D | 店家連結 | 使用者自己點 | 店家頁放 IG / FB 連結，想看最新貼文可以直接點過去 |

> 等網站上線，可以在 FB 社團發文宣傳，請大家直接到網站回報。社團就從「資料來源」變成「宣傳管道」。

### 2.3 FB 貼上更新流程（管道 B）

社群還沒起來之前，這是最快的更新方式：

```
你在 FB 看到貼文
   ↓ 複製文字（或截圖）貼給 Claude，可以加一句「這是 OO 社團，今天的貼文」
Claude：
   1. 判斷是哪間店、提到哪些事（Wi-Fi、插座、筆電政策、營業時間異動…）
   2. 更新該店的 YAML：用自己的話摘要，加上 source（facebook-group、日期）
      ※ 不記錄發文者姓名，不整段複製原文
   3. 有疑問的地方（例如店名對不上）先問你
   4. 跑驗證 → commit → push
   ↓
GitHub Actions 自動部署，大約 1–2 分鐘後上線
```

- 一次貼好幾則也可以，我會整理成一個 commit。
- repo 已經在 GitHub 上，之後你也可以在**手機 Claude App 的雲端 session** 直接貼，不用開電腦。

---

## 3. 技術架構

```
┌──────────────────────────── GitHub repo ────────────────────────────┐
│  data/shops/*.yaml  ← 每間店一個檔案（人可以直接讀、直接改）           │
│  src/               ← Astro 網站程式碼                                │
│  scripts/           ← 抓 OSM、拉取留言、檢查資料新鮮度（TypeScript）    │
│  supabase/          ← 資料表與權限規則（SQL 檔）                       │
│  .github/workflows/ ← GitHub Actions                                 │
└─────────────────────────────────────────────────────────────────────┘
      │ push                                  │ 排程
      ▼                                       ▼
 [deploy：驗證 → build → 部署]          [每天：檢查有沒有新留言 → 開 Issue 通知你]
      │                                 [每週：OSM 新店、過期資料、壞連結]
      ▼
 GitHub Pages（靜態網站）
      │ 使用者送出留言（只能新增，不能讀）
      ▼
 Supabase 免費方案（存待審核的留言）
      ▲
      │ 審核：npm run reports（只在你的電腦上跑，金鑰放 .env，不進 git）
```

| 元件 | 選擇 | 為什麼 |
|---|---|---|
| 網站框架 | **Astro** | 產出純靜態 HTML，速度快；內建資料 schema 驗證；每間店自動生成一頁 |
| 地圖 | **MapLibre GL JS + OpenFreeMap 圖磚** | 完全免費、不用 API key；可以自訂成淡色極簡風 |
| 店家資料 | **repo 裡的 YAML** | 不需要資料庫；改資料就是改檔案，有版本紀錄 |
| 留言 | **Supabase（免費方案）** | 見 §4 |
| 腳本 | **Node + TypeScript（tsx）** | 跟網站同一套工具，**不需要 Python** |
| 部署 | **GitHub Actions → GitHub Pages** | 你原本就習慣用，免費又穩定 👍 |

---

## 4. 網站直接留言（不公開、審核制）

### 4.1 使用者看到的樣子
每間店頁面下方有一個區塊「**Been here recently?**」：
- 快速按鈕：Wi-Fi worked ✓ / didn't ✗ · Outlets: plenty / a few / none
- 一個文字框（選填）："Anything else? e.g. outlets by the window, no laptops on weekends"
- 送出後顯示："Thanks! We'll review it and update the map."
- **不用註冊、不用登入、不用離開網站**（比 Google Form 方便很多）

另外有 `/submit` 頁可以「新增一間店」。

### 4.2 為什麼需要 Supabase？要付錢嗎？
GitHub Pages 是**純靜態網站**，沒辦法自己接收和儲存使用者送出的內容，所以留言需要一個能存資料的後端。Supabase 就是那個「幫你存留言的資料庫」。

**不用付錢：**

| 項目 | 費用 |
|---|---|
| Supabase 免費方案（500 MB 資料庫，存幾十萬則留言都沒問題） | **$0** |
| GitHub Pages / Actions（public repo） | **$0** |
| OpenFreeMap 地圖、Google Fonts | **$0** |
| 自訂網域（選配，例如 `850sipcharge.com`） | 約 US$12/年，不買也可以 |

**免費方案要注意的兩件事（都會處理）：**
1. **專案閒置 7 天會被暫停** → 加一個 GitHub Action，每天自動戳一下資料庫，讓它保持運作。
2. **Supabase 從 2026-10-30 起改了資料表 API 的預設開放方式** → 我們的 SQL 會明確寫好權限設定，不受影響。
3. 註冊時是否要信用卡，各方說法不一，**請你註冊時確認**；免費方案本身不會收費。帳號要你自己註冊（我不能代你建帳號）。

### 4.3 安全與防垃圾
- 資料庫權限規則（RLS）：匿名訪客**只能新增**留言，**不能讀、不能改、不能刪**。所以就算有人看網頁原始碼，也拿不到別人的留言。
- 網頁裡的 Supabase 公開金鑰（anon key）本來就設計成可以公開；真正的管理金鑰只放在你電腦的 `.env`，不會進 git。
- 防垃圾：隱藏陷阱欄位（honeypot）+ 字數限制 + 同一來源的頻率限制。如果垃圾真的變多，再加 Cloudflare Turnstile（免費的機器人驗證）。

### 4.4 審核流程
```
每天 GitHub Action 檢查新留言 → 有新留言就開一個 Issue → GitHub 寄 email 通知你
你跟 Claude 說「看一下新留言」
Claude 跑 npm run reports：
   列出待審留言 → 合理的就摘要寫進店家 YAML（source: site-report）
   → 把留言標成 approved / rejected → commit → push → 自動上線
```
之後如果你想要，也可以讓「審核通過的短評」公開顯示在店家頁（Phase 3，可選）。

---

## 5. 網站功能

### 頁面

| 頁面 | 內容 |
|---|---|
| `/` 首頁地圖 | 地圖 + 店家清單（桌機在側邊，手機是下方可拉起的抽屜）、篩選、搜尋 |
| `/shops/[slug]` 店家頁 | Wi-Fi、插座、座位、吵鬧程度、筆電政策、營業時間、IG/FB/官網、新鮮度、留言框 |
| `/submit` | 新增一間店 |
| `/about` | 資料方法（資料從哪來、多久更新）、FAQ、免責聲明 |
| `/guides`（Phase 3） | 例如 "Late-night study spots"、"Quiet places downtown" |

### 篩選
Wi-Fi（有 / 免密碼）· 插座（很多 / 有一些）· **Open now** · 筆電友善 · 安靜 · 區域（Downtown、East Hill、University area、Cordova、Perdido、Pensacola Beach…）

### 新鮮度徽章
- 🟢 **Verified**：30 天內有人確認
- 🟡 **Getting old**：30–90 天
- ⚪ **Unverified**：超過 90 天，或從來沒人確認過

---

## 6. 資料格式（草案）

```yaml
name: Bodacious Brew
slug: bodacious-brew
area: downtown
location: { lat: 30.41, lng: -87.21, address: "..." }
wifi:
  available: yes          # yes | no | unknown
  password: on-receipt    # none | ask-staff | on-receipt | posted（不公開實際密碼）
power:
  outlets: some           # none | few | some | many | unknown
  notes: "Along the window bar"
laptop_policy: "No laptops on weekends after 10am"
noise: moderate           # quiet | moderate | loud | unknown
hours: "Mo-Fr 07:00-17:00; Sa-Su 08:00-15:00"   # OSM 格式，用來算 Open now
links: { website: "...", instagram: "...", facebook: "..." }
last_verified: 2026-10-01
sources:
  - { type: osm, date: 2026-10-12 }
  - { type: facebook-group, date: 2026-09-28, note: "Local group post about outlets" }
  - { type: site-report, date: 2026-10-05 }
```

- **可以公開 Wi-Fi 密碼**（2026-10-12 改為允許）：由在地人回報，經審核後顯示，並標示回報日期（`password_value` + `password_reported`）。
- 格式錯誤 → build 直接失敗，壞資料不會上線。

---

## 7. 視覺設計

**方向：Claude/Anthropic 那種溫暖、留白多、像紙張的極簡感，搭配柔和的藍綠色。**

### 字型
Claude 官方字型要商業授權，所以改用外觀接近的免費 Google Fonts：
- 標題：**Source Serif 4**（優雅的襯線體）
- 內文 / 介面：**Inter**（乾淨好讀）

### 配色（以 UWF 藍綠為靈感，降低飽和度，比較耐看）
你說原本的官方色太飽和，所以我調成偏灰、柔和的版本。每個顏色都算過對比度，確保好讀：

| 用途 | 淺色模式 | 對比度* | 深色模式 | 對比度* |
|---|---|---|---|---|
| 背景 | 暖象牙白 `#F7F5EF` | — | 深墨藍 `#14181F` | — |
| 主要文字 | `#1F1E1D` | 15.3 | `#ECE9E2` | 14.7 |
| 次要文字 | `#6B6862` | 5.1 | `#A39F97` | 6.8 |
| 主色（標題、按鈕） | 柔和海軍藍 `#1F3A5F` | 10.5 | — | — |
| 連結 | 灰藍 `#3A6A96` | 5.2 | `#8FB3D9` | 8.2 |
| 正向狀態文字（Verified、有 Wi-Fi） | 森林綠 `#2F7D5B` | 4.6 | `#7CC49C` | 8.7 |
| 地圖標記 / 色塊（非文字） | 鼠尾草綠 `#5BA37E` | — | `#7CC49C` | — |

\* 對文字的背景對比度；無障礙標準 WCAG AA 要求 ≥ 4.5，以上全部通過。實作時我會看實際畫面再微調。

- 地圖底圖用淡色、低彩度，讓藍綠色標記跳出來
- 手機優先（大部分人會在路上用手機查）
- 支援深色模式

### Logo
**自製極簡 logo**：咖啡杯 + 閃電 / 插頭的意象，可以搭配「850」，用上面的藍綠配色。網站上**不提 UWF**。

---

## 8. 範圍（Phase 1）

Pensacola 市區與周邊：Downtown、East Hill、North Hill、Cordova Mall 一帶、University area、Perdido Key、Pensacola Beach、Gulf Breeze。
（地圖範圍大約北緯 30.33–30.55、西經 87.10–87.35；之後要擴大到 Navarre、Milton 很容易。）

---

## 9. 安裝原則：所有東西都裝在專案資料夾裡

你的電腦已經有：Node.js v24.4.1、npm 11.4.2、git、gh（已登入）、Python 3.11 ✅
**不會安裝任何全域工具。**

| 東西 | 裝在哪 | 說明 |
|---|---|---|
| npm 套件（Astro、MapLibre、Supabase client、tsx…） | `./node_modules/` | npm 預設就是裝在專案裡 |
| npm 下載快取 | `./.npm-cache/` | npm 預設會把快取放在 `~/.npm`，我會用專案的 `.npmrc` 把它改到專案資料夾裡 |
| Playwright 測試瀏覽器 | 優先**直接用你電腦上已有的**（`~/Library/Caches/ms-playwright`，只讀取、不新增）；版本不合的話，下載到 `./.playwright-browsers/`（**會先問你**） | |
| Supabase | **不裝 CLI**，SQL 檔放在 `supabase/`，在 Supabase 網頁後台執行 | |
| Python | **不需要**：腳本都用 Node/TypeScript | 以後真的要用 Python，就用內建的 `python3 -m venv .venv`（不用另外裝 uv，因為裝 uv 本身就是全域安裝） |
| 秘密金鑰 | `./.env`（已在 `.gitignore`） | 只有 Supabase 管理金鑰，**永遠不 commit** |

以上這些資料夾都會加進 `.gitignore`。要刪掉整個專案，直接刪資料夾就乾淨了。

---

## 10. 自動化（GitHub Actions）

| Workflow | 觸發 | 做什麼 |
|---|---|---|
| `deploy.yml` | push 到 main | 驗證資料 → build → 部署到 GitHub Pages |
| `ci.yml` | 開 PR | 驗證資料、build、Playwright 測試 |
| `reports-check.yml` | 每天 | 戳一下 Supabase（避免被暫停）＋ 有新留言就開 / 更新 Issue 通知你 |
| `refresh.yml` | 每週 | OSM 新開的店 → 自動開 PR；超過 90 天沒確認的店 → 開 Issue；檢查壞掉的連結 |

---

## 11. 驗證方式

每個任務完成都要通過對應的檢查，結果記在 [PROGRESS.md](PROGRESS.md)：

1. **資料驗證**：Astro content schema（zod），格式錯就 build 失敗
2. **Build**：`npm run build` 沒有錯誤
3. **自動化測試**：Playwright（首頁載入、地圖有標記、篩選有效、店家頁能開、留言能送出）
4. **瀏覽器實測**：我用內建瀏覽器看桌機、手機寬度、深色模式，並截圖
5. **Lighthouse**：效能、無障礙、SEO、最佳實踐都 ≥ 90
6. **安全**：用匿名身分實際測試「讀不到留言、改不了資料」
7. **上線確認**：實際打開 GitHub Pages 網址檢查

---

## 12. 路線圖

| 階段 | 內容 | 產出 |
|---|---|---|
| **Phase 0：準備** | ✅ 規劃、git、GitHub repo；Astro 骨架、`.npmrc`、Pages 部署 | 一個能上線的空白網站 |
| **Phase 1：MVP** | 設計系統與 logo、OSM 種子資料、FB 貼上流程、地圖、清單、篩選、店家頁、About | 可以分享到 FB 社團的第一版 |
| **Phase 1.5：留言** | Supabase 留言（不公開）、審核腳本、每日通知 | 在地人可以直接回報 |
| **Phase 2：加分功能** | 每週自動 refresh、指南頁、PWA（加到手機主畫面）、自訂網域、（選配）公開審核過的短評 | 更完整的在地工具 |

> Phase 1.5 需要你先註冊 Supabase；在那之前 Phase 0、1 都可以先做，不會卡住。

---

## 13. 決定事項

| # | 問題 | 決定 |
|---|---|---|
| 1 | 網站名稱 | ✅ **850 Sip & Charge Map** |
| 2 | 初期資料更新 | ✅ 你在 FB 看到消息就貼給 Claude（§2.3） |
| 3 | 社群回報 | ✅ 網站直接留言、不公開、審核制，用 Supabase 免費方案（§4） |
| 4 | Logo | ✅ 自製極簡 logo，網站上不提 UWF |
| 5 | 配色 | ✅ 參考 UWF 藍綠但降低飽和度，由 Claude 決定（§7） |
| 6 | GitHub repo | ✅ public repo `chungenyu6/pns-power-wifi-map`（已建立） |
| 7 | 安裝原則 | ✅ 全部裝在專案資料夾，不需要 Python（§9） |
| 8 | 自動化測試 | ✅ 優先用你電腦上已有的 Playwright 瀏覽器 |

---

## 14. 2026-10-12 第三輪更新

### 背景：颶風 Isaias
颶風 Isaias 在 10/9 登陸 Destin，Escambia / Santa Rosa 還有約 8 萬戶停電。現在大家最需要的就是「哪裡有電、有網路」，所以新增：

- **颶風臨時據點**（`data/spots/*.yaml`）：例如 Spectrum 在 Hitzman Park、Bayview Park 的 Wi-Fi 和充電車。
  - 地圖上用琥珀色方塊標示，清單最上方有「Storm recovery」區塊。
  - 到 `until` 日期（沒有寫的話就是張貼後 3 天）會**自動隱藏**。
- **店家卡片上顯示即時回報**：例如「Local report: Open · Wi-Fi works · 2h ago」，只顯示 48 小時內的回報。

### 網站留言（取代去社團挖資料）
- 快速按鈕（有開 / Wi-Fi 能用 / 插座）**立刻公開**；文字留言和 Wi-Fi 密碼**審核後**公開。
- 設定步驟見 [SUPABASE.md](SUPABASE.md)。

### 新鮮度標籤簡化成 3 種，直接寫日期
| 標籤 | 意思 |
|---|---|
| 🟢 Confirmed 3 days ago | 30 天內有在地人確認 |
| 🟡 Confirmed 2 months ago | 確認過，但比較久了 |
| ⚪ Not confirmed yet | 只有網路資料 |

### ⚠️ What's Happening Pensacola 社團規則
社團規則第 3 條寫明：**不要把社團裡的任何內容分享到社團外**，也不要截圖其他成員的貼文。所以：
- 不要把社團貼文原文或截圖搬到網站上。
- 比較好的做法：**在社團裡宣傳網站，請大家直接到網站回報**（這也是你想要的方向）。
- 你自己親眼看到、親自確認的資訊，用「In-person visit」當來源就沒問題。
- 你的帳號目前沒加入這個社團，所以 Claude 透過 Chrome 也看不到貼文內容。

### 店家清單調整
- 移除 Dunkin（之後再說）。
- Starbucks 收錄 Pensacola 全部能確認地址的店（目前 10 間；UWF 圖書館那間找不到精確座標，暫不收錄）。
- 補上官網上找得到的 FB / IG 連結。

---

## 15. 標籤統一規則（2026-10-12 第五輪）

整個網站只用一套詞彙（程式在 `src/lib/status.ts`，網站產生頁面時和瀏覽器裡都用同一份）。

### 設施標籤：每一項都只有 3 種狀態
| 樣式 | 意思 | 例子 |
|---|---|---|
| 🟢 綠色 | 有（我們確認過，或在地人投票同意） | `Wi-Fi`、`Outlets`、`Good for working`、`Quiet` |
| ⚪ 灰色加問號 | 還不知道 | `Wi-Fi?`、`Outlets?` |
| 刪除線 | 沒有 | ~~`Wi-Fi`~~ |

- 「Good for working」和「Quiet」**知道了才顯示**，免得卡片太擠。
- **投票何時會改變標籤**：資料是「不知道」，而且**至少 2 票、其中一方比較多**時。我們自己確認過的資料優先，投票不會蓋掉它。

### 新鮮度標籤：一種格式
`Confirmed today / 3 days ago / 2 months ago / Not confirmed yet`，取「我們最後確認的日期」和「最新一張投票」裡比較新的那個。**在地人按一下 👍👎 就算確認一次。**

### 地圖標記
和設施標籤用同一套規則：投票讓 Wi-Fi 變成「有」→ 深藍；Wi-Fi 和插座都「有」→ 綠色。頁面上即時更新，不用等重新部署。

### 營業狀態
卡片右上角：6 小時內有人回報 →「Reported open · 2h ago」；沒有的話就照營業時間顯示「Open now / Closed」。原本另外一條「Local report」已經拿掉。

### 名稱
「Laptop-friendly」改成 **Good for working**：Yelp 用的就是這個說法，也和投票題目「Good for working?」一致。
