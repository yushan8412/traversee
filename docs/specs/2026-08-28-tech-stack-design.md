# Traversee v1 — 技術架構規格 / Technical Architecture Spec

> **狀態 / Status**: 待審核 / In review
> **日期 / Date**: 2026-08-28
> **決策者 / Decided by**: Yulia (Product) + Claude (Engineering)
> **前置文件 / Supersedes**: [`docs/design.md`](../design.md) 的 "Open decisions" 一節 / the "Open decisions" section of `docs/design.md`

---

## 0. 這份文件是什麼 / What this document is

這份文件記錄 Traversee v1 的技術選型與架構設計，以及**每個決定背後的理由**。它的目的不只是「記下我們選了什麼」，而是讓半年後的我們（或任何看這個 repo 的人）能理解「為什麼不是別的選擇」。實作計畫另立文件。

This document records the technology choices and architecture for Traversee v1, along with **the reasoning behind each decision**. Its purpose is not merely to log what was chosen, but to let us — or anyone reading this repo six months from now — understand why the alternatives were rejected. The implementation plan lives in a separate document.

---

## 1. 前提與限制 / Context and constraints

### 產品前提 / Product context

Traversee 是北北基（台北市、新北市、基隆市）的單車與健行路線知識庫。內容有兩個來源：從 OpenStreetMap 匯入並經人工挑選的種子路線，以及註冊使用者上傳的路線。

Traversee is a cycling and hiking route knowledge base for northern Taiwan (Taipei, New Taipei, Keelung). Content comes from two sources: seed routes imported from OpenStreetMap and manually curated, plus routes submitted by registered users.

### 本次新確認的產品決定 / Product decisions confirmed in this round

| 決定 / Decision | 內容 / Detail |
|---|---|
| 雙語 / Bilingual | v1 即支援繁體中文與英文，網址分流 `/zh` `/en`。<br>Traditional Chinese and English from v1, with `/zh` and `/en` URL routing. |
| 登入方式 / Authentication | 僅支援 Google 登入，不自建密碼系統。<br>Google sign-in only; no self-managed password system. |
| 審核後台 / Moderation console | 納入 v1。使用者上傳的路線需審核通過才會公開。<br>In scope for v1. User submissions require approval before going public. |
| 難度分級 / Difficulty scale | 1–5 級，單車與健行各一套定義（見附錄 A）。<br>Five levels, with separate definitions for cycling and hiking (see Appendix A). |
| 預估時間 / Duration estimate | 以區間呈現，並記錄估算依據。<br>Presented as a range, with the basis of the estimate recorded. |

### 技術限制 / Technical constraints

- **成本 / Cost** — Azure $200 額度到期後，每月營運成本必須永久維持在 $0–5 美金。這是硬限制，不是目標。<br>After the $200 Azure credit expires, ongoing cost must stay permanently within USD $0–5/month. This is a hard constraint, not a target.
- **雲端平台 / Cloud** — Microsoft Azure。<br>Microsoft Azure.
- **團隊 / Team** — 一位產品負責人（決策、審稿、驗收）加一位 AI 工程師（實作）。架構必須是這個組合維護得動的規模。<br>One product owner (decisions, curation, acceptance) plus one AI engineer (implementation). The architecture must be maintainable by that pairing.
- **法務 / Legal** — OpenStreetMap 資料採 ODbL 授權，必須標註出處。禁止爬取 TOS 不允許的平台（Strava、komoot、健行筆記）。<br>OpenStreetMap data is ODbL-licensed and requires attribution. No scraping of platforms whose terms forbid it.
- **作品集用途 / Portfolio use** — repo、commit 紀錄、文件皆對外公開，品質須經得起檢視。<br>The repo, commit history, and docs are public and must withstand scrutiny.

### 關鍵發現：Azure「免費」有兩種 / Key finding: Azure has two kinds of "free"

Azure 的定價頁把「**永久免費**」（每月重置的免費額度，永不到期）和「**首年免費**」（免費帳戶試用，12 個月後自動轉為付費）混列在同一張表中。這個區別直接決定了本次選型。

Azure's pricing pages mix **always-free** offerings (a monthly grant that never expires) with **12-months-free** trial offerings (which convert to pay-as-you-go automatically). This distinction drove the entire selection.

**最重要的一項：Azure Database for PostgreSQL 是 12 個月免費，不是永久免費。** 試用期後，東南亞／日本區最小規格約 USD $15–25/月，是預算上限的三至五倍。因此本專案不使用 Azure 的 PostgreSQL。

**Most importantly: Azure Database for PostgreSQL is 12-months-free, not always-free.** After the trial it costs roughly USD $15–25/month for the smallest instance in Southeast Asia / Japan regions — three to five times the budget ceiling. This project therefore does not use Azure PostgreSQL.

---

## 2. 決策總覽 / Decisions at a glance

| 層 / Layer | 選定 / Chosen | 免費性質 / Free status | 落選 / Rejected |
|---|---|---|---|
| 網站框架 / Web framework | Next.js (App Router) + TypeScript | — | Astro, SvelteKit, React + Vite |
| 代管 / Hosting | Azure Static Web Apps — Free 方案 / Free plan | 永久免費 / Always free | App Service F1, Container Apps |
| 資料庫 / Database | Azure Cosmos DB for NoSQL — 免費層 / free tier | 永久免費（1,000 RU/s + 25 GB）/ Always free | Azure PostgreSQL, 外部 Postgres / external Postgres |
| 檔案儲存 / File storage | Azure Blob Storage | 依用量計費，約 $0.05/月 / Pay-as-you-go, ~$0.05/mo | 資料庫內嵌 / storing blobs in the DB |
| 身分驗證 / Authentication | Auth.js + Google OAuth，跑在 Next.js 內 / running inside Next.js | 免費 / Free | Static Web Apps 內建驗證 / built-in auth, Auth0, Entra ID B2C |
| 地圖底圖 / Map tiles | Azure Maps **Gen2** | 永久免費額度 5,000 交易/月 / Always-free grant, 5,000 transactions/mo | Azure Maps Gen1（2026-09-15 退役 / retiring）, OSM raster tiles |
| 地圖繪製 / Map rendering | MapLibre GL JS | 開源 / Open source | Leaflet, Mapbox GL JS |
| 樣式 / Styling | Tailwind CSS | 開源 / Open source | CSS Modules, styled-components |
| 多語系 / i18n | next-intl | 開源 / Open source | next-i18next |
| 基礎設施即程式碼 / IaC | Bicep | 免費 / Free | Terraform, 手動設定 / manual portal setup |
| CI/CD | GitHub Actions | 公開 repo 免費 / Free for public repos | Azure DevOps |
| 測試 / Testing | Vitest（單元 / unit）+ Playwright（端對端 / E2E） | 開源 / Open source | Jest, Cypress |
| 監控 / Monitoring | Azure Application Insights（採樣模式 / sampled） | 每月 5 GB 免費額度 / 5 GB/mo free grant | 無監控 / none |

