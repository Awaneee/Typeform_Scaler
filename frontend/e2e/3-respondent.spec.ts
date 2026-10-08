import type { Page } from "@playwright/test";
import { createForm, expect, onQuestion, opts, q, submit, test, uid } from "./helpers";

/** 3. Respondent Flow */

function sampleQuestions() {
  return [
    q("short_text", "What's your name?", { required: true }),
    q("email", "What's your email?", { required: true }),
    q("multiple_choice", "Pick a colour", { options: opts("Red", "Green", "Blue") }),
    q("yes_no", "Coming?"),
    q("rating", "Rate us", { settings: { steps: 5 } }),
  ];
}

async function publishedSample(request: Parameters<typeof createForm>[0], title = "Respondent") {
  return createForm(request, title, sampleQuestions(), {
    publish: true,
    settings: { thank_you: { title: "Thanks, you rock!", description: "See you soon.", button_text: "Create a typeform" } },
  });
}

const responseCount = async (page: Page, id: string) => (await (await page.request.get(`/api/v1/forms/${id}`)).json()).response_count;

test("One question at a time, full-screen", async ({ page, request }) => {
  const form = await publishedSample(request);
  await page.goto(`/to/${form.slug}`);
  await onQuestion(page, "What's your name?");
  await expect(page.locator("main h1")).toHaveCount(1);
  const box = (await page.locator("main").boundingBox())!;
  expect(box.width).toBe(1440);
  expect(box.height).toBeGreaterThan(850);
});

test("Smooth transitions between questions (fade + slide, direction-aware, reduced-motion aware)", async ({ page, request }) => {
  const form = await publishedSample(request);
  await page.goto(`/to/${form.slug}`);
  await onQuestion(page, "What's your name?");
  await page.keyboard.type("Ada");
  await page.keyboard.press("Enter");
  // Mid-transition the outgoing question is partly faded (an animation, not an instant swap).
  await page.waitForTimeout(120);
  const opacity = Number(await page.locator("main").first().evaluate((el) => getComputedStyle(el).opacity));
  expect(opacity).toBeLessThan(1);
  await onQuestion(page, "What's your email?");

  // With reduced motion the questions only fade: no vertical slide.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await onQuestion(page, "What's your name?");
  await page.keyboard.type("Ada");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(60);
  const transforms = await page.locator("main").evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
  expect(transforms.every((t) => t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)")).toBe(true);
});

test("Keyboard navigation (Enter / ↓ next, ↑ back, letter keys for choices, Y/N, number keys for rating)", async ({ page, request }) => {
  const form = await publishedSample(request);
  await page.goto(`/to/${form.slug}`);
  await onQuestion(page, "What's your name?");
  await page.keyboard.type("Ada");
  await page.keyboard.press("Enter");
  await onQuestion(page, "What's your email?");
  await page.keyboard.type("ada@example.com");
  await page.keyboard.press("Enter");
  await onQuestion(page, "Pick a colour");
  await page.keyboard.press("c"); // letter key picks "Blue" and auto-advances
  await onQuestion(page, "Coming?");
  await page.keyboard.press("ArrowUp");
  await onQuestion(page, "Pick a colour");
  await expect(page.getByRole("checkbox", { name: /Blue/ })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowDown");
  await onQuestion(page, "Coming?");
  await page.keyboard.press("y");
  await onQuestion(page, "Rate us");
  await page.keyboard.press("4"); // number key rates and submits (last question)
  await expect(page.getByText("Thanks, you rock!")).toBeVisible();
  expect(await responseCount(page, form.id)).toBe(1);
});

test('Progress indicator (top bar + "x of n answered")', async ({ page, request }) => {
  const form = await publishedSample(request);
  await page.goto(`/to/${form.slug}`);
  await onQuestion(page, "What's your name?");
  const bar = page.getByRole("progressbar", { name: "Form progress" });
  await expect(bar).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByText("0 of 5 answered")).toBeVisible();
  await page.keyboard.type("Ada");
  await expect(bar).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByText("1 of 5 answered")).toBeVisible();
});

