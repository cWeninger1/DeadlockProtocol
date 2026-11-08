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
    await first.getByRole("button", { name: "Join multiplayer range" }).click();
    await expect(first.getByRole("status")).toContainText("Players 1/2");
    await second.goto("http://127.0.0.1:5174");
    await second
      .getByRole("button", { name: "Join multiplayer range" })
      .click();
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
  await page.getByRole("button", { name: "Join multiplayer range" }).click();
  await expect(page.getByText(/Could not join Foundry/)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await page.getByRole("button", { name: "Main menu" }).click();
  await expect(
    page.getByRole("button", { name: "Join multiplayer range" }),
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
  await page.getByRole("button", { name: "Join multiplayer range" }).click();
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

test("preserves a jump and direction changes delivered together after a slow frame", async () => {
  const room = await new Client("http://127.0.0.1:2568").joinOrCreate(
    MOVEMENT_ROOM,
  );
  let latest: Snapshot | undefined;
  room.onMessage<Snapshot>("snapshot", (s) => {
    latest = s;
  });
  try {
    await expect.poll(() => latest?.players.length).toBe(1);
    for (let sequence = 1; sequence <= 6; sequence++)
      room.send("input", {
        ...idleInput,
        right: sequence < 4 ? 1 : -1,
        forward: 1,
        jump: sequence === 5,
        sequence,
      });
    await expect
      .poll(() => latest?.players[0].sequence, { timeout: 1500 })
      .toBe(6);
    expect(latest!.players[0].player.y).toBeGreaterThan(0);
  } finally {
    await room.leave();
  }
});

test("jumping in changing directions stays smooth when movement messages arrive in batches", async ({
  page,
}) => {
  await page.routeWebSocket("**/*", (socket) => {
    const server = socket.connectToServer();
    let open = true;
    const pending: (string | Buffer)[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    socket.onClose(() => {
      open = false;
      clearTimeout(timer);
      server.close();
    });
    server.onClose(() => {
      open = false;
      clearTimeout(timer);
      socket.close();
    });
    socket.onMessage((message) => {
      pending.push(message);
      if (!timer)
        timer = setTimeout(() => {
          timer = undefined;
          if (open) for (const entry of pending.splice(0)) server.send(entry);
        }, 100);
    });
    server.onMessage((message) => {
      if (open) socket.send(message);
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Join multiplayer range" }).click();
  await expect(page.getByRole("status")).toContainText("Players 1/2");
  await page.getByRole("button", { name: "Resume" }).click();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
    .toBe("CANVAS");
  const recording = page.evaluate(async (moduleUrl) => {
    const { Engine } = await import(moduleUrl);
    const scene = Engine.Instances[0].scenes[0];
    return new Promise<{ y: number; time: number }[]>((resolve) => {
      const points: { y: number; time: number }[] = [];
      const start = performance.now();
      const observer = scene.onAfterRenderObservable.add(() => {
        points.push({
          y: scene.activeCamera.position.y,
          time: performance.now(),
        });
        if (performance.now() - start > 3100) {
          scene.onAfterRenderObservable.remove(observer);
          resolve(points);
        }
      });
    });
  }, "/node_modules/.vite/deps/@babylonjs_core_Engines_engine.js");
  for (const key of ["d", "a", "s", "w"]) {
    await page.keyboard.down(key);
    await page.keyboard.press("Space");
    await page.waitForTimeout(700);
    await page.keyboard.up(key);
  }
  const points = await recording;
  expect(Math.max(...points.map((p) => p.y))).toBeGreaterThan(2.3);
  const rates = points
    .slice(1)
    .map((p, i) => ({
      dy: Math.abs(p.y - points[i].y),
      dt: (p.time - points[i].time) / 1000,
    }))
    .filter((p) => p.dt > 0.005 && p.dt < 0.035);
  expect(rates.length).toBeGreaterThan(80);
  expect(Math.max(...rates.map((p) => p.dy / p.dt))).toBeLessThan(7.5);
  expect(points.at(-1)!.y).toBeCloseTo(1.7, 1);
  await page.evaluate(() => document.exitPointerLock());
  await page.getByRole("button", { name: "Main menu" }).click();
});

test("server owns combat, cooldowns, deaths and same-session respawns", async () => {
  const client = new Client("http://127.0.0.1:2568");
  const a = await client.joinOrCreate(MOVEMENT_ROOM);
  const b = await client.joinOrCreate(MOVEMENT_ROOM);
  let latest: Snapshot | undefined;
  a.onMessage<Snapshot>("snapshot", (s) => {
    latest = s;
  });
  b.onMessage<Snapshot>("snapshot", () => {});
  const own = () => latest!.players.find((p) => p.id === a.sessionId)!;
  const enemy = () => latest!.players.find((p) => p.id === b.sessionId)!;
  let sequence = 0;
  const fire = (extra = {}) =>
    a.send("input", {
      ...idleInput,
      sequence: ++sequence,
      combat: {
        pitch: 0,
        pressed: true,
        held: false,
        reload: false,
        weapon: null,
        life: 0,
        ...extra,
      },
    });
  try {
    await expect.poll(() => latest?.players.length).toBe(2);
    expect(own().combat!.team).not.toBe(enemy().combat!.team);
    a.send("respawn");
    fire({ damage: 1000 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(own().combat!.life).toBe(0);
    expect(enemy().combat!.health).toBe(100);
    for (let i = 0; i < 6; i++) fire();
    await expect.poll(() => own().sequence).toBe(sequence);
    expect(own().combat!.shots).toBe(1);
    expect(enemy().combat!.health).toBe(75);
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 220));
      fire();
      await expect.poll(() => own().combat!.shots).toBe(i + 2);
    }
    await expect.poll(() => enemy().combat!.health).toBe(0);
    expect(own().combat!.kills).toBe(1);
    expect(enemy().combat!.deaths).toBe(1);
    const deadPosition = enemy().player;
    b.send("input", {
      ...idleInput,
      forward: 1,
      sequence: 1,
      combat: {
        pitch: 0,
        pressed: true,
        held: true,
        reload: false,
        weapon: "rifle",
        life: 0,
      },
    });
    await expect.poll(() => enemy().sequence).toBe(1);
    expect(enemy().player).toEqual(deadPosition);
    expect(enemy().combat!.shots).toBe(0);
    await expect
      .poll(() => latest!.tick - enemy().combat!.diedAt)
      .toBeGreaterThanOrEqual(60);
    b.send("respawn");
    await expect.poll(() => enemy().combat!.life).toBe(1);
    expect(enemy().combat!.health).toBe(100);
    expect(enemy().combat!.deaths).toBe(1);
    b.send("respawn");
    b.send("input", {
      ...idleInput,
      forward: 1,
      sequence: 2,
      combat: {
        pitch: 0,
        pressed: true,
        held: true,
        reload: false,
        weapon: null,
        life: 0,
      },
    });
    await expect.poll(() => enemy().sequence).toBe(2);
    expect(enemy().combat!.life).toBe(1);
    expect(enemy().combat!.shots).toBe(0);
    expect(enemy().player.z).toBe(-12);
    fire({ pressed: false, reload: true });
    await expect
      .poll(() => own().combat!.loadout.inventory.pistol.reloadEnds)
      .not.toBeNull();
    await expect
      .poll(() => own().combat!.loadout.inventory.pistol.magazine)
      .toBe(12);
    expect(own().combat!.loadout.inventory.pistol.reserve).toBe(44);
    fire({ pressed: false, weapon: "rifle" });
    await expect.poll(() => own().combat!.loadout.active).toBe("rifle");
    await expect
      .poll(() => latest!.tick >= own().combat!.loadout.readyAt)
      .toBe(true);
    fire({ pressed: false, held: true });
    await expect
      .poll(() => own().combat!.loadout.inventory.rifle.magazine)
      .toBe(29);
    expect(own().combat!.recoil).toBeGreaterThan(0);
  } finally {
    await a.leave();
    await b.leave();
  }
});

test("two browser players shoot, die and respawn without leaving the room", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const first = await a.newPage(),
    second = await b.newPage();
  const errors: string[] = [];
  first.on("pageerror", (e) => errors.push(e.message));
  second.on("pageerror", (e) => errors.push(e.message));
  try {
    await first.goto("http://127.0.0.1:5174");
    await first.getByRole("button", { name: "Join multiplayer range" }).click();
    await expect(first.getByRole("status")).toContainText("Players 1/2");
    await second.goto("http://127.0.0.1:5174");
    await second
      .getByRole("button", { name: "Join multiplayer range" })
      .click();
    await expect(second.getByRole("status")).toContainText("Players 2/2");
    await first.bringToFront();
    await first.getByRole("button", { name: "Resume" }).click();
    await expect(first.getByLabel("Health", { exact: true })).toHaveText(
      "HP 100",
    );
    for (let i = 0; i < 4; i++) {
      await first.mouse.down();
      await first.waitForTimeout(30);
      await first.mouse.up();
      await expect(first.getByLabel("Ammunition")).toHaveText(11 - i + " / 48");
      await first.waitForTimeout(220);
    }
    await expect(
      second.getByRole("heading", { name: "You died" }),
    ).toBeVisible();
    await expect(first.getByText("Kills 1 / Deaths 0")).toBeVisible();
    await first.evaluate(() => document.exitPointerLock());
    await second.bringToFront();
    await second.getByRole("button", { name: "Respawn" }).click();
    await expect(
      second.getByRole("heading", { name: "Range ready" }),
    ).toBeVisible();
    await expect(second.getByRole("status")).toContainText("Players 2/2");
    await second.getByRole("button", { name: "Resume" }).click();
    await expect(second.getByLabel("Health", { exact: true })).toHaveText(
      "HP 100",
    );
    await second.keyboard.press("1");
    await expect(second.getByText("AR30 Rifle", { exact: true })).toBeVisible();
    await expect(second.getByText("Ready", { exact: true })).toBeVisible();
    await second.mouse.down();
    await second.waitForTimeout(250);
    await second.mouse.up();
    await expect(second.getByLabel("Ammunition")).not.toHaveText("30 / 90");
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});
