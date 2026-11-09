import { expect, test } from "@playwright/test";
import { Client } from "@colyseus/sdk";
import {
  ROUND_ROOM,
  idleInput,
  type Snapshot,
  type InputMessage,
} from "@dp/protocol";

test("server expires stale interaction and detonates after the carrier dies", async () => {
  test.setTimeout(110000);
  const client = new Client("http://127.0.0.1:2568");
  const a = await client.joinOrCreate(ROUND_ROOM),
    b = await client.joinOrCreate(ROUND_ROOM);
  let latest: Snapshot | undefined;
  a.onMessage<Snapshot>("snapshot", (s) => {
    latest = s;
  });
  b.onMessage<Snapshot>("snapshot", () => {});
  const own = () => latest!.players.find((p) => p.id === a.sessionId)!;
  const enemy = () => latest!.players.find((p) => p.id === b.sessionId)!;
  let sequence = 0,
    enemySequence = 0;
  let intent: Partial<InputMessage> = {};
  let streaming = true;
  const send = () =>
    a.send("input", {
      ...idleInput,
      sequence: ++sequence,
      epoch: latest!.round!.epoch,
      ...intent,
    });
  const timer = setInterval(() => {
    if (latest && streaming) send();
  }, 20);
  try {
    await expect
      .poll(() => latest?.round?.phase, { timeout: 30000 })
      .toBe("active");
    expect(latest!.round!.objective!.carrier).toBe(a.sessionId);
    intent = { right: 1 };
    await expect
      .poll(() => own().player.x, { intervals: [50] })
      .toBeGreaterThan(7.5);
    intent = {};
    await expect.poll(() => own().player.vx).toBe(0);
    intent = { interact: true };
    await expect
      .poll(() => latest?.round?.objective?.action?.kind)
      .toBe("plant");
    streaming = false;
    await expect
      .poll(() => latest?.round?.objective?.action, { timeout: 2000 })
      .toBeNull();
    expect(latest!.round!.phase).toBe("active");
    streaming = true;
    await expect
      .poll(() => latest?.round?.phase, { timeout: 7000 })
      .toBe("planted");
    intent = {};
    const end = latest!.round!.endsAt!;
    for (let i = 0; i < 4; i++) {
      b.send("input", {
        ...idleInput,
        sequence: ++enemySequence,
        epoch: latest!.round!.epoch,
        yaw: Math.atan2(
          own().player.x - enemy().player.x,
          own().player.z - enemy().player.z,
        ),
        combat: {
          pitch: 0,
          pressed: true,
          held: false,
          reload: false,
          weapon: null,
          life: enemy().combat!.life,
        },
      });
      await expect.poll(() => enemy().combat!.shots).toBe(i + 1);
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    expect(own().combat!.health).toBe(0);
    expect(latest!.round!.phase).toBe("planted");
    expect(latest!.round!.endsAt).toBe(end);
    await expect
      .poll(() => latest?.round?.phase, { timeout: 45000 })
      .toBe("ending");
    expect(latest!.round).toMatchObject({
      winner: "Attackers",
      reason: "detonated",
      score: { Attackers: 1, Defenders: 0 },
    });
    await expect
      .poll(() => latest?.round?.phase, { timeout: 8000 })
      .toBe("freeze");
    expect(latest!.round!.objective).toMatchObject({
      carrier: a.sessionId,
      position: null,
      action: null,
    });
  } finally {
    clearInterval(timer);
    await a.leave();
    await b.leave();
  }
});

test("two browsers plant, cancel and complete a defuse with replicated progress", async ({
  browser,
}) => {
  test.setTimeout(90000);
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
    await expect(first.getByRole("status")).toContainText("Players 1/2");
    await second.goto("/");
    await second.getByRole("button", { name: "Join round test" }).click();
    await first.bringToFront();
    await first.getByRole("button", { name: "Resume" }).click();
    await expect(first.getByLabel("Round status")).toContainText(
      "Round active",
      { timeout: 30000 },
    );
    await first.keyboard.down("d");
    await first.waitForTimeout(1250);
    await first.keyboard.up("d");
    await expect(first.getByLabel("Objective status")).toContainText(
      "Hold E to plant",
    );
    await first.keyboard.down("e");
    await expect(first.getByLabel("Objective status")).toContainText(
      "Planting Site A",
    );
    await first.waitForTimeout(1000);
    await first.keyboard.up("e");
    await expect(first.getByLabel("Objective status")).toContainText(
      "Hold E to plant",
    );
    await first.keyboard.down("e");
    await expect(first.getByLabel("Round status")).toContainText(
      "Objective planted",
      { timeout: 7000 },
    );
    await first.keyboard.up("e");
    await expect(second.getByLabel("Objective status")).toContainText(
      "Objective planted at Site A",
    );
    await first.evaluate(() => document.exitPointerLock());
    await second.bringToFront();
    await second.getByRole("button", { name: "Resume" }).click();
    await second.keyboard.down("a");
    await second.waitForTimeout(1250);
    await second.keyboard.up("a");
    await second.keyboard.down("w");
    await second.waitForTimeout(800);
    await second.keyboard.up("w");
    await expect(second.getByLabel("Objective status")).toContainText(
      "Hold E to defuse",
    );
    await second.keyboard.down("e");
    await expect(second.getByLabel("Objective status")).toContainText(
      "Defusing Site A",
    );
    await expect(first.getByLabel("Objective status")).toContainText(
      "Defusing Site A",
    );
    await second.waitForTimeout(1000);
    await second.keyboard.up("e");
    await expect(second.getByLabel("Objective status")).toContainText(
      "Hold E to defuse",
    );
    await second.keyboard.down("e");
    await expect(second.getByLabel("Round status")).toContainText(
      "Defenders win - defused",
      { timeout: 13000 },
    );
    await second.keyboard.up("e");
    await expect(first.getByLabel("Team score")).toHaveText(
      "Attackers 0 : 1 Defenders",
    );
    await expect(first.getByLabel("Round status")).toContainText("Round 2", {
      timeout: 8000,
    });
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});
