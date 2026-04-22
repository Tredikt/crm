import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "@/app/layout/AppLayout";
import { RequireAuth } from "@/app/RequireAuth";
import { DashboardPage } from "@/pages/DashboardPage";
import { LeadCreatePage } from "@/pages/LeadCreatePage";
import { LeadDetailPage } from "@/pages/LeadDetailPage";
import { LeadsKanbanPage } from "@/pages/LeadsKanbanPage";
import { LoginPage } from "@/pages/LoginPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TasksPage } from "@/pages/TasksPage";

import type { UserMe } from "@/shared/api/auth";

export type AppOutletContext = { user: UserMe };

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "leads", element: <LeadsKanbanPage /> },
          { path: "leads/new", element: <LeadCreatePage /> },
          { path: "leads/:leadId", element: <LeadDetailPage /> },
          { path: "projects", element: <ProjectsPage /> },
          { path: "projects/:projectId", element: <ProjectDetailPage /> },
          { path: "tasks", element: <TasksPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
