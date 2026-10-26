# 花果山数学小课堂

初中代数辅导的可点击 MVP。默认学员是初二、分数段中等的「小徒弟」，师父是孙悟空。没有 OCR 钥匙、也没有大模型钥匙，六屏都能走完。

## 怎么跑

```bash
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

常用命令：

```bash
npm test    # 教学引擎：难度、提示不泄答案、听不懂、批改
npm run lint
```

数据在 `data/tutor.db`（SQLite，better-sqlite3）。第一次打开页面时自动建表，并写入 9 道初中代数题。删掉这个文件再刷新，学情和练习会回到种子状态。

## 六屏

1. **课堂**：孙悟空打招呼、今日小目标。可以拍照做题、继续上次、系统出题。
2. **确认题目**：示意照片 + 可改的识别文字。「对」进入作答，「改」改正文字。
3. **作答**：题目钉在上面。文字作答，手写区只是草稿。`我想提示` 给脚手架，不给最终答案。
4. **批改**：对或错，标出可疑的一行，错因是概念 / 运算 / 审题 / 跳步。
5. **追问**：聊天。气泡上的「教学动作」和孙悟空的说法是分开的。
6. **档案**：三句学习记录，可另看给家长的说法。

学情页可以改年级、分数段和上次卡住的点。

确认题目页可以「填入一道超当前目标的题」：放进一道当前难度吃不下的方程，并提议换同主题、更容易的一题。

## 环境变量

复制 `.env.example` 为 `.env.local`。全部可以留空。

| 变量 | 作用 |
| --- | --- |
| `OPENAI_API_KEY` | 有钥匙时，只改写孙悟空的口气。教学动作仍由本地引擎决定。模型若新增式子，结果会被丢掉，退回模板。 |
| `OPENAI_MODEL` | 默认 `gpt-4o-mini`。 |
| `OPENAI_BASE_URL` | 默认 `https://api.openai.com/v1`，可换成兼容接口。 |
| `OCR_API_URL` | 有地址时，`POST` JSON 并读取返回的 `text`。失败则退回识别桩。 |
| `OCR_API_KEY` | 可选，放在 `Authorization: Bearer`。 |
| `DATABASE_PATH` | SQLite 路径，默认 `data/tutor.db`。 |

## 架构

```text
页面（中文）
  → app/api 路由
    → session-service
      → teaching/engine.ts     决定下一步教什么
      → teaching/persona.ts    只把这句话说成孙悟空
      → providers/llm.ts       可选，只改写口气
      → providers/ocr.ts       可选，只返回文字
      → teaching/grader.ts     对错、可疑步骤、错因
      → db.ts                   better-sqlite3
```

教学动作分四层，按次数往前走，不会一次把解答说完：

1. 复述题意
2. 追问下一步
3. 半提示
4. 演示一步，然后把笔还给学生

再要提示，就演示下一个还没说的步骤，最后一步（最终答案）始终不说。

「听不懂」只把 `languageComplexity` 改成 `simple`：句子更短、少用术语。难度 A/B/C 不变，也不会因此多给一层提示。

难度由年级和分数段决定：

| 年级 | 偏低 | 中等 | 较好 |
| --- | --- | --- | --- |
| 初一 | A | A | B |
| 初二 | A | B | B |
| 初三 | B | B | C |

题目年级更高，或难度高于这个目标，就说「超当前目标」，并给出同主题、仍在目标内的一题。

## 种子题

题库在 `src/lib/teaching/catalog.ts`，启动时写入 SQLite。答案和步骤只留在服务器，页面拿到的题目没有标准答案。

- 一元一次方程：移项、去括号、两边都有未知数、去分母
- 列方程
- 整式化简
- 二元一次方程组

默认拍照示例是 `5x - 3 = 2x + 9`。系统出题会避开这一道，优先练「移项不变号」。

## 接上真实能力

- OCR：在 `src/lib/providers/ocr.ts` 的 `recognizeRemote`。返回 `{ text }` 即可，后面仍走 `classifyPhotoText`。
- 大模型：在 `src/lib/providers/llm.ts`。它拿到的是 `speak()` 之后的草稿，系统提示禁止新增步骤。`acceptsRephrase` 会丢掉多出来的式子。
- 新题目：往 `PROBLEMS` 加一项，把 `SEED_VERSION` 加一。`steps` 的最后一项必须是最终答案，提示引擎不会读它。

本地批改看文字，不看手写画布。手写区是占位，方便以后换真正的笔迹识别。
