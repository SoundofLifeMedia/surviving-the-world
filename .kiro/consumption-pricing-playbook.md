# ODE Consumption-Based Licensing Playbook (Sales/Rev/Ops)

**Purpose:** Equip sales and revenue teams with a clear consumption-based model that aligns price to value, supports flexible experimentation, and scales with customer usage—while preserving enterprise controls, RBAC, and multi-tenant guardrails.

## 1) Choose the Value Metric (tie cost to value delivered)
- Primary candidates: `AI-agent invocations`, `events processed`, `active seats with minimum commit`, `GB of indexed data`, `integrations active`, `workflows executed`.
- Rules:
  - Must be **measurable, auditable, and observable** (metrics/logs/traces + usage ledger).
  - Must correlate with outcomes customers care about (fewer tickets, faster close, compliant GL postings).
  - Keep base platform fee (SLA, support tier) + usage-based overage; include per-tenant feature flags/version pins.
  - Offer committed-use discounts (monthly/annual), burst buffers with caps/alerts, and sandbox quotas.

## 2) Modernize Sales Motion & Comp
- Compensation:
  - Quotas split between **committed ARR** (platform + committed usage) and **expansion NRR** (measured usage uplift).
  - SPIFFs for workload onboarding (events, agents, integrations) and for activating governance (alerts, caps, budgets).
  - Protect CSM/AE alignment: CSM owns adoption/health; AE owns commits/expansion; shared credit on net expansion.
- Sales process:
  - Lead with value metric clarity + budget guardrails; share forecast/alert setup in the first 2 calls.
  - Bundle implementation packages (Integration Center setup, GL validation policy, SSO/RBAC, data residency).
  - Publish standard rate cards + “design-to-cost” plays for price-sensitive buyers (enable feature flags to land and expand).

## 3) Revenue Playbook (Land → Expand → Retain)
- Land: Small commit + sandbox; enable 1–2 priority modules + 1–2 integrations; set alerts/usage caps.
- Expand: Add agents (finance/procurement/support), increase event/agent limits, activate more integrations, unlock premium SLA.
- Retain: Quarterly true-up with budget vs. actual; provide optimization recommendations and AI Chair health report; introduce annual commits for discounts.
- Pricing tiers (example skeleton):
  - **Essential**: Base platform fee, limited agent calls/events, community support, standard SLA.
  - **Growth**: Higher caps, multi-integration pack, advanced observability, business-hours support, lower unit rates.
  - **Enterprise**: Unlimited tenants, custom SLAs, dedicated SSO/SCIM, private networking, rate-limited burst buffers, premium support, lowest unit rates.

## 4) Help Customers Predict & Optimize Spend
- Provide **budgeting and alerting**: soft/hard caps, rate-limiters, anomaly alerts, daily/weekly usage emails.
- Offer **price calculators**: inputs = events/agents/GB/indexed data/integrations; output = forecast + confidence bands.
- Surface **optimization tips**: caching, batching, off-peak scheduling, agent policy tuning, dedupe rules, archival policies.
- Share **governance defaults**: per-tenant quotas, per-role limits, redaction rules, PII-safe logging options.

## 5) Leverage Data for Advantage
- Instrument **usage ledger** by tenant/feature/integration/agent; expose to RevOps and CSM.
- Build **propensity models** for expansion based on integration count, feature depth, and alert triggers.
- Run **cohort and margin analysis**: unit economics by segment/vertical; identify loss-making patterns early.
- Feed insights into **product roadmap**: optimize high-usage/low-margin paths; invest in efficiency levers; revise rate cards carefully.

## Operational Guardrails
- Always-on observability for usage measurement; audited metering path; double-write to ledger + warehouse.
- RBAC and tenant isolation on metering data; no cross-tenant aggregation without anonymization.
- Safety rails: auto-caps, retries with backoff, graceful degradation; CEO-in-loop for high-risk plan changes.

## Enablement Checklist (for Sales/CS/RevOps)
- One-pager per tier + rate card + FAQ.
- Demo path: show usage alerts, budget caps, calculator, and optimization suggestions.
- Implementation SKUs: SSO/SCIM, Integration Center setup, GL validator, data residency, private networking.
- Success plan template: 90-day adoption KPIs tied to the value metric; renewal and expansion triggers.
