import { expect, test } from "./helpers";

/** Important notes / deliverables (the parts checkable from the running app). */

test("Seed data: published forms with mixed question types and existing responses", async ({ request }) => {
  const forms: { title: string; status: string; response_count: number; id: string }[] = await (await request.get("/api/v1/forms")).json();
  const seeded = Object.fromEntries(forms.filter((f) => !f.title.startsWith("E2E ")).map((f) => [f.title, f]));
  for (const title of ["Event Registration", "Product Feedback"]) {
    expect(seeded[title], title).toBeDefined();
    expect(seeded[title].status).toBe("published");
    expect(seeded[title].response_count).toBeGreaterThanOrEqual(18);
  }
  expect(seeded["Job Application"]).toBeDefined();
  const types = new Set<string>();
  for (const f of Object.values(seeded)) for (const qn of (await (await request.get(`/api/v1/forms/${f.id}`)).json()).questions) types.add(qn.type);
  expect([...types].sort()).toEqual(["dropdown", "email", "file_upload", "long_text", "multiple_choice", "number", "rating", "short_text", "yes_no"]);
});
