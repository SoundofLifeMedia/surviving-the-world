# Implementation Plan: Risk Assessment + Authority Validator + Telemetry

## Overview

This plan implements the three services that wrap existing AI systems with observability, validation, and autofix capabilities per WAR_MODE_MASTER_DIRECTIVE Section 3.

**Priority:** Foundation services first, then integration, then autofix hooks.

## Phase 1: Core Services (Week 1)

- [x] 1. Project setup and interfaces
  - [x] 1.1 Create type definitions and interfaces
    - Create `src/core/types/RiskTypes.ts` with all interfaces from design
    - Create `src/core/types/TelemetryTypes.ts` with telemetry interfaces
    - Create `src/core/types/ValidationTypes.ts` with validation interfaces
    - _Requirements: All (foundation)_

- [x] 2. Configuration Manager implementation
  - [x] 2.1 Create ConfigurationManager class
    - Implement `src/core/ConfigurationManager.ts`
    - Add load(), get(), update(), validate() methods
    - Implement onChange callback registration
    - Add default configuration values
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 2.2 Write property tests for configuration
    - **Property 21: Configuration hot reload**
    - **Property 22: Invalid configuration rejection**
    - **Property 23: Configuration change logging**
    - **Validates: Requirements 6.2, 6.3, 6.4**

- [x] 3. Risk Assessment Service implementation
  - [x] 3.1 Create RiskAssessmentService class
    - Implement `src/ai/RiskAssessmentService.ts`
    - Add assess() method with risk score calculation
    - Implement predictCascade() for cascading effect prediction
    - Add threshold configuration and blocking logic
    - Implement assessment logging
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Implement priority queue processing
    - Add decision queue with priority ordering
    - Implement processQueue() method
    - _Requirements: 1.5_

  - [ ]* 3.3 Write property tests for risk assessment
    - **Property 1: Risk score bounds preservation**
    - **Property 2: Risk threshold blocking**
    - **Property 3: Cascading effect prediction completeness**
    - **Property 4: Assessment logging completeness**
    - **Property 5: Priority queue ordering**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [x] 4. Checkpoint - Risk Assessment functional
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Authority Validator (Week 2)

- [x] 5. Authority Validator implementation
  - [x] 5.1 Create AuthorityValidator class
    - Implement `src/ai/AuthorityValidator.ts`
    - Add validate() method with game state checking
    - Implement checkEntityAlive() for dead entity detection
    - Add checkDoctrineCompliance() for faction rules
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.2 Implement rate limiting
    - Add rate limit tracking per operation type
    - Implement checkRateLimit() with sliding window
    - Add resetRateLimits() method
    - _Requirements: 2.4_

  - [ ]* 5.3 Write property tests for authority validator
    - **Property 6: Authority validation determinism**
    - **Property 7: Doctrine violation detection**
    - **Property 8: Rate limit enforcement**
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [ ]* 5.4 Write example test for dead entity rejection
    - Test dead entity returns ENTITY_DEAD reason code
    - **Validates: Requirements 2.2**

- [x] 6. Checkpoint - Authority Validator functional
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Telemetry System (Week 2-3)

- [x] 7. Telemetry System implementation
  - [x] 7.1 Create TelemetrySystem class
    - Implement `src/core/TelemetrySystem.ts`
    - Add record() method for event recording
    - Implement emit() for event emission
    - Add event storage with configurable retention
    - _Requirements: 3.1, 3.2_

  - [x] 7.2 Implement performance counters
    - Add getCounters() method
    - Track decisions/second, latency, memory usage
    - Implement counter reset on overflow
    - _Requirements: 3.5_

  - [x] 7.3 Implement debug streaming
    - Add enableDebugStreaming() toggle
    - Implement getReasoningStream() for NPC reasoning
    - Add stream buffer management
    - _Requirements: 3.4_

  - [x] 7.4 Implement anomaly detection
    - Add detectAnomaly() method
    - Implement detection rules for each anomaly type
    - Add anomaly reporting
    - _Requirements: 3.3_

  - [ ]* 7.5 Write property tests for telemetry
    - **Property 9: Telemetry record completeness**
    - **Property 10: State change event emission**
    - **Property 11: Anomaly-autofix trigger**
    - **Property 12: Performance counter validity**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**

