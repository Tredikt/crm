import type { Tag, TagCreatePayload } from "@/entities/tag/types";
import { apiRequest } from "@/shared/api/http";

export function fetchTags() {
  return apiRequest<Tag[]>("/tags");
}

export function createTag(body: TagCreatePayload) {
  return apiRequest<Tag>("/tags", { method: "POST", json: body });
}

export type { Tag };
