import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "@/app/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { LeadCreatePage } from "@/pages/LeadCreatePage";
import { LeadDetailPage } from "@/pages/LeadDetailPage";
import { LeadsKanbanPage } from "@/pages/LeadsKanbanPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TasksPage } from "@/pages/TasksPage";

export const router = createBrowserRouter([
  {
    path: "/",
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
]);
