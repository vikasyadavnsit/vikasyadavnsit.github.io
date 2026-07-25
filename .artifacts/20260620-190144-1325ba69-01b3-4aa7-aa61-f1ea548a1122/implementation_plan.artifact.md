# Markdown Editor Project Implementation Plan

Add a "Notable-like" Markdown editor under "Creative Stuff" that allows users to write, preview, and export notes.

## User Review Required

- **Project Name**: I'm naming it "Notable Notes". Let me know if you prefer another name.
- **UI Layout**: I'm proposing a classic split-pane layout (Editor on left, Preview on right) with a sidebar for note management.
- **PDF Export**: PDF export will use `jspdf` to convert the rendered Markdown to a PDF file.
- **ZIP Export**: ZIP export will package all notes stored in `localStorage` into a single ZIP file.

## Proposed Changes

### Projects List

#### [page.tsx](file:///C:/Users/Public/Documents/vikasyadavnsit.github.io/app/projects/creative-stuff/page.tsx)

- Add "Notable Notes" to the `creativeProjects` list.

---

### Notable Notes Component

#### [NEW] [page.tsx](file:///C:/Users/Public/Documents/vikasyadavnsit.github.io/app/projects/creative-stuff/notable-notes/page.tsx)

- Create the main page for the Notable Notes project.
- Implement the split-pane layout.
- Implement note management (Create, Delete, Select).
- Implement Markdown rendering using `marked`.
- Implement persistence using `localStorage`.
- Implement PDF export using `jspdf`.
- Implement ZIP export using `jszip`.

---

## Verification Plan

### Automated Tests
- I will check for any compilation errors by analyzing the file.
- I will verify the logic of `localStorage` storage and retrieval.

### Manual Verification
- I'll use the browser to:
    - Create a new note.
    - Write Markdown and see the preview update in real-time.
    - Switch between notes.
    - Export a note as PDF.
    - Export all notes as a ZIP.
    - Delete a note.
    - Verify that data persists after a page refresh.
