# 更換地點的位置資料 / Replacing a place's geometry

> **狀態 / Status**: 待審核 / In review
> **日期 / Date**: 2026-09-07
> **決策者 / Decided by**: Yulia (Product) + Claude (Engineering)
> **影響範圍 / Touches**: `lib/places/editing.ts`、`app/[locale]/places/[slug]/edit/`、`app/[locale]/submit/`、`lib/storage/blob.ts`、`lib/maps/search.ts`

---

## 0. 這份文件是什麼 / What this document is

記錄「發布後如何更換一筆地點的位置資料」的設計與**每個決定背後的理由**。實作計畫另立文件。

This records the design for replacing a place's geometry after it has been posted, and **the reasoning behind each decision**. The implementation plan lives in a separate document.

---

## 1. 問題 / The problem

編輯頁現在能改名稱、摘要、描述、縣市、活動類型，改不了位置。`applyEdit` 是白名單寫法，`geometry` 不在上面。

被排除的欄位理由並不相同，這點值得說清楚：`status` 和 `slug` 是**安全邊界** — 能改 status 等於繞過審核發布或悄悄下架，能改 slug 等於打斷別人已經分享出去的網址。`geometry` 不是；它當初沒做，只是因為它牽涉檔案處理。所以把位置加回去不會削弱這個白名單真正在守的東西。

編輯頁本身存在的原因是 2026-09-03 一筆沒有名字的項目上了線，而 Yulia 看得出它是錯的、卻無法可修。位置錯了是同一類問題。

The edit form can change names, prose, county and activities, but not location. `applyEdit` is a whitelist and `geometry` is not on it.

The excluded fields are not excluded for the same reason, and the distinction matters. `status` and `slug` are **security boundaries** — being able to set status would make correcting a typo a way to publish past review or quietly unpublish, and changing a slug breaks a URL somebody may already have shared. Geometry is neither; it was left out because it involves file handling. Adding it back does not weaken what the whitelist actually guards.

The edit page exists because on 2026-09-03 an entry reached production with no name and Yulia could see it was wrong and could do nothing about it. A wrong location is the same class of problem.

---

## 2. 語意：整個換掉，不是編輯 / Semantics: replace, never edit

**決定 (Yulia, 2026-09-07)**：更換位置就是丟掉舊的、放進新的。不是拖曳線的頂點，不是微調針的位置。

Replacing a location discards the old one wholesale. It is not vertex editing and not nudging a pin.

**而且可以跨 kind**：本來投成地標的，之後可以上傳 GPX 變成路線；本來是路線的，也可以換成一個點。這是刻意的 — 實際的使用情境是在外面先落一個針，回家有了 GPX 再補上。

**And it may cross the kind boundary**: a spot can become a route by uploading a GPX, and a route can become a spot. This is deliberate — the real workflow is dropping a pin while out and supplying the recorded track later.

---

## 3. 四種轉換 / The four transitions

| 從 → 到 / From → to | `geometry` | `startPoint` | `route` | 舊 GPX / Old GPX |
|---|---|---|---|---|
| 地標 → 地標 / spot → spot | 新的 Point | 同一點 | 維持 null | 無 |
| 地標 → 路線 / spot → route | LineString | 軌跡第一點 | 新的 metrics | 無 |
| 路線 → 地標 / route → spot | 新的 Point | 同一點 | **設為 null** | 刪掉 |
| 路線 → 路線 / route → route | LineString | 軌跡第一點 | 新的 metrics | 刪掉 |

型別上以一個可選欄位表達，缺席即代表完全不碰幾何：

Expressed as one optional field; absent means the geometry is untouched:

```ts
/** 一次完整的替換。沒有這個欄位就代表幾何完全不動。 */
export type GeometryReplacement =
  | { kind: 'spot'; lng: number; lat: number }
  | { kind: 'route'; summary: TrackSummary; gpxPath: string }
```

`PlaceEdit` 多一個 `geometry?: GeometryReplacement`。沒帶時 `applyEdit` 的行為與今天完全相同 — 改錯字的路徑一行都沒變。

