import { useEffect, useRef, useState } from "react";
import { armorRules, economyRules } from "@dp/game-config";
import type { BuyRequest } from "@dp/protocol";
import type { MovementRoom } from "./networking/movement";
import type { RangeHud } from "./range";

export function BuyMenu({
  economy,
  room,
  connected,
}: {
  economy: NonNullable<RangeHud["economy"]>;
  room: MovementRoom | undefined;
  connected: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState("");
  const disabled = !connected || economy.restriction !== null;
  useEffect(() => {
    if (disabled) dialog.current?.close();
  }, [disabled]);
  useEffect(
    () =>
      room?.onMessage<{ text: string }>("buyResult", (result) =>
        setMessage(result.text),
      ),
    [room],
  );
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.code !== "KeyB" || event.repeat || disabled) return;
      event.preventDefault();
      if (dialog.current?.open) dialog.current.close();
      else {
        document.exitPointerLock();
        setMessage("");
        dialog.current?.showModal();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [disabled]);
  function trade(
    action: BuyRequest["action"],
    item: BuyRequest["item"] = "rifle",
  ) {
    if (disabled) return;
    setMessage("Waiting for server confirmation...");
    room?.send("buy", {
      action,
      item,
      epoch: economy.epoch,
      life: economy.life,
    } satisfies BuyRequest);
  }
  return (
    <>
      <aside className="economy-hud" aria-label="Economy">
        <strong aria-label="Money">${economy.money}</strong>
        <button
          disabled={disabled}
          onClick={() => {
            document.exitPointerLock();
            setMessage("");
            dialog.current?.showModal();
          }}
        >
          Buy equipment (B)
        </button>
        <small>
          {connected
            ? (economy.restriction ?? "Spawn buy zone / Freeze-time purchases")
            : "Connection lost"}
        </small>
      </aside>
      <dialog ref={dialog} className="buy-menu" aria-labelledby="buy-title">
        <small>FOUNDRY / EQUIPMENT</small>
        <h2 id="buy-title">Buy equipment</h2>
        <p>
          Balance <strong>${economy.money}</strong> / Purchases close when
          freeze time ends.
        </p>
        <p>Secondary slot: F12 Pistol / Owned</p>
        <div className="buy-items">
          <article>
            <h3>
              AR30 Rifle <span>${economyRules.riflePrice}</span>
            </h3>
            <p>
              Primary slot: {economy.ownsRifle ? "AR30 owned" : "Empty"} / 30
              rounds / 90 reserve
            </p>
            <p>Automatic fire. Press 1 to equip after the round starts.</p>
            <button
              disabled={
                disabled ||
                economy.ownsRifle ||
                economy.money < economyRules.riflePrice
              }
              onClick={() => trade("buy")}
            >
              Buy AR30
            </button>{" "}
            {economy.ownsRifle && (
              <button
                className="secondary"
                disabled={
                  disabled || economy.riflePurchaseEpoch !== economy.epoch
                }
                onClick={() => trade("refund")}
              >
                Refund AR30
              </button>
            )}
            {!economy.ownsRifle && economy.money < economyRules.riflePrice && (
              <p>
                Need ${economyRules.riflePrice - economy.money} more. Earn money
                through rounds, kills and objectives.
              </p>
            )}
          </article>
          <article>
            <h3>
              Armor <span>${economyRules.armorPrice}</span>
            </h3>
            <p>
              Protection: {economy.armor} / {armorRules.capacity}
            </p>
            <p>
              Absorbs weapon damage and loses points on impact. Purchase
              restores full armor.
            </p>
            <button
              disabled={
                disabled ||
                economy.armor >= armorRules.capacity ||
                economy.money < economyRules.armorPrice
              }
              onClick={() => trade("buy", "armor")}
            >
              Buy armor
            </button>{" "}
            {economy.armorPurchase?.epoch === economy.epoch && (
              <button
                className="secondary"
                disabled={disabled}
                onClick={() => trade("refund", "armor")}
              >
                Refund armor
              </button>
            )}
            {economy.armor < armorRules.capacity &&
              economy.money < economyRules.armorPrice && (
                <p>Need ${economyRules.armorPrice - economy.money} more.</p>
              )}
            <p>Same-freeze refunds restore your previous armor amount.</p>
          </article>
        </div>
        <p>
          Survive to keep equipment and remaining armor. Death removes both next
          round. Money and equipment reset at halftime.
        </p>
        <p role="status">{message}</p>
        <button className="secondary" onClick={() => dialog.current?.close()}>
          Close buy menu
        </button>
      </dialog>
    </>
  );
}
