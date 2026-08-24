# Pending Tasks (Resume Here)

Stored on request. Next session: say "continue" and start with Task 1.

## Task 1 — Remove the "borrow" option from the whole website

Convert from a physical borrow system to a digital read-only library. Remove every
borrow / reserve / return / offline-issue UI entry point, page, route, nav link and
borrow state logic.

### Borrow-related files (from earlier exploration)
- `js/app.js` — router routes, sidebar/nav/FAB menu items: `book-return`,
  `physical-reservation`, `offline-issue`, `my-books`, `reservations`, `library-stats`,
  protected/librarian route guard lists
- `js/state.js` — borrow state functions (`borrowRequests`, create/request borrow,
  updateDueDate, return logic, fine logic) + seed data in `js/data.js`
- `js/pages/myBooks.js` (525 lines) — "My Books" borrowed-list page
- `js/pages/borrowHistory.js` (274 lines) — borrow history page
- `js/pages/borrowSuccess.js` (174 lines) — success page after borrowing
- `js/pages/bookReturn.js` — return processing page
- `js/pages/offlineIssue.js` — offline issue wizard
- `js/pages/physicalReservation.js` — reservation page
- `js/pages/reservations.js` — reservations list page
- `js/pages/bookDetail.js` (572 lines) — borrow/reserve buttons + modal
- `js/pages/books.js` (580 lines) — borrow button on book cards
- `js/pages/home.js` (474 lines) — borrow CTAs, "my books" widgets
- `js/pages/dashboard.js` — borrow stats cards
- `index.html` — page script tags for the removed pages

### Approach
1. Run an exhaustive grep for `borrow|reservation|return|offline|issue|my-books`
   across `js/` to finalize the inventory (see earlier explore result — aborted).
2. Remove routes + sidebar/FAB entries in `app.js`.
3. Remove borrow buttons/links/modals in bookDetail, books, home.
4. Remove/replace borrow pages (myBooks, borrowHistory, borrowSuccess, bookReturn,
   offlineIssue, physicalReservation, reservations) and their script tags.
5. Remove borrow state/logic from state.js + seed borrow data from data.js.
6. Keep the **Digital Library** as the primary reading path.
7. Re-run `node --check` on all changed files.

## Task 2 — Import moecdc.com.np content into the Digital Library

"Import all the content you can download from moecdc.com.np and place it in the right
place" → populate the **Digital Library** page (`js/pages/digitalLibrary.js`, data from
`AppState.digitalBooks`).

### Research findings (site = moecdc.gov.np, a.k.a. moecdc.com.np)
- It is the Curriculum Development Centre (CDC), Sanothimi Bhaktapur — publishes free
  Nepali school textbooks (Nepali, English, Maths, Science, Social Studies, optional
  subjects, mother-tongue languages) for grades 1–12.
- Real textbook categories: `/category/textbook--g-/` (पाठ्यपुस्तक G).
- Actual PDF downloads live at URLs like
  `https://giwmscdnone.gov.np/media/pdf_upload/...pdf` (example seen on homepage:
  `7.Reduced-class 7 Nepali final_lnxtmxf.pdf`).
- Separate digital library portals (may need login, may not be scrapable):
  - `http://lib.moecdc.gov.np/elibrary/pages/home.php?login=true`
  - `http://lib.moecdc.gov.np/catalog/opac_css/`
  - `http://lib.moecdc.gov.np/adt/grade1/serofero/` (accessible digital content)
- YouTube playlists: `https://www.youtube.com/@moecdc/playlists` (audio-visual).

### Approach (confirm with user first)
1. Crawl `/category/textbook--g-/` (and optionally teacher guides) for the PDF index.
2. Decide: **link to CDC's hosted PDFs** (small repo) vs **download PDFs locally**
   (large repo) — ask user.
3. Generate a `digitalBooks` dataset (title, author, grade, subject, type:'pdf',
   pdfUrl, cover) and seed it into the app (js/data.js / state.js `digitalBooks`).
4. Wire `DigitalLibraryPage.openPDF()` to actually open the PDF (iframe/embed/new tab).
5. Keep formatting/search tabs; verify syntax.

## Notes
- App is vanilla JS, no framework. Run checks with `node --check <file>`.
- Project root: `C:\Users\Acer\Desktop\library`
- Files changed so far in earlier sessions (do not undo):
  - `js/pages/offlineIssue.js` (new page, may be removed in Task 1)
  - `js/app.js` (offline-issue route + sidebar + FAB entries added earlier)
  - `index.html` (offlineIssue script tag)
  - `js/pages/adminBooks.js` — cover upload (Upload Image button + URL fallback,
    methods `onCoverFile/_applyCover/onCoverUrl/clearCover/_renderCoverPreview`)
  - `js/utils.js` — `escapeHtml` now escapes `"`/`'`; `getBookCover` uses data-*
    attributes + `Utils.onCoverError()` (Nepali-safe)
  - `css/variables.css` — `--font-sans` includes Devanagari fonts
