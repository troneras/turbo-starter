# Feature Knowledge Extraction & Agent Creation

You are tasked with analyzing a recently implemented feature and creating a comprehensive knowledge distillation that can be used to create a specialized AI agent for this feature domain.

## Your Mission
Extract and document all the institutional knowledge about this feature so that a future AI agent can work on it with the same depth of understanding as the original implementer.

## Analysis Framework

### 1. Feature Identity & Purpose
- **Feature Name**: [What is this feature called?]
- **Business Purpose**: [Why does this feature exist? What problem does it solve?]
- **User Journey**: [How do users interact with this feature end-to-end?]
- **Success Metrics**: [How is this feature's success measured?]

### 2. Architecture & Design Decisions
- **High-Level Architecture**: [How does this feature fit into the overall system?]
- **Key Design Decisions**: [What architectural choices were made and WHY?]
- **Trade-offs Made**: [What alternatives were considered and rejected? Why?]
- **Dependencies**: [What other features/services does this depend on?]
- **Integration Points**: [How does this feature connect to other parts of the system?]

### 3. Technical Implementation Deep Dive

#### Backend Implementation
- **API Endpoints**: [List all endpoints with their purposes]
- **Data Models**: [Database schema, relationships, constraints]
- **Business Logic**: [Key algorithms, validation rules, workflows]
- **External Integrations**: [Third-party APIs, services, webhooks]
- **Security Considerations**: [Authentication, authorization, data protection]
- **Performance Patterns**: [Caching, optimization, scaling considerations]

#### Frontend Implementation
- **Component Architecture**: [Key components and their relationships]
- **State Management**: [How is feature state handled?]
- **UI/UX Patterns**: [Design system usage, interaction patterns]
- **Data Flow**: [How does data move through the frontend?]
- **Error Handling**: [How are errors displayed and managed?]
- **Performance Optimizations**: [Lazy loading, memoization, etc.]

### 4. Domain Knowledge & Business Rules
- **Business Logic Rules**: [All the "if this, then that" rules]
- **Edge Cases**: [Known edge cases and how they're handled]
- **Data Validation**: [What data rules must be enforced?]
- **Workflow States**: [If applicable, what states can this feature be in?]
- **Permissions & Access Control**: [Who can do what with this feature?]

### 5. Operational Knowledge
- **Testing Strategy**: [How is this feature tested? What test patterns are used?]
- **Monitoring & Logging**: [What metrics are tracked? What events are logged?]
- **Deployment Considerations**: [Any special deployment needs or rollback procedures?]
- **Common Issues**: [Known bugs, gotchas, or maintenance tasks]
- **Performance Characteristics**: [Response times, resource usage, scaling behavior]

### 6. Future Context
- **Planned Enhancements**: [What improvements are on the roadmap?]
- **Known Limitations**: [What doesn't this feature do that users might expect?]
- **Refactoring Opportunities**: [What could be improved technically?]
- **Scaling Considerations**: [How will this feature evolve as usage grows?]

## Code Analysis Instructions

1. **Examine all files related to this feature**
   - Backend: controllers, services, models, migrations, tests
   - Frontend: components, hooks, utils, styles, tests
   - Configuration: environment variables, feature flags, routing

2. **Trace the complete data flow**
   - From user action to database and back
   - Include all transformations, validations, and side effects

3. **Document patterns and conventions**
   - Naming conventions used
   - Code organization principles
   - Error handling patterns
   - Testing approaches

4. **Identify implicit knowledge**
   - Why certain libraries or approaches were chosen
   - Historical context for implementation decisions
   - Team conventions that aren't documented elsewhere

## Output Format

Create a comprehensive feature specification that includes:

### Executive Summary
[2-3 paragraphs explaining what this feature does and why it matters]

### Agent Specialization Context
```
ROLE: You are a [Feature Name] Domain Expert with deep knowledge of [brief description]

EXPERTISE AREAS:
- [List 3-5 key areas of expertise]

ARCHITECTURAL CONTEXT:
[How this feature fits into the larger system]

KEY PRINCIPLES:
- [List 3-5 guiding principles for working with this feature]

COMMON TASKS:
- [List typical tasks an agent would perform for this feature]
```

### Technical Deep Dive
[Detailed technical documentation organized by the analysis framework above]

### Agent Behavioral Guidelines
```
WHEN WORKING ON THIS FEATURE:

DO:
- [List 5-7 specific dos based on the feature's patterns]

DON'T:
- [List 5-7 specific don'ts based on known issues or constraints]

ALWAYS CONSIDER:
- [List 3-5 things to always think about when modifying this feature]

RED FLAGS:
- [List warning signs that indicate a change might break something]
```

### Communication Patterns
```
WHEN COORDINATING WITH OTHER AGENTS:

BACKEND DEPENDENCIES:
- [What backend agents need to know when this feature changes]

FRONTEND DEPENDENCIES:
- [What frontend agents need to know when this feature changes]

INTEGRATION POINTS:
- [How changes to this feature might affect other features]

SHARED STATE:
- [What information should be shared via common files when making changes]
```

Now analyze the implemented feature and create this comprehensive knowledge distillation.