`gpxPath` 由 server action 產生並在呼叫 `applyEdit` 前就已上傳完成（見第 9 節的順序）；`applyEdit` 維持純函式，不碰檔案。

`gpxPath` is produced by the server action and the file is already uploaded before `applyEdit` is called (see the ordering in section 9); `applyEdit` stays pure and touches no files.

`PlaceEdit` gains `geometry?: GeometryReplacement`. When absent, `applyEdit` behaves exactly as it does today; the fix-a-typo path is unchanged.

**現成的安全網**：`editPlace` 本來就在跑 `validateSubmission`，而該函式已經有 `route-needs-linestring`、`route-needs-metrics`、`spot-needs-point`、`spot-cannot-have-route-metrics`、`outside-coverage`。換句話說，跨 kind 需要的不變式**規則不用重寫**，只需要放寬白名單。路線改成地標時若忘了清掉 `route`，最後一道會擋下來。

**The safety net already exists**: `editPlace` already calls `validateSubmission`, which already enforces `route-needs-linestring`, `route-needs-metrics`, `spot-needs-point`, `spot-cannot-have-route-metrics` and `outside-coverage`. The invariants a kind change needs are already written; only the whitelist has to widen. A route-to-spot that forgot to null `route` is caught by the fourth of those.

---

## 4. 不動的東西 / What is not touched

`slug`、`status`、`submittedBy`、`photos` 仍在白名單外。`difficulty` 和 `attributes` 是照活動類型分類的，與 kind 無關。

**`approach` 也不動**，即使 kind 變了。理由：它現在全站沒有任何地方寫得進去 — `submission.ts` 和 `route-submission.ts` 兩條投稿路徑都硬寫 `approach: null`，唯一有值的是一筆 fixture。與其現在發明一條「換 kind 時 approach 該怎麼辦」的規則，不如留著，等它真的能被寫入時再一併設計。記在這裡，以免日後被當成漏掉的。

**`approach` is left alone** even when the kind changes. Nothing currently writes it — both submission paths hardcode `approach: null` and the only populated one is a fixture. Inventing a rule for a field nothing can produce would be guessing; it is recorded here so it is not later mistaken for an oversight.

### 已發布的項目不退回審核 / A published entry stays published

**決定 (Yulia, 2026-09-07)**：換掉位置後狀態不變，直接生效。

理由是一致性而非方便：`canEdit` 早就允許投稿者修改自己項目的描述，而那不會退回審核。位置沿用同一條規則，並沒有新開一個洞 — 「已審核的內容事後可被作者更動」這個問題**已經存在**，而它的正解是開放投稿時要一併回答的題目，不屬於這份文件。

代價是誠實記下的：等到投稿真的開放，一個人可以讓一筆無害的項目通過審核、然後把位置換成別的地方。這與他可以把描述改成廣告是同一種攻擊，需要同一個解法（編輯稽核或修改後重審），而那個解法要涵蓋兩者。

**Decision**: status is unchanged; the edit takes effect immediately.

The reason is consistency rather than convenience. `canEdit` already lets a submitter rewrite their own entry's prose without returning it to review, so geometry opens no new hole — "approved content can later be altered by its author" is an *existing* property, and its proper answer belongs to the decision about opening submission, not to this document.

The cost, recorded honestly: once submission opens, someone could get an innocuous entry approved and then swap its location. That is the same attack as rewriting the description into spam, it needs the same remedy (an edit audit, or re-review on change), and that remedy must cover both.

---

## 5. 時間會被換掉，包括換成「不知道」/ Duration is replaced, including into unknown

`summariseTrack` 遇到沒有時間戳記的 GPX，回傳 `{ minMinutes: 0, maxMinutes: 0, basis: 'submitter' }`，也就是「站上不知道」。所以拿一個沒有時間紀錄的檔案去換掉一個有紀錄的，量測到的時間就沒了。

**決定 (Yulia, 2026-09-07)**：這是對的，因為本來就是整個換掉。不保留舊值。

但不讓你事後才發現：`RouteForm` 的客戶端預覽**本來就已經算出這個數字**，所以在按下儲存前就顯示「這個檔案沒有時間紀錄，原本的 X–Y 分鐘會變成未知」。這是告知，不是選項。

