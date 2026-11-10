# Game design

Foundry starts as an open industrial movement range. Floor markings lead between three solid freight obstacles and a two-level training platform. The plan on the main menu uses the same cover coordinates as the scene. All geometry is original and generated in code. The full tactical match rules and planned arsenal are defined in MASTER_PROMPT.md.

At the spawn end of the lane, moving forward steps onto the curb. Jump while moving forward to reach the higher platform. Hold Shift for a slower walk or Ctrl to lower the viewpoint and move at crouch speed.

The F12 training pistol starts with 12 rounds loaded and 48 in reserve. Aim at the orange plate directly ahead of spawn. Left click fires one shot and R reloads. The targeting square flashes on impact and the HUD counts hits. Re-enter the range to reset the session.

Press 1 for the AR30 rifle or 2 for the F12 pistol. The AR30 carries 30 rounds with 90 in reserve and fires while the left mouse button is held. Each weapon retains its ammunition when holstered. Switching cancels reloading and takes a short equip delay. Rifle fire raises the aim, requiring downward mouse movement to keep sustained fire on target.

Players and range targets start with 100 HP. Pistol hits deal 25 damage and rifle hits deal 34 damage to the practice plate. Destroyed plates disappear for three seconds of active play before resetting.

The red striped area to the left of spawn deals 25 damage every half second while touching its floor. Leave the area to stop taking damage. At zero health, gameplay stops and the mouse is released. Respawn creates a fresh range session with full health, fresh ammunition and the default spawn position.

## Round test

A separate two-player mode runs waiting, warmup (5 seconds), freeze (20 seconds), active (115 seconds) and ending (5 seconds). Movement and weapons are enabled during active and planted play. Before planting, elimination wins for the surviving team; an unplanted timeout wins for defenders. The server deadline takes priority on the expiry tick. Team score increments once per completed round.

Each freeze restores both players to their team spawns with 100 HP, full pistol/rifle ammunition and zero recoil. Kills/deaths persist. Manual respawn is unavailable, and dead players see a waiting message until the next freeze. Both teams are required: a departure aborts the sequence, clears team scores and waits for a replacement. The mode now completes regulation matches; spectator cameras remain outstanding.

## Objectives

Round tests now include Site A at (8, -16) and Site B at (-10, 8). Shared site geometry defines the allowed planting zones. The sole attacker receives the objective each round. Hold E while stationary and grounded inside a site for five seconds to plant. The device appears at the authoritative planting position. Holding E suppresses gunfire; movement cancels the action.

Defenders within two metres of the device hold E for ten seconds to defuse. Action progress resets on release, movement, leaving range, death or expired input. Planting replaces the active clock with a 40-second fuse. After planting, player eliminations do not end the round: defenders must defuse or attackers win on expiry. The deadline takes priority over an action completing on that tick. Scores update once and objective state resets next round. A team disconnect still aborts the test round.

Simple original Web Audio tones announce planting, defuse and detonation after the browser has received a gameplay gesture. Muted/suspended browsers retain visual feedback. Purchased defuse kits, larger-team carrier dropping/pickup, blast damage and polished sound/impact effects are future work.

## Match progression

Alpha and Bravo are permanent squad identities. Alpha starts attacking and Bravo defending. After 12 completed rounds a ten-second halftime swaps their sides, spawn positions and objective eligibility. Scores and individual kills/deaths/hits stay with their squads/players; health, ammunition and recoil reset. A normal freeze precedes round 13.

First squad to 13 wins. If regulation ends 12-12 after round 24, the match is a draw; overtime is not enabled. Shared rule values define the half length, win threshold and halftime duration. On completion, play stops and a result screen displays winner/draw, final squad scores and personal stats. Players return to the menu to join another room.

A departure before completion aborts the current match and clears team scores, returning the remaining player to the initial side assignment. A departure after completion preserves the final result. Finished rooms are locked against matchmaking joins.
