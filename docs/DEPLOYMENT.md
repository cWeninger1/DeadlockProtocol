# Deployment

Run npm run build to produce apps/client/dist. Development binds both services to loopback. Production hosting, secure WebSockets, Firebase rules and the game server deployment are Phase 8 release tasks. Configure Firebase for DeadlockProtocol separately.

The production start command remains npm run start -w @dp/server. The tests/server.ts entry point is for Playwright only; it additionally registers a shortened match fixture and must not be used for deployment. Match results currently remain in room memory; account-backed durable results belong to the persistence phase.

Economy balances are match-local server memory. This slice adds no backend services, environment variables or paid resources. Client and server must run the same protocol revision because loadouts now include ownership and round snapshots include economy state. Test-only economy/spectator/short-match rooms are registered only by tests/server.ts.

The armor slice extends combat/economy snapshots and buy item validation. Run matching client/server revisions. The accelerated armor room is test-only; production registration, services and environment variables are unchanged.