`summariseTrack` returns a zero duration with basis `submitter` — the site's way of saying it does not know — for a GPX without timestamps. Replacing a timed track with an untimed one therefore loses the measured duration. That is correct under replace-wholesale semantics and the old value is not preserved.

It is not, however, discovered after the fact. `RouteForm`'s client-side preview already computes this, so the form states before saving that the recorded duration will become unknown. Information, not a choice.

---

## 6. 縣市不會跟著針走 / The county does not follow the pin

`isWithinCoverage` 只擋「跑出台灣」，不擋「針在宜蘭但下拉還寫台北」。而 `city` 是 Cosmos 的 partition key，選錯了那筆資料就存在錯的分區、在站上顯示錯的縣市。這個洞**投稿頁早就有**，只是「更換位置」讓它更容易被觸發。

`isWithinCoverage` refuses a point outside Taiwan; it does not notice a pin in Yilan filed under Taipei. `city` is the Cosmos partition key, so a wrong one puts the document in the wrong partition and shows the wrong county. The submit page has always had this hole; replacing a location makes it easier to hit.

**三層處理，額外成本為零 / Three layers, at zero additional cost:**

**① 用搜尋落針時自動帶入縣市。** 那次 geocoding 呼叫的錢已經付了，行政區就在同一個回應裡 — `readSearchResults` 目前只讀 `address.formattedAddress`，其餘丟掉。讀出來即可，額外計量為零。這同時修好投稿頁。

代價是多一張「Azure 行政區字串 → `CITIES` 鍵」的對照表，也就是**又一份可能走鐘的清單** — 正是這個 codebase 反覆出事的模式（縣市曾經有四份、活動類型四份）。所以它與 `CITIES` 放在同一個檔案，並加兩個測試：20 個縣市每一個都要能從對照表到達，且對照表不得有 `CITIES` 以外的鍵。走鐘會被測試抓到，不靠人記得。

實作前需對照一次真實回應確認欄位名稱，不從文件推定。

**① Auto-fill the county from a search result.** That geocoding call is already paid for and the administrative district is in the same response — `readSearchResults` currently reads only `address.formattedAddress` and discards the rest. Reading it costs zero extra transactions, and it fixes the submit page at the same time.

The cost is a mapping table from Azure's district strings to `CITIES` keys — *another list that can drift*, which is this codebase's recurring failure (counties once existed in four places, activities in four). It therefore lives in the same file as `CITIES`, with two tests: every one of the twenty counties must be reachable through the table, and the table may contain no key outside `CITIES`. Drift becomes a test failure rather than something someone has to remember. The exact field name is confirmed against a live response before it is relied on, not inferred from documentation.

**② 用點的落針時，不猜，但也不沉默。** 不做 reverse geocoding。改為：針移動過、而縣市選單未被碰過時，把縣市欄位標記為「請確認」。它不知道正確答案，但它知道這個答案可能過期 — 而這正是免費能取得的資訊量，也符合站上「不知道就說不知道」的原則。

**② For a tapped pin, do not guess and do not stay silent.** No reverse geocoding. Instead, when the pin has moved and the county selector has not been touched, the county field is marked as needing confirmation. It does not know the right answer; it knows the answer may be stale, which is exactly the information available for free and consistent with the site's rule that absence is displayed rather than hidden.

**③ 真正的解法先不做，但留下名字。** `cityOf(position)`，放在 `lib/gpx/geo.ts` 裡 `isWithinCoverage` 旁邊，以縣市界多邊形判斷。純函式、不吃計量表、可完全單元測試 — 這才是對的答案。不做的理由是它需要一份縣市界資料集（含澎湖、綠島、蘭嶼的離島多邊形），而目前的風險撐不起這個重量：填錯縣市是可以透過這個表單本身修好的，不是資料遺失。

