# 850 Sip & Charge Map

**🌐 網站：<https://chungenyu6.github.io/pns-power-wifi-map/>**

給 Pensacola（850）在地人用的極簡地圖：看哪些咖啡店有 **Wi-Fi**、有 **插座**、適合帶筆電。資料由社群持續更新，每間店都會標示最後確認日期。

> 網站內容是英文（給在地人用）；這份 README 和 `docs/` 裡的文件是繁體中文。

## 文件

- [計畫書 PLAN.md](docs/PLAN.md)：目標、資料來源、技術架構、留言機制、設計、安裝原則、路線圖
- [進度追蹤 PROGRESS.md](docs/PROGRESS.md)：每個任務的狀態與驗證結果
- [FB 貼上更新流程 FB-UPDATE.md](docs/FB-UPDATE.md)
- [Supabase 設定 SUPABASE.md](docs/SUPABASE.md)

## 目前狀態

MVP 已上線：31 間店、地圖、篩選、店家頁、一鍵 👍👎 投票、留言（審核制）、新增店家。詳見 [PROGRESS.md](docs/PROGRESS.md)。

## 技術

Astro · MapLibre GL JS + OpenFreeMap · YAML 資料檔 · Supabase（留言，免費方案）· GitHub Actions → GitHub Pages

所有套件都裝在專案資料夾內（`node_modules/`、`.npm-cache/`），不需要任何全域安裝，也不需要 Python。

```sh
npm ci          # 安裝
npm run dev     # 本機開發 http://localhost:4321/pns-power-wifi-map/
npm run build   # 產生網站（也會檢查所有店家資料格式）
npm test        # Playwright 測試
```

## 免責聲明

店家資訊來自社群回報和 OpenStreetMap，不一定是最新的，請以現場為準。