各套件的確切版本於實作時鎖定當下穩定版，並記錄於 `package.json`。

Exact package versions will be pinned to the then-current stable releases at implementation time and recorded in `package.json`.

---

## 3. 整體架構 / Architecture

```
                        使用者瀏覽器 / User's browser
                                  │
              ┌───────────────────┴────────────────────┐
              │   Azure Static Web Apps (Free plan)    │
              │   ── Next.js (App Router) ──           │
              │      · 伺服器端渲染頁面 / SSR pages      │
              │      · API 路由：上傳、審核、驗證         │
              │        API routes: upload, review, auth │
              └───────────────────┬────────────────────┘
                                  │
        ┌────────────┬────────────┼────────────┬──────────────┐
        │            │            │            │              │
  ┌─────▼─────┐ ┌────▼──────┐ ┌───▼───────┐ ┌──▼─────────┐ ┌──▼──────────┐
  │ Cosmos DB │ │   Blob    │ │Azure Maps │ │   Google   │ │ Application │
  │  NoSQL    │ │  Storage  │ │   Gen2    │ │   OAuth    │ │  Insights   │
  ├───────────┤ ├───────────┤ ├───────────┤ ├────────────┤ ├─────────────┤
  │ routes    │ │ pending/  │ │ 向量圖磚   │ │ 身分驗證    │ │ 錯誤與效能   │
  │ users     │ │ public/   │ │ tiles     │ │ identity   │ │ telemetry   │
  ├───────────┤ ├───────────┤ ├───────────┤ ├────────────┤ ├─────────────┤
  │ 永久免費   │ │ ~$0.05/mo │ │ 永久免費   │ │   免費      │ │  5 GB/mo    │
  │always free│ │           │ │always free│ │   free      │ │  free       │
  └───────────┘ └───────────┘ └───────────┘ └────────────┘ └─────────────┘
```

### 各元件職責 / Component responsibilities

**Next.js 應用程式 / The Next.js application** — 同時承擔前端與後端。使用者看到的頁面與處理上傳、審核的伺服器邏輯住在同一個專案、同一次部署裡。對本專案的規模而言，這是零件最少而不犧牲能力的做法；拆成獨立前後端專案會多出一套部署、一套環境變數、一層跨網域設定，換不到實質好處。

Serves as both frontend and backend. The pages users see and the server logic handling uploads and moderation live in one project and one deployment. At this project's scale that is the fewest moving parts without sacrificing capability; splitting into separate frontend and backend projects would add a second deployment, a second set of environment variables, and a cross-origin layer, in exchange for nothing material.

**Cosmos DB** — 存放結構化資料：路線的名稱、雙語描述、數據、審核狀態、地理形狀，以及使用者清單。<br>Stores structured data: route names, bilingual descriptions, metrics, moderation status, route geometry, and the user list.

**Blob Storage** — 存放大檔案：原始 GPX 軌跡與照片。資料庫中僅保存檔案路徑。<br>Stores large files: original GPX tracks and photos. The database holds only file paths.

**Azure Maps Gen2** — 提供地圖底圖圖磚。**必須建立 Gen2 帳戶**：Gen1 價格層於 2026-09-15 退役。<br>Provides base map tiles. **A Gen2 account must be created**: the Gen1 price tier retires on 2026-09-15.

**Google OAuth** — 唯一的身分來源。本系統不儲存密碼。<br>The sole identity source. This system stores no passwords.

**Application Insights** — 收集錯誤與效能資料，開啟採樣以維持在免費額度內。<br>Collects error and performance telemetry, with sampling enabled to stay within the free grant.

---

## 4. 技術選型理由 / Technology choices and rationale

### 4.1 為什麼是 Cosmos DB，而不是關聯式資料庫 / Why Cosmos DB rather than a relational database

主因是成本：Cosmos DB 的免費層（1,000 RU/s + 25 GB）是 Azure 上唯一真正永久免費的資料庫，而 Azure PostgreSQL 只免費 12 個月。

The primary reason is cost: the Cosmos DB free tier (1,000 RU/s + 25 GB) is the only genuinely always-free database on Azure, whereas Azure PostgreSQL is free for only 12 months.

次要理由是資料形狀契合。Traversee 的核心資料是「一條路線 = 一份完整文件」，包含它的雙語文字、數據、地理形狀與照片清單，幾乎不需要跨表 join。這正是文件式資料庫的適用場景。

The secondary reason is fit. Traversee's core data is "one route = one self-contained document" holding its bilingual text, metrics, geometry, and photo list, with almost no need for cross-table joins. That is precisely the shape a document database suits.

Cosmos DB 原生支援 GeoJSON 的 `Point`、`LineString`、`Polygon` 型別與 `ST_DISTANCE`、`ST_WITHIN`、`ST_INTERSECTS` 查詢，且預設索引策略會自動索引地理資料，因此地理查詢能力不是妥協。

Cosmos DB natively supports GeoJSON `Point`, `LineString`, and `Polygon` types with `ST_DISTANCE`, `ST_WITHIN`, and `ST_INTERSECTS` queries, and its default indexing policy indexes geospatial data automatically, so geospatial capability is not a compromise.

**已知取捨 / Known trade-off** — PostgreSQL + PostGIS 是地理應用的業界標準，履歷份量較重，且未來若需要複雜的關聯查詢（例如「找出與這條路線交會的所有其他路線」）會更順手。我們接受這個取捨，因為 v1 沒有這類需求，而成本限制是硬的。若日後真的需要，遷移路徑是把資料匯出成 JSON 再匯入 Postgres——資料量小，成本可控。

