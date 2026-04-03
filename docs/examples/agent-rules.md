# Agent Rules Examples

Agent Rules allow you to automatically inject markdown content into agent prompts based on the agent's name or task category. This system helps enforce coding standards, project conventions, and specialized instructions without manually updating agent configurations for every session.

## Overview

Rules are discovered from convention directories, filtered by YAML frontmatter, and injected additively. They work for both primary agents (Sisyphus, Hephaestus, etc.) and subagents spawned via the `task()` tool.

## Basic Global Rule

A rule file with no frontmatter (or with `scope: global`) applies to all agents.

**File: `.sisyphus/rules/general-formatting.md`**

```markdown
- Use 2 spaces for indentation
- No trailing whitespace
- Ensure files end with a newline
```

## Agent-Scoped Rule

Target specific agents by their name using the `agents` frontmatter key.

**File: `.sisyphus/rules/agents/sisyphus/coding-standards.md`**

```markdown
---
agents: [sisyphus]
description: "Coding standards for the main orchestrator"
---

- Prefer functional programming patterns
- Use descriptive variable names
- Always add JSDoc comments to public functions
```

## Category-Scoped Rule

Target agents based on the delegation category (e.g., `visual-engineering`, `deep`, `quick`).

**File: `.sisyphus/rules/categories/deep/research-protocol.md`**

```markdown
---
categories: [deep]
description: "Protocol for deep research tasks"
---

- Always verify information from multiple sources
- Record all search queries and visited URLs in the session notepad
- Propose 3 alternative architectures before settling on one
```

## Multi-Agent Rule

You can target multiple agents or categories in a single rule file.

**File: `.sisyphus/rules/review-guidelines.md`**

```markdown
---
agents: [oracle, momus]
description: "Guidelines for technical review"
---

- Focus on security vulnerabilities
- Check for performance bottlenecks
- Ensure test coverage is sufficient
```

## Config Example

You can add extra directories to scan or disable specific rules in your `oh-my-opencode.jsonc` file.

```jsonc
{
  "agent_rules": {
    // Extra directories to scan for rule files
    "dirs": ["./extra-rules", "./team-rules"],
    // Disable specific rules by their stem name (filename without extension)
    "disabled": ["general-formatting"]
  }
}
```

## Directory Structure

Rules are auto-scanned from these locations (in order):

```
.sisyphus/rules/                         # global rules for all agents
.sisyphus/rules/agents/{agent-name}/     # rules for a specific agent
.sisyphus/rules/categories/{category}/  # rules for a specific category
.opencode/rules/                          # alternate project root
~/.config/opencode/rules/               # user-level rules
```

A typical project structure might look like this:

```
my-project/
├── .sisyphus/
│   └── rules/
│       ├── global-identity.md
│       ├── agents/
│       │   └── sisyphus/
│       │       └── project-architecture.md
│       └── categories/
│           └── visual-engineering/
│               └── tailwind-conventions.md
└── oh-my-opencode.jsonc
```

## Frontmatter Reference

All frontmatter keys are optional.

| Key | Type | Description |
| :--- | :--- | :--- |
| `agents` | array | List of agent names this rule applies to (e.g., `[sisyphus, oracle]`) |
| `categories` | array | List of categories this rule applies to (e.g., `[deep, quick]`) |
| `scope` | string | Set to `global` to apply to all agents (default if no agents/categories set) |
| `description` | string | Human-readable description shown in tooling |
