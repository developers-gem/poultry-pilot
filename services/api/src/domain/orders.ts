import type { OrderStatus } from "@poultrypilot/types";
import { DomainError } from "./errors.js";

/**
 * The order state machine. Every status change goes through assertOrderTransition; anything not listed is refused.
 *   PENDING → ACCEPTED → PREPARING → DISPATCHED → DELIVERED → COMPLETED, CANCELLED before dispatch.
 * Pickup orders are never dispatched: they go from ACCEPTED or PREPARING straight to DELIVERED (collected).
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "dispatched", "delivered", "cancelled"],
  preparing: ["dispatched", "delivered", "cancelled"],
  dispatched: ["delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

export type Fulfilment = "pickup" | "seller_delivery" | "courier";
export type OrderActor = "seller" | "buyer";

/** Which side may make each move. Buyers can cancel early, confirm receipt and complete; sellers drive the rest. */
const ACTOR_MOVES: Record<OrderActor, readonly OrderStatus[]> = {
  seller: ["accepted", "preparing", "dispatched", "delivered", "completed", "cancelled"],
  buyer: ["cancelled", "delivered", "completed"],
};

export function assertOrderTransition(o: { status: OrderStatus; fulfilment: Fulfilment; paymentStatus?: string }, to: OrderStatus, actor: OrderActor): void {
  const allowed = ORDER_TRANSITIONS[o.status];
  if (!allowed.includes(to)) {
    throw new DomainError("INVALID_STATE_TRANSITION", `An order that is ${o.status} cannot become ${to}${allowed.length ? ` (next: ${allowed.join(", ")})` : ""}`, { from: o.status, to, allowed });
  }
  if (o.fulfilment === "pickup" && to === "dispatched") throw new DomainError("INVALID_STATE_TRANSITION", "Pickup orders are collected, not dispatched; mark them delivered when collected");
  if (o.fulfilment !== "pickup" && to === "delivered" && o.status !== "dispatched") throw new DomainError("INVALID_STATE_TRANSITION", "Dispatch the order before marking it delivered");
  if (!ACTOR_MOVES[actor].includes(to)) throw new DomainError("FORBIDDEN", `The ${actor} cannot mark an order ${to}`);
  if (actor === "buyer" && to === "cancelled" && o.status !== "pending" && o.status !== "accepted") throw new DomainError("INVALID_STATE_TRANSITION", "The order is already being prepared; ask the seller to cancel it");
  if (actor === "buyer" && to === "delivered" && o.status !== "dispatched") throw new DomainError("INVALID_STATE_TRANSITION", "Only a dispatched order can be confirmed as received by the buyer");
  if (to === "completed" && o.paymentStatus !== "paid") throw new DomainError("INVALID_STATE_TRANSITION", "Record full payment before completing the order");
}

/** Statuses in which the order holds quantity from its listing. */
export const RESERVING_STATUSES: readonly OrderStatus[] = ["accepted", "preparing", "dispatched"];
