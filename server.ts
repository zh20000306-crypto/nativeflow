import { GoogleGenAI, Type } from "@google/genai";
import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
if (!apiKey) {
  console.warn("⚠️ Warning: GEMINI_API_KEY is not set in environment variables! AI features will fail until GEMINI_API_KEY is configured.");
}

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// In-memory caches for ultra-fast repeated responses
const analysisCache = new Map<string, any>();
const evaluationCache = new Map<string, any>();
const sentenceWordsCache = new Map<string, any>();
const wordLookupCache = new Map<string, any>();
const ttsCache = new Map<string, string>();

// Candidate models prioritizing currently available & low-latency models
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite", // Consistently fast (sub-2s) & healthy
  "gemini-3.8-flash",      // Backup
  "gemini-flash-latest",   // Fallback
];

// Helper with generous timeout (18s) to prevent artificial aborts
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMsg)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function generateContentWithRetryAndFallback(params: {
  contents: any;
  config?: any;
}) {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        }),
        18000,
        `Model ${model} timed out after 18s`
      );
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`Model ${model} failed: ${errMsg}. Trying next candidate model...`);
    }
  }

  throw lastError;
}

function parseErrorMessage(error: any): string {
  if (!error) return "AI 批改服务暂时繁忙，请稍后重试";
  let msg = error.message || String(error);
  if (
    msg.includes("unregistered callers") ||
    msg.includes("API Key or other form of API consumer identity") ||
    msg.includes("without established identity") ||
    !apiKey
  ) {
    return "部署环境缺少 GEMINI_API_KEY。请在 Render 的 Environment 环境变量中添加 GEMINI_API_KEY（值填入你的 Gemini Key）后重新部署。";
  }
  if (msg.includes("Quota exceeded") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
    return "AI 请求频次稍快，请稍等数秒后点击立即重试";
  }
  if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand") || msg.includes("overloaded")) {
    return "AI 节点当前访问量较大，请点击立即重试";
  }
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.error?.message) {
      const pMsg = parsed.error.message;
      if (pMsg.includes("Quota exceeded") || pMsg.includes("RESOURCE_EXHAUSTED") || pMsg.includes("429")) {
        return "AI 请求频次稍快，请稍等数秒后点击立即重试";
      }
      return pMsg;
    }
  } catch {
    // not JSON
  }
  return msg;
}

