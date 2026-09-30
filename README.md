# 粵拼轉換器 Jyutping Converter

漢字 → 廣東話拼音嘅網頁工具。輸入繁體或簡體漢字，即時標注粵語讀音，支援 11 種拼音方案。
所有轉換都喺瀏覽器入面完成，唔會上傳任何文字。

A browser-based Chinese-to-Cantonese romanisation converter, rebuilt from the
[Hong Kong Vision converter](https://hongkongvision.com/tool/cc_py_conv_zh) with
modern web tooling. Everything runs client-side; no text leaves the device.

## 功能 Features

- **11 種拼音方案** — 粵拼（LSHK）、耶魯（數字／調符）、國際音標、教育學院拼音方案、
  廣州話拼音方案、劉錫祥、黃錫凌羅馬拼音（數字／調符）、粵語拼音字 Penkyamp（數字／調符）
- **詞語分詞** — 用詞語字典判斷多音字，例如「要求」讀 `jiu1 kau4` 而唔係 `jiu3`
- **多音字選字** — 撳一下任何漢字就可以喺所有候選讀音入面揀
- **三種排版** — 拼音標喺漢字上方（HTML `<ruby>`）、跟喺漢字後面、只顯示拼音
- **譯做粵語** — 將普通話或者其他語言改寫成地道書面粵文，譯完即刻標注粵拼
- **粵語朗讀** — 用瀏覽器 Web Speech API（需要系統裝咗粵語語音）
- **雙語介面** — 繁體中文 / English，深色淺色主題

## 開發 Development

```bash
npm install
cp .env.example .env.local   # 填入 DEEPSEEK_API_KEY
npm run dev
```

`DEEPSEEK_API_KEY` 淨係俾 `/api/translate` 用。**冇設定嘅話個站照跑**，粵拼注音完全唔需要 key；
只係「譯做粵語」會回 `503 translate_unconfigured`。部署平台記得都要設定同一個變數。

| 指令 | 作用 |
| --- | --- |
| `npm run dev` | 開發伺服器（http://localhost:3000） |
| `npm run build` | 靜態輸出到 `out/`，可直接放上任何靜態主機 |
| `npm run typecheck` | TypeScript 檢查 |
| `npm run lint` | ESLint（`eslint-config-next`，包括 React Hooks 規則） |
| `npm run data` | 重新產生 `public/data/pingyam.json` |
| `npm run icons` | 由 `assets/icon.svg` 重新產生 favicon（需要 `brew install librsvg imagemagick`） |

Build 出嚟係純靜態檔案（`output: 'export'`），可以放上 Cloudflare Pages、
GitHub Pages、Vercel 或者任何 CDN。

## 架構 Architecture

```
src/lib/schemes.ts          拼音方案清單同 pingyam 對照表嘅欄位索引
src/lib/pingyam.ts          音節層轉換：粵拼音節 → 其他方案（按需載入）
src/lib/convert.ts          分詞、自訂字典、手動選字、逐字產生讀音
src/lib/format.ts           輸出排版：括號、空格、全形轉半形、純文字複製
src/lib/userDict.ts         自訂字典解析同錯誤報告
src/lib/cantonesePrompt.ts  粵文改寫嘅 system prompt、模型同參數
src/lib/translate.ts        客戶端串流讀取
src/app/api/translate/      服務端路由：轉發去 DeepSeek，SSE 拆成純文字串流
```

### 譯做粵語

| | |
| --- | --- |
| 模型 | `deepseek-v4-pro`（`cantonesePrompt.ts` 一行改得） |
| temperature | 1.3（DeepSeek 官方對翻譯場景嘅建議值） |
| thinking | 關閉 —— 改寫用唔着推理，慳延遲同 token |
| 字數上限 | 2000（注音上限係 5000，因為注音唔使錢） |
| 成本 | 約 ¥0.005 / 次；system prompt 命中 DeepSeek 自動前綴快取後更平 |

質量嘅關鍵唔喺詞表，而喺 `cantonesePrompt.ts` 入面嘅語法規則 —— 完成體「咗」、進行體「緊」、
雙賓語語序（畀本書我）、比較用「過」、副詞後置（食多啲／行先）、句末助詞。呢啲係查表永遠做唔到嘅。

伺服端串流會將 DeepSeek 嘅 OpenAI 式 SSE 拆成純 UTF-8 文字流，所以瀏覽器嗰邊唔使解 SSE，
收到幾多就直接寫入輸入框 —— 順帶令下面嘅粵拼標注跟住一齊即時重繪。

> ⚠️ **路由未有正式限流。** 現時只有一個 in-memory 滑動窗口（每 IP 5 分鐘 20 次），
> serverless 每個實例記憶體獨立，所以只擋得住單一熱實例。公開之前應該喺前面加
> Vercel Firewall rate limit 或者 Redis-backed limiter。

### 已實作但未喺介面開放

以下兩項功能邏輯完整、有測試過，但暫時冇喺 UI 出現：

- **括號設定** — `FormatOptions.brackets` 仍然生效（預設 `［］`），只係冇咗選擇器。
  預設值喺 `src/lib/format.ts` 嘅 `DEFAULT_FORMAT`。
- **自訂字典** — `src/lib/userDict.ts` 同 `applyUserDict()` 完整保留，但
  `Converter.tsx` 而家傳 `userDict: []`。要恢復就喺 `SettingsPanel` 加返個編輯區，
  再將 parse 完嘅條目傳入 `tokenize()`。

轉換分兩層：`to-jyutping` 負責「漢字 → 粵拼」，pingyam 對照表負責
「粵拼音節 → 其他方案」。因為所有方案都經同一條粵拼中介路徑，多音字選字
喺任何方案下面都一致。

兩份數據都係按需載入：`to-jyutping`（約 1.2 MB）喺首次轉換時先至載入，
pingyam 對照表（約 390 KB）淨係喺揀咗非粵拼方案先至載入。

## 數據來源 Data sources

| 數據 | 來源 | 授權 |
| --- | --- | --- |
| 漢字讀音 | [CanCLID/ToJyutping](https://github.com/CanCLID/ToJyutping)（基於[粵典 words.hk](https://words.hk/)） | 見上游 |
| 拼音方案對照表 | [kfcd/pingyam](https://github.com/kfcd/pingyam)（開放詞典） | CC BY 3.0 |

## 已知限制 Known limitations

- 原站提供嘅「賴式」同「千島式」兩套日本學界方案，pingyam 對照表冇收錄，本站未有提供。
- pingyam 對照表覆蓋 `to-jyutping` 會輸出嘅音節約 97%；極少數罕見音節（例如 `hik1`、
  `teot1`）冇對應寫法，會維持粵拼顯示，介面亦會提示。
- 朗讀依賴使用者系統裝咗嘅粵語語音；冇嘅話會用其他口音代替，介面會提示。
