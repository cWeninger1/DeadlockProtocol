import { expect, it } from "vitest";
import { MovementPrediction } from "../apps/client/src/networking/prediction";
import { advancePlayer, spawnPlayer } from "@dp/game-config";
import {
  idleInput,
  type InputMessage,
  type PlayerSnapshot,
} from "@dp/protocol";

it("predicts immediately and reconciles delayed snapshots without camera reversals", () => {
  const prediction = new MovementPrediction();
  let server = spawnPlayer(),
    expected = spawnPlayer();
  prediction.reconcile({ id: "self", player: server, yaw: 0, sequence: 0 }, 0);
  const commands: InputMessage[] = [];
  const responses: { arrives: number; tick: number; state: PlayerSnapshot }[] =
    [];
  let previousX = 0,
    maxStep = 0;
  for (let tick = 1; tick <= 180; tick++) {
    const command = {
      ...idleInput,
      right: tick <= 120 ? 1 : 0,
      sequence: tick,
    };
    commands.push(command);
    prediction.step(command);
    expected = advancePlayer(expected, command);
    // 100 ms uplink and 100-133 ms downlink, in ordered snapshot batches.
    if (tick > 6) {
      const input = commands[tick - 7];
      server = advancePlayer(server, input);
      if (tick % 3 === 0)
        responses.push({
          arrives: tick + 6 + (tick % 2) * 2,
          tick,
          state: {
            id: "self",
            player: server,
            yaw: 0,
            sequence: input.sequence,
          },
        });
    }
    for (const response of responses.filter((r) => r.arrives === tick))
      prediction.reconcile(response.state, response.tick);
    expect(prediction.current).toEqual(expected);
    for (const alpha of [0, 0.5]) {
      const rendered = prediction.render(alpha, 1 / 120);
      if (tick > 20 && tick < 110) {
        const step = rendered.x - previousX;
        expect(step).toBeGreaterThan(0);
        maxStep = Math.max(maxStep, step);
      }
      previousX = rendered.x;
    }
  }
  expect(maxStep).toBeLessThan(0.05);
  expect(prediction.pending.length).toBeLessThan(20);
});
it("smooths small corrections, rejects old snapshots and bounds pending input", () => {
  const p = new MovementPrediction();
  const base = { id: "self", player: spawnPlayer(), yaw: 0, sequence: 0 };
  p.reconcile(base, 1);
  p.reconcile({ ...base, player: { ...base.player, x: 0.3 } }, 2);
  expect(p.current.x).toBe(0.3);
  expect(p.render(1, 1 / 60).x).toBeLessThan(0.1);
  p.reconcile(base, 1);
  expect(p.current.x).toBe(0.3);
  for (let sequence = 1; sequence <= 200; sequence++)
    p.step({ ...idleInput, sequence });
  expect(p.pending.length).toBe(120);
  p.reconcile({ ...base, sequence: 200 }, 300);
  expect(p.pending).toHaveLength(0);
});
