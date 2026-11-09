import { expect, test } from "@playwright/test";
import { Client } from "@colyseus/sdk";
import { ROUND_ROOM, idleInput, type Snapshot } from "@dp/protocol";

test("round server enforces freeze, elimination, automatic resets and disconnect recovery", async () => {
  const client = new Client("http://127.0.0.1:2568");
  const a = await client.joinOrCreate(ROUND_ROOM);
  let latest: Snapshot | undefined;
  a.onMessage<Snapshot>("snapshot", (s) => {
    latest = s;
  });
  const own = () => latest!.players.find((p) => p.id === a.sessionId)!;
  await expect.poll(() => latest?.round?.phase).toBe("waiting");
  const b = await client.joinOrCreate(ROUND_ROOM);
  b.onMessage<Snapshot>("snapshot", () => {});
  const enemy = () => latest!.players.find((p) => p.id === b.sessionId)!;
  let sequence = 0;
  const send = (forward = 0, epoch = latest!.round!.epoch) =>
    a.send("input", {
      ...idleInput,
      forward,
      sequence: ++sequence,
      epoch,
      combat: {
        pitch: 0,
        pressed: true,
        held: false,
        reload: false,
        weapon: null,
        life: own().combat!.life,
      },
    });
  try {
    await expect.poll(() => latest?.round?.phase).toBe("warmup");
    await expect
      .poll(() => latest?.round?.phase, { timeout: 8000 })
      .toBe("freeze");
    const freezeEpoch = latest!.round!.epoch;
    const spawn = own().player;
    for (let i = 0; i < 6; i++) send(1);
    await expect.poll(() => own().sequence).toBe(sequence);
    expect(own().player).toEqual(spawn);
    expect(own().combat!.shots).toBe(0);
    expect(enemy().combat!.health).toBe(100);
    await expect
      .poll(() => latest?.round?.phase, { timeout: 25000 })
      .toBe("active");
    send(1, freezeEpoch);
    await expect.poll(() => own().sequence).toBe(sequence);
    expect(own().player).toEqual(spawn);
    expect(own().combat!.shots).toBe(0);
    for (let i = 0; i < 4; i++) {
      send();
      await expect.poll(() => own().combat!.shots).toBe(i + 1);
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    await expect.poll(() => latest?.round?.phase).toBe("ending");
    expect(latest!.round).toMatchObject({
      winner: "Attackers",
      score: { Attackers: 1, Defenders: 0 },
    });
    const deadLife = enemy().combat!.life;
    b.send("respawn");
    send(1);
    await expect.poll(() => own().sequence).toBe(sequence);
    expect(enemy().combat!.health).toBe(0);
    expect(enemy().combat!.life).toBe(deadLife);
    expect(own().combat!.shots).toBe(4);
    await expect.poll(() => latest?.round?.number, { timeout: 8000 }).toBe(2);
    expect(latest!.round!.phase).toBe("freeze");
    expect(latest!.round!.score.Attackers).toBe(1);
    expect(enemy().combat!.health).toBe(100);
    expect(enemy().combat!.life).toBe(deadLife + 1);
    expect(own().combat!.loadout.inventory.pistol.magazine).toBe(12);
    expect(own().combat!.kills).toBe(1);
    await b.leave();
    await expect.poll(() => latest?.round?.phase).toBe("waiting");
    expect(latest!.round!.score).toEqual({ Attackers: 0, Defenders: 0 });
    const replacement = await client.joinOrCreate(ROUND_ROOM);
    replacement.onMessage<Snapshot>("snapshot", () => {});
    await expect.poll(() => latest?.round?.phase).toBe("warmup");
    await replacement.leave();
  } finally {
    await a.leave();
    if (b.connection.isOpen) await b.leave();
  }
});

test("two browsers show timed rounds, block freeze input and reset after elimination", async ({
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
    await first.goto("/");
    await first.getByRole("button", { name: "Join round test" }).click();
    await expect(first.getByLabel("Round status")).toContainText(
      "Waiting for players",
    );
    await second.goto("/");
    await second.getByRole("button", { name: "Join round test" }).click();
    await expect(first.getByLabel("Round status")).toContainText("Warmup");
    await first.bringToFront();
    await first.getByRole("button", { name: "Resume" }).click();
    await expect(first.getByLabel("Round status")).toContainText(
      "Freeze time",
      { timeout: 8000 },
    );
    await first.keyboard.down("w");
    await first.mouse.down();
    await first.waitForTimeout(350);
    await first.mouse.up();
    await first.keyboard.up("w");
    await expect(first.getByLabel("Ammunition")).toHaveText("12 / 48");
    await expect(first.getByLabel("Round status")).toContainText(
      "Round active",
      { timeout: 25000 },
    );
    await expect(second.getByLabel("Round status")).toContainText(
      "Round active",
    );
    for (let i = 0; i < 4; i++) {
      await first.mouse.down();
      await first.waitForTimeout(30);
      await first.mouse.up();
      await expect(first.getByLabel("Ammunition")).toHaveText(11 - i + " / 48");
      await first.waitForTimeout(220);
    }
    await expect(first.getByLabel("Round status")).toContainText(
      "Attackers win",
    );
    await expect(
      second.getByRole("heading", { name: "You died" }),
    ).toBeVisible();
    await expect(
      second.getByRole("button", { name: "Respawn", exact: true }),
    ).toHaveCount(0);
    await expect(second.getByLabel("Team score")).toHaveText(
      "Attackers 1 : 0 Defenders",
    );
    await expect(first.getByLabel("Round status")).toContainText("Round 2", {
      timeout: 8000,
    });
    await expect(first.getByLabel("Ammunition")).toHaveText("12 / 48");
    await expect(second.getByRole("button", { name: "Resume" })).toBeVisible();
    await first.evaluate(() => document.exitPointerLock());
    await second.bringToFront();
    await second.getByRole("button", { name: "Main menu" }).click();
    await expect(first.getByLabel("Round status")).toContainText(
      "Waiting for players",
    );
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});
