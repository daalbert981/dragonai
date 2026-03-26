# Release Notes

## 2026-03-26

### Fix: Markdown rendering in chat messages (bullets, headers, lists)

**Problem:** AI chat responses displayed bold text correctly but were missing bullet points, numbered lists, header formatting, and other markdown structure. All list items and headings appeared as flat plain text with no visual hierarchy.

**Root cause:** The chat message component (`components/chat/ChatMessage.tsx`) applied Tailwind's `prose` CSS classes for typography styling, but the required `@tailwindcss/typography` plugin was never installed. Without it, those classes had no effect. Meanwhile, Tailwind's Preflight CSS reset strips default browser styles (list bullets, heading sizes, margins), so the rendered HTML had no visual formatting beyond bold/italic (which browsers still apply natively to `<strong>`/`<em>` tags).

**Fix:** Installed `@tailwindcss/typography` and added it to `tailwind.config.ts` plugins. This activates the `prose` classes that were already in the markup, restoring proper rendering of:
- Bullet and numbered lists
- Heading sizes (h1-h6)
- Blockquotes
- Code blocks
- Table formatting
- Proper spacing and margins

**Commit:** `2be618a`
