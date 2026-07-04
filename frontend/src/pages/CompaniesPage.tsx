import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { Company } from "@/entities/company/types";
import { queryKeys } from "@/shared/api/query-keys";
import { createCompany, fetchCompanies } from "@/shared/api/companies";
import { QueryError } from "@/widgets/query-error/QueryError";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Dialog } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Badge } from "@/shared/ui/badge";

export function CompaniesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const listQuery = useQuery({
    queryKey: queryKeys.companies.list(search),
    queryFn: () => fetchCompanies({ search: search || undefined, include_inactive: true, limit: 500 }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createCompany({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      }),
    onSuccess: async () => {
      setName("");
      setPhone("");
      setEmail("");
      setCreateOpen(false);
      await qc.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });

  const displayed = useMemo(() => {
    const rows = [...(listQuery.data ?? [])];
    rows.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return rows;
  }, [listQuery.data]);

  if (listQuery.isError) return <QueryError error={listQuery.error} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Building2 className="mt-0.5 h-5 w-5 text-ink-muted" />
          <div>
            <h1 className="text-lg font-semibold text-ink">Компании</h1>
            <p className="text-sm text-ink-muted">B2B-клиенты и организации</p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Новая компания
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по названию…"
        className="max-w-md"
      />

      {listQuery.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : displayed.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
          Компаний пока нет
        </p>
      ) : (
        <div className="space-y-2">
          {displayed.map((c: Company) => (
            <Card key={c.id} className={!c.is_active ? "opacity-60" : undefined}>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{c.name}</span>
                  {!c.is_active ? <Badge tone="neutral">Архив</Badge> : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-muted">
                  {c.phone ? <span>{c.phone}</span> : null}
                  {c.email ? <span>{c.email}</span> : null}
                  {c.website ? (
                    <a href={c.website} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                      {c.website}
                    </a>
                  ) : null}
                </div>
                <Link to="/leads" className="mt-2 inline-block text-xs text-accent hover:underline">
                  Назначить на лиде →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen} title="Новая компания">
        <div className="space-y-3">
          <div>
            <Label>Название</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Телефон</Label>
            <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button
            className="w-full"
            variant="primary"
            disabled={!name.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            Создать
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
