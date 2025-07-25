# Documentation Development Guide

This is the VitePress-powered documentation site for the CMS Platform.

## Development

```bash
# Start dev server (port 5173)
bun run dev

# Build static site
bun run build

# Preview production build
bun run preview
```

## Directory Structure

```
docs/
├── .vitepress/
│   └── config.ts          # VitePress configuration
├── guide/                 # Getting started guides
├── api/                   # API reference documentation
├── architecture/          # Architecture documentation
└── index.md              # Homepage
```

## Writing Documentation

### Markdown Features

VitePress extends standard Markdown with:

- **Code blocks with syntax highlighting**
  ```typescript
  const example = "highlighted"
  ```

- **Custom containers**
  ::: tip
  Useful information
  :::

- **File includes**
  <<< @/snippets/example.ts

### Frontmatter

Add metadata to pages:

```yaml
---
title: Page Title
description: Page description for SEO
---
```

### Adding New Pages

1. Create a new `.md` file in the appropriate directory
2. Add to navigation in `.vitepress/config.ts`
3. Link from related pages

### Code Examples

When showing code examples:
- Include imports for clarity
- Show both TypeScript types and runtime code
- Provide context about where code belongs

## Configuration

The site configuration is in `.vitepress/config.ts`:
- Navigation structure
- Theme customization
- Search settings
- Social links

## Best Practices

1. **Keep it concise** - Developers prefer quick answers
2. **Show examples** - Code speaks louder than words
3. **Link liberally** - Connect related concepts
4. **Update regularly** - Keep docs in sync with code

## Deployment

The docs are built to static HTML and can be deployed to any static hosting service:

```bash
bun run build
# Output in .vitepress/dist/
```
