import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell, getRouteMeta } from "./AppShell.js";

describe("AppShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.removeProperty("color-scheme");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the four primary destinations and marks the current destination", () => {
    render(
      <MemoryRouter initialEntries={["/library"]}>
        <AppShell onLogout={vi.fn()} userName="learner@example.com">
          <p>Library content</p>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getAllByRole("link", { name: "对话" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "项目" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "学习库" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "仪表盘" })).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "学习库" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "学习库" }).every((link) => link.getAttribute("aria-current") === "page")).toBe(true);
  });

  it("runs the provided logout command", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell onLogout={onLogout} userName="learner@example.com">
          <p>Conversation</p>
        </AppShell>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "退出" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("switches theme and persists the preference", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("scenego.theme", "dark");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell onLogout={vi.fn()} userName="learner@example.com">
          <p>Conversation</p>
        </AppShell>
      </MemoryRouter>
    );

    const app = document.querySelector<HTMLElement>(".scene-app");
    expect(app?.dataset.theme).toBe("dark");

    await user.click(screen.getAllByRole("button", { name: "切换到浅色主题" })[0]);

    expect(app?.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("scenego.theme")).toBe("light");
  });

  it("uses the system light preference when no theme was saved", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell onLogout={vi.fn()} userName="learner@example.com">
          <p>Conversation</p>
        </AppShell>
      </MemoryRouter>
    );

    expect(document.querySelector<HTMLElement>(".scene-app")?.dataset.theme).toBe("light");
  });

  it("uses immersive layouts only for the migrated top-level surfaces", () => {
    expect(getRouteMeta("/").immersive).toBe(true);
    expect(getRouteMeta("/projects").immersive).toBe(true);
    expect(getRouteMeta("/library").immersive).toBe(true);
    expect(getRouteMeta("/dashboard").immersive).toBe(true);
    expect(getRouteMeta("/projects/new").immersive).toBe(false);
    expect(getRouteMeta("/review/today").immersive).toBe(false);
  });
});
