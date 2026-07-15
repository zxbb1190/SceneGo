import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "../stores/authStore.js";
import { LoginPage } from "./LoginPage.js";

describe("LoginPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ accessToken: undefined, user: undefined });
  });

  it("renders the SceneGo account experience and switches to registration", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    expect(screen.getByRole("heading", { name: "SceneGo", level: 1 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "欢迎回来" })).toBeTruthy();
    expect(screen.getByPlaceholderText("name@example.com")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "注册" }));

    expect(screen.getByRole("heading", { name: "创建你的账户" })).toBeTruthy();
    expect(screen.getByPlaceholderText("你的称呼")).toBeTruthy();
  });

  it("switches theme and exposes password visibility control", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("scenego.theme", "dark");
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText("至少 8 位字符");
    expect(passwordInput.getAttribute("type")).toBe("password");

    await user.click(screen.getByRole("button", { name: "显示密码" }));
    expect(passwordInput.getAttribute("type")).toBe("text");

    await user.click(screen.getByRole("button", { name: "切换到浅色主题" }));
    expect(document.querySelector<HTMLElement>(".auth-page")?.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("scenego.theme")).toBe("light");
  });
});

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}
