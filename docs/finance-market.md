# PoultryPilot Finance and PoultryMarket

Farm accounting, flock and house costing, and a marketplace with a strict order lifecycle. Code: `services/api/src/services/finance.service.ts`, `market.service.ts`, `domain/finance.ts`, `domain/orders.ts`.

## Finance model

| Concept | Where | Notes |
| --- | --- | --- |
| Expense, Purchase | `expenses` (`kind`) | A bill the farm owes: category, supplier, amount, tax, due date, flock or house, attachments. Unpaid bills are **payables** |
| Income, Sale | `incomes` (`kind`) | Money the farm is owed: category, customer, amount, tax, due date, flock or house, attachments. Unpaid incomes are **receivables** |
| Payment | `transactions` (`kind: payment`) | Against a bill (money out) or income (money in), from or into one account. No overpayment |
| Refund | `transactions` (`kind: refund`) | A supplier paying back (in) or the farm refunding a customer (out). Never more than was paid |
| Transfer | `transactions` (`kind: transfer`, a pair) | Between two of the farm's accounts; never affects profit |
| Recurring expense | `recurring_expenses` | Daily to yearly; creates one bill per due date (idempotent), skipping paused dates. Runs hourly and on demand |
| Money accounts | `money_accounts` | Cash box, bank, mobile money; balance = opening balance + ledger. Cash and mobile money cannot go below zero |
| Supplier | `suppliers` | With a statement of bills and amount owed |
| Customer | `buyers` | With order history, sales and amount owed |

- **Currency:** the farm's currency. Other currencies are refused, not converted.
- **Tax:** any rate and label the farm enters (GST, VAT…), inclusive or added on top. Net + tax always equals gross, and reports show amounts excluding tax, with tax totals separately. No country tax rules are built in.
- **Payment methods:** cash, bank transfer, mobile money, UPI, card, cheque, other.

Documents are corrected by cancelling them, and only while unpaid. Documents created by another module change through that module.

### Automatic postings

| Event | Document |
| --- | --- |
| Inventory purchase (FeedWise) | Unpaid purchase bill to the supplier (feed, medicine and vaccine, litter, equipment… by item category) |
| Fee on a health record (FlockHealth) | Vet services bill; replaced if the fee changes, cancelled if the record is deleted |
| Bird sale (flock engine) | Bird sales receivable. Reversing the sale cancels it; if it was paid, refund first |
| Chick order or marketplace order accepted | Receivable for the order total; cancelled with the order (refund payments first) |
| Recurring expense due | Bill |

### Flock and house costing without double counting

A flock's costs and revenue come from the flock engine. Finance adds only what reaches the flock no other way.

| Counted in a flock | Source |
| --- | --- |
| Chick cost | the placement |
| Feed **eaten and wasted** | feed entries, at the lots' actual cost (not the purchase bill) |
| Medicine and vaccines used, vet fees | FlockHealth (not the vet bill) |
| Bills allocated to the flock (labour, catching crew, transport…) | Finance |
| Bird sales | the sale events (not their receivables) |
| Other income allocated to the flock | Finance (hand-entered incomes) |

House costing adds bills and incomes allocated to the house itself to the costs and revenue of the flocks it holds.

## Reports

All under `/api/v1/farms/:farmId/finance/reports`.

| Report | Contents |
| --- | --- |
| `pnl?from&to[&flockId&houseId]` | Accrual basis by document date, excluding tax: revenue and expenses by category, net profit, margin, tax on sales and purchases, monthly series |
| `cash-flow?from&to` | Cash basis: inflows and outflows by category, net cash flow, transfers (shown, not counted), and per account the opening, money in, money out and closing balances |
| `expenses?from&to` | By category, kind, supplier, flock, house |
| `revenue?from&to` | By category, customer, flock, source |
| `receivables`, `payables` | Open documents with outstanding amounts, aged: current, 1–30, 31–60, 61–90, over 90 days past due |
| `flock-profitability` | Per flock: revenue, cost breakdown, profit, margin, **cost per bird** (cost ÷ birds received), **cost per kg** (cost ÷ weight produced), **cost per egg** (cost ÷ eggs collected), plus farm totals |
| `house-costing` | Per house: direct costs, flock costs, revenue, profit |

