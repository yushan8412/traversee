# M0 — 建立 Azure 資源並完成部署驗證 / Creating the Azure resources and finishing the deployment check

> **狀態 / Status**: 已執行完成，2026-08-28 / Run to completion, 2026-08-28
> **前置 / Prerequisite**: 一個 Azure 訂閱 / an Azure subscription
> **預計時間 / Time**: 約 15 分鐘 / roughly 15 minutes

這份文件是 M0 需要人工執行的那一半。只有 `az login` 真的需要人——它走互動式瀏覽器驗證，無法自動化；其餘每一步都可以照抄執行。

This runbook covers the half of M0 that a human has to run. Only `az login` genuinely needs a person — it uses interactive browser authentication and cannot be automated; every other step can be run as written.

## 實測結果 / What actually happened

2026-08-28 對真實訂閱執行的結果，逐項記錄，因為 M0 的價值就在這些答案：

Recorded from the 2026-08-28 run against a real subscription, because these answers are the entire point of M0:

- **Static Web Apps 確實會伺服器端算繪 hybrid Next.js。** 風險 1 沒有成真，備案（Container Apps）不需要動用。<br>**Static Web Apps really does server-render hybrid Next.js.** Risk 1 did not materialise; the Container Apps fallback was not needed.
- **執行環境是 Node v22.23.1，region eastasia。** 微軟文件寫的 18.17.1 與現實不符，以實測為準。<br>**The runtime is Node v22.23.1 in eastasia.** Microsoft's documented 18.17.1 does not match reality; trust the measurement.
- **Cosmos DB 免費層在此訂閱尚未被使用**，M1 的資料層可以照計畫進行。<br>**The Cosmos DB free tier is unused on this subscription**, so M1's data layer can proceed as planned.
- **全新訂閱的 `Microsoft.Web` provider 預設未註冊**，未先註冊會讓步驟 3 直接失敗。已補進步驟 1。<br>**On a fresh subscription the `Microsoft.Web` provider is unregistered**, which makes step 3 fail outright. Now covered in step 1.

---

## 1. 安裝 Azure CLI 並登入 / Install the Azure CLI and sign in

```bash
brew install azure-cli
az login
```

`az login` 會開啟瀏覽器。登入後確認選到正確的訂閱：

`az login` opens a browser. Afterwards, confirm the right subscription is selected:

```bash
az account show --output table
```

若有多個訂閱 / If you have more than one:

```bash
az account list --output table
az account set --subscription "<訂閱名稱或 ID / subscription name or id>"
```

註冊 `Microsoft.Web` provider。全新訂閱預設不會註冊它，而 Static Web Apps 屬於這個 provider，漏掉這一步時步驟 3 會失敗。註冊需要一到兩分鐘，每個訂閱只需做一次：

Register the `Microsoft.Web` provider. A fresh subscription does not have it registered, Static Web Apps lives under it, and skipping this makes step 3 fail. It takes a minute or two and is needed only once per subscription:

```bash
az provider register -n Microsoft.Web --wait
az provider show -n Microsoft.Web --query registrationState -o tsv   # 應為 Registered / expect Registered
```

---

## 2. 確認 Cosmos DB 免費層尚未被使用 / Check the Cosmos DB free tier is still available

**M0 不會建立 Cosmos DB**，但請現在就確認，因為這個結果會決定 M1 能不能照計畫走。免費層每個訂閱只能用一次，且只能在建立帳戶當下選擇，事後無法補加。

**M0 does not create Cosmos DB**, but check now, because the answer determines whether M1 can proceed as planned. The free tier is once per subscription and can only be chosen at account creation — it cannot be applied retroactively.

```bash
az cosmosdb list --query "[?enableFreeTier].{name:name, group:resourceGroup}" --output table
```

輸出為空 = 尚未使用，M1 可以照計畫進行。若有結果，代表該訂閱的免費層已被某個既有帳戶佔用，請告知，M1 的資料層需要重新評估。

Empty output means it is unused and M1 can proceed. Any result means an existing account has already consumed it — flag this, and M1's data layer needs rethinking.

---

## 3. 部署基礎設施 / Deploy the infrastructure

```bash
az deployment sub create \
  --name traversee-m0 \
  --location eastasia \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam
```

這會建立資源群組 `rg-traversee` 與一個 Free 方案的 Static Web App。以 Bicep CLI 0.46.1 編譯，並已於 2026-08-28 對真實訂閱部署成功。

This creates the resource group `rg-traversee` and a Free-plan Static Web App. It compiles under Bicep CLI 0.46.1 and deployed successfully against a real subscription on 2026-08-28.

取得網址 / Get the URL:

```bash
az deployment sub show --name traversee-m0 --query properties.outputs.siteUrl.value -o tsv
```

---

## 4. 把部署權杖存進 GitHub / Store the deployment token in GitHub

