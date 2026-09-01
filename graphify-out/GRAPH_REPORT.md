# Graph Report - .  (2026-09-01)

## Corpus Check
- Corpus is ~706 words - fits in a single context window. You may not need a graph.

## Summary
- 21 nodes · 27 edges · 5 communities
- Extraction: 56% EXTRACTED · 41% INFERRED · 4% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.82)
- Token cost: 51,248 input · 0 output

## Community Hubs (Navigation)
- AI-Generated Code Review
- Project Overview & Commit Conventions
- Secrets & Testing Discipline
- Branch & Merge Governance
- Issue Templates

## God Nodes (most connected - your core abstractions)
1. `PR Template Checklist (tested, no secrets, docs updated)` - 4 edges
2. `CLAUDE.md Project Guide` - 4 edges
3. `Disclose and Scrutinize AI-Generated PR Content` - 4 edges
4. `Pull Request Template` - 3 edges
5. `Branch Naming Convention (feature/, fix/, chore/)` - 3 edges
6. `Conventional Commits` - 3 edges
7. `No Committing Secrets/Credentials` - 3 edges
8. `Bug Report Template Structure` - 2 edges
9. `Feature Request Template Structure` - 2 edges
10. `PR Template AI-Generated Disclosure Checkbox` - 2 edges

## Surprising Connections (you probably didn't know these)
- `AI-Generated Code Must Go Through PR Review` --semantically_similar_to--> `Disclose and Scrutinize AI-Generated PR Content`  [INFERRED] [semantically similar]
  CLAUDE.md → CONTRIBUTING.md
- `Secrets Must Live in .env, Not in Code` --semantically_similar_to--> `No Committing Secrets/Credentials`  [INFERRED] [semantically similar]
  CLAUDE.md → CONTRIBUTING.md
- `PR Template AI-Generated Disclosure Checkbox` --conceptually_related_to--> `Disclose and Scrutinize AI-Generated PR Content`  [INFERRED]
  .github/PULL_REQUEST_TEMPLATE.md → CONTRIBUTING.md
- `PR Template Checklist (tested, no secrets, docs updated)` --conceptually_related_to--> `Secrets Must Live in .env, Not in Code`  [INFERRED]
  .github/PULL_REQUEST_TEMPLATE.md → CLAUDE.md
- `PR Template Checklist (tested, no secrets, docs updated)` --conceptually_related_to--> `AI-Written Tests Must Actually Run and Pass`  [INFERRED]
  .github/PULL_REQUEST_TEMPLATE.md → CONTRIBUTING.md

## Hyperedges (group relationships)
- **AI-Generated Code Governance Flow** — claude_ai_pr_review_rule, contributing_ai_generated_code_rule, github_pull_request_template_ai_generated_checkbox [INFERRED 0.85]
- **Secret/Credential Handling Rules Across Repo** — claude_env_secret_storage, contributing_secret_credential_rule, github_pull_request_template_checklist [INFERRED 0.85]
- **Branch-to-Merge Contribution Workflow** — contributing_branch_naming_convention, contributing_conventional_commits, contributing_pr_review_requirement, contributing_squash_merge [INFERRED 0.85]

## Communities (5 total, 0 thin omitted)

### Community 0 - "AI-Generated Code Review"
Cohesion: 0.40
Nodes (5): Discuss Large AI-Proposed Changes Before Executing, AI-Generated Code Must Go Through PR Review, Disclose and Scrutinize AI-Generated PR Content, PR Template AI-Generated Disclosure Checkbox, Pull Request Template

### Community 1 - "Project Overview & Commit Conventions"
Cohesion: 0.67
Nodes (3): CLAUDE.md Project Guide, Branch Naming Convention (feature/, fix/, chore/), Conventional Commits

### Community 2 - "Secrets & Testing Discipline"
Cohesion: 0.67
Nodes (4): Secrets Must Live in .env, Not in Code, AI-Written Tests Must Actually Run and Pass, No Committing Secrets/Credentials, PR Template Checklist (tested, no secrets, docs updated)

### Community 3 - "Branch & Merge Governance"
Cohesion: 0.67
Nodes (3): Main Branch Always Deployable, No Direct Commits, Minimum One Review Before Merge, Squash and Merge Policy

### Community 4 - "Issue Templates"
Cohesion: 0.50
Nodes (4): Bug Report Issue Template, Bug Report Template Structure, Feature Request Issue Template, Feature Request Template Structure

## Ambiguous Edges - Review These
- `CLAUDE.md Project Guide` → `README.md`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **2 isolated node(s):** `Bug Report Issue Template`, `Feature Request Issue Template`
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CLAUDE.md Project Guide` and `README.md`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Disclose and Scrutinize AI-Generated PR Content` connect `AI-Generated Code Review` to `Branch & Merge Governance`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **Why does `CLAUDE.md Project Guide` connect `Project Overview & Commit Conventions` to `Branch & Merge Governance`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `No Committing Secrets/Credentials` connect `Secrets & Testing Discipline` to `Branch & Merge Governance`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `PR Template Checklist (tested, no secrets, docs updated)` (e.g. with `Secrets Must Live in .env, Not in Code` and `AI-Written Tests Must Actually Run and Pass`) actually correct?**
  _`PR Template Checklist (tested, no secrets, docs updated)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Disclose and Scrutinize AI-Generated PR Content` (e.g. with `Discuss Large AI-Proposed Changes Before Executing` and `AI-Generated Code Must Go Through PR Review`) actually correct?**
  _`Disclose and Scrutinize AI-Generated PR Content` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Bug Report Issue Template`, `Feature Request Issue Template` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._