import { request } from "@playwright/test";

/** Removes every form the tests created (titles start with "E2E "). */
export default async function globalTeardown() {
  const ctx = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const forms: { id: string; title: string }[] = await (await ctx.get("/api/v1/forms")).json();
  for (const f of forms.filter((f) => f.title.startsWith("E2E "))) await ctx.delete(`/api/v1/forms/${f.id}`);
  await ctx.dispose();
}
