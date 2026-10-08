import { createForm, expect, opts, q, submit, test } from "./helpers";

/** 4. Results / Responses */

async function formWithResponses(request: Parameters<typeof createForm>[0], count = 3) {
  const colours = opts("Red", "Green");
  const qs = [
    q("short_text", "Name"),
    q("multiple_choice", "Colour", { options: colours }),
    q("yes_no", "Coming?"),
    q("rating", "Rate", { settings: { steps: 5 } }),
    q("number", "Age"),
  ];
  const form = await createForm(request, "Results", qs, { publish: true });
  const [name, colour, coming, rate, age] = qs.map((x) => x.id);
  const rows = [
    { [name]: "Ada", [colour]: [colours[0].id], [coming]: true, [rate]: 5, [age]: 36 },
    { [name]: "Bob", [colour]: [colours[0].id], [coming]: false, [rate]: 3, [age]: 20 },
    { [name]: "Cy", [colour]: [colours[1].id], [coming]: true, [rate]: 4, [age]: 31 },
  ];
  for (const r of rows.slice(0, count)) expect((await submit(request, form.slug!, r)).status()).toBe(201);
  return form;
}

test("Per-form responses view (paginated table, newest first, answers resolved to labels)", async ({ page, request }) => {
  const form = await formWithResponses(request);
  await page.goto(`/forms/${form.id}/results`);
  await page.getByRole("button", { name: /^responses/i }).click();
  const rows = page.getByRole("row", { name: /Open response/ });
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Cy"); // newest first
  await expect(rows.first()).toContainText("Green"); // option id resolved to its label
  await expect(rows.first()).toContainText("Yes");
  await expect(page.getByText("1–3 of 3")).toBeVisible();
  const page2 = await (await request.get(`/api/v1/forms/${form.id}/submissions?page=2&page_size=2`)).json();
  expect(page2.items).toHaveLength(1);
});

test("View an individual response in full (side panel, questions as that respondent saw them + form version)", async ({ page, request }) => {
  const form = await formWithResponses(request, 1);
  await page.goto(`/forms/${form.id}/results`);
  await page.getByRole("button", { name: /^responses/i }).click();
  await page.getByRole("row", { name: "Open response 1" }).click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByRole("heading", { name: "Response #1" })).toBeVisible();
  await expect(panel).toContainText("form version 1");
  for (const text of ["Name", "Ada", "Colour", "Red", "Coming?", "Yes", "Rate", "5/5", "Age", "36"]) await expect(panel).toContainText(text);
});

test("Basic summary stats per question (choice/yes-no bars with % and counts, rating average + distribution, number avg/min/max, recent text answers)", async ({ page, request }) => {
  const form = await formWithResponses(request);
  await page.goto(`/forms/${form.id}/results`);
  const card = (title: string) => page.locator("section", { has: page.getByRole("heading", { name: title, exact: true }) });
  await expect(card("Colour")).toContainText("66.7% (2)"); // Red
  await expect(card("Colour")).toContainText("33.3% (1)"); // Green
  await expect(card("Coming?")).toContainText("66.7% (2)");
  await expect(card("Rate")).toContainText("4");
  await expect(card("Rate")).toContainText("average rating");
  await expect(card("Age")).toContainText("29"); // average of 36, 20, 31
  await expect(card("Age")).toContainText("20");
  await expect(card("Age")).toContainText("36");
  await expect(card("Name")).toContainText("Cy");
  await expect(card("Name")).toContainText("3 out of 3 people answered this question");
});

test("All responses persist", async ({ page, request }) => {
  const form = await formWithResponses(request);
  // Read back through a fresh request context (straight from SQLite), then via the UI after a reload.
  const data = await (await page.request.get(`/api/v1/forms/${form.id}/submissions`)).json();
  expect(data.total).toBe(3);
  await page.goto(`/forms/${form.id}/results`);
  await page.reload();
  await expect(page.getByRole("button", { name: /^responses/i })).toContainText("3");
});
