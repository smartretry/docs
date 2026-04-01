# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SmartRetry API documentation site built with [Mintlify](https://mintlify.com). Content is MDX with YAML frontmatter. Site configuration lives entirely in `docs.json`.

## CLI Commands

```bash
npm i -g mint        # Install Mintlify CLI (one-time)
mint dev             # Local preview at localhost:3000
mint broken-links    # Check internal links
mint validate        # Validate documentation build
mint a11y            # Accessibility check
mint rename          # Rename/move files and update all references
```

No `package.json` — the Mintlify CLI is installed globally.

## Architecture

`docs.json` is the single source of truth for navigation, theme, colors, and integrations. All page additions must be registered in `docs.json` under the appropriate `navigation.tabs[].groups[].pages` array — otherwise Mintlify will not render them.

Content is organized into two tabs:

- **Documentation tab**: `introduction`, `quickstart`, `authentication`, `concepts/`, `integration/`, `faq/`
- **API Reference tab**: `api-reference/overview`, `api-reference/errors`, `api-reference/payments/`, `api-reference/recurring/`, `api-reference/future-transactions/`

Static assets (logo, OG image) live in `images/`. The Mintlify skill at `.agents/skills/mintlify/SKILL.md` has detailed guidance on components, frontmatter, and navigation patterns.

## Content Rules

- Active voice, second person ("you")
- Sentence case for headings
- **Bold** for UI elements; `code` formatting for file names, commands, paths, and code references
- One idea per sentence

## Mintlify Knowledge

Always check [mintlify.com/docs](https://mintlify.com/docs) for current component APIs and configuration options — prefer live docs over training data. Before creating a new page, search existing content to avoid duplication.
