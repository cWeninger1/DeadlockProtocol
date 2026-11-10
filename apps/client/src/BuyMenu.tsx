import { useEffect, useRef, useState } from "react";
import { economyRules } from "@dp/game-config";
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
  function trade(action: BuyRequest["action"]) {
    if (disabled) return;
    setMessage("Waiting for server confirmation...");
    room?.send("buy", {
      action,
      item: "rifle",
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
        <p>
          Survive to keep your rifle. Death removes it next round. Money resets
          at halftime.
        </p>
        <p role="status">{message}</p>
        <button className="secondary" onClick={() => dialog.current?.close()}>
          Close buy menu
        </button>
      </dialog>
    </>
  );
}