test("Validation: server side (required, email, number, choices, rating)", async ({ request }) => {
  const choice = opts("A", "B");
  const qs = [
    q("short_text", "Name", { required: true }),
    q("email", "Email"),
    q("number", "Age", { settings: { min: 0, max: 120 } }),
    q("multiple_choice", "Pick", { options: choice }),
    q("rating", "Rate", { settings: { steps: 5 } }),
  ];
  const form = await createForm(request, "Server validation", qs, { publish: true });
  const [name, email, age, pick, rate] = qs.map((x) => x.id);
  const res = await submit(request, form.slug!, { [email]: "nope", [age]: 200, [pick]: ["not-an-option"], [rate]: 9 });
  expect(res.status()).toBe(422);
  const fields = (await res.json()).error.fields;
  expect(Object.keys(fields).sort()).toEqual([age, email, name, pick, rate].sort());
  expect(fields[name]).toBe("Please fill this in.");
  const ok = await submit(request, form.slug!, { [name]: "Ada", [email]: "a@b.co", [age]: 30, [pick]: [choice[0].id], [rate]: 5 });
  expect(ok.status()).toBe(201);
});

test("Validation: client side (same rules and messages as the server)", async ({ page, request }) => {
  const form = await createForm(request, "Client validation", [
    q("short_text", "Name", { required: true }),
    q("email", "Email", { required: true }),
    q("number", "Age", { settings: { min: 18 } }),
  ], { publish: true });
  let submitted = false;
  await page.route("**/submissions", (route) => ((submitted = true), route.continue()));
  await page.goto(`/to/${form.slug}`);
  await onQuestion(page, "Name");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Please fill this in.")).toBeVisible();
  await page.keyboard.type("Ada");
  await page.keyboard.press("Enter");
  await onQuestion(page, "Email");
  await page.keyboard.type("ada@");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Hmm... that email doesn't look right.")).toBeVisible();
  await page.keyboard.type("example.com");
  await page.keyboard.press("Enter");
  await onQuestion(page, "Age");
  await page.keyboard.type("abc");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Numbers only please.")).toBeVisible();
  await page.getByRole("textbox").fill("12");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Must be at least 18.")).toBeVisible();
  expect(submitted).toBe(false); // nothing reached the server
});

test("Submit stores the response (idempotent, answers kept if it fails)", async ({ page, request }) => {
  const form = await createForm(request, "Submit", [q("short_text", "Name", { required: true })], { publish: true });
  // Idempotent: the same client_submission_id twice stores one response.
  const id = uid();
  const a = await submit(request, form.slug!, { [form.questions[0].id]: "Ada" }, id);
  const b = await submit(request, form.slug!, { [form.questions[0].id]: "Ada" }, id);
  expect((await a.json()).id).toBe((await b.json()).id);
  expect(await responseCount(page, form.id)).toBe(1);

  // A failed submit keeps the answer on screen; retrying succeeds.
  let fail = true;
  await page.route("**/submissions", (route) => (fail ? ((fail = false), route.abort()) : route.continue()));
  await page.goto(`/to/${form.slug}`);
  await onQuestion(page, "Name");
  await page.keyboard.type("Grace");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Can't reach the server|Couldn't submit/)).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue("Grace");
  await expect(page.locator("main")).toHaveCount(1);
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Thanks for completing this form")).toBeVisible();
  expect(await responseCount(page, form.id)).toBe(2);
});

test("Thank-you screen (custom title/description from the builder)", async ({ page, request }) => {
  const form = await createForm(request, "Thank you", [q("short_text", "Name")]);
  await page.goto(`/forms/${form.id}/edit`);
  await page.getByRole("button", { name: /Thanks for completing this form/ }).click(); // Endings item
  await page.getByRole("textbox", { name: "Thank you title" }).fill("Cheers, legend!");
  await page.getByRole("textbox", { name: "Thank you description" }).fill("We'll be in touch.");
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Your form is live!")).toBeVisible();
  const slug = (await (await request.get(`/api/v1/forms/${form.id}`)).json()).slug;
  await page.goto(`/to/${slug}`);
  await onQuestion(page, "Name");
  await page.keyboard.type("Ada");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Cheers, legend!" })).toBeVisible();
  await expect(page.getByText("We'll be in touch.")).toBeVisible();
});

test("No login required to fill a published form", async ({ browser, request }) => {
  const form = await publishedSample(request, "No login");
  const anonymous = await browser.newContext(); // fresh browser profile: no cookies, no storage
  const page = await anonymous.newPage();
  await page.goto(`/to/${form.slug}`);
  await onQuestion(page, "What's your name?");
  const res = await page.request.post(`/api/v1/public/forms/${form.slug}/submissions`, {
    data: { client_submission_id: uid(), answers: { [form.questions[0].id]: "Anon", [form.questions[1].id]: "anon@example.com" } },
  });
  expect(res.status()).toBe(201);
  await anonymous.close();
});
