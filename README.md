Personal Time Tracker (MVP)

Overview

- Static, client-side web app for tracking daily time blocks.
- Drag to select a time range, pick a category, optionally add a note.
- Data is stored in browser localStorage, with export/import support.
- Daily and monthly summaries by category.

Getting Started

- Open index.html in a browser.
- Select a date, click-drag on the grid to create a block.
- Click a block to edit or delete it.
- Use Export/Import to back up or restore your data.

Design Choices

- 15-minute increments (96 rows/day) for a balance of precision and usability.
- Default categories: Work, Exercise, Break, Personal, Sleep, Other.
- All data is local-first; no backend required for the MVP.

Deploy to Vercel

- You can deploy this as a static site:
  - Create a new GitHub repo and push this folder.
  - In Vercel, import the repo.
  - Set Framework Preset to “Other”.
  - Build Command: none
  - Output Directory: root (.)
  - Vercel will serve index.html as the entry point.

Next Steps (Supabase Integration)

- Add authentication (Supabase Auth) to sync data across devices.
- Replace localStorage with Supabase tables:
  - categories (id, name, color, user_id)
  - entries (id, date, start, end, category_id, label, user_id)
- Client: on login, load user’s categories and entries for selected date.
- Conflict resolution: if offline edits exist, merge by last-write-wins or ask user.

Notes

- This is intentionally simple to focus on UI/UX first.
- You can later migrate to Next.js or Vite + React for richer features.

