# Browser UI system

SOL DORADO uses Tailwind CSS for visual tokens and layout but does not adopt an off-the-shelf dashboard theme. The application should read as a modern persistent browser game, not an admin panel.

## Selected libraries

- **Radix Primitives** for accessible behavior in dialogs, tooltips, tabs, selects and contextual menus. It is headless and can inherit the SOL DORADO visual language.
- **Lucide React** for consistent, typed, tree-shakable SVG icons.
- **Motion for React** for restrained screen, panel and feedback transitions.

Libraries are introduced incrementally when the first production component needs them. They do not replace Tailwind or define the game's art direction.

## Rules

- Desktop browser is the only active layout target during feature migration.
- The sidebar communicates information architecture and implementation status; it must not pretend that placeholders are playable.
- The HUD is the single source of truth for player condition and cash.
- Use panels only when they support a task. World interaction remains contextual and world-first.
- Avoid emoji navigation, generic SaaS cards, giant empty rectangles and repeated status summaries.
- Animation confirms hierarchy, state change and feedback; it is not decorative noise.
- Each migrated feature must have loading, empty, error and disabled-access states.
