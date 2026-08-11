# Festeazy

Festeazy is a Meelad / Madrasa program management software built from the existing Sahithyotsav result portal base.

## Goal
Manage the full event workflow:

- Madrasa / event setup
- Teams / houses
- Categories and classes
- Student registration
- Programmes and participant assignment
- Judges and mark entry
- Automatic result calculation
- Public live results
- Posters, result cards, certificates and PDF reports

## Tech Stack

- Next.js App Router
- React
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Storage
- Vercel

## Phase 1 Scope

Phase 1 should convert the old result portal into a proper Festeazy foundation:

1. Rename brand and metadata to Festeazy.
2. Create the Supabase database schema in `database/001_ulsavtrack_schema.sql`.
3. Add admin modules for event setup, teams, categories/classes, students and programmes.
4. Keep result poster and public portal features from the old project.
5. Build step by step before adding judge login and advanced reports.

## Suggested Admin Menu

- Dashboard
- Event Setup
- Teams / Houses
- Categories & Classes
- Students
- Programmes
- Participants
- Judges
- Mark Entry
- Results
- Reports / Exports
- Posters / Certificates
- Public Portal
- Settings

## Phase 1.1 Update

This starter now includes the first real Festeazy admin foundation:

- `/admin/dashboard` — new Festeazy dashboard
- `/admin/event-setup` — create madrasa/institute and event profile
- `/event/[slug]` — first public event portal placeholder
- Shared admin sidebar layout in `components/admin/AdminShell.tsx`

After running the SQL schema, login to `/admin`, then open `/admin/event-setup` and save the first event.
