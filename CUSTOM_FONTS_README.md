# FestEazy Custom Fonts

The font system is centralized in `app/fonts.ts`.

## Font files

All custom font files are stored in:

```text
public/fonts/
```

Included families:

- Fhlecturis Rounded — Light, Regular, Bold
- Fhlecturis — Light, Regular, Bold
- FKL Jazri 2 — Bold

## Shared selector

All font dropdowns use:

```text
components/FontFamilySelect.tsx
```

## Pages updated

- `app/admin/reports/page.tsx`
  - Adds Card Font to Chest Number Cards.
- `app/admin/posters/page.tsx`
  - Adds custom fonts to every editable poster text layer.
- `app/admin/certificates/page.tsx`
  - Adds custom fonts to certificate text and print windows.
- `app/layout.tsx`
  - Loads base web fonts and custom local fonts globally.

## Adding another custom font later

1. Copy the font file into `public/fonts/`.
2. Add an `@font-face` rule to `CUSTOM_FONT_FACE_CSS` in `app/fonts.ts`.
3. Add one option under `Custom Fonts` in `FONT_OPTION_GROUPS`.

No page-specific dropdown code needs to be changed.