PostgreSQL with PostGIS is the industry standard for geospatial applications, carries more weight on a résumé, and would handle complex relational queries (for example, "find every route that intersects this one") more gracefully. We accept the trade-off because v1 has no such requirement and the cost constraint is hard. Should the need arise, the migration path is exporting to JSON and importing into Postgres — the dataset is small and the effort bounded.

### 4.2 為什麼不容器化 / Why not containerise

Azure Container Apps 有永久免費額度（每月 180,000 vCPU 秒、360,000 GiB 秒、200 萬次請求），技術上可行，且 Docker + IaC 的組合在履歷上最像正職工程團隊的做法。

Azure Container Apps has an always-free monthly grant (180,000 vCPU-seconds, 360,000 GiB-seconds, 2 million requests) and is technically viable; a Docker plus IaC stack also most closely resembles how a professional engineering team works.

不採用的理由有二。第一，要待在免費額度內就必須設定縮放到零，而縮放到零意味著閒置後的第一位訪客要等待容器冷啟動數秒——對一個主要用途是被雇主與客戶點開瀏覽的作品集網站，這是最糟的第一印象。若改為常駐一個副本，單是 0.5 vCPU 常駐每月就約需 130 萬 vCPU 秒，是免費額度的七倍。

We rejected it for two reasons. First, staying within the free grant requires scale-to-zero, and scale-to-zero means the first visitor after an idle period waits several seconds for a cold start — the worst possible first impression for a portfolio site whose main purpose is being opened by prospective employers and clients. Keeping one replica always warm would consume roughly 1.3 million vCPU-seconds per month for a single 0.5 vCPU replica, about seven times the grant.

第二，「專業感」的實際來源是基礎設施即程式碼、CI 自動檢查、PR 預覽環境、測試覆蓋與乾淨的提交紀錄——這些與是否使用容器無關，在 Static Web Apps 上一樣做得到，而且能早數週上線。

Second, the actual signals of professionalism are infrastructure-as-code, automated CI checks, PR preview environments, meaningful test coverage, and a clean commit history. None of these depend on containers; all are achievable on Static Web Apps, and weeks sooner.

### 4.3 為什麼不用 Static Web Apps 內建的驗證 / Why not use Static Web Apps' built-in authentication

Static Web Apps 的 Free 方案僅預先設定 GitHub 與 Microsoft Entra ID 兩個身分提供者，**不包含 Google**。要使用 Google 必須註冊自訂 OIDC 提供者，而該功能僅限 Standard 方案（每個應用程式每月 USD $9），且註冊自訂提供者會停用所有預設提供者。

The Static Web Apps Free plan preconfigures only GitHub and Microsoft Entra ID as identity providers — **Google is not among them**. Using Google requires registering a custom OIDC provider, which is a Standard-plan-only feature (USD $9 per app per month), and registering a custom provider disables all preconfigured ones.

因此我們不使用平台內建驗證，改在 Next.js 應用程式內以 Auth.js 直接串接 Google OAuth。此方案執行於 Free 方案所提供的受管後端中，功能完整且成本為零。

We therefore bypass the platform's built-in authentication and integrate Google OAuth directly via Auth.js inside the Next.js application. This runs in the managed backend that the Free plan provides, is fully featured, and costs nothing.

### 4.4 為什麼種子資料是一次性匯入，而非即時查詢 OpenStreetMap / Why OSM data is imported once rather than queried live

OpenStreetMap 的原始路徑資料品質不一：大量路段沒有名稱、幾何形狀斷裂，或根本不是供人行走的通道。若網站即時查詢 OSM，網站的內容品質將直接由 OSM 的資料品質決定，且查詢延遲與服務穩定性都不在我們掌控之中。

Raw OpenStreetMap path data is of uneven quality: many segments are unnamed, geometrically fragmented, or not intended for pedestrian use at all. Querying OSM live would tie the site's content quality directly to OSM's data quality, with query latency and availability outside our control.

因此改為：以 Overpass API 一次性擷取北北基的步道與自行車道，經程式清洗後產出候選清單，再由產品負責人人工挑選與潤稿，最後匯入資料庫。內容品質因此掌握在我們手上。

Instead: a one-off extraction of northern Taiwan's trails and cycleways via the Overpass API, programmatically cleaned into a candidate list, then manually curated and edited by the product owner before import. Content quality thus stays in our hands.

所有 OSM 來源路線標註 `© OpenStreetMap contributors`。這是 ODbL 授權的法定要求。

All OSM-derived routes carry the attribution `© OpenStreetMap contributors`. This is a legal requirement of the ODbL licence.

---

## 5. 資料模型 / Data model

資料庫使用共用輸送量模式（shared throughput），1,000 RU/s 由兩個 container 共用。

The database uses shared throughput, with 1,000 RU/s shared across two containers.

### 5.1 `routes` container

**分割索引鍵 / Partition key**: `/city`

北北基共三個值，資料量分布均衡，每個邏輯分割區都遠低於 20 GB 上限；且「僅檢視特定縣市路線」是最可能新增的篩選條件。

Three values covering the whole geographic scope, evenly distributed, each logical partition far below the 20 GB limit; filtering to a single city is also the most likely filter to be added.

```jsonc
{
  "id": "a3f2c1e8-…",
  "slug": "lengshuikeng-loop",        // 網址代稱 / URL slug — /zh/routes/lengshuikeng-loop
  "city": "taipei",                   // taipei | newTaipei | keelung  ← 分割索引鍵 / partition key
  "activityType": "hiking",           // hiking | cycling
  "status": "published",              // pending | published | rejected

  // ── 雙語文字 / Bilingual text ──
  "name":        { "zh": "冷水坑環走",   "en": "Lengshuikeng Loop" },
  "summary":     { "zh": "…",          "en": "…" },   // 列表卡片 / list card
  "description": { "zh": "…",          "en": "…" },   // 詳情頁 / detail page

  // ── 數據 / Metrics ──
  "difficulty": 3,                    // 1–5，依 activityType 解讀 / interpreted per activityType
  "distanceKm": 6.4,
  "elevationGainM": 320,
  "duration": {
    "minMinutes": 120,
    "maxMinutes": 180,
    "basis": "gpx"                    // gpx | submitter | editor
  },

  // ── 地理資料 / Geospatial ──
  "geometry":   { "type": "LineString", "coordinates": [[121.55, 25.16], "…"] },  // 簡化版 / simplified
  "startPoint": { "type": "Point",      "coordinates": [121.55, 25.16] },

  // ── 大檔案指標 / Pointers to large files ──
  "gpxPath": "gpx/a3f2c1e8.gpx",
  "photos": [
    { "path": "photos/a3f2c1e8/1.webp", "width": 1600, "height": 1067,
      "caption": { "zh": "…", "en": "…" } }
  ],
  "coverPhotoIndex": 0,

  // ── 來源與審核 / Provenance and moderation ──
  "source": "user",                   // osm | user
  "submittedBy": "使用者 id / user id",   // OSM 來源為 null / null for OSM-sourced
  "reviewedBy": "管理員 id / admin id",
  "reviewNote": "退回原因 / rejection reason",

  "createdAt": "2026-08-28T…Z",
  "updatedAt": "2026-08-28T…Z",
  "publishedAt": "2026-08-28T…Z"
}
```