```bash
az staticwebapp secrets list \
  --name traversee \
  --resource-group rg-traversee \
  --query "properties.apiKey" -o tsv \
  | tr -d '\n' \
  | gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN
```

這個權杖等同於部署權限，**絕對不要貼進 commit、issue 或 PR**。用管線傳遞是刻意的：`gh secret set --body "$TOKEN"` 會把權杖放進命令參數，而參數在同一台機器上是所有使用者都能從行程列表讀到的。

This token is equivalent to deploy permission. **Never paste it into a commit, issue, or pull request.** Piping it is deliberate: `gh secret set --body "$TOKEN"` puts the token in a command argument, and arguments are readable from the process list by any user on the machine.

設定完成後，`Deploy` workflow 的 guard job 會自動偵測到權杖存在並開始實際部署；在此之前它會顯示 skipped 而非失敗。

Once set, the `Deploy` workflow's guard job detects the token and starts deploying for real; before that it reports skipped rather than failing.

---

## 5. 驗收 / Acceptance

權杖是在 workflow 執行當下才讀取的，所以重跑一次既有的執行就會生效，不必為了觸發部署而製造一個空 commit。`deploy.yml` 沒有 `workflow_dispatch`，因此無法從 GitHub 網頁手動執行：

The token is read at run time, so re-running an existing run picks it up — no empty commit is needed just to trigger a deployment. `deploy.yml` has no `workflow_dispatch`, so it cannot be started by hand from the GitHub web UI:

```bash
gh run list --workflow=deploy.yml --limit 5
gh run rerun <run-id>
```

然後確認 / Then confirm:

- [x] `Deploy` workflow 綠燈，且 **Verify server-side rendering** 這一步通過。<br>The `Deploy` workflow is green and its **Verify server-side rendering** step passes.
- [x] 開啟網址，重新整理數次，頁面上的 `Rendered at` 每次都不同。<br>Open the site, reload a few times, and `Rendered at` changes every time.
- [x] 記下頁面顯示的 `Node` 版本與 `Region`。實測為 **Node v22.23.1 / eastasia**，與微軟文件寫的 18.17.1 不符——以實測為準。<br>Note the `Node` version and `Region` shown. Measured **Node v22.23.1 / eastasia**, which contradicts Microsoft's documented 18.17.1 — trust the measurement.
- [x] 確認 PR 會產生預覽網址。這個 PR 自己就是證明，預覽環境 `3` 已 Ready 並通過 SSR 驗證。<br>Confirm a pull request gets a preview URL. This pull request is itself the proof: preview environment `3` came up Ready and passed the SSR check.
- [x] 確認關閉 PR 後預覽環境被回收。PR #3 合併後 `close-preview` 執行成功，預覽環境 `3` 消失，只剩 `default`。<br>Confirm closing a pull request reclaims the environment. After PR #3 merged, `close-preview` ran successfully and preview environment `3` disappeared, leaving only `default`.

也可以在本機直接驗收 / You can also run the check locally against the live site:

```bash
node scripts/verify-ssr.mjs https://<你的網址 / your-url>
```

---

## 若部署失敗 / If the deployment fails

**這是 M0 存在的理由，不是意外。** 架構規格的風險 1 已預先記錄此可能性：Static Web Apps 對 Next.js hybrid 的支援仍在 preview，備案是改部署至 Azure Container Apps，且資料庫、儲存、驗證、地圖等其餘部分完全不受影響。

**This is why M0 exists; it is not a surprise.** Risk 1 in the architecture spec anticipates it: hybrid Next.js on Static Web Apps is in preview, the fallback is Azure Container Apps, and the rest of the architecture — database, storage, auth, maps — is unaffected either way.

已知的失敗模式 / Known failure modes:

| 症狀 / Symptom | 原因與處置 / Cause and response |
|---|---|
| 部署約 33 秒後出現 `Failed to deploy the Azure Functions` | Static Web Apps 端的已知間歇性問題，多個 GitHub issue 仍開啟中。先重跑一次；若持續失敗，即為風險 1 成立。<br>A known intermittent fault on the Static Web Apps side with several open GitHub issues. Re-run once; if it persists, risk 1 has materialised. |
| 網站可開啟，但 `Rendered at` 不會變 | 被當成靜態網站部署了。檢查 workflow 的 `output_location` 是否仍為空字串，且未設定 `IS_STATIC_EXPORT`。<br>It was deployed as a static site. Check that `output_location` is still an empty string and that `IS_STATIC_EXPORT` is not set. |
| 所有路由回傳 500 | 部署時 `npm install` 解析到與鎖定檔不同的版本。`package.json` 已全部鎖定精確版本正是為了防這件事——確認沒有人把 `^` 加回去。<br>Deploy-time `npm install` resolved different versions than the lockfile. Every version in `package.json` is pinned exactly to prevent this — check nobody reintroduced a `^`. |
