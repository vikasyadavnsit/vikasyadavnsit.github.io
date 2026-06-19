# Graph Report - vikasyadavnsit.github.io  (2026-06-18)

## Corpus Check
- 62 files · ~64,047 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 420 nodes · 629 edges · 29 communities (20 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3ab33300`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 21 edges
2. `useTheme()` - 13 edges
3. `MonitorEvent` - 8 edges
4. `safeSet()` - 8 edges
5. `RequestLab()` - 6 edges
6. `AlertSeverity` - 6 edges
7. `Zone` - 6 edges
8. `BoundingBox` - 6 edges
9. `TrackingPoint` - 6 edges
10. `BabyMonitorPage()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `AppletEditor()` --calls--> `cn()`  [EXTRACTED]
  app/projects/iot/bridge/components/AppletEditor.tsx → lib/utils.ts
- `TimeWindowBuilder()` --calls--> `cn()`  [EXTRACTED]
  app/projects/iot/bridge/components/AppletEditor.tsx → lib/utils.ts
- `Tooltip()` --calls--> `cn()`  [EXTRACTED]
  app/projects/creative-stuff/whiteboard/page.tsx → lib/utils.ts
- `Tooltip()` --calls--> `cn()`  [EXTRACTED]
  app/projects/creative-stuff/scratchpad/page.tsx → lib/utils.ts
- `ScratchpadPage()` --calls--> `cn()`  [EXTRACTED]
  app/projects/creative-stuff/scratchpad/page.tsx → lib/utils.ts

## Communities (29 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (32): inter, metadata, IoTBridgePage(), GlobalChatHub(), SidebarContent(), T, ThemeKey, TimeWindowBuilder() (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (43): AlertSeverity, AnalyticsSummary, DailyAnalytics, DEFAULT_SETTINGS, EVENT_MESSAGES, EVENT_SEVERITY, EventType, MonitorEvent (+35 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (35): ACTION_COLORS, ACTION_ICONS, ICON_MAP, TRIGGER_ICONS, AppletEditor(), AppletEditorProps, DEVICE_ICONS, FIELD_ICONS (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (28): BabyMonitorPage(), Tab, TABS, AudioState, BabyState, BoundingBox, DetectionResult, PoseLandmark (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (30): Auth, AuthType, BodyType, Collection, ConsoleLog, ContextMenu, emptyKV(), escapeHtml() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (15): BLOCK_CMDS, BlockType, Board, EMOJIS, PRIORITIES, Priority, priorityMeta(), SortCol (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (14): aesDecrypt(), aesEncrypt(), b64(), EntryPanel(), GeneratorPanel(), isValidUrl(), normalizeUrl(), PasswordEntry (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (7): Gauge(), Phase, PHASE_COLORS, SpeedResult, T, ThemeKey, useSmoothValue()

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (9): AnalyticsPanel(), AnalyticsPanelProps, TIP_STYLE, DailySummary(), DailySummaryProps, HeatmapCanvasProps, hslToRgb(), hue2rgb() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (7): decryptFile(), deriveKey(), encryptFile(), MAGIC, Status, Tab, Window

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (4): AddMode, generateId(), parseOtpAuthUri(), TotpAccount

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (11): code:bash (git clone https://github.com/vikasyadavnsit/vikasyadavnsit.g), code:bash (npm install), code:bash (npm run dev), 🤝 Contributing, 🔧 Getting Started, Installation, 🚀 Live Demo, Prerequisites (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.24
Nodes (9): collectDeviceInfo(), DeviceInfo, DeviceInfoCards(), formatDate(), formatTime(), parseUA(), QRLoginPage(), SessionStatus (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (4): CharacterId, characters, Lottie, Status

## Knowledge Gaps
- **128 isolated node(s):** `nextConfig`, `config`, `inter`, `metadata`, `categories` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `db` connect `Community 2` to `Community 0`, `Community 12`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `nextConfig`, `config`, `inter` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._