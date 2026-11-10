import { Client, type Room } from "@colyseus/sdk";
import { idleInput, type Snapshot } from "@dp/protocol";
import { expect, test } from "@playwright/test";
const roomName = "foundry-rounds-armor";

test("server validates armor purchases, applies damage and preserves survivors until halftime", async () => {
  const client = new Client("http://127.0.0.1:2568");
  const a = await client.joinOrCreate(roomName),
    b = await client.joinOrCreate(roomName);
  let latest: Snapshot | undefined;
  let result = "";
  a.onMessage<Snapshot>("snapshot", (s) => (latest = s));
  b.onMessage("snapshot", () => {});
  a.onMessage("buyResult", () => {});
  b.onMessage<{ text: string }>("buyResult", (r) => (result = r.text));
  const own = (room: Room) =>
    latest!.players.find((p) => p.id === room.sessionId)!;
  const sequences = new Map<Room, number>();
  function buy(room: Room, action = "buy", extra = {}) {
    room.send("buy", {
      action,
      item: "armor",
      epoch: latest!.round!.epoch,
      life: own(room).combat!.life,
      ...extra,
    });
  }
  async function shoot(room: Room) {
    const c = own(room).combat!;
    const before = c.shots;
    const sequence = (sequences.get(room) ?? 0) + 1;
    sequences.set(room, sequence);
    room.send("input", {
      ...idleInput,
      sequence,
      epoch: latest!.round!.epoch,
      yaw: c.team === "Attackers" ? 0 : Math.PI,
      combat: {
        pitch: 0,
        pressed: true,
        held: false,
        reload: false,
        weapon: null,
        life: c.life,
      },
    });
    await expect.poll(() => own(room).combat!.shots).toBe(before + 1);
    await new Promise((resolve) => setTimeout(resolve, 220));
  }
  try {
    await expect.poll(() => latest?.round?.phase).toBe("freeze");
    buy(b, "buy", { armor: 999 });
    await expect.poll(() => result).toContain("Invalid");
    buy(a);
    buy(b);
    await expect.poll(() => own(b).combat!.armor).toBe(100);
    expect(own(b).economy!.money).toBe(150);
    buy(b);
    await expect.poll(() => result).toContain("full");
    buy(b, "refund");
    await expect.poll(() => own(b).economy!.money).toBe(800);
    buy(b, "refund");
    await expect.poll(() => result).toContain("this freeze");
    buy(b);
    await expect.poll(() => own(b).combat!.armor).toBe(100);
    await expect
      .poll(() => latest?.round?.phase, { timeout: 12000 })
      .toBe("active");
    buy(b, "refund");
    await expect.poll(() => result).toContain("freeze time");
    await shoot(a);
    expect(own(b).combat).toMatchObject({ health: 87, armor: 88 });
    for (let i = 0; i < 8; i++) await shoot(b);
    await expect.poll(() => latest?.round?.phase).toBe("freeze");
    expect(own(a).combat).toMatchObject({ health: 100, armor: 0 });
    expect(own(b).combat).toMatchObject({ health: 100, armor: 88 });
    expect(own(b).economy!.money).toBe(3700);
    buy(b, "refund");
    await expect.poll(() => result).toContain("this freeze");
    buy(b);
    await expect.poll(() => own(b).combat!.armor).toBe(100);
    expect(own(b).economy!.money).toBe(3050);
    buy(b, "refund");
    await expect.poll(() => own(b).combat!.armor).toBe(88);
    expect(own(b).economy!.money).toBe(3700);
    await expect
      .poll(() => latest?.round?.phase, { timeout: 12000 })
      .toBe("active");
    for (let i = 0; i < 4; i++) await shoot(b);
    await expect.poll(() => latest?.round?.phase).toBe("halftime");
    expect(own(b).combat!.armor).toBe(0);
    expect(own(b).economy).toMatchObject({ money: 800, armorPurchase: null });
  } finally {
    await a.leave();
    if (b.connection.isOpen) await b.leave();
  }
});

