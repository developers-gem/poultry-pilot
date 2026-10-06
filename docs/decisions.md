# Decisions log

Defaults chosen so work can proceed while the open questions in the audit document are unanswered.
Each is cheap to change until the phase named.

| # | Decision | Default taken | Change cost rises after |
| --- | --- | --- | --- |
| D1 | Package manager | pnpm workspaces | — |
| D2 | IDs | UUIDv7 strings, client-generated for offline creation | Phase 2 |
| D3 | Password hashing | Argon2id, 19 MiB memory, 2 iterations (OWASP baseline) | — |
| D4 | Access / refresh tokens | 15-minute HS256 JWT; 30-day opaque refresh token, rotated, reuse revokes family | Phase 7 (Flutter) |
| D5 | Non-member access to a farm | 404, not 403, so farm IDs cannot be probed | — |
| D6 | FCR convention | Excludes dead-bird weight by default; per-farm setting `fcrIncludesMortalityWeight` | Phase 2 |
| D7 | Worker edit window | Own production entries for today and yesterday (farm-local); setting `workerEditWindowDays` | Phase 2 |
| D8 | Profit basis | Farm profit is cash-basis from the ledger; batch margin is a separate management view with feed costed from issues | Phase 3 |
| D9 | Currency change | Allowed only while the farm has no ledger entries | Phase 3 |
| D10 | Alert defaults | Evaluate yesterday only; mortality alert when ≥3 deaths and above max(0.1% of flock, 2× 7-day baseline); egg drop 10%; feed change ±20% with ≥4 baseline days | Phase 4 |
| D11 | Job scheduler | Agenda on MongoDB (no Redis) | Phase 4 |
| D12 | Incubation days | chicken 21, duck 28, turkey 28, quail 17, guinea fowl 27; overridable per batch | Phase 2 |
| D13 | Web offline | Online-only web; offline is a Flutter capability | Phase 7 |

## Open questions still blocking specific work

- Real data in Supabase project `cgcjsvdgbkvuyadwvznr`, and the actual currency users typed → blocks Phase 8 importer.
- Species at launch → affects production profile seed data (Phase 2).
- Hosting region (Atlas region / data residency) → blocks staging environment.
- Marketplace buyer accounts → blocks Phase 5 design.
