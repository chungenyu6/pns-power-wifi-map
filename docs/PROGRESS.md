# 進度追蹤 Progress Tracker — 850 Sip & Charge Map

> 計畫書：[PLAN.md](PLAN.md) · 最後更新：2026-10-12
>
> 圖例：⬜ 未開始 · 🟨 進行中 · ✅ 完成（已驗證）· ⏸️ 等你

## 目前狀態

**Phase 0 與 Phase 1 大部分已完成並通過驗證，等你提供 FB 貼文文字、確認店家資訊。**

---

## Phase 0：準備

| # | 任務 | 狀態 | 驗證方式 | 驗證結果 |
|---|---|---|---|---|
| 0.1 | 撰寫計畫書、進度表、README | ✅ | 你閱讀確認 | 已依第二輪回饋修訂 |
| 0.2 | 實測 OSM 資料可不可用 | ✅ | Overpass 查詢 | 37 間咖啡店；10 間有 Wi-Fi 標記；20 間有營業時間 |
| 0.3 | 決定名稱、回報方式、logo、配色、repo、安裝原則 | ✅ | 你回覆 | 見 PLAN §13 |
| 0.4 | `git init` + 第一次 commit | ✅ | `git log` | main 分支 |
| 0.5 | 建立 GitHub repo 並 push | ✅ | `gh repo view` | public：github.com/chungenyu6/pns-power-wifi-map |
| 0.6 | `.npmrc`（快取放專案內）+ Astro 骨架 + `npm install` | ✅ | `npm run build` 成功；`~/.npm` 沒有新增檔案 | Astro 7.3.8；`~/.npm` 新增 0 個檔案；Playwright 固定 1.62.0，沿用本機已有的 Chromium 1234，沒有下載瀏覽器 |
| 0.7 | `deploy.yml` + 開啟 GitHub Pages | 🟨 | 線上網址打得開 | Pages 已由你開啟（build_type: workflow）；待 push 後確認 |

## Phase 1：MVP

| # | 任務 | 狀態 | 驗證方式 | 驗證結果 |
|---|---|---|---|---|
| 1.1 | 設計系統：字型、柔和藍綠配色、深色模式 | ✅ | 截圖：桌機 / 手機 / 深色 | 內建瀏覽器實測三種畫面；字型自架（@fontsource），不連 Google |
| 1.2 | 自製 logo（SVG）+ favicon | ✅ | 截圖確認 | 咖啡杯 + 閃電 + 蒸氣 |
| 1.3 | 資料 schema（zod）+ 範例店家 | ✅ | 故意放錯資料 → build 應該失敗 | 錯誤檔案的 6 個錯（區域、座標、Wi-Fi、營業時間、來源）全被擋下 |
| 1.4 | `scripts/fetch-osm.ts` 產生種子資料 | ✅ | 產出 YAML，schema 全部通過 | OSM 38 筆 → 排除 13 筆（基地內、免下車、非咖啡店、Pace）→ 24 間 + 手動新增 4 間 = 28 間 |
| 1.5 | FB 貼上更新流程（寫成 `docs/FB-UPDATE.md` 操作說明） | 🟨 | 用一則範例貼文實際跑一次 | 說明文件完成；你給的 4 個連結是私人社團，打不開，等你貼文字 |
| 1.6 | 首頁地圖（MapLibre + OpenFreeMap 淡色樣式） | ✅ | 所有店家標記位置正確 | 標記數 = 店家數（自動測試）；深色模式用濾鏡反轉底圖 |
| 1.7 | 店家清單 + 搜尋 | ✅ | Playwright 測試 | 通過 |
| 1.8 | 篩選（Wi-Fi、插座、Open now、筆電友善、安靜、區域） | ✅ | Playwright 測試 | Wi-Fi、區域、搜尋、空結果都有測；Open now 以 Pensacola 時區（中部時間）計算，營業時間解析器有單元測試 |
| 1.9 | 店家頁 `/shops/[slug]` + 新鮮度徽章 | ✅ | 每間店的頁面都打得開 | 28 頁全部 200 |
| 1.10 | About / 資料方法 / FAQ / 免責聲明 | ✅ | 內容檢查 | |
| 1.11 | `ci.yml`：PR 時驗證 + build + 測試 | 🟨 | CI 綠燈 | 本機 28/28 通過；待 push 後看 CI |
| 1.12 | Lighthouse ≥ 90 | ⬜ | Lighthouse 報告 | |
| 1.13 | 上線 + 手機實測 | ⬜ | GitHub Pages 網址 | |

## Phase 1.5：網站留言（需要你先註冊 Supabase）

| # | 任務 | 狀態 | 驗證方式 | 驗證結果 |
|---|---|---|---|---|
| 1.5.1 | 你註冊 Supabase、建專案，把金鑰放進 `.env` | ⏸️ | — | |
| 1.5.2 | `supabase/schema.sql`：reports 資料表 + RLS + 明確權限設定 | ⬜ | 匿名身分：能新增、不能讀、不能改、不能刪 | |
| 1.5.3 | 店家頁留言區（快速按鈕 + 文字框）+ `/submit` 新增店家 | ⬜ | Playwright：送出成功並顯示感謝訊息 | |
| 1.5.4 | 防垃圾：honeypot、字數限制、頻率限制 | ⬜ | 填了陷阱欄位的送出會被擋下 | |
| 1.5.5 | `npm run reports` 審核腳本 | ⬜ | 拉出待審 → 套用 → 標記成 approved | |
| 1.5.6 | `reports-check.yml`：每日保持運作 + 有新留言就開 Issue | ⬜ | 手動觸發一次 | |

## Phase 2：加分功能

| # | 任務 | 狀態 | 驗證方式 | 驗證結果 |
|---|---|---|---|---|
| 2.1 | `refresh.yml` 每週：OSM 新店 PR、過期 Issue、壞連結 | ⬜ | 手動觸發一次 | |
| 2.2 | 指南頁 | ⬜ | | |
| 2.3 | PWA（加到主畫面、離線看清單） | ⬜ | Lighthouse | |
| 2.4 | 自訂網域（選配） | ⬜ | DNS + HTTPS | |
| 2.5 | 公開審核過的短評（選配） | ⬜ | | |

---

## 變更紀錄

| 日期 | 內容 |
|---|---|
| 2026-10-12 | 建立計畫書與進度表；實測 OSM 資料；確認本機已有 Node 24 / npm / git / gh |
| 2026-10-12 | 第一輪決定：自製 logo、建立 public repo、使用本機 Playwright |
| 2026-10-12 | 第二輪修訂：定名「850 Sip & Charge Map」；新增 FB 貼上更新流程；改成網站直接留言（Supabase 免費，不公開、審核制）取代 Google Form；配色降低飽和度；所有安裝都限定在專案資料夾，不需要 Python |
| 2026-10-12 | 開始實作：Astro 骨架、28 間店資料、地圖、篩選、店家頁、About、28 個自動化測試、GitHub Actions |
