# Phase 1 — Core Game Engine Plan

> Priority: P1 | Estimated: 7-10 days | Depends on: Phase 0
> 16 roles (9 Village + 4 Werewolf + 3 Solo) — see ROLES.md
> This is the heart of the game.

---

## Goal

Build a fully functional Werewolf game with all 16 roles, playable with text-only UI (no 3D yet). All game logic server-authoritative via Socket.io.

---

## Module 1: Room System (2 days)

### Server
- Room state in Redis with 16-role selection
- Host can toggle any of the 16 roles on/off
- Auto-balance validation: warn if role combination is unplayable
- Settings include role count for multi-instance roles (e.g., 2× Werewolf)

### Client
- Room browser, create room with 16-role grid (organized by team)
- Role tooltips with name (EN/VI), team, Seer result, ability description
- Auto-fill remaining slots with Villagers indication

---

## Module 2: Game Engine (3-4 days)

### State Machine
Phase flow: Night → Dawn → Day → Vote → Last Words → Win Check → Night...

### Seer Result System
Server computes what Seer/Aura Seer sees:
1. Get target's base seer result from role definition
2. Check if Werewolf Shaman cursed the target during previous day
3. If cursed → override result to "Evil"
4. Return result to Seer/Aura Seer

### Night Resolution Order (critical — must be exact)
```
1. Medium:        Talk to dead (chat channel), optional resurrect
2. Seer:          Check role → return exact role name
3. Aura Seer:     Check alignment → return Good/Evil/Unknown (with Shaman curse applied)
4. Werewolf Seer: Check role → share with all wolves
5. Beast Hunter:  Place/move trap on a player
6. Avenger:       Set/change revenge target
7. All Wolves:    Vote kill target (Alpha = 2× weight)
8. Witch:         See attack → optional heal (1×/game) or kill (1×/game)
9. Doctor:        Protect one player
10. Bomber:       Place bomb → explodes NEXT night
11. RESOLVE:
    - Previous bomb explodes → target dies (bypasses protection)
    - Wolf target resolution:
      * If target has trap → weakest wolf dies, target lives
      * If target is Cursed → converts to wolf team (not killed)
      * If target is Bomber → immune (attack fails)
      * If Doctor/Witch healed → target saved
      * Otherwise → target dies
    - Witch kill → target dies (no protection)
    - Avenger revenge → if Avenger died, revenge target also dies
    - Medium resurrect → resurrected player returns
```

### Day Phase Actions
- **Gunner:** Can shoot any living player during day (2 bullets max, immediate death, no vote needed)
- **Werewolf Shaman:** Can curse one player during day (target appears Evil to seers that night)
- Both actions are sent as socket events during day phase
- Gunner shot triggers immediate death announcement

### Win Condition Checker
After every death:
- **Village wins:** All werewolves dead (including converted Cursed)
- **Werewolf wins:** Werewolves ≥ remaining village team
- **Fool wins:** Fool gets voted out (solo victory — game continues for others)
- **Headhunter wins:** Target is voted out (solo victory — game continues)
- **Bomber:** Wins based on variant rules

---

## Module 3: Role Implementations (3 days)

Each role extends `BaseRole`:

```typescript
abstract class BaseRole {
  abstract role: Role;
  abstract team: 'village' | 'werewolf' | 'solo';
  abstract seerResult: 'good' | 'evil' | 'unknown';
  abstract hasNightAction: boolean;
  abstract hasDayAction: boolean;
  abstract validateAction(game, action): boolean;
  abstract executeAction(game, action): ActionResult;
}
```

### Village Team (9 roles)

| Role | Night | Day | Special |
|------|-------|-----|---------|
| Doctor | Select protect target | — | Cannot protect self (variant) |
| Gunner | — | Shoot button (2 bullets) | Immediate kill, no vote |
| Seer | Select check target | — | Receives exact role |
| Aura Seer | Select check target | — | Receives Good/Evil/Unknown |
| Medium | Chat with dead + resurrect | — | 1 resurrect per game |
| Witch | See attack + heal/kill | — | 1 heal + 1 kill per game, heal only if attacked |
| Avenger | Select revenge target | — | Auto-kills target if Avenger dies |
| Beast Hunter | Select trap target | — | Trap triggers vs wolf; vs solo = both survive |
| Cursed | — (passive) | — | Converts to wolf if bitten |

### Werewolf Team (4 roles)

| Role | Night | Day | Special |
|------|-------|-----|---------|
| Werewolf | Vote kill target | — | Standard wolf |
| W. Shaman | Vote kill target | Curse a player | Cursed player appears Evil |
| Alpha Wolf | Vote kill (2× weight) | — | Double vote in wolf kill |
| W. Seer | Check player role + vote kill | — | Result shared with pack |

### Solo Team (3 roles)

| Role | Night | Day | Win Condition |
|------|-------|-----|---------------|
| Headhunter | — | — | Target voted out = win. Target dies otherwise = join village |
| Fool | — | — | Self voted out = win |
| Bomber | Place bomb | — | Bomb explodes next night. Immune to wolves |

---

## Module 4: Chat System (1 day)

### Channels

| Channel | Who | When | Special |
|---------|-----|------|---------|
| `lobby` | All | Pre-game | — |
| `day` | Living players | Day phase | — |
| `werewolf` | All wolves | Night only | Coordinate kill |
| `dead` | Dead players | Always | Spectator chat |
| `medium-dead` | Medium + dead | Night only | Medium's ability |

---

## Module 5: Game Client UI (2 days)

### Role-Specific Night UIs

| Role | Night UI |
|------|----------|
| Doctor | Player grid → select protect target |
| Seer | Player grid → select check target → see result card |
| Aura Seer | Player grid → select target → see Good/Evil/Unknown badge |
| Medium | Dead player chat + resurrect button |
| Witch | "Wolves attacked [X]" + Heal/Kill/Skip buttons |
| Avenger | Player grid → select revenge target |
| Beast Hunter | Player grid → place trap |
| Werewolf | Player grid → vote kill (see other wolf votes) |
| W. Shaman | Player grid → vote kill (curse is daytime) |
| Alpha Wolf | Player grid → vote kill (2× indicator) |
| W. Seer | Player grid → check target + vote kill |
| Bomber | Player grid → place bomb |
| Headhunter | "Waiting..." (no night action) |
| Fool | "Waiting..." (no night action) |
| Cursed | "Waiting..." or wolf UI if converted |

### Day-Specific UIs
- **Gunner:** "🔫 Shoot" button with bullet counter (● ● = 2 left)
- **W. Shaman:** "🔮 Curse" button → player selector

---

## Success Criteria

- [ ] All 16 roles can be selected in room creation
- [ ] Roles assigned correctly based on player count
- [ ] Each of the 16 roles' night actions work correctly
- [ ] Seer Result system works (Good/Evil/Unknown + Shaman curse override)
- [ ] Gunner can shoot during day (bullets tracked)
- [ ] Beast Hunter trap triggers correctly vs wolves
- [ ] Cursed converts to wolf team when bitten
- [ ] Bomber bomb explodes next night, Bomber immune to wolves
- [ ] Medium can talk to dead and resurrect
- [ ] Avenger revenge triggers on death
- [ ] Fool wins when voted out
- [ ] Headhunter wins when target voted out, joins village if target dies otherwise
- [ ] Alpha Wolf has 2× vote weight
- [ ] Werewolf Seer shares check result with all wolves
- [ ] Village win / Werewolf win / Solo wins all trigger correctly
- [ ] All 4 chat channels work with correct permissions
