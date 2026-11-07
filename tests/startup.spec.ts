import { expect, test } from "@playwright/test";
test("launches the range, takes control, moves, exits and re-enters", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Enter range" }).click();
  await page.getByRole("button", { name: "Resume" }).click({ timeout: 45000 });
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
    .toBe("CANVAS");
  const canvas = page.locator("canvas");
  const before = await canvas.screenshot();
  await page.keyboard.down("Control");
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);
  await page.keyboard.up("Control");
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(true);
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(false);
  await expect
    .poll(async () => (await canvas.screenshot()).equals(before))
    .toBe(true);
  await page.keyboard.down("w");
  await page.waitForTimeout(600);
  await page.keyboard.up("w");
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  await page.waitForTimeout(300);
  const facing = await canvas.screenshot();
  await page.mouse.move(500, 280);
  await page.mouse.move(650, 300);
  await expect
    .poll(async () => (await canvas.screenshot()).equals(facing))
    .toBe(false);
  await page.evaluate(() => document.exitPointerLock());
  await page.getByRole("button", { name: "Main menu" }).click();
  await page.getByRole("button", { name: "Enter range" }).click();
  await expect(
    page.getByRole("heading", { name: "Range ready" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("server responds to health probes", async ({ request }) => {
  const res = await request.get("http://127.0.0.1:2568/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ status: "ok" });
});
test("joins and leaves a foundation room over WebSocket", async () => {
  const { Client } = await import("@colyseus/sdk");
  const { FOUNDATION_ROOM } = await import("@dp/protocol");
  const client = new Client("http://127.0.0.1:2568");
  const room = await client.joinOrCreate(FOUNDATION_ROOM);
  expect(room.roomId).toBeTruthy();
  await room.leave();
});

test("fires one round per press, registers a plate hit, and reloads", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter range" }).click();
  await page.getByRole("button", { name: "Resume" }).click();
  const ammo = page.getByLabel("Ammunition");
  await expect(ammo).toHaveText("12 / 48");
  await page.mouse.down();
  await expect(page.getByText("Target hits: 1")).toBeVisible();
  await page.waitForTimeout(450);
  await expect(ammo).toHaveText("11 / 48");
  await page.mouse.up();
  await page.keyboard.press("r");
  await expect(page.getByText("Reloading")).toBeVisible();
  await page.mouse.down();
  await page.mouse.up();
  await expect(ammo).toHaveText("12 / 47");
  await expect(page.getByText("Target hits: 1")).toBeVisible();
  await page.mouse.move(820, 360);
  await page.mouse.move(1000, 360);
  await page.mouse.down();
  await page.mouse.up();
  await expect(ammo).toHaveText("11 / 47");
  await expect(page.getByText("Target hits: 1")).toBeVisible();
});

test("switches weapons, fires a rifle burst, preserves ammunition and clears held fire on pause", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter range" }).click();
  await page.getByRole("button", { name: "Resume" }).click();
  const ammo = page.getByLabel("Ammunition");
  await page.keyboard.press("1");
  await expect(page.getByText("AR30 Rifle", { exact: true })).toBeVisible();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  await expect(ammo).toHaveText("30 / 90");
  await page.mouse.down();
  await expect
    .poll(async () => Number((await ammo.innerText()).split(" / ")[0]))
    .toBeLessThan(28);
  await page.mouse.up();
  await page.waitForTimeout(150);
  const remaining = Number((await ammo.innerText()).split(" / ")[0]);
  await page.waitForTimeout(250);
  await expect(ammo).toHaveText(remaining + " / 90");
  await page.keyboard.press("r");
  await expect(page.getByText("Reloading", { exact: true })).toBeVisible();
  await page.keyboard.press("2");
  await expect(page.getByText("F12 Pistol", { exact: true })).toBeVisible();
  await expect(ammo).toHaveText("12 / 48");
  await page.keyboard.press("1");
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  await expect(ammo).toHaveText(remaining + " / 90");
  await page.keyboard.press("r");
  await expect(ammo).toHaveText("30 / " + (90 - (30 - remaining)));
  await page.mouse.down();
  await expect
    .poll(async () => Number((await ammo.innerText()).split(" / ")[0]))
    .toBeLessThan(30);
  await page.evaluate(() => document.exitPointerLock());
  await page.mouse.up();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  const resumed = await ammo.innerText();
  await page.waitForTimeout(300);
  await expect(ammo).toHaveText(resumed);
});