// Endpoint: Analyze an English expression or word
app.post("/api/analyze-expression", async (req: Request, res: Response) => {
  try {
    const { expression, contextHint } = req.body;
    if (!expression || typeof expression !== "string") {
      return res.status(400).json({ error: "Missing or invalid expression" });
    }

    const cacheKey = `v8_pure_life_${expression.toLowerCase().trim()}_${(contextHint || "").toLowerCase().trim()}`;
    if (analysisCache.has(cacheKey)) {
      const cached = analysisCache.get(cacheKey);
      if (
        cached &&
        Array.isArray(cached.examples) &&
        cached.examples.length >= 2 &&
        cached.examples[0]?.en &&
        Array.isArray(cached.collocations) &&
        cached.collocations.length > 0 &&
        cached.collocations[0]?.phrase
      ) {
        return res.json(cached);
      }
    }

    const prompt = `Analyze this English expression: "${expression}".
${contextHint ? `Context hint: ${contextHint}` : ""}

Act as an expert bilingual lexicographer (like the '不背单词' & Oxford/Collins editorial team).
Return comprehensive, high-impact native analysis in strictly structured JSON:
- expression: cleaned, canonical form
- phoneticUs: US IPA (e.g. /ˌkɔːl ɪt ə ˈdeɪ/)
- phoneticUk: UK IPA
- partOfSpeech: concise category (e.g. "口语习语", "短语动词", "形容词短语")
- chineseMeaning: accurate, concise Chinese translation (under 15 Chinese characters)
- englishDefinition: 1 clear, simple Oxford/Collins learner's English definition
- register: category tag, strictly either "日常生活" or "职场" (default to "日常生活" unless the expression is strictly corporate jargon)
- tags: array with either ["日常生活"] or ["职场"]
- level: CEFR (e.g. "A2", "B1", "B2", "C1", "C2")
- nuance: 2-3 sentence Chinese explanation of WHEN and WHY native speakers use this expression in everyday life, tone, emotion, and subtle differences
- collocations: 2-3 high-frequency everyday collocations, each MUST be an object with keys "phrase" and "translation", e.g. [{"phrase": "...", "translation": "..."}]
- examples: Provide 3 vivid, natural EVERYDAY LIFE scenarios where native speakers actually say "${expression}" in daily life (e.g. hanging out with friends, weekend trips, dining/coffee, shopping, family/home life, pets, weather, or fitness). STRICT RULE: DO NOT generate corporate, coding, meeting, finance, or office examples unless the user's Context hint explicitly requests workplace. Each scenario MUST be an object with:
  * "scene": specific daily-life scene tag in format "[生活场景 / 具体情境]" (e.g. "[朋友聚会 / 周末约饭]", "[居家生活 / 晚间放松]", "[出门旅行 / 突发状况]")
  * "scenarioDescription": 1 concise sentence in Chinese explaining when/why native speakers use it in this everyday life situation (e.g. "周末在家大扫除或逛街走累了，轻松提议今天就先到这儿去休息时")
  * "en": an authentic, natural, spoken/conversational English sentence demonstrating natural usage in that exact everyday life scenario
  * "zh": accurate, natural Chinese translation
- memoryHook: 1 memorable mnemonic hook or visual origin`;

    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    // Normalize collocations
    parsed.collocations = (Array.isArray(parsed.collocations) ? parsed.collocations : []).map((item: any) => {
      if (typeof item === 'string') {
        const parenMatch = item.match(/^(.*?)\s*[\(（](.*?)[\)）]\s*$/);
        if (parenMatch) {
          return { phrase: parenMatch[1].trim(), translation: parenMatch[2].trim() };
        }
        const dashMatch = item.split(/\s*[-–—:]\s*/);
        if (dashMatch.length > 1) {
          return { phrase: dashMatch[0].trim(), translation: dashMatch.slice(1).join(' ').trim() };
        }
        return { phrase: item.trim(), translation: '' };
      }
      return {
        phrase: item?.phrase || item?.collocation || item?.en || '',
        translation: item?.translation || item?.chinese || item?.zh || item?.meaning || '',
        note: item?.note || '',
      };
    }).filter((c: any) => c.phrase);

    if (parsed.collocations.length === 0) {
      parsed.collocations = [
        { phrase: `use "${expression}" naturally`, translation: '自然地运用该表达' },
        { phrase: `master "${expression}"`, translation: '熟练掌握该用法' },
      ];
    }

    // Normalize examples with 2-3 most typical application scenarios
    parsed.examples = (Array.isArray(parsed.examples) ? parsed.examples : []).map((eg: any) => {
      if (typeof eg === 'string') {
        const parenMatch = eg.match(/^(.*?)\s*[\(（](.*?)[\)）]\s*$/);
        if (parenMatch) {
          return { en: parenMatch[1].trim(), zh: parenMatch[2].trim(), scene: '真实语境', scenarioDescription: '' };
        }
        return { en: eg.trim(), zh: '', scene: '真实语境', scenarioDescription: '' };
      }
      return {
        en: eg?.en || eg?.sentence || eg?.english || eg?.example || '',
        zh: eg?.zh || eg?.chinese || eg?.translation || eg?.meaning || '',
        scene: eg?.scene || eg?.category || eg?.tag || '真实语境',
        scenarioDescription: eg?.scenarioDescription || eg?.description || eg?.context || '',
      };
    }).filter((e: any) => e.en).slice(0, 3);

    if (parsed.examples.length === 0) {
      parsed.examples = [
        {
          scene: '[日常社交 / 随性闲聊]',
          scenarioDescription: '在非正式随性交流中自然运用',
          en: `Native speakers often say "${expression}" in casual conversations.`,
          zh: `母语者常在日常随性对话中使用 "${expression}"。`,
        },
      ];
    }

    // Ensure register is strictly '职场' or '日常生活'
    const regStr = String(parsed.register || '').toLowerCase();
    if (regStr.includes('职场') || regStr.includes('工作') || regStr.includes('商务') || regStr.includes('办公') || regStr.includes('面试')) {
      parsed.register = '职场';
      parsed.tags = ['职场'];
    } else {
      parsed.register = '日常生活';
      parsed.tags = ['日常生活'];
    }

    // Ensure nuance exists
    if (!parsed.nuance || typeof parsed.nuance !== 'string') {
      parsed.nuance = `该表达常用于母语者日常高频对话中，相比字面直译更加生动纯正，能够准确传递特定的语气与情感色彩。`;
    }

    analysisCache.set(cacheKey, parsed);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error analyzing expression:", error);
    const friendlyError = parseErrorMessage(error);
    return res.status(503).json({ error: friendlyError });
  }
});

