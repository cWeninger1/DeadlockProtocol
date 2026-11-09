import { MovementRoom, RoundRoom } from "./rooms/MovementRoom";
import { Server, Room, createRouter, createEndpoint } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { FOUNDATION_ROOM, MOVEMENT_ROOM, ROUND_ROOM } from "@dp/protocol";

class FoundationRoom extends Room {
  maxClients = 2;
}
const server = new Server({ transport: new WebSocketTransport() });
server.router = createRouter({
  health: createEndpoint("/health", { method: "GET" }, async () => ({
    status: "ok",
  })),
});
server.define(FOUNDATION_ROOM, FoundationRoom);
server.define(MOVEMENT_ROOM, MovementRoom);
server.define(ROUND_ROOM, RoundRoom);
await server.listen(Number(process.env.PORT ?? 2567), "127.0.0.1");
