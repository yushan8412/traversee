# M0 — 建立 Azure 資源並完成部署驗證 / Creating the Azure resources and finishing the deployment check

> **狀態 / Status**: 待執行 / Not yet run
> **前置 / Prerequisite**: 一個 Azure 訂閱 / an Azure subscription
> **預計時間 / Time**: 約 15 分鐘 / roughly 15 minutes

這份文件是 M0 需要人工執行的那一半。程式碼、基礎設施定義與驗收腳本都已完成並在本機驗證過；缺的是一個真實的 Azure 訂閱，而登入需要互動式瀏覽器驗證，無法自動化。

This runbook covers the half of M0 that a human has to run. The application, the infrastructure definition, and the acceptance script are written and verified locally; what is missing is a real Azure subscription, and signing in requires interactive browser authentication that cannot be automated.

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

這會建立資源群組 `rg-traversee` 與一個 Free 方案的 Static Web App。Bicep 已在本機以 Bicep CLI 0.46.1 編譯驗證過，但**尚未對真實訂閱部署過** — 這一步就是驗證。

This creates the resource group `rg-traversee` and a Free-plan Static Web App. The Bicep compiles cleanly under Bicep CLI 0.46.1, but **has never been deployed against a real subscription** — this step is that test.

取得網址 / Get the URL:

```bash
az deployment sub show --name traversee-m0 --query properties.outputs.siteUrl.value -o tsv
```

---

## 4. 把部署權杖存進 GitHub / Store the deployment token in GitHub

```bash
TOKEN=$(az staticwebapp secrets list \
  --name traversee \
  --query "properties.apiKey" -o tsv)

gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body "$TOKEN"
```

這個權杖等同於部署權限，**絕對不要貼進 commit、issue 或 PR**。上面的寫法讓它只存在於環境變數中，不會進入 shell history 的參數列。

This token is equivalent to deploy permission. **Never paste it into a commit, issue, or pull request.** The form above keeps it in an environment variable rather than in a command argument that lands in shell history.

設定完成後，`Deploy` workflow 的 guard job 會自動偵測到權杖存在並開始實際部署；在此之前它會顯示 skipped 而非失敗。

Once set, the `Deploy` workflow's guard job detects the token and starts deploying for real; before that it reports skipped rather than failing.

---

## 5. 驗收 / Acceptance

重新觸發部署（推一個 commit，或手動執行 workflow），然後確認：

Re-trigger the deployment (push a commit, or run the workflow manually), then confirm:

- [ ] `Deploy` workflow 綠燈，且 **Verify server-side rendering** 這一步通過。<br>The `Deploy` workflow is green and its **Verify server-side rendering** step passes.
- [ ] 開啟網址，重新整理數次，頁面上的 `Rendered at` 每次都不同。<br>Open the site, reload a few times, and `Rendered at` changes every time.
- [ ] 記下頁面顯示的 `Node` 版本與 `Region`。微軟文件說 hybrid runtime 用 Node 18.17.1，但實際建置紀錄顯示 22 — 這一欄會告訴我們真相。<br>Note the `Node` version and `Region` shown. Microsoft's docs say the hybrid runtime uses Node 18.17.1 while real build logs show 22; this field settles it.
- [ ] 開一個測試 PR，確認會產生預覽網址，且關閉 PR 後預覽環境被回收。<br>Open a throwaway PR, confirm a preview URL appears, and that closing the PR reclaims the environment.

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
