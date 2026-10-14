# FB 貼上更新流程（操作說明）

社群回報功能上線之前，這是更新網站資料最快的方式。

## 你要做的

1. 在 FB 社團看到跟咖啡店 Wi-Fi、插座、筆電政策、營業時間有關的貼文或留言。
2. 把**文字複製**貼給 Claude（私人社團的連結 Claude 打不開，要貼文字或截圖）。
3. 可以多加一句背景，例如：「這是 What's Happening Pensacola 今天的貼文」。
4. 一次貼好幾則也可以。

範例：

```
What's Happening Pensacola，10/12 的貼文：
「Foxtail on Jackson has outlets along the back wall and the wifi is fast,
but it gets packed after 3pm」
```

## Claude 會做的

1. 判斷是哪一間店（對不上就先問你）。
2. 用自己的話摘要寫進 `data/shops/<店>.yaml`：
   - 更新 `wifi` / `power` / `laptop_policy` / `noise` 等欄位
   - 在 `sources` 加一筆：`type: facebook-group`、日期、一句摘要
   - 有人親自確認過的資訊，會更新 `last_verified`，網站上的徽章就會變成 🟢 Verified
3. **不記錄發文者姓名、不整段複製原文。**
4. 跑 `npm run build` 驗證 → commit → push。
5. GitHub Actions 自動部署，大約 1–2 分鐘後上線。

## 規則

| 情況 | 處理方式 |
|---|---|
| 只有一個人說、沒有其他佐證 | 照樣更新，但來源寫清楚，讓看的人自己判斷 |
| 跟現有資料衝突 | 以**比較新**的為準，舊的來源保留 |
| 貼文提到 Wi-Fi 密碼 | 可以寫上網站（2026-10-12 起允許）：填 `password_value` 和 `password_reported`（回報日期），網站會一起顯示日期 |
| 店家已經歇業 | 把 `status` 改成 `closed`，網站就不會顯示 |
