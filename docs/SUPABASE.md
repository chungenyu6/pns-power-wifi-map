# Supabase 設定（網站留言功能）

網站已經接好 Supabase，只差在資料庫裡建立資料表。**只需要做一次，大約 2 分鐘。**

## 步驟

1. 打開 https://supabase.com/dashboard ，進入你的專案（`isncpzrcsohfolpsxmgm`）。
2. 左側選單 → **SQL Editor** → **New query**。
3. 把 [`supabase/schema.sql`](../supabase/schema.sql) 的內容**整份複製貼上**。
4. 按右下角 **Run**，看到 `Success. No rows returned` 就完成了。
5. 跟 Claude 說「SQL 跑好了」，Claude 會用網站的公開金鑰實際測試：
   - 匿名可以送出回報 ✅
   - 快速按鈕的回報會立刻公開 ✅
   - 有留言 / 密碼的回報，審核前看不到 ✅
   - 匿名不能修改或刪除 ✅

## 升級 002：可以收回投票 + 「適合工作 / 夠安靜」投票（2026-10-12）

跟上面一樣，到 SQL Editor 貼上 [`supabase/migrations/002_votes_retract_laptop_quiet.sql`](../supabase/migrations/002_votes_retract_laptop_quiet.sql) 並按 Run。

- **還沒跑之前**：網站照常運作，但投票不能收回，店家頁的「Good for working?」「Quiet enough?」也送不出去。
- **跑完之後**：再按一次同一個按鈕就會收回；從 👎 改成 👍 時，舊的票會真的被刪掉。

## 設定 secret key（審核腳本 + 新留言通知要用）

Secret key 在 Supabase 後台 → **Project Settings → API Keys → Secret keys**（`sb_secret_` 開頭）。**不要貼在對話裡。**

1. **本機審核腳本**：在專案資料夾裡建立 `.env`，把 key 貼在 `SUPABASE_SECRET_KEY=` 後面。
   ```bash
   cp .env.example .env
   ```
   `.env` 已經在 `.gitignore` 裡，不會被 commit。
2. **GitHub 新留言通知**：在終端機執行下面這行，它會請你貼上 key（畫面不會顯示）。
   ```bash
   gh secret set SUPABASE_SECRET_KEY --repo chungenyu6/pns-power-wifi-map
   ```

## 審核留言

1. Supabase 後台 → **Table Editor** → `reports`。
2. `status` 是 `pending` 的就是待審核：
   - 沒問題 → 改成 `approved`（網站上馬上看得到）
   - 垃圾 / 不當內容 → 改成 `rejected`
3. 或在終端機執行：
   ```bash
   npm run reports
   ```
   會列出所有待審項目（含「新增店家」的建議）和最近 7 天的投票，然後：
   ```bash
   npm run reports -- approve 12 13
   ```
   ```bash
   npm run reports -- reject 14
   ```
4. 或直接跟 Claude 說「看一下新留言」。新增店家的建議，Claude 會查證後建成店家檔案。

## 新留言通知

`.github/workflows/reports-check.yml` 每 3 小時檢查一次：
- 有待審項目 → 開一個標籤為 `review` 的 Issue（GitHub 會寄 email 給你）
- 又多了新的 → 在同一個 Issue 留言（再寄一次 email）
- 全部審完 → 自動關閉 Issue
- 順便讓 Supabase 免費方案不會因為閒置被暫停

## 規則（寫在資料庫裡，瀏覽器改不了）

| 回報內容 | 什麼時候公開 |
|---|---|
| 👍👎 投票（有開 / Wi-Fi / 插座 / 適合工作 / 安靜） | 立刻（顯示成票數） |
| 新增店家建議（`shop_slug = new-shop`） | 不公開，審核後由 Claude 建成店家資料 |
| 有文字留言或 Wi-Fi 密碼 | 你改成 `approved` 之後 |

- 同一個 IP 10 分鐘內最多送 6 次（防洗版）。
- IP 只存雜湊值，而且網站訪客讀不到。

## 金鑰

| 金鑰 | 放哪裡 |
|---|---|
| Publishable key（`sb_publishable_…`） | 已經寫在網站程式裡，本來就是公開用的 |
| Secret key（`sb_secret_…`） | **不要貼在對話裡、不要 commit。** 之後做審核腳本時，自己貼進專案的 `.env` |

## 測試資料

2026-10-12 驗證權限時，留下了幾筆 `shop_slug = zz-test` 的測試資料（網站上不會顯示，因為沒有這間店）。想清掉的話：Table Editor → `reports` → 篩選 `shop_slug` = `zz-test` → 全選 → Delete。
