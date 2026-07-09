import { useQueryClient } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import { useLocalMediaStore } from "../stores/localMediaStore.js";
import { AppRouter } from "./router.js";

const navItems = [
  { to: "/text-study", label: "文本学习" },
  { to: "/projects", label: "项目" },
  { to: "/study-history", label: "学习历史" },
  { to: "/sentences", label: "句子本" },
  { to: "/words", label: "生词本" }
];

export function App() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearAllProjectVideos = useLocalMediaStore((state) => state.clearAllProjectVideos);
  const queryClient = useQueryClient();

  function handleLogout() {
    clearAllProjectVideos();
    queryClient.clear();
    clearSession();
  }

  return (
    <div className="min-h-screen bg-panel text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <NavLink to="/text-study" className="text-lg font-semibold">
            SceneGo
          </NavLink>
          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "rounded px-3 py-2 text-sm font-medium",
                    isActive ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100"
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex min-w-40 items-center justify-end gap-3 text-sm">
            {user ? (
              <>
                <span className="max-w-40 truncate text-slate-600">{user.nickname ?? user.email}</span>
                <button className="rounded border border-line px-3 py-2 text-slate-700" type="button" onClick={handleLogout}>
                  退出
                </button>
              </>
            ) : (
              <NavLink className="rounded border border-line px-3 py-2 text-slate-700" to="/login">
                登录
              </NavLink>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">
        <AppRouter />
      </main>
    </div>
  );
}
