import { useOutletContext } from "react-router-dom";

import { Sidebar } from "@/app/layout/Sidebar";
import { Outlet } from "react-router-dom";

import type { AppOutletContext } from "@/app/router";

export function AppLayout() {
  const { user } = useOutletContext<AppOutletContext>();
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="min-h-screen flex-1 overflow-auto p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
