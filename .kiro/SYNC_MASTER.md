# ODE WAR MODE – SINGLE SOURCE SYNC (Claude + Kiro)

Purpose: One-page, always-fresh alignment for Claude/Kiro on ODE 2.0, Integration Layer 2.0, and STW Core Survival Engine. Use this as the canonical jump table and status tracker.

## Current Status (High-Level)
- Phase 1 Nav: ✅ Delivered (Yahoo-style nav with GPT search placeholder) in `/dashboard/src/components/GlobalTopNav.tsx` and `/dashboard/src/app/layout.tsx`.
- Phase 2 GPT Search + Agent Routing: 🔄 Planning done, ready to code (spec below).
- Integration Layer 2.0: 📝 Design + requirements in place; implementation not started.
- STW Core Survival Engine: 📝 Requirements + design complete; implementation not started.

## Core North Star
- Foundation-first, data-driven, multi-tenant isolation, hot-reloadable configs, observability, auto-heal hooks, RBAC, API versioning, and tests for every change (unit/integration/E2E/load/failure-injection).
- No era/system hardcoding; everything declarative/versioned. CorrelationId/traceId everywhere. Idempotent handlers and DLQs with replay.

## Key Specs (authoritative)
- ODE Integration Layer 2.0 Design: `.kiro/specs/ode-integration-layer/design.md`
- ODE Integration Layer Requirements: `.kiro/specs/ode-integration-layer/requirements.md`
- Phase 2 GPT Search + Agent Routing Plan: `.kiro/specs/ode-integration-layer/phase2-gpt-search-agent-routing.md`
- STW Core Survival Engine Design: `.kiro/specs/core-survival-engine/design.md`
- STW Core Survival Engine Requirements: `.kiro/specs/core-survival-engine/requirements.md`
- Historical sync docs (reference only): `../oda-backups/CLAUDE_ODE_2.0_SYNC.md`, `../oda-backups/CLAUDE_FINAL_SYNC_COMPLETE_V2.md`, `../oda-backups/CLAUDE_INTEGRATION_MASTER_LAYER_SYNC.md`
- Org/Governance (CEO-level, secret): `.kiro/ULTRA_ADMIN_SECRET.md`
- Consumption Pricing Playbook (sales/rev/ops): `.kiro/consumption-pricing-playbook.md`

## CEO 2025–2026 Market Update (team-wide directive)
- AI is core: predictive analytics, autonomous workflows, natural-language UX as defaults.
- Vertical & micro-SaaS: domain-specific accelerators (finance, procurement, support, creator, FMS) plus no/low-code extension paths.
- Hyper-personalization & autonomy: real-time adaptation per user/tenant; autonomous procurement/provisioning/renewals with RBAC, audit, CEO-in-loop for risk.
- Product-led growth: self-serve onboarding, usage-based trials, in-app guidance, adoption observability.
- Contracts/renewals: strategic, risk-aware negotiations aligned to compliance/security; use consumption-based pricing playbook and value metrics.

## Market Intel (learning-only): Microsoft “Business Agents kill SaaS by 2030”
- Microsoft leadership claims form-driven biz apps → agent-native patterns (GenAI UI, goal-oriented agents, vector DBs); timeline 6–18 months codification, mainstream by 2030.
- Skeptics note enterprise inertia, determinism gaps, and legacy/workflow migration risk; expect agents as add-ons to existing suites first.
- Standards convergence (MCP/A2A) cited as catalyst; aligns with ODE open-standards stance.
- Risks: non-determinism vs deterministic domains (GL, inventory), ossification if agents stall innovation, long migration for heavy industries.
- ODE takeaway: continue agent-first architecture, keep deterministic guardrails (GL validation, policy engines), support hybrid “apps evolve into agents” path, and maintain open-protocol alignment.

## Phase 2 (GPT Search + Agent Routing) – Action Plan
1) Backend: Add `POST /api/search/route` with request/response validation; emit correlationId/traceId; decision log included in response. Timeout + partial response handling.
2) Classification: Rules first, LLM fallback with module/role/license context; filter agents by RBAC/module visibility/license caps.
3) Agents (initial stubs): finance, procurement, support, creator, PMO, FMS, router; return structured `AgentResult` with actions and module links.
4) Frontend: Wire `GlobalTopNav` search input to endpoint; render cards with agent badge, summary, actions, module chips; loading/error/A11y/mobile.
5) Observability: Metrics (requests/agent calls/errors/latency), structured logs, traces; decision logs persisted.
6) Tests: Routing rules, contract schemas, integration (stub agents), observability presence, UX states.

## Integration Layer 2.0 – Implementation Roadmap (excerpt)
1) Scaffold Integration Service: API gateway with tenant-aware middleware; health/version; tracing.
2) Config + Secrets Store: Postgres schemas (tenant-scoped), vault client, versioned config CRUD.
3) Connector Engine v1: REST + OAuth2 adapter, retry/throttle/circuit, token cache; manifest loader.
4) Event Router: Topic schema, envelope builder, publisher/consumer, idempotency, DLQ/replay.
5) Mapping Engine v1: Declarative mapping executor + transforms + validation; versioned storage.
6) GL Transformer v1: Rule-based validator/mapper, explainability payload, rejection logging; AI hook.
7) Master Data Sync Orchestrator: Scheduler + triggers, delta/watermark, reconciliation reports.
8) IMA Discovery/Blueprint: ERP fingerprinting stub + report generator; payload exemplars; policy packs.
9) Monitoring/Health Score: Metrics/logs/traces emitters; health score calculator; dashboards schema.
10) Auto-Heal Hooks: Token refresh, retries, throttling, mapping/GL correction suggestions.
11) Playbook Generator: ERP-specific templates rendered from canonical schemas.
12) QA Harness: Contract/mapping/GL/load/drift/failure-injection suites in CI.

## Survival Engine (STW) – Next Steps
- Task 1: Project setup + data-driven content loading scaffolds (era-agnostic).
- Keep era data under `/data/eras/...` etc.; no logic hardcoding. Add observability/logging/test harness early.

## AI System Integration
- AI Bootstrap Prompt: `.ai/BOOTSTRAP.md`
- AI Constitution: `.ai/constitution/ode-ai-constitution-v3.md`
- AI System README: `.ai/README.md`
- All AI agents must follow the AI Constitution and Bootstrap rules
- AI system provides governance layer on top of Kiro specs

## Llewellyn Systems Organization (IPO PREP)
- **CEO & Ultimate Authority:** Llewellyn Christian
- **Org Chart:** `.ai/governance/LLEWELLYN_SYSTEMS_ORG_CHART.md` (ULTRA ADMIN SECRET)
- **Status:** IPO Preparation Mode - Enterprise-grade governance active
- **C-Suite:** COO, CTO, CAIO, CPO, CSO, CPO2 (Privacy), CFO, CRO, CCO, CLO, CPO3 (People), CRO2 (Reliability), CDO
- **Divisions:** AI, Engineering, SRE & Cloud, Security & Privacy, Product & UX, Sales & Revenue, Customer, Creator, Finance & Admin, Legal, People & Culture
- **Board Committees:** Audit & Compliance, AI Ethics & Safety, Security & Zero Trust, Finance & Risk, Technology Oversight, Compensation & People Governance
- All divisions operate inside ODE and use platform modules daily

## Communication Notes
- This file supersedes scattered syncs; future updates should amend this file + referenced specs.
- Keep Claude/Kiro aligned by referencing this jump table and linked specs before coding.
- All AI operations must comply with `.ai/constitution/` and `.ai/BOOTSTRAP.md`
