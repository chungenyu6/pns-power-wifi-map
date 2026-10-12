# 進度追蹤 Progress Tracker

> 計畫書：[PLAN.md](PLAN.md) · 最後更新：2026-10-12
>
> 圖例：⬜ 未開始 · 🟨 進行中 · ✅ 完成（已驗證）· ⏸️ 等你決定

## 目前狀態

**Phase 0 — 規劃完成、決定事項已確認（網站名稱待定）。下一步：Astro 骨架 + Pages 部署。**

---

## Phase 0 — 準備

| # | 任務 | 狀態 | 驗證方式 | 驗證結果 |
|---|---|---|---|---|
| 0.1 | 撰寫計畫書、進度表、README | ✅ | 你閱讀確認 | — |
| 0.2 | 實測 OSM 資料可用性 | ✅ | Overpass 查詢 | 37 間咖啡店；10 間有 Wi-Fi 標記；20 間有營業時間 |
| 0.3 | 決定回報方式、logo、repo、測試 | ✅ | 你回覆 | 見 PLAN §12；網站名稱仍待定 |
| 0.4 | `git init` + 第一次 commit | ✅ | `git log` | main 分支，規劃文件已 commit |
| 0.5 | 建立 GitHub repo 並 push | ✅ | `gh repo view` | public：github.com/chungenyu6/pns-power-wifi-map |
| 0.6 | Astro 專案骨架（`npm install`） | ⬜ | `npm run build` 成功 | |
| 0.7 | `deploy.yml` + 開啟 GitHub Pages | ⬜ | 線上網址可開啟 | |

## Phase 1 — MVP

| # | 任務 | 狀態 | 驗證方式 | 驗證結果 |
|---|---|---|---|---|
| 1.1 | 設計系統：字型、藍綠配色、深色模式、自製 logo（不提 UWF） | ⬜ | 瀏覽器截圖 桌機/手機/深色 | |
| 1.2 | 資料 schema（zod）+ 範例店家 | ⬜ | 故意放錯資料 → build 應失敗 | |
| 1.3 | `scripts/fetch-osm` 產生種子資料 | ⬜ | 產出 ≥ 30 個 YAML，schema 全過 | |
| 1.4 | 人工補資料：Wi-Fi / 插座 / 筆電政策（目標 25+ 間有完整資料） | ⬜ | 每筆有 source + last_verified | |
| 1.5 | 首頁地圖（MapLibre + OpenFreeMap 自訂淡色樣式） | ⬜ | 所有店家標記正確顯示 | |
| 1.6 | 店家清單 + 搜尋 | ⬜ | Playwright 測試 | |
| 1.7 | 篩選器（Wi-Fi、插座、Open now、筆電友善、安靜、區域） | ⬜ | Playwright 測試各篩選 | |
| 1.8 | 店家頁 `/shops/[slug]` + 新鮮度徽章 | ⬜ | 每間店頁面皆可開啟 | |
| 1.9 | About / 資料方法 / FAQ / 免責聲明 | ⬜ | 內容檢查 | |
| 1.10 | 回報表單（Google Form 或 Tally）串接 | ⬜ | 送出測試回報 | |
| 1.11 | `ci.yml`：PR 時驗證 + build + 測試 | ⬜ | 開測試 PR 看 CI 綠燈 | |
| 1.12 | Lighthouse ≥ 90（效能 / 無障礙 / SEO / 最佳實踐） | ⬜ | Lighthouse 報告 | |
| 1.13 | 上線 + 手機實測 | ⬜ | GitHub Pages 網址 | |

## Phase 2 — 社群即時回報

| # | 任務 | 狀態 | 驗證方式 | 驗證結果 |
|---|---|---|---|---|
| 2.1 | Supabase 專案 + 資料表 + RLS 權限規則 | ⬜ | 匿名只能新增、不能改刪 | |
| 2.2 | 一鍵回報（Wi-Fi works / Outlets available） | ⬜ | 回報後即時顯示 | |
| 2.3 | 留言 + Cloudflare Turnstile 防機器人 | ⬜ | 無驗證無法送出 | |
| 2.4 | 社群回報自動更新新鮮度 | ⬜ | 徽章隨回報改變 | |
| 2.5 | 檢舉 / 隱藏垃圾留言 | ⬜ | 手動測試 | |

## Phase 3 — 加分功能

| # | 任務 | 狀態 | 驗證方式 | 驗證結果 |
|---|---|---|---|---|
| 3.1 | `refresh.yml` 每週：OSM 新店 PR、過期 Issue、壞連結檢查 | ⬜ | 手動觸發一次 | |
| 3.2 | 指南頁（Study spots near UWF 等） | ⬜ | | |
| 3.3 | PWA（加到主畫面、離線看清單） | ⬜ | Lighthouse PWA | |
| 3.4 | 店家認領 / 店家自行更新 | ⬜ | | |
| 3.5 | 自訂網域 | ⬜ | DNS + HTTPS | |

---

## 變更紀錄

| 日期 | 內容 |
|---|---|
| 2026-10-12 | 建立計畫書與進度表；實測 OSM 資料；確認本機已有 Node 24 / npm / git / gh |
| 2026-10-12 | 確認決定：表單先行、自製 logo 不提 UWF、public repo、使用本機 Playwright |
