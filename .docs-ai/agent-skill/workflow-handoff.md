# Werewolf Game — Session Handoff Workflow

> Defines how agents hand off work between sessions.

---

## Task Stages

```
INTAKE → PLANNING → IN_PROGRESS → VERIFY → DONE
                                 ↘ BLOCKED
```

| Stage | Description |
|-------|-------------|
| `INTAKE` | Task received, classified, requirements clarified |
| `PLANNING` | Reading code, identifying files, designing approach |
| `IN_PROGRESS` | Actively writing code, running builds, fixing errors |
| `VERIFY` | Code written, running tests, checking quality |
| `BLOCKED` | Needs user input, external dependency, or unresolvable error |
| `DONE` | Task complete, tested, documented |
| `CANCELLED` | Task abandoned or superseded |

---

## Handoff File

**Location:** `.docs-ai/handoff/HANDOFF.md`

### Task Entry Format

```markdown
### TASK-{number}: {title}
- **Stage:** {stage}
- **Priority:** {P0|P1|P2|P3}
- **Date:** {YYYY-MM-DD}
- **Summary:** {1-2 sentence description}
- **Approach:** {implementation strategy}
- **Files Modified:** {list}
- **Files To Modify:** {list}
- **Last Action:** {what was done last}
- **Next Action:** {what should be done next}
- **Blockers:** {any blockers, or "None"}
- **Decisions:** {architectural decisions made}
```

---

## Session Protocols

### Starting a Session
1. Read `.docs-ai/handoff/HANDOFF.md`
2. Check for `IN_PROGRESS` or `BLOCKED` tasks
3. Resume if found, otherwise check `PLANNING` → `INTAKE` → ask user
4. Update HANDOFF.md with session start

### Ending a Session
1. Update task stage and last/next actions
2. Document where you stopped and what's next
3. List new issues or follow-up tasks
4. Update "Next Recommended Work"

### Multi-Task Priority Order
1. `BLOCKED` (try to unblock)
2. `VERIFY` (finish verification)
3. `IN_PROGRESS` by priority (P0 first)
4. `PLANNING`
5. `INTAKE`

---

## Task Categories

| Category | Prefix | Example |
|----------|--------|---------|
| Foundation/Setup | `setup-` | `setup-monorepo`, `setup-nextjs` |
| Game Engine | `engine-` | `engine-night-phase`, `engine-votes` |
| Role Implementation | `role-` | `role-werewolf`, `role-seer` |
| 3D Scene | `3d-` | `3d-village`, `3d-character` |
| UI Component | `ui-` | `ui-role-card`, `ui-vote-panel` |
| Socket/Real-time | `socket-` | `socket-room-events` |
| i18n | `i18n-` | `i18n-role-translations` |
| Audio | `audio-` | `audio-sfx`, `audio-ambient` |
| Testing | `test-` | `test-game-engine` |
| DevOps | `devops-` | `devops-docker`, `devops-ci` |

---

## Cleanup Rules

- Keep last 10 completed tasks in HANDOFF.md
- Archive older tasks to `.docs-ai/handoff/archive/`
- Compress when HANDOFF.md exceeds ~150 lines
