import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { formatDateTime, isDueToday } from "@/shared/lib/dates";
import { queryKeys } from "@/shared/api/query-keys";
import { QueryError } from "@/widgets/query-error/QueryError";
import {
  fetchLeadsNextActionDue,
  fetchLeadsNoContact,
  fetchTasksOverdue,
  fetchTasksToday,
} from "@/services/api";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

function startOfLocalDay(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function isLeadNextOverdue(iso: string): boolean {
  return new Date(iso) < startOfLocalDay();
}

export function DashboardPage() {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.tasks.today(),
        queryFn: fetchTasksToday,
      },
      {
        queryKey: queryKeys.tasks.overdue(),
        queryFn: fetchTasksOverdue,
      },
      {
        queryKey: queryKeys.leads.noContact(7),
        queryFn: () => fetchLeadsNoContact(7),
      },
      {
        queryKey: queryKeys.leads.nextActionDue(),
        queryFn: fetchLeadsNextActionDue,
      },
    ],
  });

  const [todayTasks, overdueTasks, stale, nextDue] = results;
  const err = results.find((r) => r.isError)?.error;

  if (err) return <QueryError error={err} />;

  const loading = results.some((r) => r.isPending);

  const nextDueList = nextDue.data ?? [];
  const nextToday = nextDueList.filter(
    (l) => l.next_action_at && isDueToday(l.next_action_at),
  );
  const nextStale = nextDueList.filter(
    (l) => l.next_action_at && isLeadNextOverdue(l.next_action_at),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Дашборд</h1>
        <p className="text-sm text-ink-muted">Сводка на сегодня</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Задачи на сегодня</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (todayTasks.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-ink-muted">Нет задач на сегодня</p>
            ) : (
              todayTasks.data!.map((t) => (
                <Link
                  key={t.id}
                  to="/tasks"
                  className="block rounded-md border border-line px-3 py-2 text-sm hover:bg-surface-muted"
                >
                  <span className="font-medium text-ink">{t.title}</span>
                  {t.due_at ? (
                    <span className="ml-2 text-xs text-ink-muted">
                      {formatDateTime(t.due_at)}
                    </span>
                  ) : null}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Просроченные задачи</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (overdueTasks.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-ink-muted">Просроченных нет</p>
            ) : (
              overdueTasks.data!.map((t) => (
                <Link
                  key={t.id}
                  to="/tasks"
                  className="block rounded-md border border-red-100 bg-red-50/60 px-3 py-2 text-sm hover:bg-red-50"
                >
                  <span className="font-medium text-ink">{t.title}</span>
                  {t.due_at ? (
                    <Badge tone="danger" className="ml-2">
                      {formatDateTime(t.due_at)}
                    </Badge>
                  ) : null}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Без касания (7+ дней)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (stale.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-ink-muted">Все ок</p>
            ) : (
              stale.data!.slice(0, 8).map((l) => (
                <Link
                  key={l.id}
                  to={`/leads/${l.id}`}
                  className="block rounded-md border border-line px-3 py-2 text-sm hover:bg-surface-muted"
                >
                  {l.full_name}
                  {l.last_contact_at ? (
                    <span className="ml-2 text-xs text-ink-muted">
                      {formatDateTime(l.last_contact_at)}
                    </span>
                  ) : (
                    <Badge tone="warn" className="ml-2">
                      нет даты
                    </Badge>
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Следующий шаг</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-ink-muted">
                    Просрочено
                  </p>
                  {nextStale.length === 0 ? (
                    <p className="text-sm text-ink-muted">—</p>
                  ) : (
                    <ul className="space-y-1">
                      {nextStale.slice(0, 6).map((l) => (
                        <li key={l.id}>
                          <Link
                            to={`/leads/${l.id}`}
                            className="text-sm text-ink hover:underline"
                          >
                            {l.full_name}
                          </Link>
                          {l.next_action_at ? (
                            <span className="text-xs text-red-700">
                              {" "}
                              ({formatDateTime(l.next_action_at)})
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-ink-muted">
                    На сегодня
                  </p>
                  {nextToday.length === 0 ? (
                    <p className="text-sm text-ink-muted">Нет на сегодня</p>
                  ) : (
                    <ul className="space-y-1">
                      {nextToday.slice(0, 6).map((l) => (
                        <li key={l.id}>
                          <Link
                            to={`/leads/${l.id}`}
                            className="text-sm text-ink hover:underline"
                          >
                            {l.full_name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
