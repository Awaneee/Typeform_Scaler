import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

export const PREFIX = "E2E ";
const API = "/api/v1";

export const uid = () => crypto.randomUUID();

type Q = Record<string, unknown> & { id: string; type: string; title: string };

export function q(type: string, title: string, extra: Record<string, unknown> = {}): Q {
  return { id: uid(), type, title, description: "", required: false, settings: {}, options: [], logic: [], ...extra };
}

export const opts = (...labels: string[]) => labels.map((label) => ({ id: uid(), label }));

export interface TestForm {
  id: string;
  slug: string | null;
  questions: Q[];
}

/** Creates a form through the API (fast, deterministic setup), optionally published. */
export async function createForm(
  request: APIRequestContext,
  title: string,
  questions: Q[],
  { publish = false, settings = {} }: { publish?: boolean; settings?: Record<string, unknown> } = {},
): Promise<TestForm> {
  const created = await (await request.post(`${API}/forms`, { data: { title: PREFIX + title } })).json();
  const saved = await request.put(`${API}/forms/${created.id}/draft`, {
    data: { revision: created.revision, title: PREFIX + title, settings, questions },
  });
  expect(saved.ok(), await saved.text()).toBeTruthy();
  let slug: string | null = null;
  if (publish) {
    const res = await request.post(`${API}/forms/${created.id}/publish`);
    expect(res.ok(), await res.text()).toBeTruthy();
    slug = (await res.json()).slug;
  }
  return { id: created.id, slug, questions };
}

export async function submit(request: APIRequestContext, slug: string, answers: Record<string, unknown>, id = uid()) {
  return request.post(`${API}/public/forms/${slug}/submissions`, { data: { client_submission_id: id, answers } });
}

export async function getForm(request: APIRequestContext, id: string) {
  return (await request.get(`${API}/forms/${id}`)).json();
}

/** Waits until the respondent flow shows the question whose title contains `text`. */
export async function onQuestion(page: Page, text: string | RegExp) {
  await expect(page.locator("main h1").first()).toContainText(text);
  await page.waitForTimeout(450); // let the enter transition finish so focus/keys land on it
}

/** Autosave waits 800ms after the last edit; wait past that, then for the save to finish. */
export async function waitSaved(page: Page) {
  await page.waitForTimeout(1000);
  await expect(page.getByText("All changes saved")).toBeVisible();
}

/** Deletes every form created by the tests (titles start with PREFIX). */
export async function cleanup(request: APIRequestContext) {
  const forms: { id: string; title: string }[] = await (await request.get(`${API}/forms`)).json();
  // "My new form" is what "Start from scratch" creates; only clean those up locally, never on a live site.
  const local = !process.env.E2E_BASE_URL;
  for (const f of forms.filter((f) => f.title.startsWith(PREFIX) || (local && f.title === "My new form"))) {
    await request.delete(`${API}/forms/${f.id}`);
  }
}

/** Every test starts from a clean slate: forms left by earlier tests are removed first. */
export const test = base.extend<{ cleanSlate: void }>({
  cleanSlate: [
    async ({ request }, use) => {
      await cleanup(request);
      await use();
    },
    { auto: true },
  ],
});
export { expect };
