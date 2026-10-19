import React from 'react';
import {
  Lightbulb,
  Cpu,
  Layers,
  Repeat,
  Sparkles,
  Workflow,
  Smartphone,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Flame,
} from 'lucide-react';

export const ArchitectureGuideView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>产品设计与技术实现完整思路指南</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 font-serif tracking-tight">
          如何打造一款“不背单词”级的地道表达与造句复习 App
        </h1>
        <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 max-w-2xl mx-auto">
          融合“语境输入 + AI 深度拆解 + 启发式造句实战 + 艾宾浩斯记忆排期”，建立从输入到输出的完整闭环。
        </p>
      </div>

      {/* Chapter 1: Product Philosophy */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
          <Workflow className="w-6 h-6" />
          <h2 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
            一、核心产品闭环：为什么“语境 + 造句”远胜于死记硬背？
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 space-y-2">
            <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              ❌ 传统背单词 App 的痛点
            </div>
            <ul className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 space-y-1.5 list-disc pl-4">
              <li>孤立背诵单词中文释义，脱离真实生活或职场语境；</li>
              <li>“只认不写”：认识几千个词，但在发邮件或开口时依然只会最简单的初中词汇；</li>
              <li>无法分辨词汇语域（口语、书面、俚语、礼貌程度的微妙差异）。</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 space-y-2">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              ✅ 本应用的“不背单词”闭环设计
            </div>
            <ul className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 space-y-1.5 list-disc pl-4">
              <li><strong>用户自主输入：</strong>从美剧、小说、播客中捕获任何心仪表达；</li>
              <li><strong>AI 语境拆解：</strong>解析“为什么老外这么说”、搭配词与场景例句；</li>
              <li><strong>情境造句 + 导师批改：</strong>用户立即写句，AI 点评并给出母语者润色；</li>
              <li><strong>科学定时复习：</strong>按艾宾浩斯规律精准唤醒，永久进入长期记忆。</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Chapter 2: SRS Algorithm */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
          <Repeat className="w-6 h-6" />
          <h2 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
            二、艾宾浩斯 / SM-2 智能复习排期算法
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
          人类记忆遗忘具有“先快后慢”的特征（20分钟遗忘42%，1天后遗忘66%）。间隔重复算法（SRS）的核心就是在遗忘临界点到来时，主动弹回复习。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 text-center">
            <div className="text-base font-extrabold text-rose-600">🟥 遗忘 (Again)</div>
            <div className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              重置间隔为 1 天，难度因子 (EF) 扣减 0.2，重新从基础阶段记忆。
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 text-center">
            <div className="text-base font-extrabold text-orange-600">🟨 模糊 (Hard)</div>
            <div className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              间隔小幅增长（1.2x），难度因子微减，防止复习跨度过大导致脱节。
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 text-center">
            <div className="text-base font-extrabold text-emerald-600">🟩 掌握 (Good)</div>
            <div className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              经典递增：1天 → 3天 → 7天 → 15天 → 30天... 按难度乘数稳健递增。
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 text-center">
            <div className="text-base font-extrabold text-indigo-600">🟦 简单 (Easy)</div>
            <div className="text-xs text-stone-600 dark:text-stone-400 mt-1">
              额外加速奖励（1.3x），难度因子加成，减少熟词的无谓重复。
            </div>
          </div>
        </div>
      </div>

      {/* Chapter 3: Prompt Engineering */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
          <Cpu className="w-6 h-6" />
          <h2 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
            三、AI 提示词工程 (Prompt Engineering) 架构规范
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
          要做出“不背单词”级别的细腻卡片，AI 输出必须严格遵守结构化输出规范（JSON Schema），并设定双向任务：
        </p>

        <div className="space-y-3 pt-1">
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-2">
            <div className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
              1. 词条解析提示词 (Analyze Expression)
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              扮演“不背单词资深教研主编”，输出：国际音标(US/UK IPA)、精炼中文释义、语体色彩分类(职场/美剧/书面)、老外使用心理与语境情感(Nuance)、2-4组高频搭配、3个不同场景的生动原声感例句、趣味助记联想，以及一条针对该词的<strong>情景造句引导题</strong>。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-2">
            <div className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
              2. 智能造句批改提示词 (Evaluate Sentence)
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              扮演“母语级英文写作教练”，从三个维度严格评估：①是否正确自然地使用了目标表达；②语法与标点正确性；③母语地道度。并给出0-100评分、详尽中文解析、<strong>母语者地道润色版 (Native Polish)</strong>及其升级亮点对比。
            </p>
          </div>
        </div>
      </div>

      {/* Chapter 4: Tech Stack & Roadmap */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
          <Smartphone className="w-6 h-6" />
          <h2 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
            四、技术栈选型与跨端发布路线
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-1.5">
            <div className="font-bold text-stone-900 dark:text-stone-100">
              🎨 前端与交互
            </div>
            <p className="text-stone-600 dark:text-stone-400 text-xs">
              React + TypeScript + Tailwind CSS，配合 Web Speech API 实现零延迟双音标真人感发音。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-1.5">
            <div className="font-bold text-stone-900 dark:text-stone-100">
              ⚙️ 后端服务代理
            </div>
            <p className="text-stone-600 dark:text-stone-400 text-xs">
              Express / Node.js 代理 Gemini 3.8 Flash，保护 API Key 不暴露于前端，执行结构化 Schema 输出。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-1.5">
            <div className="font-bold text-stone-900 dark:text-stone-100">
              📱 移动端与持久化
            </div>
            <p className="text-stone-600 dark:text-stone-400 text-xs">
              本地 LocalStorage 离线快存 + JSON 导入导出；上线时可使用 Capacitor 一键打包为 iOS / Android 原生 App。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