test("browser buys and refunds armor, displays damage and carries remaining points into the next round", async ({
  page,
}, info) => {
  await page.route("**/matchmake/joinOrCreate/foundry-rounds", (route) =>
    route.continue({
      url: route.request().url().replace("foundry-rounds", roomName),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Join round test" }).click();
  await expect(page.getByRole("status")).toContainText("Players 1/2");
  const enemy = await new Client("http://127.0.0.1:2568").joinOrCreate(
    roomName,
  );
  let latest: Snapshot | undefined;
  enemy.onMessage<Snapshot>("snapshot", (s) => (latest = s));
  try {
    await expect(page.getByLabel("Round status")).toContainText("Freeze time");
    await page.keyboard.press("b");
    const dialog = page.getByRole("dialog", { name: "Buy equipment" });
    await dialog
      .getByRole("button", { name: "Buy armor", exact: true })
      .click();
    await expect(dialog).toContainText("Protection: 100 / 100");
    await expect(page.getByLabel("Money", { exact: true })).toHaveText("$150");
    await expect(
      dialog.getByRole("button", { name: "Buy armor", exact: true }),
    ).toBeDisabled();
    await dialog.getByRole("button", { name: "Refund armor" }).click();
    await expect(dialog).toContainText("Protection: 0 / 100");
    await expect(page.getByLabel("Money", { exact: true })).toHaveText("$800");
    await dialog
      .getByRole("button", { name: "Buy armor", exact: true })
      .click();
    await expect(dialog).toContainText("Armor purchased.");
    await expect(dialog).toContainText("Protection: 100 / 100");
    await expect(page.getByLabel("Money", { exact: true })).toHaveText("$150");
    await expect(
      dialog.getByRole("button", { name: "Close buy menu" }),
    ).toBeInViewport();
    await page.screenshot({ path: info.outputPath("armor-menu.png") });
    await dialog.getByRole("button", { name: "Close buy menu" }).click();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByLabel("Armor", { exact: true })).toHaveText(
      "Armor 100",
    );
    await expect(page.getByLabel("Round status")).toContainText(
      "Round active",
      { timeout: 12000 },
    );
    enemy.send("input", {
      ...idleInput,
      sequence: 1,
      epoch: latest!.round!.epoch,
      yaw: Math.PI,
      combat: {
        pitch: 0,
        pressed: true,
        held: false,
        reload: false,
        weapon: null,
        life: latest!.players.find((p) => p.id === enemy.sessionId)!.combat!
          .life,
      },
    });
    await expect(page.getByLabel("Health", { exact: true })).toHaveText(
      "HP 87",
    );
    await expect(page.getByLabel("Armor", { exact: true })).toHaveText(
      "Armor 88",
    );
    for (let i = 0; i < 4; i++) {
      await page.mouse.down();
      await page.waitForTimeout(30);
      await page.mouse.up();
      await expect(page.getByLabel("Ammunition")).toHaveText(11 - i + " / 48");
      await page.waitForTimeout(220);
    }
    await expect(page.getByLabel("Round status")).toContainText("Freeze time");
    await expect(page.getByLabel("Armor", { exact: true })).toHaveText(
      "Armor 88",
    );
    await expect(page.getByLabel("Health", { exact: true })).toHaveText(
      "HP 100",
    );
    await page.keyboard.press("b");
    await dialog
      .getByRole("button", { name: "Buy armor", exact: true })
      .click();
    await expect(dialog).toContainText("Protection: 100 / 100");
    await dialog.getByRole("button", { name: "Refund armor" }).click();
    await expect(dialog).toContainText("Protection: 88 / 100");
    await dialog.getByRole("button", { name: "Close buy menu" }).click();
    await page.getByRole("button", { name: "Main menu" }).click();
    await expect(
      page.getByRole("button", { name: "Join round test" }),
    ).toBeVisible();
    await expect.poll(() => latest?.round?.phase).toBe("waiting");
    expect(latest!.players[0].combat!.armor).toBe(0);
  } finally {
    await enemy.leave();
  }
});