// Endpoint: Generate dynamic extra scenarios for an expression
app.post("/api/generate-scenarios", async (req: Request, res: Response) => {
  try {
    const { expression } = req.body;
    if (!expression) {
      return res.status(400).json({ error: "Missing expression" });
    }

    const prompt = `Generate 3 fresh, diverse, realistic EVERYDAY LIFE situational practice prompts in Chinese for practicing the English expression "${expression}".
Each scenario should be 1-2 sentences with an everyday-life category prefix like [朋友聚会], [周末出游], [居家生活], [咖啡闲聊], [美食探店], [购物砍价].
Return ONLY a valid JSON object:
{
  "scenarios": [
    "[场景名称]：描述具体生活情境与想表达的意图...",
    "[场景名称]：描述具体生活情境与想表达的意图...",
    "[场景名称]：描述具体生活情境与想表达的意图..."
  ]
}`;

    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error generating scenarios:", error);
    return res.status(500).json({ error: "Failed to generate scenarios" });
  }
});

// Endpoint: Deep sentence word-by-word breakdown, phonetics, and contextual definitions
app.post("/api/analyze-sentence-words", async (req: Request, res: Response) => {
  try {
    const { sentence, expression, translationHint } = req.body;
    if (!sentence || typeof sentence !== "string") {
      return res.status(400).json({ error: "Missing or invalid sentence" });
    }

    const cacheKey = `v1_sent_${sentence.toLowerCase().trim()}:::${(expression || "").toLowerCase().trim()}`;
    if (sentenceWordsCache.has(cacheKey)) {
      return res.json(sentenceWordsCache.get(cacheKey));
    }

    const safeSentence = sentence.replace(/"/g, '\\"');
    const prompt = `Analyze this English sentence for an English language learner:
Sentence: "${safeSentence}"
${expression ? `Target Expression: "${expression}"` : ""}
${translationHint ? `Reference Translation: "${translationHint}"` : ""}

Act as an expert bilingual lexicographer (Oxford/Collins & 不背单词).
Provide a structured linguistic and phonetic breakdown in strict JSON:
{
  "sentence": "${safeSentence}",
  "translation": "Accurate, natural Chinese translation of this sentence",
  "tokens": [
    {
      "word": "word as appears in sentence",
      "lemma": "dictionary base form (e.g. troubleshoot)",
      "phonetic": "US IPA phonetic (e.g. /ˈtrʌbəlˌʃuːtɪŋ/)",
      "partOfSpeech": "e.g. v. / n. / adj. / phr. / adv.",
      "meaning": "accurate concise Chinese meaning in THIS specific context",
      "isTarget": true
    }
  ],
  "keyPhrases": [
    {
      "phrase": "e.g. six hours straight",
      "meaning": "e.g. 连续6个小时整"
    }
  ],
  "grammarBreakdown": "1-2 sentences in Chinese explaining key grammar/sentence structure",
  "nuanceNote": "1-2 sentences in Chinese explaining why native speakers choose this wording, tone, and practical communicative effect"
}`;

    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    // Defensive formatting
    if (!Array.isArray(parsed.tokens)) {
      parsed.tokens = [];
    }
    if (!Array.isArray(parsed.keyPhrases)) {
      parsed.keyPhrases = [];
    }
    if (!parsed.translation) {
      parsed.translation = translationHint || "";
    }

    sentenceWordsCache.set(cacheKey, parsed);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error analyzing sentence words:", error);
    const friendlyError = parseErrorMessage(error);
    return res.status(503).json({ error: friendlyError });
  }
});

// Endpoint: Fast dictionary lookup for word selection (Daily English Listening style popover)
app.post("/api/lookup-word", async (req: Request, res: Response) => {
  try {
    const { word, sentenceContext } = req.body;
    if (!word || typeof word !== "string") {
      return res.status(400).json({ error: "Missing or invalid word" });
    }

    const cleanWord = word.trim().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
    if (!cleanWord) {
      return res.status(400).json({ error: "Invalid word" });
    }

    const cacheKey = `${cleanWord.toLowerCase()}:::${(sentenceContext || '').toLowerCase().slice(0, 80)}`;
    if (wordLookupCache.has(cacheKey)) {
      return res.json(wordLookupCache.get(cacheKey));
    }

    const prompt = `Act as an authoritative English-Chinese dictionary (like Collins COBUILD, Oxford Advanced, 欧路/每日英语听力词典).
Look up the word "${cleanWord}"${sentenceContext ? ` within this sentence context: "${sentenceContext}"` : ""}.

Return strictly structured JSON:
{
  "word": "${cleanWord}",
  "lemma": "base/dictionary form (e.g. run for running, child for children)",
  "phoneticUs": "US IPA phonetic (e.g. /ˈtrʌbəlˌʃuːt/)",
  "phoneticUk": "UK IPA phonetic (e.g. /ˈtrʌbəlˌʃuːt/)",
  "partOfSpeech": "e.g. vt. / vi. / n. / adj. / adv. / phr.",
  "contextualMeaning": "Accurate, concise Chinese translation in the current context",
  "definitions": [
    {
      "pos": "e.g. vt.",
      "meaning": "common Chinese definition 1",
      "enDef": "concise English definition if helpful"
    },
    {
      "pos": "e.g. n.",
      "meaning": "common Chinese definition 2"
    }
  ],
  "commonPhrases": [
    { "phrase": "high-frequency collocation 1", "meaning": "Chinese translation" },
    { "phrase": "high-frequency collocation 2", "meaning": "Chinese translation" }
  ],
  "inflections": "e.g. 复数: -s | 过去式: -ed | 现在分词: -ing"
}`;

    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    if (!parsed.word) parsed.word = cleanWord;
    if (!parsed.lemma) parsed.lemma = cleanWord;
    if (!Array.isArray(parsed.definitions)) parsed.definitions = [];
    if (!Array.isArray(parsed.commonPhrases)) parsed.commonPhrases = [];

    wordLookupCache.set(cacheKey, parsed);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error looking up word:", error);
    const friendlyError = parseErrorMessage(error);
    return res.status(503).json({ error: friendlyError });
  }
});

// Endpoint: High-fidelity natural AI voice generation (gemini-3.8-flash-lite-tts)
app.post("/api/tts", async (req: Request, res: Response) => {
  try {
    const { text, voice = "Kore" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid text" });
    }

    const cleanText = text.trim();
    if (!cleanText) {
      return res.status(400).json({ error: "Empty text" });
    }

    const cacheKey = `${voice}_${cleanText.toLowerCase()}`;
    if (ttsCache.has(cacheKey)) {
      return res.json({ audio: ttsCache.get(cacheKey), format: "audio/wav" });
    }

    // Call gemini-3.8-flash-lite-tts with 8s timeout to avoid blocking
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: "Natural, native American English speaker with authentic conversational intonation, proper pauses, and clear pronunciation",
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice || "Kore" },
            },
          },
        },
      }),
      8000,
      "TTS request timed out"
    );

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio returned from Gemini TTS");
    }

    ttsCache.set(cacheKey, base64Audio);
    return res.json({ audio: base64Audio, format: "audio/wav" });
  } catch (error: any) {
    console.warn("TTS generation warning (client will use enhanced local voice):", error?.message || error);
    return res.status(503).json({ error: "TTS service unavailable, use local fallback" });
  }
});

