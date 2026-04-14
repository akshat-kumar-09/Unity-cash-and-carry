Brand logos (optional)
======================

Add PNG, WebP, or SVG files named after each brand slug (lowercase, hyphens).

Examples:
  elf-bar.png
  ske.png
  ivg.png
  lost-mary.png
  higo.png

The shop tries /brands/{slug}.png, then .webp, then .svg.
If none load, initials are shown.

Slugs are derived from the display name:
  "Elf Bar" → elf-bar
  "Lost Mary" → lost-mary
