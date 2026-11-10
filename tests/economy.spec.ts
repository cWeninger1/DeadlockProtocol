import { Client, type Room } from "@colyseus/sdk";
import { idleInput, type Snapshot } from "@dp/protocol";
import { expect, test } from "@playwright/test";
const name = "foundry-rounds-economy";

test("server rewards once, rejects invalid purchases and preserves only surviving rifles", async () => {
  const client = new Client("http://127.0.0.1:2568");
  const a = await client.joinOrCreate(name),
    b = await client.joinOrCreate(name);
  let latest: Snapshot | undefined;
  let reply = "";
  a.onMessage<Snapshot>("snapshot", (s) => (latest = s));
  b.onMessage("snapshot", () => {});
  a.onMessage<{ text: string }>("buyResult", (r) => (reply = r.text));
  b.onMessage("buyResult", () => {});
  const own = (r: Room = a) =>
    latest!.players.find((p) => p.id === r.sessionId)!;
  let sequence = 0;
  function buy(r: Room, action = "buy", extra = {}) {
    r.send("buy", {
      action,
      item: "rifle",
      epoch: latest!.round!.epoch,
      life: own(r).combat!.life,
      ...extra,
    });
  }
  function shoot(weapon: "pistol" | "rifle" = "pistol") {
    a.send("input", {
      ...idleInput,
      sequence: ++sequence,
      epoch: latest!.round!.epoch,
      combat: {
        pitch: 0,
        pressed: true,
        held: false,
        reload: false,
        weapon,
        life: own().combat!.life,
      },
    });
  }
  async function kill(weapon: "pistol" | "rifle") {
    for (let i = 0; i < (weapon === "pistol" ? 4 : 3); i++) {
      shoot(weapon);
      await new Promise((resolve) => setTimeout(resolve, 480));
    }
    await expect.poll(() => latest?.round?.phase).toBe("ending");
  }
  try {
    await expect.poll(() => latest?.round?.phase).toBe("freeze");
    buy(a);
    await expect.poll(() => reply).toContain("Not enough");
    buy(a, "buy", { price: 0 });
    await expect.poll(() => reply).toContain("Invalid");
    expect(own().economy!.money).toBe(800);
    await expect
      .poll(() => latest?.round?.phase, { timeout: 7000 })
      .toBe("active");
    shoot("rifle");
    await expect.poll(() => own().sequence).toBe(sequence);
    expect(own().combat!.loadout.active).toBe("pistol");
    // The rejected rifle switch can still fire the owned pistol.
    await new Promise((resolve) => setTimeout(resolve, 250));
    for (let i = 0; i < 3; i++) {
      shoot();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await expect.poll(() => latest?.round?.phase).toBe("ending");
    expect(own().economy!.money).toBe(4350);
    expect(own(b).economy!.money).toBe(2200);
    const staleEpoch = latest!.round!.epoch;
    buy(a);
    await expect.poll(() => reply).toContain("freeze time");
    await expect.poll(() => latest?.round?.phase).toBe("freeze");
    buy(a, "buy", { epoch: staleEpoch });
    await expect.poll(() => reply).toContain("window changed");
    buy(a);
    await expect.poll(() => own().economy!.money).toBe(1650);
    buy(a);
    await expect.poll(() => reply).toContain("already own");
    buy(a, "refund");
    await expect.poll(() => own().economy!.money).toBe(4350);
    buy(a, "refund");
    await expect.poll(() => reply).toContain("this freeze");
    buy(a);
    await expect.poll(() => own().economy!.money).toBe(1650);
    await expect
      .poll(() => latest?.round?.phase, { timeout: 7000 })
      .toBe("active");
    shoot("rifle");
    await new Promise((resolve) => setTimeout(resolve, 500));
    await kill("rifle");
    expect(own().economy!.money).toBe(5200);
    expect(own(b).economy!.money).toBe(4100);
    await expect.poll(() => latest?.round?.phase).toBe("freeze");
    expect(own().combat!.loadout.owned).toContain("rifle");
    expect(own().combat!.loadout.inventory.rifle.magazine).toBe(30);
    buy(a, "refund");
    await expect.poll(() => reply).toContain("this freeze");
    buy(b);
    await expect.poll(() => own(b).economy!.money).toBe(1400);
    await expect
      .poll(() => latest?.round?.phase, { timeout: 7000 })
      .toBe("active");
    shoot("rifle");
    await new Promise((resolve) => setTimeout(resolve, 500));
    await kill("rifle");
    await expect.poll(() => latest?.round?.phase).toBe("freeze");
    expect(own(b).combat!.loadout.owned).toEqual(["pistol"]);
    expect(own(b).economy!.money).toBe(3800);
    expect(own().economy!.money).toBe(8750);
    await b.leave();
    await expect.poll(() => latest?.round?.phase).toBe("waiting");
    expect(own().economy!.money).toBe(800);
    expect(own().combat!.loadout.owned).toEqual(["pistol"]);
  } finally {
    await a.leave();
    if (b.connection.isOpen) await b.leave();
  }
});

test("browser earns money, buys and refunds with B, then fires the purchased rifle", async ({
  page,
}, info) => {
  await page.route("**/matchmake/joinOrCreate/foundry-rounds", (route) =>
    route.continue({
      url: route.request().url().replace("foundry-rounds", name),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Join round test" }).click();
  await expect(page.getByRole("status")).toContainText("Players 1/2");
  const opponent = await new Client("http://127.0.0.1:2568").joinOrCreate(name);
  let latest: Snapshot | undefined;
  opponent.onMessage<Snapshot>("snapshot", (s) => (latest = s));
  try {
    await expect(page.getByLabel("Round status")).toContainText("Freeze time");
    await page.keyboard.press("b");
    const dialog = page.getByRole("dialog", { name: "Buy equipment" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Buy AR30" }),
    ).toBeDisabled();
    await expect(dialog).toContainText("Need $1900 more");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByLabel("Round status")).toContainText(
      "Round active",
      { timeout: 7000 },
    );
    for (let i = 0; i < 4; i++) {
      await page.mouse.down();
      await page.waitForTimeout(30);
      await page.mouse.up();
      await expect(page.getByLabel("Ammunition")).toHaveText(11 - i + " / 48");
      await page.waitForTimeout(220);
    }
    await expect(page.getByLabel("Money", { exact: true })).toHaveText("$4350");
    await expect(page.getByLabel("Round status")).toContainText("Freeze time");
    await page.keyboard.press("b");
    await expect(dialog).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.pointerLockElement === null))
      .toBe(true);
    await dialog.getByRole("button", { name: "Buy AR30" }).click();
    await expect(dialog).toContainText("AR30 purchased");
    await expect(page.getByLabel("Money", { exact: true })).toHaveText("$1650");
    await dialog.getByRole("button", { name: "Refund AR30" }).click();
    await expect(page.getByLabel("Money", { exact: true })).toHaveText("$4350");
    await dialog.getByRole("button", { name: "Buy AR30" }).click();
    await expect(page.getByLabel("Money", { exact: true })).toHaveText("$1650");
    await page.screenshot({ path: info.outputPath("buy-menu.png") });
    await expect(dialog).not.toBeVisible({ timeout: 7000 });
    await expect(
      page.getByRole("button", { name: "Buy equipment (B)" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByLabel("Range results")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
      .toBe("CANVAS");
    await page.keyboard.press("1");
    await expect(page.getByLabel("Range results")).toContainText("AR30 Rifle");
    await page.waitForTimeout(450);
    await page.mouse.down();
    await page.waitForTimeout(30);
    await page.mouse.up();
    await expect(page.getByLabel("Ammunition")).toHaveText("29 / 90");
    await expect
      .poll(
        () =>
          latest?.players.find((p) => p.id === opponent.sessionId)?.combat
            ?.health,
      )
      .toBe(66);
    await page.evaluate(() => document.exitPointerLock());
    await page.getByRole("button", { name: "Main menu" }).click();
    await expect(
      page.getByRole("button", { name: "Join round test" }),
    ).toBeVisible();
  } finally {
    await opponent.leave();
  }
});