// Endpoint: Evaluate user sentence (Free-form, no scenario constraints)
app.post("/api/evaluate-sentence", async (req: Request, res: Response) => {
  try {
    const { expression, userSentence, scenarioChinese, scenarioDescription } = req.body;
    if (!expression || !userSentence) {
      return res.status(400).json({ error: "Missing expression or userSentence" });
    }

    const cacheKey = `v6_scene_${expression.toLowerCase().trim()}:::${userSentence.toLowerCase().trim()}:::${(scenarioChinese || "").slice(0, 30)}`;
    if (evaluationCache.has(cacheKey)) {
      return res.json(evaluationCache.get(cacheKey));
    }

    const prompt = `You are a world-class bilingual native English speaking and writing coach.
Target English expression to practice: "${expression}"
User's self-composed sentence: "${userSentence}"
${scenarioChinese ? `Target Real-Life Chinese Situation/Intent: "${scenarioChinese}"` : ""}
${scenarioDescription ? `Situational Background: "${scenarioDescription}"` : ""}

TASK & GOAL:
The user is practicing whether they can naturally recall and evoke "${expression}" when encountering this real-life communication scenario: "我会不会在这个场景想到并用它？"
1. Evaluate whether the user's sentence naturally conveys the communicative intent of the scenario and whether "${expression}" is used accurately.
2. In the Chinese feedback, specifically comment on situational fit (情境契合度) and expression evocation (在真实情境中是否自然想到并运用).
3. Polish and elevate the user's sentence into an authentic, highly natural native speaker version ("nativeAlternative"), strictly based on what they expressed.

CRITICAL INSTRUCTION - TARGET EXPRESSION MUST BE PRESERVED IN REWRITE:
1. The student is deliberately practicing the target expression: "${expression}".
2. In "nativeAlternative" (母语者润色版本), YOU MUST KEEP AND USE THE EXACT TARGET EXPRESSION "${expression}" (natural grammatical conjugations like past tense, gerund, or 3rd-person singular are allowed, e.g. "hooked up", "hooking up").
3. NEVER REPLACE OR SUBSTITUTE "${expression}" WITH ANY SYNONYM (e.g. if the target is "hook up", DO NOT substitute it with "meet with", "meet", "hang out", or "catch up"; if it is "call it a day", DO NOT substitute with "wrap up" or "stop"; if it is "cut corners", DO NOT substitute with "take shortcuts").
4. Polish and optimize the surrounding syntax, collocations, rhythm, and natural conversational tone to elevate the user's sentence to native level.

Evaluation criteria:
1. Did the user use "${expression}" correctly and naturally to meet the situational intent?
2. Grammar, tense, prepositions, and punctuation correctness.
3. Natural native phrasing, flow, and conciseness.

Respond ONLY with a valid JSON object matching this exact format:
{
  "score": 95,
  "status": "perfect",
  "isGrammaticallyCorrect": true,
  "isCollocationNatural": true,
  "feedback": "2-3 sentences of supportive Chinese coaching feedback explaining what was expressed well, how well it fits the scenario, and tips for speaking it naturally",
  "nativeAlternative": "One authentic, highly natural native speaker rewrite that MUST explicitly keep and use '${expression}'",
  "alternativeAnalysis": "1-2 sentences in Chinese explaining how the sentence was optimized into native flow while preserving '${expression}' in this real-life scene",
  "praisePoints": ["情境契合", "表达地道"]
}`;

    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    // Ensure fallback defaults so frontend never breaks
    const safeResult = {
      score: typeof parsed.score === "number" ? parsed.score : 85,
      status: parsed.status || "natural",
      isGrammaticallyCorrect: parsed.isGrammaticallyCorrect ?? true,
      isCollocationNatural: parsed.isCollocationNatural ?? true,
      feedback: parsed.feedback || "造句地道自然，用词准确契合语境。",
      nativeAlternative: parsed.nativeAlternative || userSentence,
      alternativeAnalysis: parsed.alternativeAnalysis || "母语者常用更加地道轻盈的口语搭配。",
      praisePoints: Array.isArray(parsed.praisePoints) && parsed.praisePoints.length > 0 ? parsed.praisePoints : ["语境贴切", "语法通顺"],
    };

    evaluationCache.set(cacheKey, safeResult);
    return res.json(safeResult);
  } catch (error: any) {
    console.error("Error evaluating sentence:", error);
    const friendlyError = parseErrorMessage(error);
    return res.status(503).json({ error: friendlyError });
  }
});