#### 三個關鍵設計決定 / Three key design decisions

**一、雙語以「單一文件內的雙欄位」表示，而非兩份文件。**
一條路線的距離、爬升、GPX、照片在中英文版本完全相同，僅文字不同。若拆成兩份文件，修正一次距離就必須同步兩處，長期必然不一致。此設計另有一個好處：若某條路線僅有中文描述，英文版可自動退回顯示中文並標示「尚未翻譯」，而不是讓該路線在英文版整條消失。

**1. Bilingual content is modelled as paired fields within a single document, not as two documents.**
A route's distance, elevation gain, GPX track, and photos are identical across languages; only the prose differs. Splitting into two documents would require updating a corrected distance in two places, which will inevitably drift. This design carries a further benefit: a route with only Chinese prose can fall back to displaying Chinese on the English site with a "not yet translated" marker, rather than vanishing from the English site entirely.

**二、資料庫僅存簡化後的路線形狀，完整 GPX 存於 Blob Storage。**
一個原始 GPX 檔可能包含數千個座標點。若整包存入資料庫，列表頁列出 20 條路線就需搬運數萬個座標點，既慢又快速消耗免費輸送量額度——而列表頁與地圖總覽實際上只需要粗略形狀。因此以 Ramer–Douglas–Peucker 演算法簡化後存入資料庫（目標數十至數百點），僅在路線詳情頁需要精確軌跡時才自 Blob 讀取完整檔案。

**2. The database stores only a simplified route geometry; the full GPX lives in Blob Storage.**
A raw GPX file may contain thousands of coordinate points. Storing them in the database would mean a 20-route list page transferring tens of thousands of points — slow, and a fast way to burn the free throughput grant — when the list and overview map need only a coarse shape. Geometry is therefore simplified with the Ramer–Douglas–Peucker algorithm before storage (targeting tens to low hundreds of points), and the full file is fetched from Blob only when the detail page needs a precise track.

**三、`duration` 記錄估算依據。**
GPX 檔的座標點通常帶有時間戳，因此上傳者的實際移動時間可由檔案直接計算（扣除停留超過設定閾值的休息時段）。但並非所有檔案都含時間戳，此時改由上傳者自行填寫。`basis` 欄位保存這個區別，讓前台能誠實呈現「根據實際紀錄」或「上傳者估計」——兩者可信度不同。

未來若要針對不同體能程度提供不同估時，僅需在此物件內新增 `byLevel` 欄位；Cosmos DB 無固定綱要，既有文件不受影響，不需要資料庫遷移。

**3. `duration` records the basis of its estimate.**
GPX trackpoints usually carry timestamps, so a submitter's actual moving time can be computed directly from the file (excluding pauses longer than a configured threshold). Not every file has timestamps, in which case the submitter supplies the estimate. The `basis` field preserves that distinction so the site can honestly show "from recorded tracks" versus "submitter's estimate" — the two carry different confidence.

Should we later offer estimates tailored to different fitness levels, that requires only adding a `byLevel` field to this object; Cosmos DB is schemaless, existing documents are unaffected, and no migration is needed.

### 5.2 `users` container

**分割索引鍵 / Partition key**: `/id`

驗證後的查詢一律是「以 id 取得單一使用者」，此為最有效率的存取模式。

Post-authentication lookups are always "fetch one user by id", which this makes maximally efficient.

```jsonc
{
  "id": "google-sub 的雜湊值 / hash of the Google subject identifier",
  "email": "…",
  "displayName": "…",
  "avatarUrl": "…",
  "role": "user",                     // user | admin
  "preferredLocale": "zh",            // zh | en
  "createdAt": "…",
  "lastLoginAt": "…"
}
```

管理員身分由環境變數中的 email 允許清單決定，於登入時比對後寫入 `role`。管理員名單不寫死在程式碼中，也不需要手動修改資料庫。

Administrator status is determined by an email allowlist held in an environment variable, checked at sign-in and written to `role`. The admin list is neither hard-coded nor requires manual database edits.

### 5.3 審核狀態機 / Moderation state machine

```
  使用者上傳 / user submits
        │
        ▼
    ┌─────────┐   管理員通過 / approve    ┌───────────┐
    │ pending │ ────────────────────────► │ published │
    │ 待審核   │                          │ 已發布     │
    └─────────┘ ◄──────────────────────── └───────────┘
        │           管理員下架 / unpublish
        │
        │ 管理員退回 / reject（附原因 / with reason）
        ▼
    ┌──────────┐   上傳者修改重送 / resubmit
    │ rejected │ ──────────────────────► pending
    │ 已退回    │
    └──────────┘

  OSM 匯入 / OSM import ──────────────────► published（直接發布 / published directly）
```

規則 / Rules:

- 僅 `published` 的路線會出現在公開頁面與地圖。<br>Only `published` routes appear on public pages and the map.
- `pending` 與 `rejected` 僅該路線的上傳者與管理員可見。<br>`pending` and `rejected` routes are visible only to their submitter and to administrators.
- 退回必須填寫 `reviewNote`；此為系統強制，退回原因對上傳者可見。<br>Rejection requires a `reviewNote`; this is enforced, and the reason is visible to the submitter.
- OSM 匯入的路線因已經人工挑選，直接進入 `published`。<br>OSM-imported routes are already manually curated and enter `published` directly.

### 5.4 檔案儲存配置 / Blob storage layout

```
pending/                              私有 / private
  gpx/{routeId}.gpx
  photos/{routeId}/{n}.webp

public/                               公開唯讀 / public read-only
  gpx/{routeId}.gpx
  photos/{routeId}/{n}.webp
  photos/{routeId}/{n}-thumb.webp
```

