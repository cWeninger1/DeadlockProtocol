import { expect, test } from "@playwright/test";
import { Client } from "@colyseus/sdk";
import { idleInput, type Snapshot } from "@dp/protocol";
const roomName = "foundry-rounds-test";

test("halftime changes roles and carrier, preserves scores, and finished matches reject further play", async () => {
  const client = new Client("http://127.0.0.1:2568");
  const a = await client.joinOrCreate(roomName),
    b = await client.joinOrCreate(roomName);
  let latest: Snapshot | undefined;
  a.onMessage<Snapshot>("snapshot", (s) => {
    latest = s;
  });
  b.onMessage<Snapshot>("snapshot", () => {});
  const own = () => latest!.players.find((p) => p.id === a.sessionId)!;
  const enemy = () => latest!.players.find((p) => p.id === b.sessionId)!;
  let sequence = 0;
  function shoot(forward = 0) {
    a.send("input", {
      ...idleInput,
      forward,
      sequence: ++sequence,
      epoch: latest!.round!.epoch,
      yaw: own().combat!.team === "Attackers" ? 0 : Math.PI,
      combat: {
        pitch: 0,
        pressed: true,
        held: false,
        reload: false,
        weapon: null,
        life: own().combat!.life,
      },
    });
  }
  try {
    await expect.poll(() => latest?.round?.phase).toBe("active");
    expect(own().squad).toBe("Alpha");
    const firstLife = own().combat!.life;
    for (let i = 0; i < 4; i++) {
      shoot();
      await expect.poll(() => own().combat!.shots).toBe(i + 1);
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    await expect.poll(() => latest?.round?.phase).toBe("halftime");
    expect(own().combat).toMatchObject({
      team: "Defenders",
      kills: 1,
      health: 100,
      life: firstLife + 1,
    });
    expect(enemy().combat).toMatchObject({
      team: "Attackers",
      deaths: 1,
      health: 100,
    });
    expect(own().player.z).toBe(-12);
    expect(enemy().player.z).toBe(-16);
    expect(latest!.round!.score).toEqual({ Alpha: 1, Bravo: 0 });
    shoot(1);
    a.send("respawn");
    await expect.poll(() => own().sequence).toBe(sequence);
    expect(own().player.z).toBe(-12);
    expect(own().combat!.shots).toBe(4);
    await expect.poll(() => latest?.round?.phase).toBe("freeze");
    expect(latest!.round!.objective!.carrier).toBe(b.sessionId);
    await expect.poll(() => latest?.round?.phase).toBe("active");
    for (let i = 0; i < 4; i++) {
      shoot();
      await expect.poll(() => own().combat!.shots).toBe(i + 5);
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    await expect.poll(() => latest?.round?.phase).toBe("finished");
    expect(latest!.round).toMatchObject({
      matchWinner: "Alpha",
      score: { Alpha: 2, Bravo: 0 },
      endsAt: null,
    });
    const position = own().player;
    shoot(1);
    a.send("respawn");
    await expect.poll(() => own().sequence).toBe(sequence);
    expect(own().player).toEqual(position);
    expect(own().combat!.kills).toBe(2);
    expect(own().combat!.shots).toBe(8);
    await b.leave();
    await expect.poll(() => latest?.players.length).toBe(1);
    expect(latest!.round!.matchWinner).toBe("Alpha");
    const replacement = await client.joinOrCreate(roomName);
    replacement.onMessage<Snapshot>("snapshot", () => {});
    expect(replacement.roomId).not.toBe(a.roomId);
    await replacement.leave();
  } finally {
    await a.leave();
    if (b.connection.isOpen) await b.leave();
  }
});

test("two browsers keep squad scores through halftime and show the finished-match screen", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  // Redirect matchmaking only to the server-owned shortened fixture.
  for (const context of [a, b])
    await context.route("**/matchmake/joinOrCreate/foundry-rounds", (route) =>
      route.continue({
        url: route.request().url().replace("foundry-rounds", roomName),
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
    for (let round = 1; round <= 2; round++) {
      await expect(first.getByLabel("Round status")).toContainText(
        "Round active",
      );
      for (let i = 0; i < 4; i++) {
        await first.mouse.down();
        await first.waitForTimeout(30);
        await first.mouse.up();
        await expect(first.getByLabel("Ammunition")).toHaveText(
          11 - i + " / 48",
        );
        await first.waitForTimeout(220);
      }
      if (round === 1) {
        await expect(first.getByLabel("Round status")).toContainText(
          "Halftime",
        );
        await expect(first.getByLabel("Team score")).toHaveText(
          "Alpha 1 : 0 Bravo",
        );
        await expect(first.getByLabel("Round status")).toContainText(
          "Alpha: Defenders / Bravo: Attackers",
        );
        await expect(first.getByLabel("Health", { exact: true })).toHaveText(
          "HP 100",
        );
      }
    }
    await expect(
      first.getByRole("heading", { name: "Alpha wins the match" }),
    ).toBeVisible();
    await expect(
      second.getByRole("heading", { name: "Alpha wins the match" }),
    ).toBeVisible();
    await expect(first.getByLabel("Match results")).toContainText(
      "Kills 2 / Deaths 0",
    );
    await expect(second.getByLabel("Match results")).toContainText(
      "Kills 0 / Deaths 2",
    );
    await expect
      .poll(() => first.evaluate(() => document.pointerLockElement === null))
      .toBe(true);
    await expect(first.getByRole("button", { name: "Resume" })).toHaveCount(0);
    await first.getByRole("button", { name: "Main menu" }).click();
    await expect(
      first.getByRole("button", { name: "Join round test" }),
    ).toBeVisible();
    await expect(second.getByLabel("Team score")).toHaveText(
      "Alpha 2 : 0 Bravo",
    );
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});
