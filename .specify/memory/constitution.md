<!--
Sync Impact Report:
Version change: N/A → 1.0.0 (initial constitution)
Modified principles: N/A (initial creation)
Added sections: Core Principles, Security & Privacy, Development Workflow, Governance
Removed sections: N/A
Templates requiring updates:
  ✅ .specify/templates/plan-template.md - Constitution Check section exists
  ✅ .specify/templates/spec-template.md - No direct constitution references
  ✅ .specify/templates/tasks-template.md - No direct constitution references
Follow-up TODOs: None
-->

# Qoondeeye Constitution

## Core Principles

### I. Type Safety (NON-NEGOTIABLE)
All code MUST be written in TypeScript with strict type checking enabled. No `any` types without explicit justification. Type definitions MUST be defined for all data structures, API responses, and component props. Type safety is critical for financial data accuracy and preventing runtime errors in production.

**Rationale**: Financial applications require absolute data integrity. TypeScript's compile-time checks prevent type-related bugs that could lead to incorrect calculations, data corruption, or security vulnerabilities.

### II. Mobile-First Architecture
The application MUST be built using React Native with Expo SDK, prioritizing native mobile experiences (iOS and Android) over web. All features MUST work seamlessly on mobile devices with touch-optimized interfaces. Web platform support is secondary and MUST not compromise mobile UX.

**Rationale**: Qoondeeye is primarily a mobile personal finance application. Users expect fast, responsive, native-feeling experiences on their phones. Mobile-first ensures optimal performance and usability.

### III. Test-First Development (NON-NEGOTIABLE)
TDD mandatory: Tests written → User approved → Tests fail → Then implement. Red-Green-Refactor cycle strictly enforced. All financial calculations, data transformations, and critical business logic MUST have unit tests. Integration tests required for Supabase interactions and cross-screen user flows.

**Rationale**: Financial data accuracy is non-negotiable. Test-first development ensures correctness is verified before implementation, preventing regressions and calculation errors that could impact user finances.

### IV. Data Security & Privacy
All sensitive financial data MUST be encrypted at rest and in transit. Authentication MUST use secure token-based systems (Supabase Auth). API keys and secrets MUST never be committed to version control. User financial data MUST be isolated per user with proper Row Level Security (RLS) policies in Supabase. PII handling MUST comply with applicable privacy regulations.

**Rationale**: Financial applications are high-value targets for attackers. User trust depends on absolute security of their financial information. Data breaches could have severe legal and reputational consequences.

### V. Cross-Platform Consistency
Features MUST work identically across iOS, Android, and Web platforms. Platform-specific code MUST be isolated and justified. Shared business logic MUST be platform-agnostic. UI components MUST adapt gracefully to platform conventions while maintaining functional parity.

**Rationale**: Users expect consistent experiences regardless of device. Inconsistent behavior across platforms erodes trust and creates support burden.

### VI. Performance & Offline Support
Critical features (viewing expenses, balances, budgets) MUST work offline with local data caching. App MUST load initial screens in under 2 seconds on standard mobile networks. Data synchronization MUST be seamless and non-blocking. Heavy computations MUST be optimized or moved to background tasks.

**Rationale**: Users need access to financial information even without connectivity. Poor performance leads to abandonment. Financial apps must feel instant and reliable.

### VII. Observability & Error Handling
All API calls, data mutations, and critical user actions MUST be logged with structured logging. Errors MUST be captured with full context and reported to monitoring systems. User-facing errors MUST be clear and actionable. Financial transaction errors MUST be logged with transaction IDs for audit trails.

**Rationale**: Financial applications require complete auditability. Errors must be traceable for debugging and compliance. Users need clear feedback when operations fail.

## Security & Privacy Requirements

- All environment variables containing secrets MUST use EAS secrets or secure environment management
- Database queries MUST use parameterized queries to prevent SQL injection
- User authentication MUST use Supabase Auth with secure session management
- Financial data MUST be validated server-side; client-side validation is insufficient
- API rate limiting MUST be implemented to prevent abuse
- Data retention policies MUST be defined and enforced

## Development Workflow

- All features MUST start with a specification document in `/specs/[###-feature-name]/spec.md`
- Implementation plans MUST be created using `/speckit.plan` command before coding begins
- Code reviews MUST verify constitution compliance before merge
- Breaking changes to data models or APIs MUST include migration plans
- All PRs MUST pass linting, type checking, and tests before merge
- Documentation MUST be updated alongside code changes

## Governance

This constitution supersedes all other development practices and guidelines. Amendments require:

1. Documentation of the proposed change and rationale
2. Review of impact on existing codebase and dependent systems
3. Update to this document with version increment following semantic versioning:
   - **MAJOR**: Backward incompatible principle removals or redefinitions
   - **MINOR**: New principle/section added or materially expanded guidance
   - **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements
4. Propagation of changes to all dependent templates and documentation
5. Communication to all contributors

All PRs and code reviews MUST verify compliance with this constitution. Complexity additions MUST be justified against simpler alternatives. Violations of NON-NEGOTIABLE principles block merge until resolved.

**Version**: 1.0.0 | **Ratified**: 2025-11-09 | **Last Amended**: 2025-11-09
