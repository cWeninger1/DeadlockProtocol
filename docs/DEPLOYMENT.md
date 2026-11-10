# Deployment

Run npm run build to produce apps/client/dist. Development binds both services to loopback. Production hosting, secure WebSockets, Firebase rules and the game server deployment are Phase 8 release tasks. Configure Firebase for DeadlockProtocol separately.

The production start command remains npm run start -w @dp/server. The tests/server.ts entry point is for Playwright only; it additionally registers a shortened match fixture and must not be used for deployment. Match results currently remain in room memory; account-backed durable results belong to the persistence phase.
