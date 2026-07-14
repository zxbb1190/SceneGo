import type { PropsWithChildren } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage.js";
import { MistakesPage } from "../pages/MistakesPage.js";
import { PlayerStudyPage } from "../pages/PlayerStudyPage.js";
import { ProjectCreatePage } from "../pages/ProjectCreatePage.js";
import { ProjectListPage } from "../pages/ProjectListPage.js";
import { ReportPage } from "../pages/ReportPage.js";
import { ReviewTodayPage } from "../pages/ReviewTodayPage.js";
import { SentenceBookPage } from "../pages/SentenceBookPage.js";
import { StudyHistoryPage } from "../pages/StudyHistoryPage.js";
import { StudyItemDetailPage } from "../pages/StudyItemDetailPage.js";
import { TextStudyPage } from "../pages/TextStudyPage.js";
import { WordBookPage } from "../pages/WordBookPage.js";
import { useAuthStore } from "../stores/authStore.js";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/text-study" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/projects"
        element={
          <RequireAuth>
            <ProjectListPage />
          </RequireAuth>
        }
      />
      <Route
        path="/projects/new"
        element={
          <RequireAuth>
            <ProjectCreatePage />
          </RequireAuth>
        }
      />
      <Route
        path="/projects/:projectId/study"
        element={
          <RequireAuth>
            <PlayerStudyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/text-study"
        element={
          <RequireAuth>
            <TextStudyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/review/today"
        element={
          <RequireAuth>
            <ReviewTodayPage />
          </RequireAuth>
        }
      />
      <Route
        path="/mistakes"
        element={
          <RequireAuth>
            <MistakesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/report"
        element={
          <RequireAuth>
            <ReportPage />
          </RequireAuth>
        }
      />
      <Route
        path="/study-history"
        element={
          <RequireAuth>
            <StudyHistoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/study-items/:itemId"
        element={
          <RequireAuth>
            <StudyItemDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sentences"
        element={
          <RequireAuth>
            <SentenceBookPage />
          </RequireAuth>
        }
      />
      <Route
        path="/words"
        element={
          <RequireAuth>
            <WordBookPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function RequireAuth({ children }: PropsWithChildren) {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
