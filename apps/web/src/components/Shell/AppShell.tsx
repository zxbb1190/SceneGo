import type { PropsWithChildren } from "react";
import {
  ArrowLeft,
  BookOpenText,
  Brain,
  ChartNoAxesCombined,
  Clapperboard,
  LibraryBig,
  LogOut,
  MessageCircle,
  Moon,
  Plus,
  SquarePen,
  Sun
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useSceneTheme, type SceneTheme } from "./useSceneTheme.js";

export interface AppShellProps extends PropsWithChildren {
  onLogout: () => void;
  userName: string;
}

interface NavigationItem {
  icon: typeof MessageCircle;
  label: string;
  to: string;
}

const navigationItems: NavigationItem[] = [
  { icon: MessageCircle, label: "对话", to: "/" },
  { icon: Clapperboard, label: "项目", to: "/projects" },
  { icon: LibraryBig, label: "学习库", to: "/library" },
  { icon: ChartNoAxesCombined, label: "仪表盘", to: "/dashboard" }
];

export function AppShell({ children, onLogout, userName }: AppShellProps) {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);
  const { theme, toggleTheme } = useSceneTheme();

  return (
    <div className="scene-app" data-theme={theme}>
      <aside className="scene-rail" aria-label="主导航">
        <Link className="scene-brand-mark" to="/" aria-label="SceneGo 对话首页">
          S
        </Link>
        <nav className="scene-rail-nav">
          {navigationItems.map((item) => (
            <SceneNavLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="scene-rail-footer">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button className="scene-rail-button" type="button" title="退出登录" onClick={onLogout}>
            <LogOut aria-hidden="true" />
            <span>退出</span>
          </button>
          <span className="scene-profile" title={userName}>
            {getInitials(userName)}
          </span>
        </div>
      </aside>

      <div className="scene-workspace">
        <header className="scene-topbar">
          <div className="scene-topbar-title">
            <p>{routeMeta.eyebrow}</p>
            <h1>{routeMeta.title}</h1>
          </div>
          <div className="scene-topbar-actions">
            <ThemeToggle mobile theme={theme} onToggle={toggleTheme} />
            <TopbarAction path={location.pathname} />
          </div>
        </header>
        <main className={routeMeta.immersive ? "scene-main scene-main-immersive" : "scene-main"}>{children}</main>
      </div>

      <nav className="scene-mobile-nav" aria-label="移动导航">
        {navigationItems.map((item) => (
          <SceneNavLink key={item.to} item={item} mobile />
        ))}
      </nav>
    </div>
  );
}

function ThemeToggle({ mobile = false, onToggle, theme }: { mobile?: boolean; onToggle: () => void; theme: SceneTheme }) {
  const isDark = theme === "dark";
  const label = isDark ? "切换到浅色主题" : "切换到深色主题";
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      aria-label={label}
      className={mobile ? "scene-theme-button scene-theme-button-mobile" : "scene-rail-button"}
      title={label}
      type="button"
      onClick={onToggle}
    >
      <Icon aria-hidden="true" />
      {!mobile && <span>{isDark ? "浅色" : "深色"}</span>}
    </button>
  );
}

function SceneNavLink({ item, mobile = false }: { item: NavigationItem; mobile?: boolean }) {
  const Icon = item.icon;

  return (
    <NavLink
      className={({ isActive }) =>
        [mobile ? "scene-mobile-nav-link" : "scene-rail-button", isActive ? "is-active" : ""].filter(Boolean).join(" ")
      }
      end={item.to === "/"}
      to={item.to}
      title={item.label}
    >
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function TopbarAction({ path }: { path: string }) {
  if (path === "/" || path === "/chat") {
    return (
      <Link className="scene-topbar-action" to="/?new=1">
        <SquarePen aria-hidden="true" />
        <span>新对话</span>
      </Link>
    );
  }

  if (path === "/projects") {
    return (
      <Link className="scene-topbar-action" to="/projects/new">
        <Plus aria-hidden="true" />
        <span>新建项目</span>
      </Link>
    );
  }

  if (path.startsWith("/projects/") && path !== "/projects/new") {
    return (
      <Link className="scene-topbar-icon" to="/projects" title="返回项目">
        <ArrowLeft aria-hidden="true" />
      </Link>
    );
  }

  if (path === "/library") {
    return (
      <Link className="scene-topbar-action" to="/">
        <BookOpenText aria-hidden="true" />
        <span>分析内容</span>
      </Link>
    );
  }

  if (path === "/dashboard") {
    return (
      <Link className="scene-topbar-action" to="/review/today">
        <Brain aria-hidden="true" />
        <span>开始复习</span>
      </Link>
    );
  }

  return null;
}

export function getRouteMeta(path: string): { eyebrow: string; immersive: boolean; title: string } {
  if (path === "/" || path === "/chat") {
    return { eyebrow: "Conversation / English coach", immersive: true, title: "口语表达辨析" };
  }

  if (path === "/projects") {
    return { eyebrow: "Projects / Learning context", immersive: true, title: "学习项目" };
  }

  if (path === "/projects/new") {
    return { eyebrow: "Projects / New", immersive: false, title: "新建项目" };
  }

  if (path.startsWith("/projects/")) {
    return { eyebrow: "Project / Scene study", immersive: false, title: "项目学习" };
  }

  if (path === "/library") {
    return { eyebrow: "Knowledge / Saved learning", immersive: true, title: "学习库" };
  }

  if (path === "/dashboard") {
    return { eyebrow: "Progress / Learning report", immersive: true, title: "学习仪表盘" };
  }

  if (path === "/review/today") {
    return { eyebrow: "Review / Today", immersive: false, title: "今日复习" };
  }

  if (path.startsWith("/study-items/")) {
    return { eyebrow: "Library / Detail", immersive: false, title: "学习内容" };
  }

  return { eyebrow: "SceneGo / Learning", immersive: false, title: "SceneGo" };
}

function getInitials(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "SG";
  }

  return normalized.slice(0, 2).toUpperCase();
}
