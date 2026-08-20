# Browser UI system

SOL DORADO uses Tailwind CSS for visual tokens and layout but does not adopt an off-the-shelf dashboard theme. The application should read as a modern persistent browser game, not an admin panel.

## Selected libraries

- **Radix Primitives** for accessible behavior in dialogs, tooltips, tabs, selects and contextual menus. It is headless and can inherit the SOL DORADO visual language.
- **Lucide React** for consistent, typed, tree-shakable SVG icons.
- **Motion for React** for restrained screen, panel and feedback transitions.

Libraries are introduced incrementally when the first production component needs them. They do not replace Tailwind or define the game's art direction. Radix Select is now active in the Finance slice and is the baseline for future dropdowns.

## UI & localization v0.3

- Bulgarian and English are first-class interface languages. Bulgarian is the default for a new browser profile.
- The `BG / EN` switch lives in the persistent header and the preference is stored under `sd_locale`.
- Visible copy is resolved through the central i18n provider. Currency, dates and time use locale-aware `Intl` formatting.
- API error codes remain language-neutral; React maps known codes to localized player-facing copy.
- Routine action feedback uses the global glass notification queue with success, error, warning, info and reward tones. Inline feedback remains only where it carries durable gameplay context.
- Native browser selects are not part of the visual system. Use the accessible `GlassSelect` wrapper around Radix Select.

The glass direction is inspired by modern game interfaces: layered translucent surfaces, subtle edge light, compact pill controls and restrained contextual color. SOL DORADO keeps its own charcoal, Dorado gold, Pacific teal and warm off-white palette and does not import FiveM-specific HUD elements.

## Rules

- Desktop browser is the only active layout target during feature migration.
- The sidebar communicates information architecture and implementation status; it must not pretend that placeholders are playable.
- The HUD is the single source of truth for player condition and cash.
- Use panels only when they support a task. World interaction remains contextual and world-first.
- Avoid emoji navigation, generic SaaS cards, giant empty rectangles and repeated status summaries.
- Animation confirms hierarchy, state change and feedback; it is not decorative noise.
- Each migrated feature must have loading, empty, error and disabled-access states.
- Every actionable control exposes a pointer cursor plus visible hover, pressed and keyboard-focus feedback. Disabled controls use a blocked cursor and do not mimic interactivity.
