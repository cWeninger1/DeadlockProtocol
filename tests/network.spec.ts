import { expect, test } from "@playwright/test";
import { Client } from "@colyseus/sdk";
import { MOVEMENT_ROOM, idleInput, type Snapshot } from "@dp/protocol";

test("server rejects forged positions and input floods cannot increase simulation speed", async () => {
  const client = new Client("http://127.0.0.1:2568");
  const room = await client.joinOrCreate(MOVEMENT_ROOM);
  let latest: Snapshot | undefined;
  room.onMessage<Snapshot>("snapshot", (s) => {
    latest = s;
  });
  try {
    await expect.poll(() => latest?.players.length).toBe(1);
    const start = latest!.players[0].player;
    room.send("input", { ...idleInput, forward: 1, sequence: 1, x: 10000 });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(latest!.players[0].player.z).toBe(start.z);
    const startTick = latest!.tick;
    for (let sequence = 1; sequence <= 120; sequence++)
      room.send("input", { ...idleInput, forward: 1, sequence });
    await expect.poll(() => latest!.tick - startTick).toBeGreaterThan(18);
    const elapsed = (latest!.tick - startTick) / 60;
    expect(latest!.players[0].player.z - start.z).toBeLessThanOrEqual(
      elapsed * 5 + 0.1,
    );
    await expect
      .poll(() => latest!.players[0].player.vz, { timeout: 3000 })
      .toBe(0);
    expect(latest!.players[0].player.z - start.z).toBeLessThan(3);
  } finally {
    await room.leave();
  }
});
test("two browser sessions see movement and remove a departing player", async ({
  browser,
}) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const first = await a.newPage(),
    second = await b.newPage();
  const errors: string[] = [];
  first.on("pageerror", (e) => errors.push(e.message));
  second.on("pageerror", (e) => errors.push(e.message));
  try {
    await first.goto("http://127.0.0.1:5174");
    await first.getByRole("button", { name: "Join movement room" }).click();
    await expect(first.getByRole("status")).toContainText("Players 1/2");
    await second.goto("http://127.0.0.1:5174");
    await second.getByRole("button", { name: "Join movement room" }).click();
    await expect(first.getByRole("status")).toContainText("Players 2/2");
    await expect(second.getByRole("status")).toContainText("Players 2/2");
    const before = await first.locator("canvas").screenshot();
    await second.bringToFront();
    await second.getByRole("button", { name: "Resume" }).click();
    await expect
      .poll(() => second.evaluate(() => document.pointerLockElement?.tagName))
      .toBe("CANVAS");
    await second.keyboard.down("a");
    await second.waitForTimeout(500);
    await second.keyboard.up("a");
    await expect
      .poll(async () =>
        (await first.locator("canvas").screenshot()).equals(before),
      )
      .toBe(false);
    await second.evaluate(() => document.exitPointerLock());
    await second.getByRole("button", { name: "Main menu" }).click();
    await expect(first.getByRole("status")).toContainText("Players 1/2");
    await first.getByRole("button", { name: "Main menu" }).click();
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});

test("a failed join shows a retry path through the menu", async ({ page }) => {
  await page.route("**/matchmake/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Join movement room" }).click();
  await expect(page.getByText(/Could not join Foundry/)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await page.getByRole("button", { name: "Main menu" }).click();
  await expect(
    page.getByRole("button", { name: "Join movement room" }),
  ).toBeVisible();
});

test("renders continuous predicted movement with delayed WebSocket traffic", async ({
  page,
}) => {
  await page.routeWebSocket("**/*", (socket) => {
    const server = socket.connectToServer();
    let open = true;
    socket.onClose(() => {
      open = false;
      server.close();
    });
    server.onClose(() => {
      open = false;
      socket.close();
    });
    socket.onMessage((message) => {
      setTimeout(() => {
        if (open) server.send(message);
      }, 100);
    });
    server.onMessage((message) => {
      setTimeout(() => {
        if (open) socket.send(message);
      }, 100);
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Join movement room" }).click();
  await expect(page.getByRole("status")).toContainText("Players 1/2");
  await page.getByRole("button", { name: "Resume" }).click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
    .toBe("CANVAS");
  await page.keyboard.down("d");
  await page.waitForTimeout(350);
  const samples = await page.evaluate(async (moduleUrl) => {
    const { Engine } = await import(moduleUrl);
    const scene = Engine.Instances[0].scenes[0];
    return new Promise<{ x: number; time: number }[]>((resolve) => {
      const values: { x: number; time: number }[] = [];
      const observer = scene.onAfterRenderObservable.add(() => {
        values.push({
          x: scene.activeCamera.position.x,
          time: performance.now(),
        });
        if (values.length >= 60) {
          scene.onAfterRenderObservable.remove(observer);
          resolve(values);
        }
      });
    });
  }, "/node_modules/.vite/deps/@babylonjs_core_Engines_engine.js");
  await page.keyboard.up("d");
  const steps = samples.slice(1).map((value, i) => ({
    dx: value.x - samples[i].x,
    dt: value.time - samples[i].time,
  }));
  const regular = steps.filter((s) => s.dt > 5 && s.dt < 30);
  expect(regular.length).toBeGreaterThan(20);
  expect(
    regular.filter((s) => s.dx <= 0.001).length / regular.length,
  ).toBeLessThan(0.15);
  expect(Math.max(...regular.map((s) => s.dx))).toBeLessThan(0.18);
  await page.evaluate(() => document.exitPointerLock());
  await page.getByRole("button", { name: "Main menu" }).click();
});