審核通過時，檔案自 `pending` 伺服器端複製至 `public` 後刪除來源。同一儲存體帳戶內的複製為伺服器端操作，即時且不計輸出流量費用。

On approval, files are server-side copied from `pending` to `public` and the source deleted. Copies within the same storage account are server-side operations: immediate, and not charged as egress.

**為何分為兩個容器 / Why two containers** — 若所有上傳檔案一律進入公開容器，則使用者上傳不當內容時，即使尚未通過審核，該檔案已存在一個真實可存取的公開網址。分離儲存從結構上消除這個風險，而非依賴網址不易猜測。

If all uploads landed in a public container, inappropriate content would have a genuinely reachable public URL from the moment of upload, before any review. Separating storage eliminates that risk structurally rather than relying on URLs being hard to guess.

---

## 6. 資料流 / Data flows

### 6.1 訪客瀏覽路線 / Visitor browses routes

```
訪客開啟 /zh/routes
  └─► Next.js 於伺服器端查詢 Cosmos：status = "published"
      投影僅取列表所需欄位（不含 description 與完整 geometry）
  └─► 伺服器產生完整 HTML 後送出
  └─► 瀏覽器以 MapLibre 於 Azure Maps 底圖上繪製路線
  └─► 點選路線 → /zh/routes/{slug}
      └─► 查詢單一文件 + 自 Blob 讀取完整 GPX
      └─► 繪製精確軌跡與海拔剖面圖
```

**為何採用伺服器端渲染 / Why server-side rendering** — 兩個理由。其一，搜尋引擎爬蟲能取得完整內容，這對一個希望被搜尋到的路線網站至關重要。其二，行動裝置首次載入即有內容，不會先呈現空白再逐步載入。

Two reasons. First, search engine crawlers receive complete content, which matters enormously for a route site that needs to be discoverable. Second, mobile users see content on first paint rather than a blank page that fills in progressively.

列表資料變動頻率低，將設定數分鐘的快取，使重複造訪不觸及資料庫，直接節省免費輸送量額度。

List data changes infrequently and will be cached for several minutes, so repeat visits never reach the database — directly conserving the free throughput grant.

### 6.2 使用者上傳路線 / User submits a route

```
登入後開啟 /zh/submit
  └─► 選擇 GPX 檔 → 於瀏覽器端解析
      · 即時顯示預覽地圖（確認檔案正確）
      · 自動計算距離、爬升、移動時間並預填表單
  └─► 填寫中英文名稱與描述、選擇難度、上傳照片
  └─► 送出 → 伺服器端驗證
      · 檔案大小與 MIME 類型
      · XML 解析停用外部實體（防 XXE）
      · 座標是否落在北北基邊界框內
      · 照片重新編碼為 WebP 並移除 EXIF
  └─► 寫入 pending/ 容器 → 寫入 Cosmos（status = pending）
  └─► 顯示「已送出，等待審核」
```

**為何在瀏覽器端解析 GPX / Why parse GPX in the browser** — 使用者能立即看到預覽並確認上傳的是正確檔案，體驗遠優於送出後才知道錯誤；同時節省伺服器資源。伺服器端仍會重新驗證，前端解析純粹是體驗優化，不作為信任邊界。

The user immediately sees a preview and confirms they uploaded the right file, which is far better than discovering an error after submission; it also conserves server resources. The server re-validates regardless — client-side parsing is a UX optimisation, never a trust boundary.

### 6.3 管理員審核 / Administrator reviews

```
以 Google 登入 → 系統比對管理員允許清單 → 開啟 /zh/admin
  └─► 列出所有 status = "pending" 的路線
  └─► 檢視地圖預覽、照片、雙語描述、GPX 統計
  └─► 通過：檔案 pending → public，status → published，記錄 reviewedBy
      退回：填寫 reviewNote，status → rejected
  └─► 上傳者於「我的投稿」看見結果與退回原因，可修改後重送
```

### 6.4 OpenStreetMap 種子資料匯入 / OSM seed import

此流程**不是網站功能，而是一次性的離線作業**。

This flow is **not a site feature but a one-off offline task**.

```
Overpass API 查詢北北基的 highway=path/footway/cycleway 等標籤
  └─► 清洗腳本
      · 濾除無名稱路段
      · 合併斷裂的連續路段
      · 計算距離與爬升（結合高程資料）
      · 產出候選 JSON
  └─► 產品負責人人工挑選與潤稿（中英文）
  └─► 匯入腳本寫入 Cosmos，status = published，
      source = "osm"，附 © OpenStreetMap contributors 標註
```

腳本存放於 repo 的 `scripts/` 目錄並納入版本控制，使匯入過程可重現、可稽核。

The scripts live in the repo's `scripts/` directory under version control, making the import reproducible and auditable.

---

## 7. 錯誤處理 / Error handling

### 7.1 使用者輸入錯誤 / User input errors

所有面向使用者的錯誤訊息必須具體說明**哪裡有問題以及如何修正**，並提供中英文兩種語言。禁止使用「發生錯誤，請稍後再試」這類無資訊量的訊息。

Every user-facing error message must state **specifically what is wrong and how to fix it**, in both languages. Uninformative messages such as "An error occurred, please try again later" are not acceptable.

| 情況 / Case | 處理 / Handling |
|---|---|
| GPX 檔格式無效 / Invalid GPX | 指出解析失敗的位置，說明支援的格式。<br>Identify where parsing failed and state the supported formats. |
| 座標超出北北基範圍 / Coordinates outside the region | 顯示偵測到的地區，說明 v1 的地理範圍。<br>Show the detected region and explain v1's geographic scope. |
| 檔案過大 / File too large | 顯示實際大小與上限。<br>Show the actual size and the limit. |
| 缺少必填的雙語欄位 / Missing required bilingual field | 標示是哪個語言的哪個欄位。<br>Indicate which field in which language. |

### 7.2 外部服務失敗 / External service failures

