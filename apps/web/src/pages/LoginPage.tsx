import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Moon, Sun, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { login, register, type AuthInput } from "../api/auth.js";
import { ApiRequestError } from "../api/http.js";
import { useSceneTheme } from "../components/Shell/useSceneTheme.js";
import { useAuthStore } from "../stores/authStore.js";
import { useLocalMediaStore } from "../stores/localMediaStore.js";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const clearAllProjectVideos = useLocalMediaStore((state) => state.clearAllProjectVideos);
  const { theme, toggleTheme } = useSceneTheme();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<AuthInput>({
    email: "",
    password: "",
    nickname: ""
  });

  useEffect(() => {
    if (accessToken) {
      navigate("/", { replace: true });
    }
  }, [accessToken, navigate]);

  const authMutation = useMutation({
    mutationFn: () =>
      mode === "login"
        ? login(form)
        : register({
            ...form,
            nickname: optionalString(form.nickname)
          }),
    onSuccess: (session) => {
      clearAllProjectVideos();
      queryClient.clear();
      setSession(session);
      navigate("/", { replace: true });
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    authMutation.mutate();
  }

  function selectMode(nextMode: "login" | "register") {
    authMutation.reset();
    setMode(nextMode);
  }

  const errorMessage =
    authMutation.error instanceof ApiRequestError ? authMutation.error.message : authMutation.error?.message;

  return (
    <main className="auth-page" data-theme={theme}>
      <section className="auth-brand-panel" aria-labelledby="auth-brand-title">
        <header className="auth-brand-lockup">
          <span className="auth-brand-mark">S</span>
          <div>
            <strong>SceneGo</strong>
            <span>AI language workspace</span>
          </div>
        </header>

        <div className="auth-brand-content">
          <p className="auth-kicker">Learn through context / 01</p>
          <h1 id="auth-brand-title">SceneGo</h1>
          <p className="auth-brand-statement">在真实场景里，学会自然表达。</p>

          <div className="auth-scene-sample">
            <div className="auth-scene-meta">
              <span>Scene fragment</span>
              <span>00:18</span>
            </div>
            <p>I didn't catch that.</p>
            <span>我刚才没听清。</span>
            <div className="auth-waveform" aria-hidden="true">
              {Array.from({ length: 14 }, (_, index) => (
                <i key={index} />
              ))}
            </div>
          </div>
        </div>

        <footer className="auth-brand-footer">
          <span>OpenAI-compatible</span>
          <span>Self-hosted</span>
          <span>SceneGo / 0.3.0</span>
        </footer>
      </section>

      <section className="auth-access-panel" aria-labelledby="auth-form-title">
        <button
          aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
          className="auth-theme-button"
          title={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
          type="button"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>

        <div className="auth-form-shell">
          <header className="auth-form-heading">
            <p>Account access</p>
            <h2 id="auth-form-title">{mode === "login" ? "欢迎回来" : "创建你的账户"}</h2>
            <span>{mode === "login" ? "继续你的场景学习。" : "开始建立你的个人学习库。"}</span>
          </header>

          <div className="auth-mode-switch" role="tablist" aria-label="账户操作">
            <button
              aria-selected={mode === "login"}
              className={mode === "login" ? "is-active" : ""}
              role="tab"
              type="button"
              onClick={() => selectMode("login")}
            >
              登录
            </button>
            <button
              aria-selected={mode === "register"}
              className={mode === "register" ? "is-active" : ""}
              role="tab"
              type="button"
              onClick={() => selectMode("register")}
            >
              注册
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <label className="auth-field">
                <span>昵称</span>
                <div>
                  <UserRound aria-hidden="true" />
                  <input
                    autoComplete="nickname"
                    placeholder="你的称呼"
                    value={form.nickname ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
                  />
                </div>
              </label>
            ) : null}

            <label className="auth-field">
              <span>邮箱</span>
              <div>
                <Mail aria-hidden="true" />
                <input
                  autoComplete="email"
                  placeholder="name@example.com"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>密码</span>
              <div>
                <LockKeyhole aria-hidden="true" />
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="至少 8 位字符"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
                <button
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  className="auth-password-toggle"
                  title={showPassword ? "隐藏密码" : "显示密码"}
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </label>

            {errorMessage ? (
              <p className="auth-error" role="alert">
                <AlertCircle aria-hidden="true" />
                <span>{errorMessage}</span>
              </p>
            ) : null}

            <button className="auth-submit" type="submit" disabled={authMutation.isPending}>
              <span>{authMutation.isPending ? "处理中..." : mode === "login" ? "进入 SceneGo" : "创建账户"}</span>
              <ArrowRight aria-hidden="true" />
            </button>
          </form>

          <p className="auth-form-footer">SceneGo · Your learning stays yours</p>
        </div>
      </section>
    </main>
  );
}

function optionalString(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}
