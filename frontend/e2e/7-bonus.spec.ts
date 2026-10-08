import { createForm, expect, onQuestion, opts, q, submit, test } from "./helpers";

/** Bonus features */

test("Logic jumps / conditional branching (Workflow tab rules: is / is not / greater / lower → later question or end; server validates the respondent's path)", async ({ page, request }) => {
  const qs = [q("yes_no", "Attending?", { required: true }), q("short_text", "Why not?", { required: true }), q("short_text", "Dietary needs?", { required: true })];
  const form = await createForm(request, "Logic", qs);
  await page.goto(`/forms/${form.id}/edit`);
  await page.getByRole("button", { name: "workflow", exact: true }).click();
  // Rule: "If answer is Yes → question 3" (skips "Why not?").
  await page.getByRole("button", { name: "Add rule" }).first().click();
  await page.getByRole("combobox", { name: "Value" }).selectOption("true");
  await page.getByRole("combobox", { name: "Go to" }).selectOption({ label: "3. Dietary needs?" });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Your form is live!")).toBeVisible();
  const slug = (await (await request.get(`/api/v1/forms/${form.id}`)).json()).slug;

  await page.goto(`/to/${slug}`);
  await onQuestion(page, "Attending?");
  await page.keyboard.press("y");
  await onQuestion(page, "Dietary needs?"); // jumped over "Why not?"
  // (Arrow keys are left to the text field here, so use the on-screen up/down buttons.)
  await page.getByRole("button", { name: "Previous question" }).click();
  await onQuestion(page, "Attending?"); // back retraces the real path, not "Why not?"
  await page.getByRole("button", { name: "Next question" }).click();
  await onQuestion(page, "Dietary needs?");
  await page.keyboard.type("None");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Thanks for completing this form")).toBeVisible();

  // Server: the skipped required question isn't required on this path, but is on the other.
  const [attending, whyNot] = qs.map((x) => x.id);
  expect((await submit(request, slug, { [attending]: true, [qs[2].id]: "Vegan" })).status()).toBe(201);
  const other = await submit(request, slug, { [attending]: false });
  expect(other.status()).toBe(422);
  expect(Object.keys((await other.json()).error.fields)).toContain(whyNot);
});

test("Custom themes (4 presets with colours, fonts and background: Design popover in builder, applied to canvas, preview and public form; snapshot per published version)", async ({ page, request }) => {
  const form = await createForm(request, "Themes", [q("short_text", "Name")], { publish: true, settings: { theme: "midnight" } });
  await page.goto(`/to/${form.slug}`);
  await onQuestion(page, "Name");
  await expect(page.locator("main").locator("..")).toHaveCSS("background-color", "rgb(30, 27, 46)");
  await expect(page.locator("main h1")).toHaveCSS("font-family", /Playfair Display/); // themes set the font too
  await expect(page.getByRole("textbox")).toHaveCSS("font-family", /Playfair Display/);
  // Changing the draft's theme doesn't touch the published snapshot until republished.
  const draft = await (await request.get(`/api/v1/forms/${form.id}`)).json();
  await request.put(`/api/v1/forms/${form.id}/draft`, { data: { ...draft, settings: { ...draft.settings, theme: "ocean" } } });
  await page.reload();
  await onQuestion(page, "Name");
  await expect(page.locator("main").locator("..")).toHaveCSS("background-color", "rgb(30, 27, 46)");
});

test("Export responses as CSV (Download CSV button on results)", async ({ page, request }) => {
  const form = await createForm(request, "CSV", [q("short_text", "Name"), q("dropdown", "City", { options: opts("Pune", "Delhi") })], { publish: true });
  await submit(request, form.slug!, { [form.questions[0].id]: "Ada, Countess", [form.questions[1].id]: (form.questions[1].options as { id: string }[])[1].id });
  await page.goto(`/forms/${form.id}/results`);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download CSV" }).click()]);
  expect(download.suggestedFilename()).toBe("E2E-CSV.csv");
  const text = await (await import("node:fs/promises")).readFile(await download.path(), "utf8");
  expect(text).toContain("Name,City");
  expect(text).toContain('"Ada, Countess",Delhi'); // labels resolved, commas quoted
});

