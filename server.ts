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

    const cacheKey = `v6_topscenes_${expression.toLowerCase().trim()}_${(contextHint || "").toLowerCase().trim()}`;
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
- register: category tag, strictly either "职场" or "日常生活" (choose the single most fitting one)
- tags: array with either ["职场"] or ["日常生活"]
- level: CEFR (e.g. "A2", "B1", "B2", "C1", "C2")
- nuance: 2-3 sentence Chinese explanation of WHEN and WHY native speakers use this expression, tone, emotion, and subtle differences
- collocations: 2-3 high-frequency collocations, each MUST be an object with keys "phrase" and "translation", e.g. [{"phrase": "...", "translation": "..."}]
- examples: Select and provide 2 to 3 of the MOST TYPICAL and high-frequency application scenarios where native speakers actually use "${expression}" (e.g. 1 workplace/formal communication, 1 daily life/casual conversation, and optionally 1 social/emotional context). Each scenario MUST be an object with:
  * "scene": specific scene tag in format "[场景类别 / 具体情境]" (e.g. "[外企职场 / 会议推进]", "[日常社交 / 随性闲聊]", "[生活办事 / 突发状况]")
  * "scenarioDescription": 1 concise sentence in Chinese explaining when/why native speakers use it in this scenario (e.g. "当讨论陷入僵局或时间已晚，体面且具亲和力地提议今天先结束时")
  * "en": an authentic, natural, spoken/conversational English sentence demonstrating natural usage in that exact scenario
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

    const prompt = `Generate 3 fresh, diverse, realistic situational practice prompts in Chinese for practicing the English expression "${expression}".
Each scenario should be 1-2 sentences with a category prefix like [职场收工], [健身运动], [备考复习], [朋友聚会], [商务谈判].
Return ONLY a valid JSON object:
{
  "scenarios": [
    "[场景名称]：描述具体情境与想表达的意图...",
    "[场景名称]：描述具体情境与想表达的意图...",
    "[场景名称]：描述具体情境与想表达的意图..."
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
    const { expression, userSentence } = req.body;
    if (!expression || !userSentence) {
      return res.status(400).json({ error: "Missing expression or userSentence" });
    }

    const cacheKey = `v5_free_preserve_${expression.toLowerCase().trim()}:::${userSentence.toLowerCase().trim()}`;
    if (evaluationCache.has(cacheKey)) {
      return res.json(evaluationCache.get(cacheKey));
    }

    const prompt = `You are a world-class bilingual native English writing coach and editor.
Target English expression to practice: "${expression}"
User's self-composed sentence: "${userSentence}"

TASK:
The user freely composed their own sentence using "${expression}" WITHOUT ANY pre-imposed scenario prompt or constraint.
1. Understand the core idea, message, and nuance the user intended to express in their sentence.
2. Directly evaluate their sentence and how they used "${expression}".
3. Polish and elevate the user's sentence into an authentic, highly natural native speaker version ("nativeAlternative"), strictly based on what they wrote and the expression used.

CRITICAL INSTRUCTION - TARGET EXPRESSION MUST BE PRESERVED IN REWRITE:
1. The student is deliberately practicing the target expression: "${expression}".
2. In "nativeAlternative" (母语者润色版本), YOU MUST KEEP AND USE THE EXACT TARGET EXPRESSION "${expression}" (natural grammatical conjugations like past tense, gerund, or 3rd-person singular are allowed, e.g. "hooked up", "hooking up").
3. NEVER REPLACE OR SUBSTITUTE "${expression}" WITH ANY SYNONYM (e.g. if the target is "hook up", DO NOT substitute it with "meet with", "meet", "hang out", or "catch up"; if it is "call it a day", DO NOT substitute with "wrap up" or "stop"; if it is "cut corners", DO NOT substitute with "take shortcuts").
4. Polish and optimize the surrounding syntax, collocations, rhythm, and natural conversational tone to elevate the user's sentence to native level.

Evaluation criteria:
1. Did the user use "${expression}" correctly according to its authentic meaning?
2. Grammar, tense, prepositions, and punctuation correctness.
3. Natural native phrasing, flow, and conciseness.

Respond ONLY with a valid JSON object matching this exact format:
{
  "score": 95,
  "status": "perfect",
  "isGrammaticallyCorrect": true,
  "isCollocationNatural": true,
  "feedback": "2-3 sentences of supportive Chinese coaching feedback explaining what was expressed well, grammar notes, and how to improve",
  "nativeAlternative": "One authentic, highly natural native speaker rewrite that MUST explicitly keep and use '${expression}'",
  "alternativeAnalysis": "1-2 sentences in Chinese explaining how the sentence was optimized into native flow while preserving '${expression}'",
  "praisePoints": ["亮点1", "亮点2"]
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
Task: Create an authentic, vivid Chinese situation scenario that naturally weaves together ALL of the following target English expressions:
${itemsSummary}

Requirements:
1. The scenario should be a coherent, realistic real-world situation (e.g. workplace sprint, international negotiation, startup pivot, unexpected travel event, or close friend conversation).
2. Explain clearly in Chinese why and how these expressions fit naturally into the same scene.
3. Provide a thought starter hint in Chinese to guide the learner's writing logic.
4. Provide an authentic model English paragraph (2-3 sentences) demonstrating how a native speaker would seamlessly connect all target expressions while explicitly keeping and using each target expression (do not replace them with synonyms).

Respond ONLY with valid JSON:
{
  "scenarioTitle": "4-8字生动场景标题，如：外企周五紧急排障与复盘",
  "scenarioCategory": "分类标签，如：外企职场 / 深度交流 / 商务谈判 / 旅途突发 / 日常社交",
  "scenarioDescription": "2-3句生动具体的语境任务描述，明确角色、冲突/事件，并交代如何串联使用这几个表达",
  "thoughtStarter": "给学习者的构思思路建议（如：先交代紧迫情况，再陈述应对表现，最后做总结提议）",
  "modelParagraph": "母语者范例段落（英文2-3句），纯正自然地融合全部目标表达"
}`;

    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const safeScenario = {
      scenarioTitle: parsed.scenarioTitle || "综合语境实战融合",
      scenarioCategory: parsed.scenarioCategory || "高频真实生活",
      scenarioDescription:
        parsed.scenarioDescription ||
        `请尝试在一段生动连贯的英语表达中，将以上 ${expressions.length} 个地道表达自然融为一体，讲述一段真实的职场沟通或生活经历。`,
      thoughtStarter:
        parsed.thoughtStarter ||
        "构思建议：可以用2-3句话写成一个微场景，先描述背景，再说明过程，最后做出行动提议。",
      modelParagraph:
        parsed.modelParagraph ||
        `In our fast-paced daily work, connecting idiomatic expressions like these helps us communicate with native clarity and warmth.`,
    };

    return res.json(safeScenario);
  } catch (error: any) {
    console.error("Error generating combo scenario:", error);
    // Graceful fallback scenario so user experience is uninterrupted
    const fallbackList = Array.isArray(req.body.expressions)
      ? req.body.expressions.map((e: any) => (typeof e === 'string' ? e : e.expression)).join('、')
      : '这些表达';
    return res.json({
      scenarioTitle: "职场与日常综合演练",
      scenarioCategory: "综合实战",
      scenarioDescription: `在跨国团队协作与日常交流中，尝试写出 2-3 句英文短篇，将【${fallbackList}】自然串联起来，展现地道母语思维。`,
      thoughtStarter: "建议分层次叙述：先交代所处背景与现状，随后说明具体行动与应对，使整段表达浑然一体。",
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