| 服務 / Service | 失敗處理 / Handling |
|---|---|
| Cosmos DB 輸送量不足（HTTP 429）/ throughput exceeded | SDK 內建指數退避重試；記錄至 Application Insights。這是免費層最可能遭遇的錯誤，快取策略即為主要防線。<br>The SDK retries with exponential backoff; logged to Application Insights. This is the most likely failure on the free tier, and caching is the primary defence. |
| Cosmos DB 無法連線 / unreachable | 若有快取則提供快取內容並標示資料時間；否則顯示明確的服務中斷頁面。<br>Serve cached content with a staleness notice if available; otherwise show an explicit outage page. |
| Blob 上傳失敗 / upload failure | 中止整筆提交，不寫入資料庫紀錄，清除已上傳的部分檔案。<br>Abort the entire submission, write no database record, and clean up any partially uploaded files. |
| Azure Maps 無回應 / unavailable | 地圖區塊降級為說明訊息，路線的文字與數據資訊照常顯示。地圖失效不應使整個頁面失效。<br>The map area degrades to a notice while the route's text and metrics still render. A map failure must not fail the whole page. |
| Google OAuth 失敗 / failure | 導回登入頁並說明原因，保留使用者原本要前往的頁面。<br>Return to the sign-in page with an explanation, preserving the originally requested destination. |

### 7.3 跨系統資料一致性 / Cross-system data consistency

上傳流程先寫入 Blob 再寫入 Cosmos。Blob 與 Cosmos 是兩個獨立系統，不存在跨系統交易，因此若 Blob 寫入成功而 Cosmos 寫入失敗，將產生無資料庫紀錄指向的孤兒檔案。

The submission flow writes to Blob before writing to Cosmos. Blob and Cosmos are separate systems with no cross-system transaction, so a successful Blob write followed by a failed Cosmos write leaves orphaned files that no database record references.

處理方式為定期清理作業：掃描 `pending/` 容器中建立超過 24 小時且無對應資料庫紀錄的檔案並刪除。這是分散式系統的標準取捨——以最終一致性換取架構簡單，而非引入分散式交易的複雜度。

The remedy is a scheduled cleanup job that scans `pending/` for files older than 24 hours with no matching database record and deletes them. This is the standard distributed-systems trade-off: accept eventual consistency in exchange for architectural simplicity, rather than introducing the complexity of distributed transactions.

**執行方式 / How it runs** — Static Web Apps 無內建排程機制，因此以 GitHub Actions 的排程工作流程每日呼叫一個受保護的 API 路由（以共用密鑰驗證，該密鑰存放於環境變數）。選擇此做法而非新增 Azure Functions，是為了避免為一項每日執行一次的維護作業引入一個新的 Azure 資源與部署目標。

Static Web Apps has no built-in scheduler, so a scheduled GitHub Actions workflow calls a protected API route once daily, authenticated with a shared secret held in an environment variable. This was chosen over adding an Azure Function to avoid introducing a new Azure resource and deployment target for a once-daily maintenance task.

### 7.4 監控 / Monitoring

Application Insights 收集未處理的例外、API 回應時間與失敗率。開啟採樣以維持在每月 5 GB 免費額度內。並設定 Azure 預算警示，於預估月費超過 USD $3 時通知。

Application Insights captures unhandled exceptions, API response times, and failure rates. Sampling is enabled to stay within the 5 GB monthly free grant. An Azure budget alert will notify when projected monthly spend exceeds USD $3.

---

## 8. 安全與隱私 / Security and privacy

- **不儲存密碼 / No passwords stored** — 身分驗證完全委託 Google，本系統從不接觸使用者密碼。<br>Authentication is delegated entirely to Google; this system never handles user passwords.
- **秘密管理 / Secrets management** — 所有連線字串與金鑰存放於 Static Web Apps 的應用程式設定，絕不進入版本控制。repo 內僅提供 `.env.example` 範本。<br>All connection strings and keys live in Static Web Apps application settings and never enter version control. The repo contains only an `.env.example` template.
- **管理員授權 / Administrator authorisation** — 管理員 email 允許清單存放於環境變數。所有 `/admin` 路徑與相關 API 於伺服器端驗證角色，不依賴前端隱藏介面。<br>The admin email allowlist lives in an environment variable. Every `/admin` path and associated API verifies the role server-side; hiding UI on the client is not treated as authorisation.
- **XXE 防護 / XXE protection** — GPX 為 XML 格式。解析器必須停用外部實體與 DTD 處理，這是 XML 解析的經典遠端檔案讀取漏洞。<br>GPX is XML. The parser must disable external entities and DTD processing — the classic XML parsing vulnerability leading to remote file disclosure.
- **EXIF 移除 / EXIF stripping** — 使用者上傳的照片重新編碼為 WebP，過程中移除所有 EXIF 中繼資料。戶外活動照片經常內嵌拍攝地 GPS 座標與裝置識別資訊，公開發布前必須清除。<br>Uploaded photos are re-encoded to WebP, stripping all EXIF metadata. Outdoor photos frequently embed GPS coordinates and device identifiers, which must be removed before publication.
- **上傳限制 / Upload limits** — 限制檔案大小、檔案數量與每位使用者的提交頻率，避免濫用消耗免費額度。<br>Limits on file size, file count, and per-user submission rate prevent abuse from consuming the free grants.
- **地圖憑證保護 / Map credential protection** — 地圖圖磚由瀏覽器直接向 Azure Maps 請求，因此需要一組前端可見的憑證。**不得直接內嵌訂閱金鑰**：金鑰一旦外流即可被他人任意使用，先耗盡每月免費交易額度，隨後產生實際費用。改以 Entra ID 驗證流程——由 Next.js 的 API 路由簽發短效權杖給地圖元件使用，金鑰本身永不離開伺服器。同時設定 Azure Maps 用量警示作為第二道防線。此流程的實作細節於實作階段確認。<br>Map tiles are requested by the browser directly from Azure Maps, which requires a credential visible to the front end. **A subscription key must not be embedded directly**: a leaked key can be used freely by anyone, first exhausting the monthly free transaction grant and then incurring real charges. Instead, use the Entra ID flow — a Next.js API route issues short-lived tokens to the map component, and the key itself never leaves the server. An Azure Maps usage alert provides a second line of defence. Implementation details to be confirmed during implementation.
- **未審核內容隔離 / Isolation of unreviewed content** — 見 5.4。<br>See 5.4.

---

## 9. 測試策略 / Testing strategy

測試投入依「錯了會多痛」分配，不追求覆蓋率數字。

Testing effort is allocated by how much a defect would hurt, not by chasing a coverage percentage.

### 9.1 單元測試 — Vitest / Unit tests

