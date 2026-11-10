import { Client } from "@colyseus/sdk";
import { idleInput, type Snapshot } from "@dp/protocol";
import { expect, test, type Page } from "@playwright/test";

async function sceneState(page: Page) {
  return page.evaluate(async (moduleUrl) => {
    const { Engine } = await import(moduleUrl);
    const scene = Engine.Instances[0]?.scenes[0];
    const p = scene?.activeCamera.position;
    return {
      engines: Engine.Instances.length,
      position: p ? { x: p.x, y: p.y, z: p.z } : null,
      remoteX: scene?.getMeshByName("remote player")?.position.x,
      weaponVisible: scene?.getMeshByName("pistol slide")?.isEnabled(),
    };
  }, "/node_modules/.vite/deps/@babylonjs_core_Engines_engine.js");
}

test("eliminated players watch live views, switch cameras and regain their player camera next round", async ({
  browser,
}, testInfo) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  for (const context of [a, b])
    await context.route("**/matchmake/joinOrCreate/foundry-rounds", (route) =>
      route.continue({
        url: route
          .request()
          .url()
          .replace("foundry-rounds", "foundry-rounds-spectator"),
      }),
    );
  const first = await a.newPage(),
    second = await b.newPage();
  const errors: string[] = [];
  first.on("pageerror", (e) => errors.push(e.message));
  second.on("pageerror", (e) => errors.push(e.message));
  try {
    await first.goto("/");
    await first.getByRole("button", { name: "Join round test" }).click();
    await expect(first.getByRole("status")).toContainText("Players 1/2");
    await second.goto("/");
    await second.getByRole("button", { name: "Join round test" }).click();
    await first.bringToFront();
    await first.getByRole("button", { name: "Resume" }).click();
    await expect(first.getByLabel("Round status")).toContainText(
      "Round active",
    );
    for (let i = 0; i < 4; i++) {
      await first.mouse.down();
      await first.waitForTimeout(30);
      await first.mouse.up();
      await expect(first.getByLabel("Ammunition")).toHaveText(11 - i + " / 48");
      await first.waitForTimeout(220);
    }
    await expect(second.getByLabel("Spectator controls")).toBeVisible();
    await expect(
      second.getByText("Watching Foundry", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(async () => (await sceneState(second)).position?.y)
      .toBe(42);
    expect((await sceneState(second)).weaponVisible).toBe(false);
    await second.screenshot({ path: testInfo.outputPath("spectator.png") });
    expect((await sceneState(second)).remoteX).toBeCloseTo(2);
    await first.evaluate(() => document.exitPointerLock());
    await second.bringToFront();
    for (const [name, x] of [
      ["Site A", 8],
      ["Site B", -10],
      ["Foundry", 0],
    ] as const) {
      const button = second.getByRole("button", { name, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect
        .poll(async () => (await sceneState(second)).position?.x)
        .toBe(x);
    }
    await second.keyboard.press("w");
    await second.keyboard.press("e");
    await expect(
      second.getByRole("button", { name: "Resume", exact: true }),
    ).toHaveCount(0);
    await expect(
      second.getByRole("button", { name: "Respawn", exact: true }),
    ).toHaveCount(0);
    await expect
      .poll(() => second.evaluate(() => document.pointerLockElement === null))
      .toBe(true);
    await expect(
      second.getByRole("button", { name: "Resume", exact: true }),
    ).toBeVisible({ timeout: 13000 });
    await expect(second.getByLabel("Spectator controls")).toHaveCount(0);
    await expect
      .poll(async () => (await sceneState(second)).position?.y)
      .toBeCloseTo(1.7);
    expect((await sceneState(second)).position?.z).toBeCloseTo(-12);
    expect((await sceneState(second)).weaponVisible).toBe(true);
    await second.getByRole("button", { name: "Resume" }).click();
    await expect(second.getByLabel("Health", { exact: true })).toHaveText(
      "HP 100",
    );
    await second.evaluate(() => document.exitPointerLock());
    await second.getByRole("button", { name: "Main menu" }).click();
    expect((await sceneState(second)).engines).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});

test("a dead planter watches the live objective and leaving spectator mode disposes the scene", async ({
  page,
}) => {
  await page.route("**/matchmake/joinOrCreate/foundry-rounds", (route) =>
    route.continue({
      url: route
        .request()
        .url()
        .replace("foundry-rounds", "foundry-rounds-spectator"),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Join round test" }).click();
  await expect(page.getByRole("status")).toContainText("Players 1/2");
  const enemy = await new Client("http://127.0.0.1:2568").joinOrCreate(
    "foundry-rounds-spectator",
  );
  let latest: Snapshot | undefined;
  enemy.onMessage<Snapshot>("snapshot", (s) => {
    latest = s;
  });
  const own = () => latest!.players.find((p) => p.id !== enemy.sessionId)!;
  const opponent = () => latest!.players.find((p) => p.id === enemy.sessionId)!;
  let sequence = 0;
  let moving: ReturnType<typeof setInterval> | undefined;
  try {
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByLabel("Round status")).toContainText("Round active");
    await page.keyboard.down("d");
    await page.waitForTimeout(1250);
    await page.keyboard.up("d");
    await expect(page.getByLabel("Objective status")).toContainText(
      "Hold E to plant",
    );
    await page.keyboard.down("e");
    await expect(page.getByLabel("Round status")).toContainText(
      "Objective planted",
      { timeout: 7000 },
    );
    await page.keyboard.up("e");
    for (let i = 0; i < 4; i++) {
      enemy.send("input", {
        ...idleInput,
        sequence: ++sequence,
        epoch: latest!.round!.epoch,
        yaw: Math.atan2(
          own().player.x - opponent().player.x,
          own().player.z - opponent().player.z,
        ),
        combat: {
          pitch: 0,
          pressed: true,
          held: false,
          reload: false,
          weapon: null,
          life: opponent().combat!.life,
        },
      });
      await expect.poll(() => opponent().combat!.shots).toBe(i + 1);
      await page.waitForTimeout(220);
    }
    await expect(page.getByLabel("Spectator controls")).toContainText(
      "Watching objective at Site A",
    );
    await expect
      .poll(async () => (await sceneState(page)).position?.y)
      .toBe(16);
    const corpse = own().player;
    const shots = own().combat!.shots;
    moving = setInterval(
      () =>
        enemy.send("input", {
          ...idleInput,
          right: 1,
          sequence: ++sequence,
          epoch: latest!.round!.epoch,
        }),
      20,
    );
    await expect
      .poll(async () => (await sceneState(page)).remoteX)
      .toBeGreaterThan(3);
    clearInterval(moving);
    moving = undefined;
    await page.keyboard.press("w");
    await page.keyboard.press("e");
    await page.mouse.click(1000, 300);
    await page.waitForTimeout(200);
    expect(own().player).toEqual(corpse);
    expect(own().combat!.shots).toBe(shots);
    expect(own().combat!.health).toBe(0);
    await page.getByRole("button", { name: "Main menu" }).click();
    expect((await sceneState(page)).engines).toBe(0);
    await expect.poll(() => latest?.round?.phase).toBe("waiting");
  } finally {
    clearInterval(moving);
    await enemy.leave();
  }
});
