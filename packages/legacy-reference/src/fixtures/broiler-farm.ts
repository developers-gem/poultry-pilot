/**
 * A realistic small broiler farm in the prototype's row shapes (Supabase tables).
 * Amounts are what a farmer in India would type: rupees, though the prototype displayed "$".
 */
export const NOW = "2026-10-06T06:00:00Z"; // 11:30 IST

export const flocks = [
  {
    id: "f1", name: "Batch 14", bird_type: "broiler", status: "active", bird_count: 1000, chicks_received: 1000,
    start_date: "2026-09-01", hatch_date: "2026-09-01", chick_cost: 40000, birds_sold: 400,
    sale_weight_kg: 920, sale_price_per_kg: 110, sale_date: null,
  },
  {
    id: "f0", name: "Batch 13", bird_type: "broiler", status: "sold", bird_count: 800, chicks_received: 800,
    start_date: "2026-07-01", hatch_date: "2026-07-01", chick_cost: 32000, birds_sold: 770,
    sale_weight_kg: 1771, sale_price_per_kg: 105, sale_date: "2026-08-12",
  },
];

export const logs = [
  // Batch 13 (closed) losses still in the table
  { flock_id: "f0", log_date: "2026-07-03", mortality: 30, feed_kg: 2900 },
  // Batch 14
  { flock_id: "f1", log_date: "2026-09-02", mortality: 12, feed_kg: 30 },
  { flock_id: "f1", log_date: "2026-09-20", mortality: 8, feed_kg: 1500 },
  { flock_id: "f1", log_date: "2026-10-01", mortality: 5, feed_kg: 1870 },
];

export const weights = [
  { flock_id: "f1", weigh_date: "2026-09-29", weight_g: 2000 },
  { flock_id: "f1", weigh_date: "2026-09-29", weight_g: 2100 },
  { flock_id: "f1", weigh_date: "2026-10-05", weight_g: 2300 },
  { flock_id: "f1", weigh_date: "2026-10-05", weight_g: 2500 },
];

export const tx = [
  { flock_id: "f1", kind: "expense", category: "medicine", amount: 3000 },
  { flock_id: null, kind: "sale", category: "eggs", amount: 5000 },
  // A feed purchase entered on the Money page too, with blank category (saved as "feed" by default)
  { flock_id: null, kind: "expense", category: "feed", amount: 90000 },
];

export const feed = [{ name: "Broiler starter", quantity_kg: 3000, price_per_kg: 30 }];

export const recurring = [
  { name: "Electricity", amount: 5000, frequency: "monthly", start_date: "2026-01-01", active: true },
  { name: "Old attendant", amount: 9000, frequency: "monthly", start_date: "2026-01-01", active: false },
];
