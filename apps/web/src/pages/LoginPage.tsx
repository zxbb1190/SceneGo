import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login, register, type AuthInput } from "../api/auth.js";
import { ApiRequestError } from "../api/http.js";
import { useAuthStore } from "../stores/authStore.js";
import { useLocalMediaStore } from "../stores/localMediaStore.js";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const clearAllProjectVideos = useLocalMediaStore((state) => state.clearAllProjectVideos);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState<AuthInput>({
    email: "",
    password: "",
    nickname: ""
  });

  useEffect(() => {
    if (accessToken) {
      navigate("/text-study", { replace: true });
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
      navigate("/text-study", { replace: true });
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    authMutation.mutate();
  }

  const errorMessage =
    authMutation.error instanceof ApiRequestError ? authMutation.error.message : authMutation.error?.message;

  return (
    <section className="mx-auto max-w-md rounded border border-line bg-white p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{mode === "login" ? "登录" : "注册"}</h1>
        <button
          className="rounded border border-line px-3 py-2 text-sm text-slate-700"
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "去注册" : "去登录"}
        </button>
      </div>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label className="block text-sm font-medium">
            昵称
            <input
              className="mt-1 w-full rounded border border-line px-3 py-2"
              value={form.nickname ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
            />
          </label>
        ) : null}
        <label className="block text-sm font-medium">
          邮箱
          <input
            className="mt-1 w-full rounded border border-line px-3 py-2"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          密码
          <input
            className="mt-1 w-full rounded border border-line px-3 py-2"
            type="password"
            minLength={8}
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
        </label>
        {errorMessage ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p> : null}
        <button
          className="w-full rounded bg-ink px-4 py-2 font-semibold text-white disabled:opacity-50"
          type="submit"
          disabled={authMutation.isPending}
        >
          {authMutation.isPending ? "处理中..." : "进入"}
        </button>
      </form>
    </section>
  );
}

function optionalString(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}
