# Whiteboard Theme Improvement Plan

Improve the "black" and "light" themes for the Digital Whiteboard project. The goal is to create a more "premium" and "whiteboard-native" feel without impacting the global portfolio themes.

## User Review Required

- **Color Palette**: I've proposed a refined "Studio" (Light) and "Obsidian" (Black) palette. Please review the specific HSL values or suggest alternatives.
- **Marker Colors**: I've updated the marker palette to be more vibrant and "premium".
- **Grid Style**: Proposed a subtle dot/line grid for both themes.

## Proposed Changes

### [Whiteboard Component]

Create a dedicated theme file for the whiteboard to isolate changes from the global portfolio.

#### [NEW] [themes.css](file:///C:/Users/Public/Documents/vikasyadavnsit.github.io/app/projects/creative-stuff/whiteboard/themes.css)

- Define whiteboard-specific CSS variables for background, foreground, canvas, and grid.
- Implement `.wb-theme-light` and `.wb-theme-dark` classes.
- Refine glassmorphism effects for whiteboard UI.

```css
.wb-theme-light {
  --wb-background: 0 0% 98%;
  --wb-foreground: 240 10% 10%;
  --wb-canvas: 0 0% 100%;
  --wb-grid: 0 0% 0% / 0.03;
  --wb-border: 240 5% 90%;
  --wb-primary: 221.2 83.2% 53.3%;
}

.wb-theme-dark {
  --wb-background: 240 10% 2%;
  --wb-foreground: 0 0% 98%;
  --wb-canvas: 240 10% 3%;
  --wb-grid: 0 0% 100% / 0.03;
  --wb-border: 240 4% 12%;
  --wb-primary: 217.2 91.2% 59.8%;
}
```

#### [page.tsx](file:///C:/Users/Public/Documents/vikasyadavnsit.github.io/app/projects/creative-stuff/whiteboard/page.tsx)

- Import `themes.css`.
- Replace hardcoded hex colors (`#0a0a0a`, `#f5f5f7`) with the new CSS variables.
- Update p5.js initialization to use the new theme colors dynamically.
- Refine the marker color palette in the toolbar.
- Update the main `main` element classes to use the new theme classes.

```tsx
// Example change in page.tsx
<main className={cn(
  "h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-700",
  currentMode === 'dark' ? "wb-theme-dark bg-[hsl(var(--wb-background))]" : "wb-theme-light bg-[hsl(var(--wb-background))]"
)}>
```

---

## Verification Plan

### Automated Tests
- No automated tests currently exist for the whiteboard canvas. I will rely on manual verification and static analysis.
- Run `npm run build` to ensure no regressions in build process.

### Manual Verification
- **Visual Inspection**: Open the whiteboard in both Light and Dark modes.
- **Contrast Check**: Ensure text and icons are readable in both themes.
- **Canvas Rendering**: Verify that the grid and background colors update correctly when switching themes.
- **Export Verification**: Ensure the exported PNG has the correct background color for the active theme.
- **Responsive Check**: Ensure the sidebar and toolbars still look good on different screen sizes with the new styles.
