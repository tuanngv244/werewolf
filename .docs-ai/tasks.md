# Werewolf Game — Quick Task Reference

> 16 roles (9 Village + 4 Werewolf + 3 Solo) — see ROLES.md
> Last updated: 2026-03-09

---

## Current Focus: Phase 0 — Foundation

### Setup (0/9)
- [ ] pnpm monorepo + workspaces
- [ ] shared/ package (16 role types, constants, seer results)
- [ ] Next.js 15 client (TailwindCSS, next-intl, R3F)
- [ ] NestJS server (TypeORM, Socket.io, Redis)
- [ ] i18n files (EN + VI, all 16 roles translated)
- [ ] Game theme (Fredoka One + Nunito, fantasy palette)
- [ ] Docker Compose dev (postgres + redis)
- [ ] Root layout + locale layout
- [ ] Role metadata constants (all 16 roles)

### Auth (0/10)
- [ ] Server: Auth module, User entity, Guest auth
- [ ] Client: Login, Register, Auth store, Language selector

---

## Up Next: Phase 1 — Game Engine (0/~60)

- Room System (11 tasks) — 16-role selection
- Game Engine (10 tasks) — seer results, day actions
- Village Roles (9 tasks) — Doctor, Gunner, Seer, Aura Seer, Medium, Witch, Avenger, Beast Hunter, Cursed
- Werewolf Roles (4 tasks) — Werewolf, Shaman, Alpha, W.Seer
- Solo Roles (3 tasks) — Headhunter, Fool, Bomber
- Game Client (12 tasks) — role-specific UIs for all 16
- Chat System (11 tasks) — 4 channels + medium-dead

## Phase 2: 3D Scene (0/~45)

- Village + Lighting (8)
- Characters (9)
- 16 Role Costumes (18)
- Effects (8)

---

## Totals

| Phase | Tasks | Done |
|-------|-------|------|
| P0 Foundation | 19 | 0 |
| P1 Game Engine | ~60 | 0 |
| P2 3D Scene | ~45 | 0 |
| P3 UI & Pages | ~45 | 0 |
| P4 Sound | ~18 | 0 |
| P5 Polish | ~35 | 0 |
| P6 Social | ~25 | 0 |
| P7 DevOps | ~15 | 0 |
| **Total** | **~262** | **0** |
