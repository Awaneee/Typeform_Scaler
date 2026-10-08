import { createForm, expect, onQuestion, opts, q, test } from "./helpers";

/** 5. Typeform Experience + placeholders */

test("Conversational, one-at-a-time fill UI with transitions", async ({ page, request }) => {
  const form = await createForm(request, "Conversational", [q("short_text", "First?"), q("short_text", "Second?")], { publish: true });
  await page.goto(`/to/${form.slug}`);
  await onQuestion(page, "First?");
  await expect(page.getByText("Second?")).toHaveCount(0); // only one question on screen
  await page.getByRole("button", { name: "OK" }).click();
  await onQuestion(page, "Second?");
  await expect(page.getByText("First?")).toHaveCount(0);
});

test("Clean builder layout with live preview", async ({ page, request }) => {
  const form = await createForm(request, "Layout", [q("short_text", "Hello?")]);
  await page.goto(`/forms/${form.id}/edit`);
  await expect(page.getByRole("list", { name: "Questions" })).toBeVisible(); // left: question list
  await expect(page.getByRole("textbox", { name: "Question title" })).toHaveValue("Hello?"); // centre: canvas
  await expect(page.getByRole("complementary", { name: "Question settings" })).toBeVisible(); // right: settings
  for (const tab of ["content", "workflow", "connect", "share", "results"]) await expect(page.getByRole("button", { name: tab, exact: true }).or(page.getByRole("link", { name: tab, exact: true }))).toBeVisible();
  // Live: typing on the canvas updates the question list immediately.
  await page.getByRole("textbox", { name: "Question title" }).fill("Hello world?");
  await expect(page.getByLabel("Question 1: Hello world?")).toBeVisible();
});

test("Forms, modals and inline editing", async ({ page, request }) => {
  const form = await createForm(request, "Modals", [q("multiple_choice", "Pick", { options: opts("A") })]);
  await page.goto(`/forms/${form.id}/edit`);
  // Inline editing: choices are edited on the canvas, Enter adds the next one.
  await page.getByRole("textbox", { name: "Choice A" }).fill("Apple");
  await page.getByRole("textbox", { name: "Choice A" }).press("Enter");
  await page.keyboard.type("Banana");
  await expect(page.getByRole("textbox", { name: "Choice B" })).toHaveValue("Banana");
  // Modal: question picker opens and closes with Escape.
  await page.getByRole("button", { name: "Add content" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Notifications / toasts", async ({ page, request }) => {
  await createForm(request, "Toast", [q("short_text", "Name")]);
  await page.goto("/workspace");
    await page.waitForLoadState("networkidle"); // let React hydrate before clicking
  await page.getByRole("button", { name: "Actions for E2E Toast", exact: true }).click();
  await page.getByRole("menuitem", { name: "Publish" }).click();
  await expect(page.getByText("Form published. It's live!")).toBeVisible();
});

test("Settings placeholders (theme picker + editable thank-you screen)", async ({ page, request }) => {
  const form = await createForm(request, "Theme", [q("short_text", "Name")]);
  await page.goto(`/forms/${form.id}/edit`);
  await page.getByRole("button", { name: "Design" }).click();
  for (const t of ["Classic", "Lavender", "Ocean", "Midnight"]) await expect(page.getByRole("button", { name: new RegExp(t) })).toBeVisible();
  await page.getByRole("button", { name: /Lavender/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Thanks for completing this form/ }).click();
  await expect(page.getByRole("textbox", { name: "Thank you title" })).toBeVisible();
  await page.waitForTimeout(1000);
  expect((await (await request.get(`/api/v1/forms/${form.id}`)).json()).settings.theme).toBe("lavender");
});

test.describe("Mocked / placeholder sections", () => {
  test("Integrations / webhooks (\"Coming soon\" in workspace header)", async ({ page }) => {
    await page.goto("/workspace");
    await page.waitForLoadState("networkidle"); // let React hydrate before clicking
    await page.getByRole("button", { name: "Integrations", exact: true }).click();
    await expect(page.getByText("Integrations is coming soon")).toBeVisible();
  });

  test("Team collaboration & sharing (\"Coming soon\" in sidebar)", async ({ page }) => {
    await page.goto("/workspace");
    await page.waitForLoadState("networkidle"); // let React hydrate before clicking
    await page.getByRole("button", { name: "Invite your team" }).click();
    await expect(page.getByText("Team collaboration is coming soon")).toBeVisible();
  });

  test("Payment / file-upload question types (Payment is \"Coming soon\" in the picker; file upload implemented as a bonus)", async ({ page, request }) => {
    const form = await createForm(request, "Picker", []);
    await page.goto(`/forms/${form.id}/edit`);
    await page.getByRole("button", { name: "Add content" }).first().click();
    const picker = page.getByRole("dialog");
    await expect(picker.getByTitle("Coming soon").filter({ hasText: "Payment" })).toBeVisible();
    await expect(picker.getByRole("button", { name: "File Upload", exact: true })).toBeEnabled();
  });

  test("Simplified auth (one default logged-in creator)", async ({ page }) => {
    const me = await (await page.request.get("/api/v1/me")).json();
    expect(me.email).toBe("creator@example.com");
    await page.goto("/workspace");
    await page.waitForLoadState("networkidle"); // let React hydrate before clicking
    await expect(page.getByRole("button", { name: `${me.name}'s account` })).toBeVisible();
  });
});
