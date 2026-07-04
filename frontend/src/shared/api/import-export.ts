import { getAccessToken } from "@/shared/lib/auth-storage";

const API_BASE = "/api/v1";

async function downloadCsv(path: string, filename: string) {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportLeadsCsv() {
  return downloadCsv("/import-export/leads.csv", "leads.csv");
}

export function exportDealsCsv() {
  return downloadCsv("/import-export/deals.csv", "deals.csv");
}

export async function importLeadsCsv(file: File): Promise<{ created: number }> {
  const token = getAccessToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/import-export/leads/import`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Import failed: ${res.status}`);
  }
  return res.json();
}

export async function importDealsCsv(file: File): Promise<{ created: number }> {
  const token = getAccessToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/import-export/deals/import`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Import failed: ${res.status}`);
  }
  return res.json();
}