// Endpoint: Generate coherent scenario for multiple expressions (Combo Synthesis Challenge)
app.post("/api/generate-combo-scenario", async (req: Request, res: Response) => {
  try {
    const { expressions } = req.body;
    if (!expressions || !Array.isArray(expressions) || expressions.length === 0) {
      return res.status(400).json({ error: "Missing or invalid expressions array" });
    }

    const itemsSummary = expressions
      .map((item: any, idx: number) => {
        if (typeof item === 'string') return `${idx + 1}. "${item}"`;
        return `${idx + 1}. "${item.expression}" (${item.chineseMeaning || ''} · ${item.register || '日常'})`;
      })
      .join('\n');

    const prompt = `You are an expert bilingual English curriculum architect and creative writer.
Task: Create an authentic, vivid EVERYDAY LIFE Chinese situation scenario AND a concrete Chinese combo example paragraph (中文串联示例) that naturally weaves together ALL of the following target English expressions:
${itemsSummary}

Requirements:
1. The scenario MUST be a coherent, realistic everyday-life situation (e.g. weekend trip with friends, rainy day plan changes, cozy café catch-up, shopping trip, family dinner, or unexpected travel moment).
2. "chineseComboExample": Write a concrete, natural 2-3 sentence spoken Chinese example paragraph that demonstrates EXACTLY how a person strings all these ideas together in daily life. Inside the Chinese text, gently annotate where each target expression corresponds in parentheses like **改天再约 (take a rain check)** so the learner clearly sees the connection logic!
3. "scenarioDescription": 1-2 sentences briefly explaining the scene background.
4. "thoughtStarter": 1 sentence in Chinese guiding the structure.
5. "modelParagraph": One authentic model English paragraph (2-3 sentences) translating that exact Chinese combo example naturally while explicitly keeping and using EVERY target expression (do NOT replace them with synonyms).

Respond ONLY with valid JSON:
{
  "scenarioTitle": "4-8字生动生活场景标题，如：周末遇雨改约后的火锅局",
  "scenarioCategory": "日常社交 / 周末出游 / 居家生活 / 美食探店 / 旅途奇遇",
  "scenarioDescription": "1-2句生活背景交代",
  "chineseComboExample": "2-3句接地气的中文串联示例（如：周末本来约好去野餐，但突然下起大雨，我们只好先改天再约 (take a rain check)。不过好的一面 (silver lining) 是大家改在家煮了顿热气腾腾的火锅，那口热汤喝下去真是太解馋太舒坦了 (hit the spot)！）",
  "thoughtStarter": "1句构思结构提示",
  "modelParagraph": "2-3句地道英文范例段落，纯正自然地融合全部目标表达"
}`;

    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const exprNames = expressions.map((e: any) => (typeof e === 'string' ? e : e.expression));
    const fallbackZh =
      exprNames.length >= 2
        ? `周末本来打算出门逛逛，中途遇到点小插曲让我觉得不如先这样（${exprNames[0]}），结果顺便发现了一个意想不到的好去处，真是太合心意了（${exprNames[1]}）！`
        : `在日常聊天中自然用出 ${exprNames.join('、')}，分享今天发生的生活小故事。`;

    const safeScenario = {
      scenarioTitle: parsed.scenarioTitle || "真实生活中文串联示例",
      scenarioCategory: parsed.scenarioCategory || "日常高频生活",
      scenarioDescription:
        parsed.scenarioDescription ||
        `参考下方中文生活语境示例，试着用地道英文将这些表达顺畅串成一段日常分享。`,
      chineseComboExample: parsed.chineseComboExample || fallbackZh,
      thoughtStarter:
        parsed.thoughtStarter ||
        "构思建议：先交代生活小背景，再顺畅过渡到感受或临时决定。",
      modelParagraph:
        parsed.modelParagraph ||
        `In everyday conversations with friends, connecting natural idioms like these helps you sound relaxed, warm, and genuinely fluent.`,
    };

    return res.json(safeScenario);
  } catch (error: any) {
    console.error("Error generating combo scenario:", error);
    const exprList = Array.isArray(req.body.expressions)
      ? req.body.expressions.map((e: any) => (typeof e === 'string' ? e : e.expression))
      : [];
    const fallbackList = exprList.join('、') || '这些表达';
    const fallbackZh =
      exprList.length >= 2
        ? `周末约朋友出门逛街走累了，本想先到这儿歇着（${exprList[0]}），后来临时看情况去了街角一家宝藏小店（${exprList[1]}），体验超级棒！`
        : `试试用生活里发生的一件小事，把【${fallbackList}】自然串起来说一遍。`;

    return res.json({
      scenarioTitle: "日常生活串联参考示例",
      scenarioCategory: "生活社交",
      scenarioDescription: `参考下方中文生活情境，尝试写出 2-3 句英文短篇，将【${fallbackList}】自然串联起来。`,
      chineseComboExample: fallbackZh,
      thoughtStarter: "先交代生活背景或突发小状况，随后说明大家的反应和决定，让故事自然流畅。",
      modelParagraph: "",
    });
  }
});

