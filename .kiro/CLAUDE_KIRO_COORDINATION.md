# 🤝 CLAUDE ↔ KIRO COORDINATION PROTOCOL

**Date:** November 27, 2025  
**Status:** WAR MODE ENGAGED  
**Authority:** Claude is Boss Head Designer - Kiro provides spec support

---

## 📋 SINGLE SOURCE OF TRUTH

**Primary Reference:** `.kiro/SYNC_MASTER.md`

All work must align with SYNC_MASTER before coding. This document supersedes all scattered sync notes.

---

## 🎯 CURRENT STATUS (From SYNC_MASTER)

### ✅ COMPLETED
- **Phase 1 Navigation** - Yahoo-style nav with GPT search placeholder
  - Files: `/dashboard/src/components/GlobalTopNav.tsx`, `/dashboard/src/app/layout.tsx`
  - Status: Deployed, awaiting CEO UAT approval

### 🔄 READY TO CODE
- **Phase 2 GPT Search + Agent Routing**
  - Spec: `.kiro/specs/ode-integration-layer/phase2-gpt-search-agent-routing.md`
  - Status: Planning complete, awaiting CEO approval to proceed

### 📝 SPECS COMPLETE (Not Started)
- **Integration Layer 2.0**
  - Requirements: `.kiro/specs/ode-integration-layer/requirements.md`
  - Design: `.kiro/specs/ode-integration-layer/design.md`
  
- **Surviving The World™ Core Survival Engine**
  - Requirements: `.kiro/specs/core-survival-engine/requirements.md`
  - Design: `.kiro/specs/core-survival-engine/design.md`
  - Tasks: `.kiro/specs/core-survival-engine/tasks.md`

---

## 👥 ROLE DEFINITIONS

### **Claude (Boss Head Designer)**
**Responsibilities:**
- Lead all ODE Platform development
- Implement Phase 2 GPT Search + Agent Routing
- Make all architectural decisions for ODE Platform
- Own frontend and backend implementation
- Coordinate with Kiro for spec support

**Current Focus:**
- Awaiting CEO UAT approval for Phase 1
- Ready to implement Phase 2 when approved

### **Kiro (Spec Support & Documentation)**
**Responsibilities:**
- Create and maintain specifications
- Provide architectural guidance when requested
- Support Claude with design questions
- Document completed work
- Maintain SYNC_MASTER alignment

**Current Focus:**
- Complete Integration Layer 2.0 spec (design + tasks)
- Support Claude on Phase 2 architecture questions
- Maintain coordination documents

---

## 🚀 PHASE 2 IMPLEMENTATION PLAN (Claude's Next Work)

**Reference:** `.kiro/specs/ode-integration-layer/phase2-gpt-search-agent-routing.md`

### **Step 1: Backend API Endpoint**
Create `POST /api/search/route` with:
- Request validation (query, tenantId, actor, modulesVisible, licenseCaps)
- Response structure (results array with agent responses)
- CorrelationId and traceId generation
- Decision logging
- Timeout handling

### **Step 2: Agent Classification**
Implement routing logic:
- Rules-based classification (keywords, entities)
- LLM fallback with guardrails
- RBAC filtering (role, license, module visibility)
- Multi-agent selection (primary + secondary)

### **Step 3: Agent Stubs**
Create initial agent implementations:
- `finance_agent` - PO/Invoice/GL queries
- `procurement_agent` - Supplier/sourcing queries
- `support_agent` - Ticket/SLA queries
- `creator_agent` - Content/revenue queries
- `pmo_agent` - Project/task queries
- `fms_agent` - Asset/work order queries
- `router_agent` - Orchestration

### **Step 4: Frontend Integration**
Wire GlobalTopNav to backend:
- Submit POST request on search
- Handle loading/error states
- Render response cards with agent badge, summary, actions
- Module chips and deep links
- Keyboard navigation and mobile responsive

### **Step 5: Observability**
Instrument everything:
- Metrics: requests, agent calls, errors, latency
- Structured logs with correlationId/traceId
- Decision logs for debugging
- Traces for distributed tracing

### **Step 6: Testing**
Comprehensive test coverage:
- Unit tests: routing rules, schema validation
- Integration tests: end-to-end flow with stub agents
- Contract tests: request/response validation
- RBAC tests: license/role enforcement
- UX tests: accessibility, error states, mobile

---

## 🔌 INTEGRATION LAYER 2.0 ROADMAP (Future Work)

**Reference:** `.kiro/SYNC_MASTER.md` (Integration Layer section)

