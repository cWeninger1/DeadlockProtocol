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