test("Partial-response tracking / completion rate (partial answers autosaved and listed, views, starts, submissions, completion %)", async ({ page, browser, request }) => {
  const form = await createForm(request, "Completion", [q("short_text", "Name", { required: true }), q("short_text", "City")], { publish: true });
  // Visitor 1 only looks; visitor 2 starts but leaves; visitor 3 completes.
  for (const action of ["view", "start", "complete"] as const) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(`/to/${form.slug}`);
    await onQuestion(p, "Name");
    if (action !== "view") {
      await p.keyboard.type("Ada");
      await p.waitForTimeout(1500); // partial answers autosave ~1s after typing
    }
    if (action === "complete") {
      await p.keyboard.press("Enter");
      await onQuestion(p, "City");
      await p.keyboard.press("Enter");
      await expect(p.getByText("Thanks for completing this form")).toBeVisible();
    }
    await p.waitForTimeout(400);
    await ctx.close();
  }
  await page.goto(`/forms/${form.id}/results`);
  const stat = (label: string) => page.locator("div", { has: page.getByText(label, { exact: true }) }).last();
  await expect(stat("Views")).toContainText("3");
  await expect(stat("Starts")).toContainText("2");
  await expect(stat("Submissions")).toContainText("1");
  await expect(stat("Completion rate")).toContainText("50%");

  // The visitor who left halfway shows up as a partial response with their answer.
  await page.getByRole("button", { name: /^responses/i }).click();
  await page.getByRole("button", { name: /partial \(1\)/i }).click();
  const partial = page.getByRole("row", { name: "Partial response" });
  await expect(partial).toHaveCount(1);
  await expect(partial).toContainText("Ada");
  await expect(partial).toContainText("1 of 2");
});

test("File-upload question type (drag & drop, size limit, stored on backend disk, downloadable from results)", async ({ page, request }) => {
  const form = await createForm(request, "Upload", [q("file_upload", "Your CV", { required: true, settings: { max_size_mb: 1 } })], { publish: true });
  await page.goto(`/to/${form.slug}`);
  await onQuestion(page, "Your CV");
  // Too large: rejected before upload.
  await page.locator("input[type=file]").setInputFiles({ name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(1024 * 1024 + 1) });
  await expect(page.getByText("Files can be at most 1 MB.")).toBeVisible();
  // Drag & drop a small file onto the drop zone.
  const dataTransfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(["hello from e2e"], "cv.txt", { type: "text/plain" }));
    return dt;
  });
  await page.getByRole("button", { name: /Choose file/ }).dispatchEvent("drop", { dataTransfer });
  await expect(page.getByText("cv.txt")).toBeVisible();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Thanks for completing this form")).toBeVisible();

  await page.goto(`/forms/${form.id}/results`);
  await page.getByRole("button", { name: /^responses/i }).click();
  await page.getByRole("row", { name: "Open response 1" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("dialog").getByRole("link", { name: "cv.txt" }).click()]);
  const text = await (await import("node:fs/promises")).readFile(await download.path(), "utf8");
  expect(text).toBe("hello from e2e");
});

test("Dark mode (creator app: Light / Dark / System toggle in every top bar, no flash on load; public forms keep their form theme)", async ({ page, request }) => {
  const form = await createForm(request, "Dark", [q("short_text", "Name")], { publish: true });
  await page.goto("/workspace");
    await page.waitForLoadState("networkidle"); // let React hydrate before clicking
  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(20, 18, 22)");

  // No flash: the theme is already applied when the HTML is parsed, before React runs.
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.unroute("**/_next/static/**/*.js");

  for (const url of [`/forms/${form.id}/edit`, `/forms/${form.id}/results`]) {
    await page.goto(url);
    await expect(page.getByRole("button", { name: "Appearance" })).toBeVisible();
  }
  // The public form keeps its own (light, classic) theme.
  await page.goto(`/to/${form.slug}`);
  await onQuestion(page, "Name");
  await expect(page.locator("main").locator("..")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});