> **Change:** decision D8 ("farm profit is cash-basis") is superseded. P&L is accrual, and cash flow is reported separately (D75).

## PoultryMarket

| Part | Endpoints | Notes |
| --- | --- | --- |
| Seller listings | `POST/GET /farms/:farmId/market/listings`, `PUT …/:id`, `POST …/:id/status` | Title, category, quantity, unit, price per unit, region, fulfilment options (pickup, seller delivery, courier), photos, optional **stock source** (eggs of a grade, a chick lot, or a flock). Draft → active ⇄ paused → closed; sold out when fully reserved |
| Browse | `GET /market/listings`, `GET /market/listings/:id` | Any signed-in user; active listings only; shows seller farm name and area, **never contact details** |
| Order | `POST /market/orders` | The buyer chooses quantity and fulfilment. **The price always comes from the listing** (a price in the request is rejected; fixes B8). A farm cannot order its own listing |
| Order management (seller) | `POST /farms/:farmId/market/orders/:id/accept|prepare|dispatch|deliver|complete|cancel` | See the state machine below |
| Buyer actions | `POST /market/orders/:id/cancel|received|complete`, `GET /market/orders` | A buyer sees only their own orders, and the seller's contact once the seller accepts |
| Payments | `POST …/orders/:id/payments`, `…/refunds` | Recorded by the seller; settle the order's receivable in Finance; set the order's payment status (unpaid, partially paid, paid, refunded) |
| Delivery | `dispatch` (vehicle, driver, tracking, expected date), `deliver` (received by, proof photo) | Delivery moves stock: eggs leave egg stock, chicks leave the chick lot, birds are sold through the flock engine (bird count, FCR and **withdrawal periods** apply; the order carries the income) |
| Buyer management | `GET/PUT /farms/:farmId/buyers/:id` | Order history, sales and outstanding amount |

### Order states

```
PENDING → ACCEPTED → PREPARING → DISPATCHED → DELIVERED → COMPLETED
   └──────────┴──────────┴─────→ CANCELLED (before dispatch)
```

| From | Allowed next |
| --- | --- |
| pending | accepted, cancelled |
| accepted | preparing, dispatched, delivered (pickup only), cancelled |
| preparing | dispatched, delivered (pickup only), cancelled |
| dispatched | delivered |
| delivered | completed (fully paid only) |
| completed, cancelled | — |

Every move goes through one function (`assertOrderTransition`); anything else is refused with `INVALID_STATE_TRANSITION`. The rules:
- Pickup orders are never dispatched. Delivery orders must be dispatched before delivered.
- Buyers may cancel only while pending or accepted. They may confirm receipt only after dispatch, and complete a delivered, paid order. They may not accept, prepare or dispatch.
- **Accepting** reserves the quantity on the listing, refusing if not enough is left (two orders that each fit cannot both be accepted beyond the listing), and creates the receivable.
- **Cancelling** returns reserved quantity and cancels the receivable. It is refused while payments are recorded: refund first.

Chick orders from HatcheryHub use the same state machine (`/chick-orders/:id/confirm` = accept).

## Permissions

| Action | Roles |
| --- | --- |
| See finance (`money.read`) | owner, admin, farm manager, accountant |
| Record documents, accounts, transfers, refunds (`money.record`) | owner, admin, farm manager, accountant |
| Record payments (`payment.record`) | owner, admin, farm manager, accountant |
| Cancel documents (`money.delete`) | owner, admin, accountant |
| Listings, order management, buyers (`market.manage`) | owner, admin, farm manager |
| Browse and buy | any signed-in user |

## Not yet included

- **Multi-currency:** refused, not converted.
- **Accounting exports:** no ledger export to accounting software, and no invoice PDFs yet.
- **Buyer-side bookkeeping:** marketplace purchases are not posted to the buyer's own farm books. That would be a cross-farm write; the buyer can record the bill by hand.
- **Payment confirmation:** buyers cannot record that they paid. The seller records payments received.
- **Ratings and disputes.**
