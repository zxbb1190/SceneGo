import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  CirclePlay,
  Code2,
  Database,
  ExternalLink,
  Github,
  Languages,
  Library,
  LockKeyhole,
  MessageSquareText,
  MonitorPlay,
  ServerCog,
  Sparkles,
  Subtitles,
  type LucideIcon
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type Locale = "zh" | "en";

const links = {
  github: "https://github.com/zxbb1190/SceneGo",
  release: "https://github.com/zxbb1190/SceneGo/releases/tag/v0.3.1",
  readme: "https://github.com/zxbb1190/SceneGo#readme",
  siliconFlow: "https://cloud.siliconflow.cn/i/iA6DF2nP"
};

const copy = {
  zh: {
    nav: ["产品", "工作流", "AI 英语", "部署"],
    navIds: ["product", "workflow", "ai-english", "deploy"],
    github: "GitHub",
    heroKicker: "OPEN SOURCE · AI ENGLISH LEARNING",
    heroTitle: "SceneGo",
    heroLead: "面向真实场景的开源 AI 英语学习工作台。",
    heroImageAlt: "SceneGo AI英语学习与多轮英语对话界面",
    source: "查看源码",
    deploy: "本地部署",
    proof: ["AI英语学习", "OpenAI-compatible", "本地材料优先", "MIT 开源"],
    introKicker: "ONE WORKSPACE, EVERY SCENE",
    introTitle: "一个 AI 英语学习工作台，串联对话、视频与知识库。",
    introBody: "SceneGo 把 AI英语对话、视频字幕学习、英语知识库和学习报告收拢进同一条路径。AI 负责理解表达与组织知识，你保留对材料和数据的控制。",
    pillars: [
      ["AI 英语对话", "普通聊天与项目学习共享多轮上下文。AI 识别新英语表达与追问，避免重复写入学习库。"],
      ["英语知识库", "句子、生词和错题集中管理。AI 标签、收藏、笔记和复习记录跟随学习内容。"],
      ["AI 学习报告", "仪表盘聚合英语学习、复习、掌握和错题数据，让下一步行动清晰可见。"]
    ],
    productKicker: "CONVERSATION FIRST",
    productTitle: "让 AI 英语学习保留完整上下文。",
    productBody: "SceneGo 不止提供一次性 AI翻译。思考、回复和英语句子分析都会真实流式输出，切换页面后任务仍在后台继续。",
    productPoints: ["自动区分新英语表达、追问和无关消息", "逐步生成翻译、拆解、词汇、语法和自然用法", "AI 自动分类标签，用户保留备注与收藏控制"],
    productImageAlt: "SceneGo AI英语翻译、词汇拆解和语法分析界面",
    productCaption: "SceneGo / AI 英语对话与结构化分析",
    workflowKicker: "FROM SCENE TO MEMORY",
    workflowTitle: "同一套 AI 学习路径，覆盖真正遇到英语的地方。",
    steps: [
      ["01", "带入场景", "输入表达、选择本地视频与字幕，或打开外链伴学。"],
      ["02", "理解这一句", "AI 根据对话上下文生成翻译、拆解、词汇与语法分析。"],
      ["03", "留下有用内容", "新表达进入学习库；追问继续留在原对话，不制造重复记录。"],
      ["04", "复习与回看", "通过句子、生词、错题和仪表盘持续回到真正薄弱的地方。"]
    ],
    scenes: [
      ["视频字幕英语学习", "原生 video 播放、自备 SRT/VTT、字幕同步、逐句重播与 AI 分析。"],
      ["外链英语伴学", "只做嵌入或外部打开，配合手动输入 AI翻译，不读取跨域页面。"],
      ["AI 英语对话", "翻译、润色、表达辨析和上下文追问都在同一条多轮会话中完成。"]
    ],
    seoKicker: "AI ENGLISH LEARNING",
    seoTitle: "用 AI 学英语，不止得到一次翻译。",
    seoBody: "SceneGo 面向希望长期积累的 AI英语学习者。每次对话、字幕分析和语音输入都可以转化为可收藏、可复习、可追踪的英语学习内容。",
    seoTopics: [
      ["AI 英语对话与翻译", "在多轮上下文中完成中英翻译、英文润色、表达辨析和追问，AI 会判断哪些新句子值得进入学习库。"],
      ["视频字幕英语学习", "使用自己的本地视频和 SRT/VTT 字幕逐句学习，按时间轴同步当前英语台词，并重播需要精听的句子。"],
      ["AI 单词、语法与复习", "把句子拆解为词汇、短语、语法和自然用法，配合生词本、错题本与复习计划持续巩固。"],
      ["可自托管的 AI 学习工具", "通过 OpenAI-compatible API 接入 DeepSeek、OpenAI、通义千问或硅基流动，模型、代码和学习数据由你决定。"]
    ],
    faqKicker: "COMMON QUESTIONS",
    faqTitle: "关于 SceneGo AI 英语学习",
    faqs: [
      ["SceneGo 是什么 AI 英语学习工具？", "SceneGo 是开源 AI英语学习工作台，把 AI英语对话、AI翻译、视频字幕学习、词汇语法分析和复习记录放在同一个学习流程中。"],
      ["SceneGo 支持哪些 AI 模型和 API？", "SceneGo 使用 OpenAI-compatible API，可接入 OpenAI、DeepSeek、通义千问、硅基流动及其他兼容服务，不把模型厂商写死。"],
      ["能否用本地视频和字幕学习英语？", "可以。用户可选择自己的本地视频并导入 SRT 或 VTT 字幕，进行字幕同步、逐句重播和 AI 句子分析。"],
      ["SceneGo 如何管理句子、生词和错题？", "新的英语表达可进入学习库，并与句子收藏、生词、笔记、错题、复习计划和学习报告关联，追问不会重复创建学习内容。"]
    ],
    deployKicker: "SELF-HOST IN MINUTES",
    deployTitle: "代码、模型和数据，都由你决定放在哪里。",
    deployBody: "React + Vite 前端、Node.js API、MySQL + Prisma。聊天和语音转写分别配置 OpenAI-compatible provider，也可以共用同一套服务凭据。",
    stack: ["React + Vite + TypeScript", "Express + Prisma + MySQL", "OpenAI-compatible Chat + STT", "pnpm workspace + Docker"],
    docs: "阅读部署文档",
    provider: "硅基流动",
    ctaKicker: "START WITH YOUR NEXT SENTENCE",
    ctaTitle: "下一句真实表达，就是新的学习入口。",
    ctaBody: "SceneGo 是 MIT 开源项目。查看代码、本地部署，或者从 v0.3.1 Release 开始了解它。",
    release: "查看 v0.3.1",
    footer: "AI 英语学习与场景化语言学习工作台",
    rights: "SceneGo · MIT License"
  },
  en: {
    nav: ["Product", "Workflow", "AI English", "Deploy"],
    navIds: ["product", "workflow", "ai-english", "deploy"],
    github: "GitHub",
    heroKicker: "OPEN SOURCE · AI LANGUAGE WORKSPACE",
    heroTitle: "SceneGo",
    heroLead: "An open-source AI English learning workspace for real-world scenes.",
    heroImageAlt: "SceneGo AI English learning and multi-turn conversation interface",
    source: "View source",
    deploy: "Self-host",
    proof: ["AI English learning", "OpenAI-compatible", "Local materials first", "MIT open source"],
    introKicker: "ONE WORKSPACE, EVERY SCENE",
    introTitle: "One AI English workspace for chat, video, and your learning library.",
    introBody: "SceneGo brings AI English conversation, subtitle learning, the personal library, and progress reports into one path while you keep control of your materials and data.",
    pillars: [
      ["AI English conversation", "General chat and project study share multi-turn context. AI separates new expressions from follow-up questions."],
      ["English learning library", "Sentences, vocabulary, and mistakes live together with notes, favorites, AI tags, and review history."],
      ["AI learning reports", "The dashboard brings English learning, reviews, mastery, and mistakes together without adding noise."]
    ],
    productKicker: "CONVERSATION FIRST",
    productTitle: "AI English learning with the whole context intact.",
    productBody: "SceneGo goes beyond one-off AI translation. Reasoning, replies, and structured English analysis stream progressively and continue across route changes.",
    productPoints: ["Distinguishes new English expressions, follow-ups, and unrelated chat", "Streams translation, breakdown, vocabulary, grammar, and natural usage", "AI assigns tags while notes and favorites remain under your control"],
    productImageAlt: "SceneGo AI English translation, vocabulary breakdown, and grammar analysis",
    productCaption: "SceneGo / AI English conversation and structured analysis",
    workflowKicker: "FROM SCENE TO MEMORY",
    workflowTitle: "One AI learning path for the places where English actually happens.",
    steps: [
      ["01", "Bring the scene", "Enter an expression, choose a local video and subtitles, or open a companion link."],
      ["02", "Understand the line", "AI uses conversation context to produce translation, breakdown, vocabulary, and grammar."],
      ["03", "Keep what matters", "New expressions enter the library; follow-ups stay in the conversation without duplicates."],
      ["04", "Review and return", "Sentences, words, mistakes, and the dashboard bring you back to weak spots."]
    ],
    scenes: [
      ["Video subtitle learning", "Native video playback, your own SRT/VTT, sentence sync, replay, and AI analysis."],
      ["Link companion", "Embed or open externally with manual AI translation. No cross-origin page access."],
      ["AI English conversation", "Translation, rewriting, nuance, and contextual follow-ups in one multi-turn thread."]
    ],
    seoKicker: "AI ENGLISH LEARNING",
    seoTitle: "Learn English with AI, beyond a one-time translation.",
    seoBody: "SceneGo is built for learners who want AI English study to accumulate over time. Conversations, subtitle analysis, and voice input become content you can save, review, and track.",
    seoTopics: [
      ["AI English chat and translation", "Translate, rewrite, compare expressions, and ask follow-up questions in context while AI identifies new sentences worth saving."],
      ["Video subtitle English learning", "Study your own local videos with SRT/VTT subtitles, timeline sync, sentence replay, and structured AI analysis."],
      ["AI vocabulary, grammar, and review", "Break sentences into vocabulary, phrases, grammar, and natural usage, then retain them through reviews and mistake tracking."],
      ["Self-hosted AI learning tool", "Connect DeepSeek, OpenAI, Qwen, SiliconFlow, or another OpenAI-compatible API while keeping control of models and learning data."]
    ],
    faqKicker: "COMMON QUESTIONS",
    faqTitle: "About SceneGo AI English learning",
    faqs: [
      ["What kind of AI English learning tool is SceneGo?", "SceneGo is an open-source workspace that combines AI English chat, translation, video subtitle learning, vocabulary and grammar analysis, and review history."],
      ["Which AI models and APIs does SceneGo support?", "SceneGo uses OpenAI-compatible APIs and can connect to OpenAI, DeepSeek, Qwen, SiliconFlow, and other compatible providers."],
      ["Can I learn English from local videos and subtitles?", "Yes. Choose your own local video and import SRT or VTT subtitles for timeline sync, sentence replay, and AI sentence analysis."],
      ["How does SceneGo manage sentences, words, and mistakes?", "New English expressions enter the learning library and connect to favorites, vocabulary, notes, mistakes, review plans, and progress reports without duplicating follow-up questions."]
    ],
    deployKicker: "SELF-HOST IN MINUTES",
    deployTitle: "You choose where the code, models, and data live.",
    deployBody: "React + Vite on the frontend, Node.js API, and MySQL + Prisma. Chat and speech transcription use separate OpenAI-compatible provider settings or shared credentials.",
    stack: ["React + Vite + TypeScript", "Express + Prisma + MySQL", "OpenAI-compatible Chat + STT", "pnpm workspace + Docker"],
    docs: "Read deployment guide",
    provider: "SiliconFlow",
    ctaKicker: "START WITH YOUR NEXT SENTENCE",
    ctaTitle: "Your next real expression is a new learning entry point.",
    ctaBody: "SceneGo is MIT licensed. Explore the source, self-host it, or start with the v0.3.1 release.",
    release: "View v0.3.1",
    footer: "AI English and scene-based language learning workspace",
    rights: "SceneGo · MIT License"
  }
} as const;