- [x] 8. Checkpoint - Telemetry System functional
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Autofix Hooks (Week 3)

- [ ] 9. Autofix Hooks implementation
  - [x] 9.1 Create AutofixHooks class
    - Implement `src/core/AutofixHooks.ts`
    - Add register() method for hook registration
    - Implement trigger() method for hook execution
    - Add getRegisteredHooks() method
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 9.2 Implement default autofix handlers
    - Add excessive spawning throttle handler
    - Add stuck AI reset handler
    - Add escalation logic for failed fixes
    - _Requirements: 4.1, 4.3, 4.5_

  - [ ]* 9.3 Write property tests for autofix
    - **Property 13: Excessive spawning throttle**
    - **Property 14: Stuck AI reset**
    - **Property 15: Autofix telemetry emission**
    - **Property 16: Autofix escalation on failure**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.5**

- [x] 10. Checkpoint - Autofix Hooks functional
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Integration Layer (Week 4)

- [x] 11. AI Decision Pipeline implementation
  - [x] 11.1 Create AIDecisionPipeline class
    - Implement `src/ai/AIDecisionPipeline.ts`
    - Add process() method with full pipeline flow
    - Implement trace recording for each stage
    - Add getTrace() and getRecentTraces() methods
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 11.2 Wire pipeline to existing AI systems
    - Create wrapper for EnemyAIStack.updateEnemy()
    - Route all decisions through pipeline
    - Add rejection handling and propagation
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 11.3 Write property tests for pipeline
    - **Property 17: Pipeline risk assessment routing**
    - **Property 18: Pipeline validation routing**
    - **Property 19: Pipeline rejection propagation**
    - **Property 20: Pipeline trace completeness**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5**

- [x] 12. Checkpoint - Integration Layer functional
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Integration & Polish (Week 4)

- [x] 13. Full system integration
  - [x] 13.1 Wire all services together
    - Connect ConfigurationManager to all services
    - Connect TelemetrySystem to AutofixHooks
    - Connect AIDecisionPipeline to EnemyAIStack
    - _Requirements: All_

  - [x] 13.2 Add service initialization
    - Create `src/core/ServiceRegistry.ts` for service management
    - Implement startup sequence with dependency order
    - Add graceful shutdown handling
    - _Requirements: All_

- [ ] 14. End-to-end testing
  - [x] 14.1 Create integration test suite
    - Test full pipeline: decision → assess → validate → execute → log
    - Test rejection flow at each stage
    - Test autofix triggering from anomaly detection
    - _Requirements: All_

  - [x] 14.2 Create performance test suite
    - Test 1000 decisions/second throughput
    - Verify telemetry overhead < 5%
    - Test memory usage with 10,000 events
    - _Requirements: All_

- [ ] 15. Documentation
  - [ ] 15.1 Add JSDoc to all public APIs
    - Document all interfaces and methods
    - Add usage examples in comments
    - _Requirements: All_

  - [ ] 15.2 Create developer guide
    - Document service architecture
    - Add configuration guide
    - Include troubleshooting section
    - _Requirements: All_

- [x] 16. Final checkpoint - Production ready
  - All 23 property tests passing
  - Integration tests passing
  - Performance targets met
  - Documentation complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks that can be skipped for faster MVP
- Property-based tests should run 100+ iterations minimum
- Each property test must be tagged with: `// Feature: risk-authority-telemetry, Property {number}: {property_text}`
- Services should be loosely coupled via interfaces for testability
- All services must support hot configuration reload per WAR_MODE requirements