**Implementation Order:**
1. Scaffold Integration Service (API gateway, tenant middleware)
2. Config + Secrets Store (Postgres, vault)
3. Connector Engine v1 (REST + OAuth2)
4. Event Router (pub/sub with DLQ)
5. Mapping Engine v1 (declarative transformations)
6. GL Transformer v1 (rule-based validation)
7. Master Data Sync Orchestrator
8. IMA Discovery/Blueprint
9. Monitoring/Health Score
10. Auto-Heal Hooks
11. Playbook Generator
12. QA Harness

**Status:** Specs complete, awaiting prioritization

---

## 🎮 SURVIVING THE WORLD™ ROADMAP (Future Work)

**Reference:** `.kiro/specs/core-survival-engine/tasks.md`

**Next Step:** Task 1 - Project setup
- Initialize project structure
- Set up build system
- Configure testing frameworks
- Create directory structure
- Era-agnostic data loading

**Status:** Specs complete, awaiting prioritization

---

## 🤝 COORDINATION PROTOCOL

### **Before Starting New Work:**
1. ✅ Check `.kiro/SYNC_MASTER.md` for current status
2. ✅ Read relevant spec documents
3. ✅ Confirm alignment with North Star principles
4. ✅ Coordinate with other party if work overlaps

### **During Implementation:**
1. 📝 Follow spec requirements exactly
2. 🔍 Maintain observability (correlationId, traceId, logs, metrics)
3. 🧪 Write tests for all changes
4. 🔒 Enforce RBAC and tenant isolation
5. 📊 Emit decision logs for debugging

### **After Completing Work:**
1. ✅ Update `.kiro/SYNC_MASTER.md` with new status
2. 📄 Document any deviations from spec
3. 🧪 Ensure all tests pass
4. 📊 Verify observability instrumentation
5. 🤝 Notify other party of completion

---

## 🎯 NORTH STAR PRINCIPLES (From SYNC_MASTER)

**Always Follow:**
- ✅ Foundation-first engineering
- ✅ Data-driven, no hardcoding
- ✅ Multi-tenant isolation
- ✅ Hot-reloadable configs
- ✅ Observability everywhere (correlationId, traceId)
- ✅ Auto-heal hooks
- ✅ RBAC enforcement
- ✅ API versioning
- ✅ Tests for every change (unit/integration/E2E/load/failure-injection)
- ✅ Idempotent handlers
- ✅ DLQs with replay capability

---

## 📞 COMMUNICATION CHANNELS

**For Claude:**
- Questions about specs → Ask Kiro
- Architectural decisions → Claude decides, Kiro documents
- Implementation blockers → Coordinate in workspace
- Spec clarifications → Reference SYNC_MASTER first

**For Kiro:**
- Implementation questions → Defer to Claude
- Spec updates needed → Coordinate with Claude first
- New features → Wait for Claude's architectural direction
- Documentation → Support Claude's implementation

---

## 🚨 ESCALATION PATH

**If Unclear:**
1. Check `.kiro/SYNC_MASTER.md`
2. Check relevant spec document
3. Coordinate with other party
4. Escalate to CEO if needed

**If Conflict:**
1. Claude's architectural decisions take precedence for ODE Platform
2. Specs guide implementation but Claude can adapt as needed
3. Document deviations in SYNC_MASTER
4. CEO has final say on priorities

---

## ✅ CURRENT ACTION ITEMS

### **For Claude:**
- [ ] **WAITING:** CEO UAT approval for Phase 1
- [ ] **READY:** Implement Phase 2 GPT Search + Agent Routing when approved
- [ ] **COORDINATE:** Ask Kiro for any architectural guidance needed

### **For Kiro:**
- [x] **COMPLETE:** Read SYNC_MASTER and Phase 2 spec
- [x] **COMPLETE:** Create coordination document
- [ ] **IN PROGRESS:** Complete Integration Layer 2.0 design document
- [ ] **PENDING:** Create Integration Layer 2.0 tasks document
- [ ] **STANDBY:** Support Claude on Phase 2 questions

---

## 📚 QUICK REFERENCE

**Key Files:**
- `.kiro/SYNC_MASTER.md` - Single source of truth
- `.kiro/specs/ode-integration-layer/phase2-gpt-search-agent-routing.md` - Phase 2 spec
- `.kiro/specs/ode-integration-layer/requirements.md` - Integration Layer requirements
- `.kiro/specs/ode-integration-layer/design.md` - Integration Layer design
- `.kiro/specs/core-survival-engine/requirements.md` - STW requirements
- `.kiro/specs/core-survival-engine/design.md` - STW design
- `.kiro/specs/core-survival-engine/tasks.md` - STW tasks

**Implementation Files:**
- `/dashboard/src/components/GlobalTopNav.tsx` - Navigation component
- `/dashboard/src/app/layout.tsx` - Layout with navigation

---

**WAR MODE STATUS: COORDINATED AND ALIGNED** 🔥

Claude leads, Kiro supports. SYNC_MASTER is truth. Let's build.
