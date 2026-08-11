# FestEazy bug-fix batch — 2026-08-11

This build changes application code only. It does not modify Supabase data or require a destructive SQL operation.

## Fixed

- Reports: category-aware Class filter; class options now belong only to the selected category.
- Reports: Class filter resets when Category changes and is disabled for All Categories / General.
- Reports: inactive students/programmes are excluded from normal report selections.
- Reports: Valuation / Green Room / Call List participant rows preserve programme `sort_order` instead of being re-sorted alphabetically.
- Reports: Winners / Prize Distribution / Result Summary data uses published results only.
- Programmes: next sort order uses `MAX(sort_order) + 1`, not `programmes.length + 1`.
- Programmes: positive integer sort-order validation and duplicate-order warning.
- Teams / Schedule stages / Milestone templates: next order uses the current maximum, preventing duplicate order values after deletions/gaps.
- Public Student Lookup: duplicate-looking class names are disambiguated with their category and ordered category -> class.
- Green Room: group registration identity is deterministic and existing codes attached to any group member registration are recognized.
- Green Room: cancelled/inactive registrations are excluded from active entries.
- Green Room: mark/result locks are checked across every registration in a group.
- Green Room: duplicate code letters, duplicate code rows, and multiple codes on one participant/group are detected.
- Green Room: reset removes all duplicate code rows belonging to the selected participant/group.
- Green Room: concurrent generation is verified after insert; conflicting newly inserted duplicate rows are rolled back.
- Removed one unused Green Room client-side code-selection helper.

## Static checks completed

- Parsed all 79 TypeScript / TSX files: 0 syntax errors.
- Exact duplicate source-file scan: 0 duplicate source files.
- Duplicate function-body scan found only a small set of repeated UI/helper implementations across pages; none are duplicate routes or conflicting business logic, so they were left unchanged in this bug-fix batch.

## Not changed

- Supabase RLS/RPC/database constraints were not modified because the database migration/schema SQL was not included in the supplied ZIP.
- Existing category/class/programme records were not deleted or renumbered.

## Printing / report fixes (second pass)

- Green Room Sign-In: long programmes are now split into multiple logical A4 pages instead of shrinking/clipping the report after the first visible rows.
- Valuation Sheet: long programme sheets are paginated and continuation pages keep continuous serial numbers.
- Call List: long programme sheets are paginated with the same print-safe continuation logic.
- Programme-wise continuation pages show `Page X / Y` while keeping the programme's total visible entries.
- Group/team rows use a print-weight estimate so long member lists consume more page space and are less likely to overflow.
- Removed the old 40% minimum print scale that could clip oversized logical pages; the print exporter now scales far enough to keep unexpected content inside the physical page as a final fallback.
- Long table reports: horizontal scroll containers are disabled during printing so right-side columns are not clipped.
- Table headers repeat on continuation pages; rows avoid bad mid-row page breaks where practical.
- Student Programme Register: exceptionally tall student rows may continue to the next page instead of overflowing/disappearing.
- Team-wise reports keep a team heading with the table that follows it when the browser creates a page break.
- Entry Form: corrected the `General` category filter so it no longer behaves like "all categories" for division/student selection.
- Chest Number Cards: added an optional Division filter for printing one division at a time.
- Chest Number Cards: added an independent `Show Division on card` option (off by default).
- Division options are now category/class aware and use division sort order; ambiguous all-category options include category + class context.
- `class_divisions.sort_order` is now loaded by the Reports page so division options can be presented consistently.

### Print audit coverage

Reviewed all 14 report formats in the Reports library: Green Room Sign, Valuation Sheet, Common Valuation Sheet, Call List, Entry Form, Chest Number Cards, Chest Number List, Student Programme Register, Programme Register, Winners List, Prize Distribution, Team-wise List, Top Scorers Report, and Result Summary.
