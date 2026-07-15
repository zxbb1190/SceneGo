import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { AppShell } from "../components/Shell/AppShell.js";
import { useAuthStore } from "../stores/authStore.js";
import { useConversationStreamStore } from "../stores/conversationStreamStore.js";
import { useLocalMediaStore } from "../stores/localMediaStore.js";
import { AppRouter } from "./router.js";

export function App() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearAllProjectVideos = useLocalMediaStore((state) => state.clearAllProjectVideos);
  const resetConversationStreams = useConversationStreamStore((state) => state.reset);
  const queryClient = useQueryClient();

  function handleLogout() {
    clearAllProjectVideos();
    resetConversationStreams();
    queryClient.clear();
    clearSession();
  }

  if (location.pathname === "/login") {
    return <AppRouter />;
  }

  return (
    <AppShell onLogout={handleLogout} userName={user?.nickname ?? user?.email ?? "SceneGo"}>
      <AppRouter />
    </AppShell>
  );
}
