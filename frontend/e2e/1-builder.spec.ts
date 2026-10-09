import type { Page } from "@playwright/test";
import { createForm, getForm, PREFIX, q, waitSaved, expect, test } from "./helpers";

/** 1. Form Builder */

const listTitles = (page: Page) =>
  page
    .locator('ol[aria-label="Questions"] > li')
    .evaluateAll((items) =>
      items.map((li) =>
        (li.querySelector("[aria-label^='Question']")?.getAttribute("aria-label") ?? "").replace(/^Question \d+: /, ""),
      ),
    );

async function openPicker(page: Page) {
  await page.getByRole("button", { name: "Add content" }).first().click();
  return page.getByRole("dialog");
}

async function addViaPicker(page: Page, type: string, title: string) {
  await (await openPicker(page)).getByRole("button", { name: type, exact: true }).click();
  await page.getByRole("textbox", { name: "Question title" }).fill(title);
}

test("Create a form with a title and ordered list of questions", async ({ page, request }) => {
  await page.goto("/forms/new");
  await page.getByRole("button", { name: /Start from scratch/ }).click();
  await expect(page).toHaveURL(/\/forms\/.+\/edit/);
  const formId = page.url().split("/forms/")[1].split("/")[0];

  await page.getByRole("textbox", { name: "Form title" }).fill(`${PREFIX}Builder create`);
  await addViaPicker(page, "Short Text", "First question");
  await addViaPicker(page, "Email", "Second question");
  await waitSaved(page);

  const saved = await getForm(request, formId);
  expect(saved.title).toBe(`${PREFIX}Builder create`);
  expect(saved.questions.map((x: { title: string }) => x.title)).toEqual(["First question", "Second question"]);
});

test("Add questions (question picker modal, inserts after the selected question)", async ({ page, request }) => {
  const form = await createForm(request, "Builder add", [q("short_text", "A"), q("short_text", "C")]);
  await page.goto(`/forms/${form.id}/edit`);
  await page.getByLabel("Question 1: A").click();
  const picker = await openPicker(page);
  await expect(picker.getByRole("button", { name: "Add form elements" })).toBeVisible();
  await picker.getByRole("button", { name: "Number", exact: true }).click();
  await page.getByRole("textbox", { name: "Question title" }).fill("B");
  await waitSaved(page);
  expect(await listTitles(page)).toEqual(["A", "B", "C"]);
});

test("Edit questions (inline on the canvas + settings panel)", async ({ page, request }) => {
  const form = await createForm(request, "Builder edit", [q("short_text", "Old title")]);
  await page.goto(`/forms/${form.id}/edit`);
  await page.getByRole("textbox", { name: "Question title" }).fill("New title");
  await page.getByRole("textbox", { name: "Placeholder text" }).fill("Your name");
  await waitSaved(page);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Question title" })).toHaveValue("New title");
  const saved = await getForm(request, form.id);
  expect(saved.questions[0].settings.placeholder).toBe("Your name");
});

test("Reorder questions (drag-and-drop with dnd-kit, keyboard sortable too)", async ({ page, request }) => {
  const form = await createForm(request, "Builder reorder", [
    q("short_text", "One"),
    q("short_text", "Two"),
    q("short_text", "Three"),
  ]);
  await page.goto(`/forms/${form.id}/edit`);

  // Mouse drag: "Three" to the top.
  const src = (await page.getByLabel("Question 3: Three").boundingBox())!;
  const dst = (await page.getByLabel("Question 1: One").boundingBox())!;
  await page.mouse.move(src.x + 40, src.y + src.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++)
    await page.mouse.move(src.x + 40, src.y + src.height / 2 + ((dst.y + 4 - src.y - src.height / 2) * i) / 12);
  await page.mouse.up();
  await expect.poll(() => listTitles(page)).toEqual(["Three", "One", "Two"]);

  // Keyboard: focus "Three", Space to lift, ArrowDown, Space to drop.
  await page.getByLabel("Question 1: Three").focus();
  for (const key of ["Space", "ArrowDown", "Space"]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(250); // dnd-kit animates between keyboard steps
  }
  await expect.poll(() => listTitles(page)).toEqual(["One", "Three", "Two"]);

  await waitSaved(page);
  await page.reload();
  await expect.poll(() => listTitles(page)).toEqual(["One", "Three", "Two"]);
});

