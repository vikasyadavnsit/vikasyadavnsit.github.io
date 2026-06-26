# Notable Notes Project Walkthrough

I've implemented a new Markdown-based note-taking application called **Notable Notes** under the "Creative Stuff" category. This project provides a robust, local-first editing experience similar to Notable.

## Features Implemented

- **Split-Pane Editor**: Real-time Markdown preview on the right as you type on the left.
- **Note Management**: Create, delete, and search through your notes.
- **Local Persistence**: Notes are automatically saved to your browser's `localStorage`.
- **Export Options**:
    - **PDF Export**: Export the current note as a PDF file.
    - **ZIP Export**: Package all your notes into a single ZIP file for easy backup.
- **Customization**:
    - **Light/Dark Mode**: Toggle between light and dark themes.
    - **View Modes**: Choose between Split View, Editor-only, or Preview-only.
- **Search**: Quickly find notes by title or content.

## Implementation Details

- **Framework**: Built with Next.js and Tailwind CSS.
- **Libraries**:
    - `marked`: For fast and reliable Markdown parsing.
    - `jspdf`: For individual note PDF generation.
    - `jszip`: For bulk note export as ZIP.
    - `lucide-react`: For a consistent and modern icon set.
    - `framer-motion`: For smooth UI transitions and sidebar animations.

## Verification Results

- **Build Status**: The project builds successfully with `next build`.
- **Type Safety**: All TypeScript errors have been resolved, including the `dangerouslySetInnerHTML` type mismatch.
- **Responsiveness**: The UI is designed to be responsive, with a collapsible sidebar and adaptable view modes.
- **Functionality**: Verified note creation, editing, searching, and export features.

## How to Access

You can find the project at [/projects/creative-stuff/notable-notes](file:///C:/Users/Public/Documents/vikasyadavnsit.github.io/app/projects/creative-stuff/notable-notes/page.tsx) or by launching it from the "Creative Stuff" category page.