僅測試計算錯誤會造成實質傷害的純函式邏輯：

Only pure-function logic where an error would cause real harm:

- GPX 解析與軌跡點擷取 / GPX parsing and trackpoint extraction
- 距離、累積爬升、移動時間計算（含休息時段排除）/ distance, cumulative elevation gain, and moving-time computation including pause exclusion
- 路線幾何簡化演算法 / route geometry simplification
- 北北基邊界檢查 / regional bounds checking
- 審核狀態轉換規則（哪些轉換合法）/ moderation state transition rules
- 雙語欄位的語言退回邏輯 / bilingual fallback logic

### 9.2 端對端測試 — Playwright / End-to-end tests

僅測試三條關鍵路徑：

Only three critical paths:

1. 訪客能看見已發布路線並開啟詳情頁。<br>A visitor can see published routes and open a detail page.
2. 未登入者無法存取上傳頁面與上傳 API。<br>An unauthenticated user cannot reach the submission page or API.
3. **`pending` 與 `rejected` 狀態的路線不出現於任何公開頁面。**<br>**Routes in `pending` or `rejected` state appear on no public page.**

第三項是安全性測試，優先度最高——它驗證審核機制真的有效。

The third is a security test and the highest priority: it verifies the moderation gate actually holds.

### 9.3 不測試的項目 / What is not tested

不測試 UI 樣式細節。這些在開發期間會持續調整，為其撰寫測試只會製造持續失敗的雜訊，掩蓋真正的問題。視覺正確性由人工於 PR 預覽環境驗收。

UI styling details are not tested. These change continuously during development, and testing them only produces perpetually failing noise that masks real problems. Visual correctness is verified by a human on the PR preview environment.

### 9.4 CI 檢查 / CI checks

每個 PR 自動執行 TypeScript 型別檢查、ESLint、單元測試與正式建置，全數通過方可合併。

Every PR automatically runs TypeScript type checking, ESLint, unit tests, and a production build; all must pass before merge.

### 9.5 人工驗收 / Human acceptance

每個 PR 自動部署至獨立的預覽網址（Static Web Apps Free 方案提供 3 個預覽環境）。產品負責人於實際裝置上操作驗收。自動化測試不能取代這一關。

Every PR deploys to its own preview URL (the Static Web Apps Free plan provides three preview environments). The product owner exercises it on real devices. Automated tests do not replace this step.

---

## 10. 部署與 CI/CD / Deployment and CI/CD

```
feature/* 分支推送 / push
  └─► GitHub Actions
      ├─ 型別檢查、Lint、單元測試、建置 / typecheck, lint, unit tests, build
      └─ 部署至 PR 預覽環境 / deploy to PR preview environment
          └─► 產品負責人於預覽網址驗收 / product owner reviews on preview URL
              └─► 合併至 main / merge to main
                  └─► GitHub Actions 部署至正式環境 / deploy to production
```

Azure 資源以 Bicep 定義並納入版本控制，涵蓋 Static Web App、Cosmos DB 帳戶與資料庫、儲存體帳戶與容器、Azure Maps 帳戶、Application Insights。基礎設施因此可重建、可稽核，且設定變更會經過與程式碼相同的審查流程。

Azure resources are defined in Bicep under version control, covering the Static Web App, the Cosmos DB account and database, the storage account and containers, the Azure Maps account, and Application Insights. Infrastructure is therefore reproducible, auditable, and configuration changes pass through the same review process as code.

---

## 11. 成本 / Cost

$200 額度到期後的每月穩定成本：

Steady-state monthly cost after the $200 credit expires:

| 項目 / Item | 免費性質 / Free status | 月成本 / Monthly |
|---|---|---|
| Static Web Apps — Free 方案 / plan | 永久免費 / Always free | $0.00 |
| Cosmos DB — 免費層 / free tier（1,000 RU/s + 25 GB） | 永久免費 / Always free | $0.00 |
| Blob Storage（約 2 GB Hot LRS / ~2 GB Hot LRS） | 依用量 / Pay-as-you-go | ~$0.05 |
| Azure Maps Gen2（5,000 交易額度內 / within the 5,000-transaction grant） | 永久免費額度 / Always-free grant | $0.00 |
| Application Insights（5 GB 額度內 / within the 5 GB grant） | 永久免費額度 / Always-free grant | $0.00 |
| Google OAuth | 免費 / Free | $0.00 |
| GitHub Actions（公開 repo / public repo） | 免費 / Free | $0.00 |
| **合計 / Total** | | **< $0.10** |

$200 額度自建立起 30 天內到期，將用於試用付費服務（例如評估 Azure Maps 的實際用量特性），不用於支撐長期架構。

The $200 credit expires 30 days after account creation and will be used to trial paid services — for instance, to characterise real Azure Maps usage — not to underpin the long-term architecture.

---

## 12. 風險與緩解 / Risks and mitigations

