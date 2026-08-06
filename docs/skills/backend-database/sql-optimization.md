[![mdskills](https://www.mdskills.ai/images/logo.svg)](https://www.mdskills.ai/)

[Skills](https://www.mdskills.ai/skills) [Plugins](https://www.mdskills.ai/plugins) [MCP Servers](https://www.mdskills.ai/mcp-servers) [Rules](https://www.mdskills.ai/rules) [Learn](https://www.mdskills.ai/learn) [Submit](https://www.mdskills.ai/submit) [Advertise](https://www.mdskills.ai/advertise)

English

[Sign in](https://www.mdskills.ai/login)

[← Back to skills](https://www.mdskills.ai/skills)

# SQL Optimization

Verified

SKILL + PLUGIN [Databases](https://www.mdskills.ai/skills?category=databases) Intermediate

SQL query optimization patterns including EXPLAIN plan analysis, index strategies, query rewriting, and N+1 query prevention. Use when optimizing slow database queries, analyzing query performance, designing indexes, or debugging database bottlenecks. Works with PostgreSQL, MySQL, SQLite, and other SQL databases. Typical improvements: 10x-1000x query speedup.

8.0advisor443popularity23downloads [by applied-artificial-intelligence](https://www.mdskills.ai/u/applied-artificial-intelligence)

`npx mdskills install applied-artificial-intelligence/sql-optimization`

Download

Copy SKILL.mdUpvote

Share

Add to collection

Are you `@applied-artificial-intelligence`? [Sign in with GitHub](https://www.mdskills.ai/login?next=/skills/sql-optimization) to claim this listing.

Skill Advisor8.0 [How we review skills](https://www.mdskills.ai/docs/skill-advisor "How we review skills")

Comprehensive reference guide with excellent EXPLAIN analysis, index strategies, and concrete optimization patterns across databases

- +Provides actionable before/after examples with real performance metrics
- +Covers critical patterns like N+1 queries, index design, and pagination strategies
- +Includes clear decision trees for when to apply each optimization technique
- -Requests shell/network permissions that SQL optimization guidance doesn't require

[Overview](https://www.mdskills.ai/skills/sql-optimization) [Source Code](https://www.mdskills.ai/skills/sql-optimization?tab=source) [Installation](https://www.mdskills.ai/skills/sql-optimization?tab=installation) [Forks (0)](https://www.mdskills.ai/skills/sql-optimization?tab=forks) [Comments (0)](https://www.mdskills.ai/skills/sql-optimization?tab=comments)

# SQL Query Optimization Patterns

Comprehensive guide to optimizing SQL queries for performance, including EXPLAIN plan analysis, index design strategies, query rewriting patterns, and N+1 query detection. Works across PostgreSQL, MySQL, and SQLite.

* * *

## Quick Reference

**When to use this skill:**

- Slow database queries (>100ms for simple queries, >1s for complex)
- High database CPU usage
- Analyzing EXPLAIN plans
- Designing database indexes
- Debugging N+1 query problems
- Optimizing JOIN operations
- Reducing table scans

**Common triggers:**

- "This query is too slow"
- "How do I optimize this SQL"
- "What indexes should I add"
- "Explain this EXPLAIN plan"
- "Fix N+1 queries"
- "Database CPU at 100%"

**Typical improvements:**

- 3 seconds → 50ms (60x faster)
- Full table scan → Index scan
- 1000 queries → 2 queries (N+1 elimination)

* * *

## Part 1: Understanding EXPLAIN Plans

### Reading PostgreSQL EXPLAIN

```sql
EXPLAIN ANALYZE
SELECT u.name, p.title
FROM users u
JOIN posts p ON u.id = p.user_id
WHERE u.created_at > '2024-01-01'
ORDER BY p.created_at DESC
LIMIT 10;
```

**Key Metrics to Watch**:

- **Seq Scan** (bad): Full table scan, reads every row
- **Index Scan** (good): Uses index, reads only needed rows
- **Cost**: Estimated computational cost (lower is better)
- **Actual time**: Real execution time in milliseconds
- **Rows**: Number of rows processed at each step

### Bad EXPLAIN Example

```
Seq Scan on users u  (cost=0.00..1234.00 rows=1000 width=50)
                     (actual time=0.123..45.678 rows=950 loops=1)
  Filter: (created_at > '2024-01-01'::date)
  Rows Removed by Filter: 50000
Planning Time: 0.234 ms
Execution Time: 3456.789 ms
```

**Problems**:

- **Seq Scan**: Reading entire table (50,950 rows)
- **Rows Removed by Filter**: Filtering after reading (wasteful)
- **Execution Time**: 3.5 seconds (way too slow)

### Good EXPLAIN Example (After Index)

```
Index Scan using users_created_at_idx on users u
  (cost=0.29..123.45 rows=950 width=50)
  (actual time=0.012..3.456 rows=950 loops=1)
  Index Cond: (created_at > '2024-01-01'::date)
Planning Time: 0.123 ms
Execution Time: 4.567 ms
```

**Improvements**:

- **Index Scan**: Using index (only reads needed rows)
- **Index Cond**: Filtering during index scan (efficient)
- **Execution Time**: 4.5ms (750x faster!)

* * *

## Part 2: Index Design Strategies

### When to Add an Index

**✅ Add index when:**

- Column frequently in WHERE clauses
- Column frequently in JOIN conditions
- Column frequently in ORDER BY
- Query does Seq Scan on large table (>10K rows)
- Query execution time >100ms

**❌ Don't add index when:**

- Table has '2024-01-01'

\-\- ❌ Doesn't use index (skips first column)
WHERE status = 'pending'
WHERE created\_at > '2024-01-01'

````

### Partial Indexes (Filtered)

**Index only subset of rows** (smaller, faster):

```sql
-- Only index active users
CREATE INDEX idx_users_active_email
ON users(email)
WHERE status = 'active';

-- Query that uses partial index
SELECT * FROM users
WHERE email = 'user@example.com'
AND status = 'active';  -- Must include filter condition!
````

**Benefits**:

- Smaller index (faster scans, less storage)
- Only indexes rows you actually query
- Great for status fields with skewed distribution

### Covering Indexes (INCLUDE)

**Include columns in index** to avoid table access:

```sql
-- Postgres: INCLUDE clause
CREATE INDEX idx_users_email_covering
ON users(email)
INCLUDE (name, created_at);

-- Query doesn't need to access table (all data in index)
SELECT name, created_at FROM users WHERE email = 'user@example.com';
```

**Benefit**: Index-Only Scan (even faster than Index Scan)

* * *

## Part 3: Query Rewriting Patterns

### Problem 1: SELECT \* (Fetching Unnecessary Data)

**❌ Bad** (fetches all columns):

```sql
SELECT * FROM users WHERE id = 123;
```

**✅ Good** (fetches only needed columns):

```sql
SELECT id, name, email FROM users WHERE id = 123;
```

**Impact**:

- Smaller result set
- Less memory usage
- Faster network transfer
- Can use covering indexes

### Problem 2: N+1 Queries

**❌ Bad** (1 query for posts + N queries for users):

```python
# 1 query
posts = db.execute("SELECT * FROM posts LIMIT 10")

# N queries (10 separate queries!)
for post in posts:
    user = db.execute("SELECT * FROM users WHERE id = ?", post.user_id)
    print(f"{user.name}: {post.title}")
```

**✅ Good** (2 queries total):

```python
# 1 query for posts
posts = db.execute("SELECT * FROM posts LIMIT 10")

# 1 query for all users
user_ids = [p.user_id for p in posts]
users = db.execute("SELECT * FROM users WHERE id IN (?)", user_ids)
users_by_id = {u.id: u for u in users}

# No additional queries
for post in posts:
    user = users_by_id[post.user_id]
    print(f"{user.name}: {post.title}")
```

**Even Better** (1 query with JOIN):

```sql
SELECT u.name, p.title
FROM posts p
JOIN users u ON p.user_id = u.id
LIMIT 10;
```

### Problem 3: Implicit Type Conversion

**❌ Bad** (index not used due to implicit conversion):

```sql
-- user_id is INTEGER, but '123' is string
SELECT * FROM posts WHERE user_id = '123';  -- Seq Scan!
```

**✅ Good** (explicit type, index used):

```sql
SELECT * FROM posts WHERE user_id = 123;  -- Index Scan
```

### Problem 4: Function Calls in WHERE Clause

**❌ Bad** (can't use index):

```sql
-- Function prevents index usage
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
```

**✅ Good** (use functional index):

```sql
-- Create index on function result
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- Now query can use index
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
```

**✅ Even Better** (store lowercase, regular index):

```sql
-- Store email in lowercase
CREATE INDEX idx_users_email ON users(email);

-- Query with lowercase value
SELECT * FROM users WHERE email = LOWER('user@example.com');
```

### Problem 5: OR Conditions

**❌ Bad** (often does Seq Scan):

```sql
SELECT * FROM users
WHERE email = 'user@example.com'
OR username = 'johndoe';
```

**✅ Good** (use UNION, allows index usage):

```sql
SELECT * FROM users WHERE email = 'user@example.com'
UNION
SELECT * FROM users WHERE username = 'johndoe';
```

### Problem 6: NOT IN with Subquery

**❌ Bad** (very slow, especially with large subquery):

```sql
SELECT * FROM users
WHERE id NOT IN (SELECT user_id FROM blocked_users);
```

**✅ Good** (use LEFT JOIN with NULL check):

```sql
SELECT u.*
FROM users u
LEFT JOIN blocked_users b ON u.id = b.user_id
WHERE b.user_id IS NULL;
```

* * *

## Part 4: JOIN Optimization

### JOIN Order Matters

Database optimizes join order, but you can help:

**Small table first, large table second**:

```sql
-- Good: Join small table (categories: 10 rows) to large table (products: 10M rows)
SELECT p.*
FROM categories c
JOIN products p ON c.id = p.category_id
WHERE c.name = 'Electronics';
```

### Avoid Cartesian Products

**❌ Bad** (produces rows1 × rows2 × rows3):

```sql
SELECT *
FROM users, posts, comments;  -- 100 × 10000 × 50000 = 50 billion rows!
```

**✅ Good** (proper JOIN conditions):

```sql
SELECT *
FROM users u
JOIN posts p ON u.id = p.user_id
JOIN comments c ON p.id = c.post_id;
```

### EXISTS vs IN for Subqueries

**Scenario**: Find users who have at least one post

**❌ Slower** (IN loads all post IDs):

```sql
SELECT * FROM users
WHERE id IN (SELECT user_id FROM posts);
```

**✅ Faster** (EXISTS stops at first match):

```sql
SELECT * FROM users u
WHERE EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id);
```

### JOIN vs Subquery

**Use JOIN when** you need data from both tables:

```sql
SELECT u.name, p.title
FROM users u
JOIN posts p ON u.id = p.user_id;
```

**Use Subquery when** you only need filtering:

```sql
SELECT * FROM users
WHERE id IN (SELECT DISTINCT user_id FROM posts);
```

* * *

## Part 5: Aggregation Optimization

### COUNT(\*) Optimization

**Problem**: COUNT(\*) on large tables is slow

**❌ Slow** (counts all rows):

```sql
SELECT COUNT(*) FROM orders;  -- Full table scan on 10M rows
```

**✅ Faster** (approximate count from statistics):

```sql
-- PostgreSQL: Use statistics (fast but approximate)
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'orders';
```

**✅ Also Good** (exact count with index):

```sql
-- If you have an index, COUNT can use index-only scan
CREATE INDEX idx_orders_id ON orders(id);
SELECT COUNT(*) FROM orders;  -- Index-only scan
```

### GROUP BY Optimization

**❌ Bad** (groups after fetching all data):

```sql
SELECT user_id, COUNT(*)
FROM posts
GROUP BY user_id;
```

**✅ Good** (index helps grouping):

```sql
-- Create index on grouped column
CREATE INDEX idx_posts_user_id ON posts(user_id);

SELECT user_id, COUNT(*)
FROM posts
GROUP BY user_id;  -- Can use index for grouping
```

### HAVING vs WHERE

**❌ Bad** (filters after grouping):

```sql
SELECT user_id, COUNT(*) as post_count
FROM posts
GROUP BY user_id
HAVING user_id > 1000;  -- Filters after grouping all users
```

**✅ Good** (filters before grouping):

```sql
SELECT user_id, COUNT(*) as post_count
FROM posts
WHERE user_id > 1000  -- Filters before grouping (can use index)
GROUP BY user_id;
```

* * *

## Part 6: Pagination Optimization

### OFFSET is Slow for Large Offsets

**❌ Bad** (OFFSET scans all skipped rows):

```sql
-- Page 1000 (skips 50,000 rows, then returns 50)
SELECT * FROM posts
ORDER BY created_at DESC
LIMIT 50 OFFSET 50000;  -- Scans 50,050 rows!
```

**✅ Good** (keyset pagination with WHERE):

```sql
-- Save last seen ID from previous page
SELECT * FROM posts
WHERE created_at  0
ORDER BY seq_tup_read DESC
LIMIT 25;
```

### Find Unused Indexes (PostgreSQL)

```sql
-- Indexes that are never used
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'  -- Exclude primary keys
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Check Index Bloat

```sql
-- Postgres: Check for bloated indexes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- Rebuild bloated indexes
REINDEX INDEX index_name;
```

* * *

## Part 9: Common Patterns by Use Case

### Pattern 1: Recent Records with Pagination

```sql
-- Create composite index
CREATE INDEX idx_posts_created_user ON posts(created_at DESC, user_id);

-- Query uses index efficiently
SELECT * FROM posts
WHERE user_id = 123
ORDER BY created_at DESC
LIMIT 20;
```

### Pattern 2: Search Across Multiple Columns

```sql
-- Create GIN index for full-text search (Postgres)
CREATE INDEX idx_posts_search ON posts
USING gin(to_tsvector('english', title || ' ' || content));

-- Fast full-text search
SELECT * FROM posts
WHERE to_tsvector('english', title || ' ' || content) @@
      to_tsquery('english', 'database & optimization');
```

### Pattern 3: Range Queries

```sql
-- Create index on range column
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Query uses index
SELECT * FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY created_at;
```

### Pattern 4: Distinct Values with Filter

```sql
-- Create composite index
CREATE INDEX idx_posts_category_user ON posts(category_id, user_id);

-- Query uses index
SELECT DISTINCT category_id
FROM posts
WHERE user_id = 123;
```

* * *

## Part 10: Quick Optimization Checklist

**Diagnosis**:

- [ ]  Run EXPLAIN ANALYZE on slow queries
- [ ]  Check for Seq Scan on tables >10K rows
- [ ]  Look for missing indexes
- [ ]  Identify N+1 query patterns
- [ ]  Check query execution time (aim for <100ms)

**Index Strategy**:

- [ ]  Index columns in WHERE clauses
- [ ]  Index columns in JOIN conditions
- [ ]  Index columns in ORDER BY
- [ ]  Use composite indexes for multi-column queries
- [ ]  Consider partial indexes for filtered queries
- [ ]  Remove unused indexes

**Query Rewriting**:

- [ ]  Select only needed columns (not SELECT \*)
- [ ]  Use JOIN instead of N+1 queries
- [ ]  Use proper types (avoid implicit conversion)
- [ ]  Avoid functions in WHERE (use functional indexes)
- [ ]  Use UNION instead of OR for multiple conditions
- [ ]  Use EXISTS instead of IN for large subqueries

**Pagination**:

- [ ]  Use keyset pagination (not OFFSET) for large datasets
- [ ]  Include stable sort column (id) in pagination
- [ ]  Index pagination columns

**Monitoring**:

- [ ]  Enable query logging for slow queries
- [ ]  Monitor index usage
- [ ]  Check for index bloat
- [ ]  Regularly VACUUM ANALYZE (Postgres)

* * *

## Resources

**PostgreSQL**:

- EXPLAIN docs: [https://www.postgresql.org/docs/current/sql-explain.html](https://www.postgresql.org/docs/current/sql-explain.html)
- Index types: [https://www.postgresql.org/docs/current/indexes-types.html](https://www.postgresql.org/docs/current/indexes-types.html)
- Performance tips: [https://wiki.postgresql.org/wiki/Performance\_Optimization](https://wiki.postgresql.org/wiki/Performance_Optimization)

**MySQL**:

- EXPLAIN output: [https://dev.mysql.com/doc/refman/8.0/en/explain-output.html](https://dev.mysql.com/doc/refman/8.0/en/explain-output.html)
- Optimization: [https://dev.mysql.com/doc/refman/8.0/en/optimization.html](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)

**Tools**:

- pgAdmin (Postgres GUI)
- MySQL Workbench
- DBeaver (multi-database)
- explain.depesz.com (Postgres EXPLAIN visualizer)

## Quick Start

Best experience: Claude Code

`/plugin marketplace add applied-artificial-intelligence/sql-optimization`

Then /plugin menu → select skill → restart. Use /skill-name:init for first-time setup.

Other platforms

Install via CLI

`npx mdskills install applied-artificial-intelligence/sql-optimization`

## Tags

[postgresql](https://www.mdskills.ai/tags/postgresql) [mysql](https://www.mdskills.ai/tags/mysql) [sqlite](https://www.mdskills.ai/tags/sqlite)

## Platforms

claude-codeclaude-desktopcursorvscode-copilotwindsurfcontinue-devcodexgemini-cliamproo-codegooseopencodetraeqodocommand-code

Updated 2/23/2026· [View source on GitHub](https://github.com/applied-artificial-intelligence/claude-code-toolkit)

## Frequently Asked Questions

### What is SQL Optimization?

SQL Optimization is a free, open-source AI agent skill. SQL query optimization patterns including EXPLAIN plan analysis, index strategies, query rewriting, and N+1 query prevention. Use when optimizing slow database queries, analyzing query performance, designing indexes, or debugging database bottlenecks. Works with PostgreSQL, MySQL, SQLite, and other SQL databases. Typical improvements: 10x-1000x query speedup.

### How do I install SQL Optimization?

Install SQL Optimization with a single command:

`npx mdskills install applied-artificial-intelligence/sql-optimization`

This downloads the skill files into your project and your AI agent picks them up automatically.

### What platforms support SQL Optimization?

SQL Optimization works with Claude Code, Claude Desktop, Cursor, Vscode Copilot, Windsurf, Continue Dev, Codex, Gemini Cli, Amp, Roo Code, Goose, Opencode, Trae, Qodo, Command Code. Skills use the open SKILL.md format which is compatible with any AI coding agent that reads markdown instructions.

## Creator

[![applied-artificial-intelligence avatar](https://github.com/applied-artificial-intelligence.png?size=80)\\
\\
applied-artificial-intelligence\\
\\
@applied-artificial-intelligence](https://www.mdskills.ai/u/applied-artificial-intelligence) [View on GitHub](https://github.com/applied-artificial-intelligence)

Sponsored [![Quant Garage](https://bwyjitcjuysaykcophyt.supabase.co/storage/v1/object/public/ad-images/1783966401485-3w35jf.png)\\
\\
Pro stock research in Claude. No terminal needed.\\
\\
Analyst-grade market research used to live behind expensive professional terminals. Now it runs in your Claude,\\
\\
Try it](https://www.mdskills.ai/plugins/quant-garage)

Quant Garage

## Quick Info

TypeAgent Skill + Plugin

CategoryDatabases

Difficultyintermediate

LicenseMIT

Skill Advisor [How we review skills](https://www.mdskills.ai/docs/skill-advisor "How we review skills")Verified · 8.0

GitHub 43 stars 10 forks

Best experienceClaude Code (plugin)

### Permissions

- Filesystem Read
- Filesystem Write
- Shell Execution
- Network Access

[Install guide](https://www.mdskills.ai/docs/install-skills) [View on GitHub](https://github.com/applied-artificial-intelligence/claude-code-toolkit/tree/main/skills/general-dev/sql-optimization)

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