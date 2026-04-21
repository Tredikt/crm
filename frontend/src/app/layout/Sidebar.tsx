import {
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  Settings,
  UserCircle,
  UserPlus,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/shared/lib/cn";

const nav = [
  { to: "/", label: "Дашборд", icon: LayoutDashboard },
  { to: "/leads", label: "Воронка", icon: KanbanSquare },
  { to: "/leads/new", label: "Новый клиент", icon: UserPlus },
  { to: "/projects", label: "Проекты", icon: FolderKanban },
  { to: "/tasks", label: "Задачи", icon: ListTodo },
  { to: "/settings", label: "Настройки", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-line bg-surface-card">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <UserCircle className="h-5 w-5 text-ink-muted" />
        <span className="text-sm font-semibold tracking-tight">LidoCRM</span>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/" || to === "/leads"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors",
                isActive
                  ? "bg-surface-muted text-ink"
                  : "hover:bg-surface-muted hover:text-ink",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
