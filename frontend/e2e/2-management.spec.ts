import type { Page } from "@playwright/test";
import { createForm, PREFIX, q, submit, waitSaved, expect, test } from "./helpers";

/** 2. Form Management (CRUD) */

const row = (page: Page, title: string) =>
  page.locator("li", { has: page.getByRole("link", { name: title, exact: true }) });

async function openMenu(page: Page, title: string) {
  await page.getByRole("button", { name: `Actions for ${title}`, exact: true }).click();
}

test("List of the creator's forms with status (draft/published) and response count", async ({ page, request }) => {
  const live = await createForm(request, "List live", [q("short_text", "Name")], { publish: true });
  await createForm(request, "List draft", [q("short_text", "Name")]);
  await submit(request, live.slug!, { [live.questions[0].id]: "Ada" });
  await submit(request, live.slug!, { [live.questions[0].id]: "Bob" });

  await page.goto("/workspace");
  await page.waitForLoadState("networkidle"); // let React hydrate before clicking
  await page.getByRole("button", { name: "list view" }).click();
  await expect(row(page, `${PREFIX}List live`)).toContainText("Live");
  await expect(row(page, `${PREFIX}List live`)).toContainText("2");
  await expect(row(page, `${PREFIX}List draft`)).toContainText("Draft");
  await expect(row(page, `${PREFIX}List draft`)).toContainText("0");
});

test('Create a form (`/forms/new` → "Start from scratch")', async ({ page }) => {
  await page.goto("/workspace");
  await page.waitForLoadState("networkidle"); // let React hydrate before clicking
  await page.getByRole("link", { name: "Create form" }).click();
  await expect(page.getByRole("heading", { name: "What would you like to create?" })).toBeVisible();
  await page.getByRole("button", { name: /Start from scratch/ }).click();
  await expect(page).toHaveURL(/\/forms\/.+\/edit/);
  await page.getByRole("textbox", { name: "Form title" }).fill(`${PREFIX}Created from scratch`);
  await waitSaved(page);
  await page.goto("/workspace");
  await page.waitForLoadState("networkidle"); // let React hydrate before clicking
  await expect(page.getByRole("link", { name: `${PREFIX}Created from scratch` })).toBeVisible();
});

test("Rename a form", async ({ page, request }) => {
  await createForm(request, "Rename me", [q("short_text", "Name")]);
  await page.goto("/workspace");
  await page.waitForLoadState("networkidle"); // let React hydrate before clicking
  await openMenu(page, `${PREFIX}Rename me`);
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByRole("textbox", { name: "Form name" }).fill(`${PREFIX}Renamed`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Form renamed")).toBeVisible(); // toast
  await page.reload();
  await expect(page.getByRole("link", { name: `${PREFIX}Renamed`, exact: true })).toBeVisible();
});

test("Duplicate a form", async ({ page, request }) => {
  await createForm(request, "Original", [q("short_text", "Name"), q("email", "Email")]);
  await page.goto("/workspace");
  await page.waitForLoadState("networkidle"); // let React hydrate before clicking
  await openMenu(page, `${PREFIX}Original`);
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  const copy = page.getByRole("link", { name: `${PREFIX}Original (copy)` });
  await expect(copy).toBeVisible();
  await copy.click();
  await expect(page.getByLabel(/^Question 2: Email/)).toBeVisible();
});

test("Delete a form (with confirmation)", async ({ page, request }) => {
  await createForm(request, "Delete me", [q("short_text", "Name")]);
  await page.goto("/workspace");
  await page.waitForLoadState("networkidle"); // let React hydrate before clicking
  await openMenu(page, `${PREFIX}Delete me`);
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("can't be undone");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("link", { name: `${PREFIX}Delete me` })).toBeVisible();

  await openMenu(page, `${PREFIX}Delete me`);
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete form" }).click();
  await expect(page.getByRole("link", { name: `${PREFIX}Delete me` })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("link", { name: `${PREFIX}Delete me` })).toHaveCount(0);
});

test("Publish / unpublish", async ({ page, request }) => {
  const form = await createForm(request, "Publish toggle", [q("short_text", "Name")]);
  await page.goto("/workspace");
  await page.waitForLoadState("networkidle"); // let React hydrate before clicking
  await openMenu(page, `${PREFIX}Publish toggle`);
  await page.getByRole("menuitem", { name: "Publish" }).click();
  await expect(row(page, `${PREFIX}Publish toggle`)).toContainText("Live");
  const slug = (await (await request.get(`/api/v1/forms/${form.id}`)).json()).slug;
  expect((await request.get(`/api/v1/public/forms/${slug}`)).status()).toBe(200);

  await openMenu(page, `${PREFIX}Publish toggle`);
  await page.getByRole("menuitem", { name: "Unpublish" }).click();
  await expect(row(page, `${PREFIX}Publish toggle`)).toContainText("Draft");
  await page.goto(`/to/${slug}`);
  await expect(page.getByText("This form is closed")).toBeVisible();
});

test("Shareable public link generated (`/to/<slug>`, copy link in workspace + builder Share tab)", async ({
  page,
  request,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const form = await createForm(request, "Share link", [q("short_text", "Name")], { publish: true });

  await page.goto("/workspace");
  await page.waitForLoadState("networkidle"); // let React hydrate before clicking
  await openMenu(page, `${PREFIX}Share link`);
  await page.getByRole("menuitem", { name: "Copy link" }).click();
  await expect(page.getByText("Link copied to clipboard")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(`${new URL(page.url()).origin}/to/${form.slug}`); // built from the site's own origin

  await page.goto(`/forms/${form.id}/edit`);
  await page.getByRole("button", { name: "share" }).click();
  await expect(page.getByRole("textbox", { name: "Public link" })).toHaveValue(copied);

  const fresh = await (await context.browser()!.newContext()).newPage(); // no cookies, no storage
  await fresh.goto(copied);
  await expect(fresh.locator("main h1")).toContainText("Name");
});

test("All form definitions persist (SQLite)", async ({ page, request }) => {
  const form = await createForm(
    request,
    "Persist",
    [
      q("dropdown", "Pick", {
        options: [{ id: "o1", label: "One" }],
        required: true,
        settings: { placeholder: "Choose" },
      }),
    ],
    { settings: { theme: "ocean" } },
  );
  // A brand-new API context reads straight from the database.
  const saved = await (await request.get(`/api/v1/forms/${form.id}`)).json();
  expect(saved.settings.theme).toBe("ocean");
  expect(saved.questions[0]).toMatchObject({ title: "Pick", required: true, options: [{ id: "o1", label: "One" }] });
  await page.goto(`/forms/${form.id}/edit`);
  await expect(page.getByRole("textbox", { name: "Question title" })).toHaveValue("Pick");
});
