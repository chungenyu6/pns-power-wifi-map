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

## 審核留言

1. Supabase 後台 → **Table Editor** → `reports`。
2. `status` 是 `pending` 的就是待審核：
   - 沒問題 → 改成 `approved`（網站上馬上看得到）
   - 垃圾 / 不當內容 → 改成 `rejected`
3. 也可以直接跟 Claude 說「看一下新留言」（之後會做 `npm run reports` 審核腳本）。

## 規則（寫在資料庫裡，瀏覽器改不了）

| 回報內容 | 什麼時候公開 |
|---|---|
| 只有快速按鈕（有開 / Wi-Fi / 插座） | 立刻 |
| 有文字留言或 Wi-Fi 密碼 | 你改成 `approved` 之後 |

- 同一個 IP 10 分鐘內最多送 6 次（防洗版）。
- IP 只存雜湊值，而且網站訪客讀不到。

## 金鑰

| 金鑰 | 放哪裡 |
|---|---|
| Publishable key（`sb_publishable_…`） | 已經寫在網站程式裡，本來就是公開用的 |
| Secret key（`sb_secret_…`） | **不要貼在對話裡、不要 commit。** 之後做審核腳本時，自己貼進專案的 `.env` |
