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
    nav: ["产品", "工作流", "部署"],
    navIds: ["product", "workflow", "deploy"],
    github: "GitHub",
    heroKicker: "OPEN SOURCE · AI LANGUAGE WORKSPACE",
    heroTitle: "SceneGo",
    heroLead: "把真实场景中的表达，变成可持续积累的语言能力。",
    source: "查看源码",
    deploy: "本地部署",
    proof: ["OpenAI-compatible", "本地材料优先", "MIT License", "中文优先"],
    introKicker: "ONE WORKSPACE, EVERY SCENE",
    introTitle: "不是多一个学习工具，而是少一点场景切换。",
    introBody: "SceneGo 把聊天、项目、学习库和报告收拢进同一条学习路径。AI 负责理解意图和组织知识，你保留对材料与数据的控制。",
    pillars: [
      ["对话即学习入口", "普通聊天与项目学习共享多轮上下文。AI 识别新表达与追问，避免重复写入学习库。"],
      ["知识自然沉淀", "句子、生词和错题集中管理。收藏、笔记、标签和复习记录跟随学习内容。"],
      ["报告而不是噪音", "仪表盘聚合学习、复习、掌握和错题数据，让下一步行动清晰可见。"]
    ],
    productKicker: "CONVERSATION FIRST",
    productTitle: "从一句话开始，保持完整的学习上下文。",
    productBody: "思考、回复和结构化分析都采用真实流式输出。切换页面后任务仍在后台继续，回来时不会丢失进度。",
    productPoints: ["自动区分新表达、追问和无关消息", "拆解、词汇、语法和自然用法逐步生成", "AI 自动分类标签，用户保留备注与收藏控制"],
    workflowKicker: "FROM SCENE TO MEMORY",
    workflowTitle: "同一套学习路径，覆盖你真正遇到语言的地方。",
    steps: [
      ["01", "带入场景", "输入表达、选择本地视频与字幕，或打开外链伴学。"],
      ["02", "理解这一句", "AI 根据对话上下文生成翻译、拆解、词汇与语法分析。"],
      ["03", "留下有用内容", "新表达进入学习库；追问继续留在原对话，不制造重复记录。"],
      ["04", "复习与回看", "通过句子、生词、错题和仪表盘持续回到真正薄弱的地方。"]
    ],
    scenes: [
      ["本地视频", "原生 video 播放、自备 SRT/VTT、逐句同步与重播。"],
      ["外链伴学", "只做嵌入或外部打开，配合手动输入分析，不读取跨域页面。"],
      ["自由对话", "翻译、润色、表达辨析和上下文追问都在同一条会话中完成。"]
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
    footer: "AI 场景化语言学习工作台",
    rights: "SceneGo · MIT License"
  },
  en: {
    nav: ["Product", "Workflow", "Deploy"],
    navIds: ["product", "workflow", "deploy"],
    github: "GitHub",
    heroKicker: "OPEN SOURCE · AI LANGUAGE WORKSPACE",
    heroTitle: "SceneGo",
    heroLead: "Turn expressions from real scenes into language you can keep using.",
    source: "View source",
    deploy: "Self-host",
    proof: ["OpenAI-compatible", "Local materials first", "MIT License", "Chinese-first docs"],
    introKicker: "ONE WORKSPACE, EVERY SCENE",
    introTitle: "Less context switching. More connected learning.",
    introBody: "SceneGo brings chat, projects, the learning library, and reports into one path. AI organizes intent and knowledge while you keep control of your materials and data.",
    pillars: [
      ["Conversation is the entry", "General chat and project study share multi-turn context. AI separates new expressions from follow-up questions."],
      ["Knowledge accumulates", "Sentences, vocabulary, and mistakes live together with notes, favorites, tags, and review history."],
      ["Reports stay actionable", "The dashboard brings learning, reviews, mastery, and mistakes together without adding noise."]
    ],
    productKicker: "CONVERSATION FIRST",
    productTitle: "Start with one sentence. Keep the whole learning context.",
    productBody: "Reasoning, replies, and structured analysis stream progressively. Jobs continue across route changes, so returning to a conversation never loses progress.",
    productPoints: ["Distinguishes new expressions, follow-ups, and unrelated chat", "Streams breakdown, vocabulary, grammar, and natural usage", "AI assigns tags while notes and favorites remain under your control"],
    workflowKicker: "FROM SCENE TO MEMORY",
    workflowTitle: "One learning path for the places where language actually happens.",
    steps: [
      ["01", "Bring the scene", "Enter an expression, choose a local video and subtitles, or open a companion link."],
      ["02", "Understand the line", "AI uses conversation context to produce translation, breakdown, vocabulary, and grammar."],
      ["03", "Keep what matters", "New expressions enter the library; follow-ups stay in the conversation without duplicates."],
      ["04", "Review and return", "Sentences, words, mistakes, and the dashboard bring you back to weak spots."]
    ],
    scenes: [
      ["Local video", "Native video playback, your own SRT/VTT, sentence sync, and replay."],
      ["Link companion", "Embed or open externally with manual analysis. No cross-origin page access."],
      ["Open conversation", "Translation, rewriting, nuance, and contextual follow-ups in one thread."]
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
    footer: "AI-assisted language learning workspace",
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
          <img src="images/hero-chat.png" alt="SceneGo conversation workspace" />
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
              <img src="images/conversation-analysis.png" alt="SceneGo streaming language analysis" loading="lazy" />
              <figcaption>SceneGo / Conversation</figcaption>
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