export function App() {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = window.localStorage.getItem("scenego.website.locale");
    return saved === "en" ? "en" : "zh";
  });
  const t = copy[locale];

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem("scenego.website.locale", locale);
  }, [locale]);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="SceneGo">
          <span className="brand-mark">S</span>
          <span>SceneGo</span>
        </a>
        <nav aria-label={locale === "zh" ? "主导航" : "Primary navigation"}>
          {t.nav.map((item, index) => <a key={item} href={`#${t.navIds[index]}`}>{item}</a>)}
        </nav>
        <div className="header-actions">
          <button
            className="language-button"
            type="button"
            aria-label={locale === "zh" ? "Switch to English" : "切换到中文"}
            title={locale === "zh" ? "English" : "中文"}
            onClick={() => setLocale((current) => current === "zh" ? "en" : "zh")}
          >
            <Languages aria-hidden="true" />
            <span>{locale === "zh" ? "EN" : "中文"}</span>
          </button>
          <a className="header-github" href={links.github} target="_blank" rel="noreferrer">
            <Github aria-hidden="true" />
            <span>{t.github}</span>
          </a>
        </div>
      </header>

      <main>
        <section className="hero" id="top">
          <img src="images/hero-chat.png" alt={t.heroImageAlt} />
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-content page-width">
            <p className="eyebrow hero-eyebrow">{t.heroKicker}</p>
            <h1>{t.heroTitle}</h1>
            <p className="hero-lead">{t.heroLead}</p>
            <div className="hero-actions">
              <a className="primary-link" href={links.github} target="_blank" rel="noreferrer">
                <Github aria-hidden="true" />
                {t.source}
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="secondary-link hero-secondary" href="#deploy">
                <Code2 aria-hidden="true" />
                {t.deploy}
              </a>
            </div>
          </div>
        </section>

        <section className="proof-band" aria-label="SceneGo facts">
          <div className="page-width proof-grid">
            {t.proof.map((item, index) => (
              <div key={item}>
                <IndexedIcon icons={[BrainCircuit, LockKeyhole, Code2, Languages]} index={index} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="intro-section page-width" id="product">
          <div className="section-heading wide-heading">
            <p className="eyebrow">{t.introKicker}</p>
            <h2>{t.introTitle}</h2>
            <p>{t.introBody}</p>
          </div>
          <div className="pillar-grid">
            {t.pillars.map(([title, body], index) => (
              <article key={title}>
                <span className="pillar-index">0{index + 1}</span>
                <IndexedIcon icons={[MessageSquareText, Library, Sparkles]} index={index} />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="product-section">
          <div className="page-width product-layout">
            <div className="section-heading product-copy">
              <p className="eyebrow">{t.productKicker}</p>
              <h2>{t.productTitle}</h2>
              <p>{t.productBody}</p>
              <ul className="check-list">
                {t.productPoints.map((item) => <li key={item}><Check aria-hidden="true" /><span>{item}</span></li>)}
              </ul>
            </div>
            <figure className="product-frame">
              <img src="images/conversation-analysis.png" alt={t.productImageAlt} loading="lazy" />
              <figcaption>{t.productCaption}</figcaption>
            </figure>
          </div>
        </section>

        <section className="workflow-section page-width" id="workflow">
          <div className="section-heading wide-heading">
            <p className="eyebrow">{t.workflowKicker}</p>
            <h2>{t.workflowTitle}</h2>
          </div>
          <div className="step-grid">
            {t.steps.map(([number, title, body]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <div className="scene-grid">
            {t.scenes.map(([title, body], index) => (
              <article key={title}>
                <IndexedIcon icons={[MonitorPlay, Subtitles, MessageSquareText]} index={index} />
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="seo-section" id="ai-english">
          <div className="page-width">
            <div className="section-heading wide-heading">
              <p className="eyebrow">{t.seoKicker}</p>
              <h2>{t.seoTitle}</h2>
              <p>{t.seoBody}</p>
            </div>
            <div className="seo-topic-grid">
              {t.seoTopics.map(([title, body], index) => (
                <article key={title}>
                  <IndexedIcon icons={[MessageSquareText, Subtitles, Library, ServerCog]} index={index} />
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="faq-layout">
              <div className="faq-heading">
                <p className="eyebrow">{t.faqKicker}</p>
                <h2>{t.faqTitle}</h2>
              </div>
              <div className="faq-list">
                {t.faqs.map(([question, answer]) => (
                  <details key={question}>
                    <summary><span>{question}</span><i aria-hidden="true">+</i></summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="deploy-section" id="deploy">
          <div className="page-width deploy-layout">
            <div className="section-heading deploy-copy">
              <p className="eyebrow">{t.deployKicker}</p>
              <h2>{t.deployTitle}</h2>
              <p>{t.deployBody}</p>
              <div className="stack-list">
                {t.stack.map((item, index) => (
                  <span key={item}><IndexedIcon icons={[Code2, Database, BrainCircuit, ServerCog]} index={index} />{item}</span>
                ))}
              </div>
              <div className="deploy-links">
                <a className="primary-link" href={links.readme} target="_blank" rel="noreferrer">{t.docs}<ExternalLink aria-hidden="true" /></a>
                <a className="text-link" href={links.siliconFlow} target="_blank" rel="noreferrer">{t.provider}<ChevronRight aria-hidden="true" /></a>
              </div>
            </div>
            <CodeWindow />
          </div>
        </section>

        <section className="final-cta">
          <div className="page-width">
            <p className="eyebrow">{t.ctaKicker}</p>
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaBody}</p>
            <div className="hero-actions">
              <a className="primary-link" href={links.github} target="_blank" rel="noreferrer"><Github aria-hidden="true" />{t.source}<ArrowRight aria-hidden="true" /></a>
              <a className="secondary-link" href={links.release} target="_blank" rel="noreferrer"><CirclePlay aria-hidden="true" />{t.release}</a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="page-width footer-content">
          <div className="footer-brand"><span className="brand-mark">S</span><span><strong>SceneGo</strong><small>{t.footer}</small></span></div>
          <span>{t.rights}</span>
          <a href={links.github} target="_blank" rel="noreferrer"><Github aria-hidden="true" />GitHub</a>
        </div>
      </footer>
    </div>
  );
}

function CodeWindow() {
  return (
    <div className="code-window" aria-label="SceneGo installation commands">
      <div className="code-window-head"><span /><span /><span /><small>scene-go / setup</small></div>
      <pre><code><Line prefix="$" value="git clone https://github.com/zxbb1190/SceneGo.git" />
<Line prefix="$" value="cd SceneGo && pnpm install" />
<Line prefix="$" value="cp .env.example .env" />
<Line prefix="$" value="pnpm docker:mysql:up" />
<Line prefix="$" value="pnpm db:deploy" />
<Line prefix="$" value="pnpm dev" />
{"\n"}<span className="code-comment"># OpenAI-compatible providers</span>
<Line value="AI_MODEL=your-chat-model" />
<Line value="STT_MODEL=your-speech-model" /></code></pre>
    </div>
  );
}

function IndexedIcon({ icons, index }: { icons: readonly LucideIcon[]; index: number }) {
  const Icon = icons[index] ?? Sparkles;
  return <Icon aria-hidden="true" />;
}

function Line({ prefix, value }: { prefix?: string; value: string }): ReactNode {
  return <>{prefix ? <span className="code-prefix">{prefix} </span> : null}<span>{value}</span>{"\n"}</>;
}
