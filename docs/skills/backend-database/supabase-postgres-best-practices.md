[![mdskills](https://www.mdskills.ai/images/logo.svg)](https://www.mdskills.ai/)

[Skills](https://www.mdskills.ai/skills) [Plugins](https://www.mdskills.ai/plugins) [MCP Servers](https://www.mdskills.ai/mcp-servers) [Rules](https://www.mdskills.ai/rules) [Learn](https://www.mdskills.ai/learn) [Submit](https://www.mdskills.ai/submit) [Advertise](https://www.mdskills.ai/advertise)

English

[Sign in](https://www.mdskills.ai/login)

[← Back to skills](https://www.mdskills.ai/skills)

# Supabase Postgres Best Practices

OfficialVerified

[Databases](https://www.mdskills.ai/skills?category=databases) Intermediate

Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations.

8.0advisor1.8kpopularity16downloads [by supabase](https://www.mdskills.ai/u/supabase)

`npx mdskills install supabase/supabase-postgres-best-practices`

Download

Copy SKILL.mdUpvote

Share

Add to collection

Are you `@supabase`? [Sign in with GitHub](https://www.mdskills.ai/login?next=/skills/supabase-postgres-best-practices) to claim this listing.

Skill Advisor8.0 [How we review skills](https://www.mdskills.ai/docs/skill-advisor "How we review skills")

Comprehensive Postgres optimization guide with clear categorization, detailed examples, and actionable rules

- +Prioritizes rules by impact (CRITICAL to LOW) with clear categorization across 8 domains
- +Promises detailed SQL examples with incorrect/correct patterns and query plan analysis
- +Well-scoped trigger conditions for query optimization, schema design, and RLS scenarios
- -Actual reference files not visible in submission, only template and structure descriptions
- -Declares filesystem write and network permissions without clear justification in the skill manifest

[Overview](https://www.mdskills.ai/skills/supabase-postgres-best-practices) [Source Code](https://www.mdskills.ai/skills/supabase-postgres-best-practices?tab=source) [Installation](https://www.mdskills.ai/skills/supabase-postgres-best-practices?tab=installation) [Forks (0)](https://www.mdskills.ai/skills/supabase-postgres-best-practices?tab=forks) [Comments (0)](https://www.mdskills.ai/skills/supabase-postgres-best-practices?tab=comments)

# Supabase Postgres Best Practices - Contributor Guide

This skill contains Postgres performance optimization references optimized for
AI agents and LLMs. It follows the [Agent Skills Open Standard](https://agentskills.io/).

## Quick Start

```bash
# From repository root
npm install

# Validate existing references
npm run validate

# Build AGENTS.md
npm run build
```

## Creating a New Reference

1. **Choose a section prefix** based on the category:
   - `query-` Query Performance (CRITICAL)
   - `conn-` Connection Management (CRITICAL)
   - `security-` Security & RLS (CRITICAL)
   - `schema-` Schema Design (HIGH)
   - `lock-` Concurrency & Locking (MEDIUM-HIGH)
   - `data-` Data Access Patterns (MEDIUM)
   - `monitor-` Monitoring & Diagnostics (LOW-MEDIUM)
   - `advanced-` Advanced Features (LOW)
2. **Copy the template**:


```bash
cp references/_template.md references/query-your-reference-name.md
```

3. **Fill in the content** following the template structure

4. **Validate and build**:


```bash
npm run validate
npm run build
```

5. **Review** the generated `AGENTS.md`


## Skill Structure

```
skills/supabase-postgres-best-practices/
├── SKILL.md           # Agent-facing skill manifest (Agent Skills spec)
├── AGENTS.md          # [GENERATED] Compiled references document
├── README.md          # This file
└── references/
    ├── _template.md      # Reference template
    ├── _sections.md      # Section definitions
    ├── _contributing.md  # Writing guidelines
    └── *.md              # Individual references

packages/skills-build/
├── src/               # Generic build system source
└── package.json       # NPM scripts
```

## Reference File Structure

See `references/_template.md` for the complete template. Key elements:

````markdown
---
title: Clear, Action-Oriented Title
impact: CRITICAL|HIGH|MEDIUM-HIGH|MEDIUM|LOW-MEDIUM|LOW
impactDescription: Quantified benefit (e.g., "10-100x faster")
tags: relevant, keywords
---

## [Title]

[1-2 sentence explanation]

**Incorrect (description):**

```sql
-- Comment explaining what's wrong
[Bad SQL example]
```
````

**Correct (description):**

```sql
-- Comment explaining why this is better
[Good SQL example]
```

```
## Writing Guidelines

See `references/_contributing.md` for detailed guidelines. Key principles:

1. **Show concrete transformations** - "Change X to Y", not abstract advice
2. **Error-first structure** - Show the problem before the solution
3. **Quantify impact** - Include specific metrics (10x faster, 50% smaller)
4. **Self-contained examples** - Complete, runnable SQL
5. **Semantic naming** - Use meaningful names (users, email), not (table1, col1)

## Impact Levels

| Level | Improvement | Examples |
|-------|-------------|----------|
| CRITICAL | 10-100x | Missing indexes, connection exhaustion |
| HIGH | 5-20x | Wrong index types, poor partitioning |
| MEDIUM-HIGH | 2-5x | N+1 queries, RLS optimization |
| MEDIUM | 1.5-3x | Redundant indexes, stale statistics |
| LOW-MEDIUM | 1.2-2x | VACUUM tuning, config tweaks |
| LOW | Incremental | Advanced patterns, edge cases |
```

## Quick Start

Install via CLI

`npx mdskills install supabase/supabase-postgres-best-practices`

## Tags

[ai](https://www.mdskills.ai/tags/ai) [ai-agents](https://www.mdskills.ai/tags/ai-agents) [skills](https://www.mdskills.ai/tags/skills) [supabase](https://www.mdskills.ai/tags/supabase) [postgresql](https://www.mdskills.ai/tags/postgresql)

## Platforms

claude-codeclaude-desktopcursorvscode-copilotwindsurfcontinue-devcodexgemini-cliamproo-codegooseopencodetraeqodocommand-code

Updated 2/24/2026· [View source on GitHub](https://github.com/supabase/agent-skills)

## Frequently Asked Questions

### What is Supabase Postgres Best Practices?

Supabase Postgres Best Practices is a free, open-source AI agent skill. Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations.

### How do I install Supabase Postgres Best Practices?

Install Supabase Postgres Best Practices with a single command:

`npx mdskills install supabase/supabase-postgres-best-practices`

This downloads the skill files into your project and your AI agent picks them up automatically.

### What platforms support Supabase Postgres Best Practices?

Supabase Postgres Best Practices works with Claude Code, Claude Desktop, Cursor, Vscode Copilot, Windsurf, Continue Dev, Codex, Gemini Cli, Amp, Roo Code, Goose, Opencode, Trae, Qodo, Command Code. Skills use the open SKILL.md format which is compatible with any AI coding agent that reads markdown instructions.

## Creator

[![supabase avatar](https://github.com/supabase.png?size=80)\\
\\
supabase\\
\\
@supabase](https://www.mdskills.ai/u/supabase) [View on GitHub](https://github.com/supabase)

Sponsored [![Quant Garage](https://bwyjitcjuysaykcophyt.supabase.co/storage/v1/object/public/ad-images/1783966401485-3w35jf.png)\\
\\
Pro stock research in Claude. No terminal needed.\\
\\
Analyst-grade market research used to live behind expensive professional terminals. Now it runs in your Claude,\\
\\
Try it](https://www.mdskills.ai/plugins/quant-garage)

Quant Garage

## Quick Info

TypeAgent Skill

CategoryDatabases

Difficultyintermediate

LicenseMIT

Skill Advisor [How we review skills](https://www.mdskills.ai/docs/skill-advisor "How we review skills")Verified · 8.0

GitHub 1.4k stars 81 forks

### Permissions

- Filesystem Read
- Filesystem Write
- Network Access

[Install guide](https://www.mdskills.ai/docs/install-skills) [View on GitHub](https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices)

New to [skill.md files](https://www.mdskills.ai/specs/skill-md)? See how the format works and how it differs from AGENTS.md or cursorrules.

#### Marketplace

- [Skills](https://www.mdskills.ai/skills)
- [MCP Servers](https://www.mdskills.ai/mcp-servers)
- [Rules](https://www.mdskills.ai/rules)
- [Agents](https://www.mdskills.ai/clients)
- [Submit](https://www.mdskills.ai/submit)
- [Advertise](https://www.mdskills.ai/advertise)

#### Docs

- [Ecosystem Overview](https://www.mdskills.ai/docs)
- [What are Skills?](https://www.mdskills.ai/docs/what-are-skills)
- [Create a Skill](https://www.mdskills.ai/docs/create-a-skill)
- [Best Practices](https://www.mdskills.ai/docs/skill-best-practices)
- [Skills vs MCP](https://www.mdskills.ai/docs/skills-vs-mcp)
- [Install Skills](https://www.mdskills.ai/docs/install-skills)
- [Learn](https://www.mdskills.ai/learn)

#### Specs

- [SKILL.md](https://www.mdskills.ai/specs/skill-md)
- [AGENTS.md](https://www.mdskills.ai/specs/agents-md)
- [MCP Protocol](https://www.mdskills.ai/specs/mcp)
- [CLAUDE.md](https://www.mdskills.ai/specs/claude-md)
- [llms.txt](https://www.mdskills.ai/specs/llms-txt)
- [All specs →](https://www.mdskills.ai/specs)

#### Community

- [GitHub](https://github.com/rgourley/mdskills)
- [About](https://www.mdskills.ai/about)
- [Contact](https://www.mdskills.ai/contact)
- [Privacy Policy](https://www.mdskills.ai/privacy)
- [Terms of Service](https://www.mdskills.ai/terms)

The community layer for AI agent skills. Find, create, fork, and share. Created by [Rob Gourley](https://www.robertcreative.com/).