test("Delete questions (and duplicate)", async ({ page, request }) => {
  const form = await createForm(request, "Builder delete", [q("short_text", "Keep"), q("short_text", "Remove me")]);
  await page.goto(`/forms/${form.id}/edit`);
  await page.getByRole("button", { name: "Question 1 actions" }).click();
  await page.getByRole("menuitem", { name: "Duplicate" }).click();
  await expect.poll(() => listTitles(page)).toEqual(["Keep", "Keep", "Remove me"]);
  await page.getByRole("button", { name: "Question 3 actions" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect.poll(() => listTitles(page)).toEqual(["Keep", "Keep"]);
  await waitSaved(page);
  expect((await getForm(request, form.id)).questions).toHaveLength(2);
});

test("Question types in the builder: short text, long text, multiple choice, dropdown, email, number, yes/no, rating", async ({
  page,
  request,
}) => {
  const form = await createForm(request, "Builder types", []);
  await page.goto(`/forms/${form.id}/edit`);
  const types = ["Short Text", "Long Text", "Multiple Choice", "Dropdown", "Email", "Number", "Yes/No", "Rating"];
  for (const type of types) await addViaPicker(page, type, `${type} question`);
  await waitSaved(page);
  const saved = await getForm(request, form.id);
  expect(saved.questions.map((x: { type: string }) => x.type)).toEqual([
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
  ]);
});

test("Per-question settings: required toggle", async ({ page, request }) => {
  const form = await createForm(request, "Builder required", [q("short_text", "Name")]);
  await page.goto(`/forms/${form.id}/edit`);
  await page.getByRole("switch", { name: "Required" }).click();
  await expect(page.getByLabel("required", { exact: true })).toBeVisible(); // asterisk on canvas
  await waitSaved(page);
  expect((await getForm(request, form.id)).questions[0].required).toBe(true);
});

test("Per-question settings: description / help text", async ({ page, request }) => {
  const form = await createForm(request, "Builder description", [q("short_text", "Name")], { publish: true });
  await page.goto(`/forms/${form.id}/edit`);
  await page.getByRole("textbox", { name: "Question description" }).fill("As written on your ID");
  await waitSaved(page);
  await page.getByRole("button", { name: "Publish changes" }).click();
  await page.goto(`/to/${form.slug}`);
  await expect(page.getByText("As written on your ID")).toBeVisible();
});

test("Live preview of the form (canvas is a live WYSIWYG preview with desktop/mobile toggle + full Preview page that never saves)", async ({
  page,
  request,
  context,
}) => {
  const form = await createForm(request, "Builder preview", [q("short_text", "Your name?", { required: true })]);
  await page.goto(`/forms/${form.id}/edit`);

  // Canvas updates live with the theme and the device toggle.
  const canvas = page.locator("main .rounded-xl.border").first();
  await page.getByRole("button", { name: "Design" }).click();
  await page.getByRole("button", { name: /Midnight/ }).click();
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveCSS("background-color", "rgb(30, 27, 46)");
  const desktopWidth = (await canvas.boundingBox())!.width;
  await page.getByRole("button", { name: "mobile preview" }).click();
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeLessThanOrEqual(375);
  expect(desktopWidth).toBeGreaterThan(375);

  // Preview opens the real respondent flow on the draft, and submitting saves nothing.
  const [preview] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("button", { name: "Preview", exact: true }).click(),
  ]);
  await expect(preview.getByText("Preview")).toBeVisible();
  await expect(preview.locator("main h1")).toContainText("Your name?");
  await preview.keyboard.type("Ada");
  await preview.keyboard.press("Enter");
  await expect(preview.getByText("Thanks for completing this form")).toBeVisible();
  expect((await getForm(request, form.id)).response_count).toBe(0);
  await preview.close();
});
