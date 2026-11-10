import { server } from "../apps/server/src/main";
import { RoundRoom } from "../apps/server/src/rooms/MovementRoom";
import { createRound, roundRules } from "@dp/game-config";

// Only the Playwright entry point registers this fast, real-simulation fixture.
// Clients of the production entry point cannot select or override these rules.
class ShortMatchRoom extends RoundRoom {
  protected rules = {
    ...roundRules,
    warmupTicks: 60,
    freezeTicks: 60,
    endingTicks: 60,
    halftimeTicks: 180,
    roundsPerHalf: 1,
    roundsToWin: 2,
  };
  protected round = createRound(0, this.rules);
}
server.define("foundry-rounds-test", ShortMatchRoom);

class SpectatorTestRoom extends RoundRoom {
  protected rules = {
    ...roundRules,
    warmupTicks: 60,
    freezeTicks: 60,
    endingTicks: 600,
  };
  protected round = createRound(0, this.rules);
}
server.define("foundry-rounds-spectator", SpectatorTestRoom);