**③ The real fix is named but deferred.** `cityOf(position)`, beside `isWithinCoverage` in `lib/gpx/geo.ts`, deciding by county boundary polygons: pure, unmetered, fully unit-testable. It is deferred because it needs a boundary dataset including the offshore islands, and the present risk does not justify that weight — a wrong county is correctable through this very form, not data loss.

**為什麼不乾脆每次落針都 reverse geocode / Why not reverse geocode every pin drop**：技術可行，計量也吃得起（Location Insights 每月 5,000 次，與地點搜尋共用，落針次數是幾十的量級）。但 ① 已經涵蓋常見路徑，而讓剩下的手動落針也走網路，等於為了一個純幾何事實，每一次點擊都依賴一個外部服務。

It would work and the meter could afford it — the Location Insights grant is 5,000 a month, shared with place search, against pin drops in the dozens. But layer ① already covers the common path, and routing the rest through the network makes every tap depend on an external service to answer a question that is purely geometric.

---

## 7. 元件 / Components

落針的地圖現在埋在 `SpotForm`（285 行）裡，GPX 上傳與預覽埋在 `RouteForm`（227 行）裡。編輯頁需要同樣的兩件東西。

**決定：抽出 `<PinPicker>` 和 `<GpxPicker>`，投稿頁與編輯頁共用。**

這不是順手重構 — 這個專案反覆出事的模式就是「同一件事寫在兩個地方，其中一份走鐘」：縣市四份、活動類型四份、照片大小限制寫在句子裡沒跟著程式改。編輯頁自己複製一份地圖邏輯就是第五次。而且 `NameFields`、`ProseFields`、`PlaceSearch` 早就抽出來了，把欄位群組抽成元件是既有作法，地圖和 GPX 只是之前只有一個表單用到。

The map picker currently sits inside `SpotForm` (285 lines) and the GPX upload and preview inside `RouteForm` (227 lines). The edit page needs both.

**Decision: extract `<PinPicker>` and `<GpxPicker>` and share them between the submit and edit pages.** This is not incidental refactoring. The recurring bug on this codebase is one thing written in two places where one copy drifts; a second copy of the map logic would be the fifth instance. `NameFields`, `ProseFields` and `PlaceSearch` are already extracted, so pulling a field group into a component is the established pattern — the map and the GPX field simply had one consumer until now.

**`PinPicker` 必須能在沒有搜尋時運作。** `/api/place-search` 是 admin-only，而 `canEdit` 允許投稿者編輯自己的項目，所以開放投稿後一般使用者在編輯頁會拿到 403。搜尋不可用時，搜尋框收起，地圖照樣可以點 — 這是共用元件從第一天就該有的行為，不是之後再補。

**`PinPicker` must work without search.** `/api/place-search` is administrator-only while `canEdit` admits the submitter, so once submission opens an ordinary contributor editing their own entry receives a 403. When search is unavailable the box is withdrawn and the map still takes a tap. Designed in from the start rather than retrofitted.

---

## 8. 介面 / Interface

編輯頁多一個「位置」區塊，**預設收合**，顯示現況：

- 地標 → 一張小地圖顯示現在的針，旁邊「更換位置」
- 路線 → 現在的距離／爬升／時間，旁邊「更換路線」

展開後是 kind 切換（與投稿頁同一個元件，預設停在這筆現在的 kind）加上對應的 `PinPicker` 或 `GpxPicker`，另有「取消」收回並且什麼都不動。

收合是刻意的：更換位置是丟掉資料的動作，不該長得像一個普通欄位，也不該在改錯字時被誤觸。展開只多一次點擊。

A "location" section, **collapsed by default**, showing what is there now: for a spot a small map with the current pin and a *replace* control; for a route the current distance, ascent and duration with the same. Expanding reveals the kind picker — the same component the submit page uses, starting on the entry's current kind — and the matching picker, plus a cancel that collapses without changing anything.

Collapsed by default is deliberate: replacing a location discards data, so it should not look like an ordinary field or be reachable by accident while fixing a typo. Expanding costs one click.

**意圖以 hidden 欄位表達**：表單帶 `replaceGeometry=1` 才代表要換。沒有它就完全不碰幾何。有它但幾何不完整（展開了、選了路線、卻沒上傳檔案）→ 明確報錯，而不是安靜地忽略使用者剛做的事。

