import type { PropsWithChildren } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage.js";
import { LearningLibraryPage } from "../pages/LearningLibraryPage.js";
import { PlayerStudyPage } from "../pages/PlayerStudyPage.js";
import { ProjectCreatePage } from "../pages/ProjectCreatePage.js";
import { ProjectListPage } from "../pages/ProjectListPage.js";
import { ReportPage } from "../pages/ReportPage.js";
import { ReviewTodayPage } from "../pages/ReviewTodayPage.js";
import { StudyItemDetailPage } from "../pages/StudyItemDetailPage.js";
import { TextStudyPage } from "../pages/TextStudyPage.js";
import { useAuthStore } from "../stores/authStore.js";

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <TextStudyPage />
          </RequireAuth>
        }
      />
      <Route path="/chat" element={<Navigate to="/" replace />} />
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
      <Route path="/text-study" element={<Navigate to="/" replace />} />
      <Route
        path="/review/today"
        element={
          <RequireAuth>
            <ReviewTodayPage />
          </RequireAuth>
        }
      />
      <Route path="/mistakes" element={<Navigate to="/library?type=mistakes" replace />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <ReportPage />
          </RequireAuth>
        }
      />
      <Route path="/report" element={<Navigate to="/dashboard" replace />} />
      <Route path="/study-history" element={<Navigate to="/library" replace />} />
      <Route
        path="/study-items/:itemId"
        element={
          <RequireAuth>
            <StudyItemDetailPage />
          </RequireAuth>
        }
      />
      <Route path="/sentences" element={<Navigate to="/library?type=sentences" replace />} />
      <Route
        path="/library"
        element={
          <RequireAuth>
            <LearningLibraryPage />
          </RequireAuth>
        }
      />
      <Route path="/words" element={<Navigate to="/library?type=words" replace />} />
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