// Endpoint: Evaluate combo paragraph (Multi-Expression Synergy)
app.post("/api/evaluate-combo-sentence", async (req: Request, res: Response) => {
  try {
    const { expressions, scenarioDescription, userParagraph } = req.body;
    if (!expressions || !Array.isArray(expressions) || !userParagraph) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const expressionsText = expressions.map((e: string) => `- "${e}"`).join('\n');
    const expressionsListStr = expressions.map((e: string) => `"${e}"`).join(', ');

    const prompt = `You are a world-class bilingual English writing coach and native editor.
Target English expressions that MUST be practiced and woven into the paragraph:
${expressionsText}

Scenario context provided:
"${scenarioDescription || 'Real-world English context'}"

User's submitted multi-expression sentence / paragraph:
"${userParagraph}"

CRITICAL MANDATE - ALL TARGET EXPRESSIONS MUST BE PRESERVED:
1. The student is specifically training to connect these exact target expressions: ${expressionsListStr}.
2. In "nativeAlternative", YOU MUST KEEP AND USE ALL OF THE TARGET EXPRESSIONS (${expressionsListStr}), allowing only legitimate grammatical conjugations (e.g. tense, gerund, or plural inflections).
3. NEVER SUBSTITUTE OR REPLACE ANY OF THE TARGET EXPRESSIONS WITH OTHER WORDS OR SYNONYMS!
   - Example: If a target expression is "hook up", DO NOT replace it with "meet with", "meet", "get together", or "catch up". Your rewrite MUST use "hook up"!
   - Example: If a target expression is "call it a day", DO NOT replace it with "finish", "stop working", or "wrap up". Keep "call it a day"!
   - Example: If a target expression is "hit the ground running", DO NOT replace it with "start immediately" or "take off". Keep "hit the ground running"!
4. Your "nativeAlternative" must serve as an inspiring model showing how a master native writer naturally interweaves these EXACT target expressions together into an organic, cohesive narrative.

Evaluate with high rigor and warm encouragement:
1. Check each expression: Was it included? Was it used idiomatically in this exact context or was it forced/awkward?
2. Cohesion and flow: Does the submission read like a cohesive, natural paragraph with good transitions, or just mechanically glued sentences?
3. Grammar, punctuation, tense consistency, and natural collocations.

Respond ONLY with valid JSON:
{
  "overallScore": 92,
  "status": "perfect", // "perfect" (90-100) | "natural" (80-89) | "minor_slip" (70-79) | "needs_work" (<70)
  "isAllUsed": true,
  "expressionFeedbacks": [
    {
      "expression": "target expression",
      "isUsed": true,
      "isNatural": true,
      "comment": "简短1句中文点评该表达在此处的运用地道程度"
    }
  ],
  "cohesionAndFlow": "2句中文点评整段文字的逻辑转折、节奏感与衔接",
  "nativeAlternative": "One cohesive, authentic native-speaker paragraph (2-3 sentences) integrating and preserving ALL target expressions (${expressionsListStr})",
  "alternativeAnalysis": "1-2句中文分析母语者重写版在各目标表达的起承转合、语气自然度上的精妙之处",
  "praisePoints": ["亮点1", "亮点2"]
}`;

    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    // Defensive mapping for expressionFeedbacks
    const expressionFeedbacks = expressions.map((expr: string) => {
      const found = Array.isArray(parsed.expressionFeedbacks)
        ? parsed.expressionFeedbacks.find(
            (item: any) =>
              item?.expression &&
              item.expression.toLowerCase().includes(expr.toLowerCase())
          )
        : null;

      const userTextLower = userParagraph.toLowerCase();
      const detectedInText = userTextLower.includes(expr.toLowerCase());

      return {
        expression: expr,
        isUsed: found ? Boolean(found.isUsed) : detectedInText,
        isNatural: found ? Boolean(found.isNatural) : true,
        comment:
          found?.comment ||
          (detectedInText
            ? "在上下文中自然出现，表意清晰。"
            : "未在提交段落中明显检测到该表达，建议尝试融入。"),
      };
    });

    const safeResult = {
      overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : 88,
      status: parsed.status || "natural",
      isAllUsed:
        typeof parsed.isAllUsed === 'boolean'
          ? parsed.isAllUsed
          : expressionFeedbacks.every((f: any) => f.isUsed),
      expressionFeedbacks,
      cohesionAndFlow:
        parsed.cohesionAndFlow ||
        "段落行文连贯，上下文语境过渡自然，成功将多个目标表达融于一体。",
      nativeAlternative:
        parsed.nativeAlternative ||
        `Connecting these key thoughts together makes your message sound clear, polished, and confident.`,
      alternativeAnalysis:
        parsed.alternativeAnalysis ||
        "母语者重构版本更加注重句子之间的因果承接与口语松弛感，避免了生硬拼凑。",
      praisePoints:
        Array.isArray(parsed.praisePoints) && parsed.praisePoints.length > 0
          ? parsed.praisePoints
          : ["成功跨表达融会贯通", "语境真实鲜活"],
    };

    return res.json(safeResult);
  } catch (error: any) {
    console.error("Error evaluating combo sentence:", error);
    const friendlyError = parseErrorMessage(error);
    return res.status(503).json({ error: friendlyError });
  }
});

const isProd = process.env.NODE_ENV === "production";
const port = process.env.PORT || 3000;

async function startServer() {
  if (!isProd) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`NativeFlow server running on port ${port} (0.0.0.0)`);
  });
}

startServer();