**Intent is explicit**: the form posts `replaceGeometry=1` only when a replacement is meant. Without it the geometry is untouched. With it but incomplete — expanded, switched to route, no file chosen — the save fails with a stated reason rather than silently discarding what the user just did.

---

## 9. 檔案處理 / File handling

**新檔案走新的 UUID 路徑，不覆蓋舊路徑。** 這樣快取不可能拿舊檔案冒充新內容，而且存檔失敗時舊項目原封不動。

**順序**：伺服器端重新解析並驗證 → 上傳新檔 → 寫入文件 → **最後**刪舊檔。

刪除放最後的理由與 `route-actions.ts` 既有的註解同源：孤兒檔案無害，指向不存在檔案的文件是沒人修得好的壞資料。反過來做，刪除成功而存檔失敗，就會產生後者。

**已發布的項目，新檔要直接進 `public` 容器**（`filesOf` 與 promote/demote 機制假設檔案跟著狀態走），但現在只有 `uploadToPending`。把它改成薄薄一層包在通用的 `upload(container, path, body, contentType)` 上，既有呼叫端不動。

The new file takes a fresh UUID path rather than overwriting the old one, so no cache can serve the old file as the new content and a failed save leaves the existing entry intact.

Order: re-parse and validate server-side → upload the new file → write the document → **then** delete the old one. The reasoning matches the comment already in `route-actions.ts`: an orphaned blob is harmless, while a document pointing at a file that was never stored is a broken entry nobody can repair. Deleting first and failing to save produces exactly that.

A published entry's new GPX must land in `public`, since `filesOf` and the promote/demote machinery assume files follow status, but only `uploadToPending` exists. It becomes a thin wrapper over a general `upload(container, path, body, contentType)`, leaving existing call sites untouched.

**伺服器端一定重新解析。** 客戶端的 `parseGpx` 只服務預覽，不是信任邊界 — 這條規則在投稿路徑已經寫下，更換路徑沿用。

The server always re-parses. The client-side `parseGpx` serves the preview and is never a trust boundary; the rule is already stated on the submission path and carries over.

---

## 10. 測試 / Testing

`applyEdit` 是純函式，所以主體是單元測試，放進既有的 `editing.test.ts`：

- 四種轉換各一個
- 沒帶替換時，幾何、`route`、`startPoint` 完全不動
- 路線 → 地標時 `route` 變成 `null`
- 換 kind 時 `approach` 不動（把第 4 節的決定釘住）

另外記錄安全網：路線 → 地標若忘了清 `route`，`validateSubmission` 回 `spot-cannot-have-route-metrics`。

行政區對照表兩個測試（第 6 節①）。`readSearchResults` 既有測試補一個「回應缺行政區時仍回傳結果」。

檔案順序與 server action 屬整合層，依這個 repo 既有作法以本機 dev server 實測驗證，不寫脆弱的 mock。

`applyEdit` is pure, so the substance is unit tests in the existing `editing.test.ts`: one per transition; geometry, `route` and `startPoint` untouched when no replacement is supplied; `route` nulled on route-to-spot; `approach` untouched across a kind change, pinning section 4's decision. A further test records the safety net — a route-to-spot that forgot to null `route` yields `spot-cannot-have-route-metrics`.

The district mapping gets the two tests from section 6①, and `readSearchResults` gains one for a response carrying no district. File ordering and the server action are integration-shaped and are verified against a local dev server, following this repo's existing practice rather than through brittle mocks.

---

## 11. 不在範圍內 / Out of scope

- **編輯線的頂點 / vertex editing** — 語意是整個換掉（第 2 節）
- **`approach` 的寫入 / writing `approach`** — 全站尚無任何路徑可寫入，屬獨立工作
- **`cityOf(position)` 與縣市界資料 / boundary data** — 第 6 節③，已具名延後
- **編輯稽核或修改後重審 / edit audit or re-review on change** — 第 4 節，屬開放投稿的決定
- **照片的更換 / replacing photos** — 照片有自己的既有流程，本次不動