| # | 風險 / Risk | 緩解 / Mitigation |
|---|---|---|
| 1 | Static Web Apps 對 Next.js 混合渲染的支援仍標示為預覽（preview）階段。<br>Static Web Apps' hybrid Next.js support is still labelled preview. | 若遭遇阻斷性缺陷，改部署至 Azure Container Apps；架構其餘部分（資料庫、儲存、驗證、地圖）完全不受影響，遷移成本限於部署層。<br>If a blocking defect appears, redeploy to Azure Container Apps; the rest of the architecture is unaffected and migration is confined to the deployment layer. |
| 2 | Free 方案超過每月 100 GB 流量時**直接停止服務**，無超額計費機制。<br>The Free plan **stops serving** past 100 GB monthly bandwidth; there is no overage billing. | 圖片壓縮為 WebP 並產生縮圖；設定 Azure 預算與流量警示。以預期流量而言此上限極難觸及，但不得自此託管大量高解析媒體。<br>Compress images to WebP with thumbnails; configure budget and bandwidth alerts. The ceiling is far out of reach at expected traffic, but no bulk high-resolution media may be hosted from it. |
| 3 | Cosmos DB 免費層每個訂閱僅能啟用一次，且**只能於帳戶建立時選擇**，事後無法補加。<br>The Cosmos DB free tier is once per subscription and **can only be selected at account creation**; it cannot be applied retroactively. | 建立帳戶前確認該訂閱尚未使用免費層，並於 Bicep 中明確設定 `enableFreeTier`。不得使用 serverless 模式（與免費層互斥）。<br>Verify the subscription has not consumed it, and set `enableFreeTier` explicitly in Bicep. Serverless mode must not be used, as it is incompatible with the free tier. |
| 4 | Azure Maps Gen1 價格層於 **2026-09-15** 退役。<br>The Azure Maps Gen1 price tier retires on **2026-09-15**. | 帳戶建立時直接指定 Gen2，不經由 Gen1 建立後升級。<br>Create the account as Gen2 directly rather than creating Gen1 and upgrading. |
| 5 | OSM 原始資料品質不一，直接匯入會嚴重拉低內容品質。<br>Raw OSM data quality is uneven; direct import would badly degrade content quality. | 匯入前經程式清洗與人工挑選（見 6.4）。<br>Programmatic cleaning plus manual curation before import (see 6.4). |
| 6 | 雙語內容使每條路線的文案工作量加倍，可能拖慢上線。<br>Bilingual content doubles the copywriting effort per route and may delay launch. | 允許單語路線存在，前台以語言退回機制顯示並標示「尚未翻譯」，不阻斷發布。<br>Single-language routes are permitted; the front end falls back with a "not yet translated" marker rather than blocking publication. |
| 7 | Application Insights 每月 5 GB 免費額度的永久性未經完整查證。<br>The permanence of the Application Insights 5 GB monthly grant is not fully verified. | 實作時查證；預設開啟採樣並設定每日擷取上限，確保即使額度變更也不致產生非預期費用。<br>Verify at implementation; enable sampling and a daily ingestion cap by default so that any change to the grant cannot produce unexpected charges. |

---

## 13. 範圍外 / Out of scope

以下項目明確不在 v1 範圍內，列出以避免範圍潛移：

Explicitly excluded from v1, listed here to prevent scope creep:

- 北北基以外的地理範圍 / Coverage beyond Taipei, New Taipei, and Keelung
- 進階搜尋與篩選 / Advanced search and filtering
- 留言、評分、按讚 / Comments, ratings, likes
- 收藏與「我的路線」清單 / Saving routes and personal collections
- 原生行動應用程式（v1 為響應式網頁）/ Native mobile apps (v1 is responsive web)
- 完整管理後台：使用者管理、數據儀表板、批次操作 / A full admin console with user management, analytics dashboards, and bulk operations
- 依體能程度分級的預估時間（資料模型已預留擴充空間）/ Fitness-level-specific duration estimates (the data model reserves room for these)

---

## 14. 後續決定 / Deferred decisions

以下項目不阻礙實作開始，但需在上線前決定：

These do not block the start of implementation but must be settled before launch:

- **自訂網域 / Custom domain** — 是否購買網域。Static Web Apps Free 方案支援 2 個自訂網域並提供免費且自動更新的 SSL 憑證。<br>Whether to purchase a domain. The Free plan supports two custom domains with free auto-renewing SSL.
- **視覺設計方向 / Visual design direction** — 品牌調性、配色、字體與版面。另案處理，屆時以參考網站、截圖或 Figma 稿為輸入。<br>Brand tone, palette, typography, and layout. Handled separately, driven by reference sites, screenshots, or Figma files.
- **難度分級表的最終定義 / Final difficulty scale definitions** — 附錄 A 為初稿，需由產品負責人依實際經驗校準。<br>Appendix A is a first draft requiring calibration by the product owner against real experience.

---

## 附錄 A：難度分級表（初稿）/ Appendix A: Difficulty scale (draft)

此表為初稿，待產品負責人依北北基實際路線經驗校準。單車與健行的體感難度標準不同，因此分開定義。此表為前台顯示的內容文案，非資料庫結構，日後修改不影響既有資料。

This is a draft pending calibration by the product owner against real experience of the region's routes. Cycling and hiking difficulty are perceived differently and are therefore defined separately. This table is front-end content copy, not a database structure; revising it does not affect existing data.

### 健行 / Hiking

| 級 / Level | 定義 / Definition | 參考 / Reference |
|---|---|---|
| 1 | 鋪面完整的親山步道（石階或木棧道），單程 2 公里內，爬升 100 公尺內。適合全家。<br>Fully paved trail (stone steps or boardwalk), under 2 km one way, under 100 m gain. Family-friendly. | 象山親山步道 / Elephant Mountain |
| 2 | 路徑明確，3–6 公里，爬升 100–350 公尺。需基本體力，運動鞋可行。<br>Clear path, 3–6 km, 100–350 m gain. Basic fitness; trainers sufficient. | — |
| 3 | 含連續上坡或碎石路段，6–12 公里，爬升 350–700 公尺。建議登山鞋。<br>Sustained climbs or loose surfaces, 6–12 km, 350–700 m gain. Hiking shoes recommended. | — |
| 4 | 部分路段需拉繩、渡溪或路跡不明，12–18 公里，爬升 700–1,200 公尺。需經驗與裝備。<br>Sections requiring ropes, stream crossings, or route-finding; 12–18 km, 700–1,200 m gain. Experience and equipment required. | — |
| 5 | 長程或地形困難，18 公里以上或爬升 1,200 公尺以上。需完整規劃與補給。<br>Long-distance or technically demanding; over 18 km or over 1,200 m gain. Full planning and provisioning required. | — |

### 單車 / Cycling

| 級 / Level | 定義 / Definition | 參考 / Reference |
|---|---|---|
| 1 | 河濱等自行車專用道，平坦，30 公里內，無需與汽車共道。<br>Dedicated cycleway such as riverside paths; flat, under 30 km, no shared traffic. | 淡水河右岸 / Tamsui riverside |
| 2 | 平路與市區道路混合，30–60 公里，累積爬升 300 公尺內。<br>Mixed flat and urban roads, 30–60 km, under 300 m cumulative gain. | — |
| 3 | 含丘陵路段，60–100 公里，累積爬升 300–1,000 公尺。<br>Rolling terrain, 60–100 km, 300–1,000 m cumulative gain. | 北海岸 / North coast |
| 4 | 長爬坡，100 公里以上或單段爬升 800 公尺以上。<br>Extended climbs; over 100 km, or a single climb over 800 m. | 巴拉卡公路 / Balaka Highway |
| 5 | 高強度長程，多段連續爬坡，需規劃補給點。<br>High-intensity long distance with multiple sustained climbs; resupply planning required. | — |
