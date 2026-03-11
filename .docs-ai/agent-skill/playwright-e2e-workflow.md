# Werewolf Game — E2E Testing Workflow

> Playwright E2E testing for multiplayer Werewolf game with 16 roles.

---

## 1. Critical Test Scenarios

### Auth & Entry (P0)
| ID | Flow |
|----|------|
| E2E-001 | Guest Play → Auto-name → Room Browser |
| E2E-002 | Register → Rooms |
| E2E-003 | Login → Rooms |
| E2E-010 | Language Switch EN/VI |

### Room System (P0)
| ID | Flow |
|----|------|
| E2E-004 | Create Room with 16-role selection |
| E2E-005 | Join Room |
| E2E-006 | Join by Code |
| E2E-007 | Start Game (6+ ready) |

### Core Game (P0)
| ID | Flow |
|----|------|
| E2E-008 | Night Phase → Actions → Dawn |
| E2E-009 | Day Phase → Discussion → Vote |
| E2E-011 | Vote → Majority → Elimination |
| E2E-012 | Game Over → Role Reveal |

### Village Role Tests (P1)
| ID | Role | Test |
|----|------|------|
| E2E-020 | Doctor | Protect target → wolf attacks same → survives |
| E2E-021 | Gunner | Day phase → shoot player → immediate death |
| E2E-022 | Seer | Night → check player → see exact role |
| E2E-023 | Aura Seer | Night → check player → see Good/Evil/Unknown |
| E2E-024 | Medium | Night → chat with dead → resurrect player |
| E2E-025 | Witch | Night → see attack → heal target → survives |
| E2E-026 | Witch | Night → use kill potion → target dies |
| E2E-027 | Avenger | Set revenge target → Avenger dies → target also dies |
| E2E-028 | Beast Hunter | Trap player → wolf bites → weakest wolf dies |
| E2E-029 | Cursed | Wolf bites Cursed → Cursed converts to wolf team |

### Werewolf Role Tests (P1)
| ID | Role | Test |
|----|------|------|
| E2E-030 | Werewolf | Night → select target → target dies |
| E2E-031 | W. Shaman | Day → curse player → Seer sees them as Evil |
| E2E-032 | Alpha Wolf | Night → vote (2x weight) → correct target selected |
| E2E-033 | W. Seer | Night → check role → all wolves see result |

### Solo Role Tests (P1)
| ID | Role | Test |
|----|------|------|
| E2E-040 | Headhunter | Target voted out → Headhunter wins |
| E2E-041 | Headhunter | Target killed at night → Headhunter joins Village |
| E2E-042 | Fool | Fool voted out → Fool wins, game continues |
| E2E-043 | Bomber | Place bomb → explodes next night → target dies |
| E2E-044 | Bomber | Wolf attacks Bomber → Bomber immune |

### Win Condition Tests (P1)
| ID | Test |
|----|------|
| E2E-050 | All wolves dead → Village Wins |
| E2E-051 | Wolves >= villagers → Werewolf Wins |
| E2E-052 | Fool voted out → Fool Wins (solo) |
| E2E-053 | HH target voted out → Headhunter Wins (solo) |

### Seer Result System Tests (P1)
| ID | Test |
|----|------|
| E2E-060 | Seer checks Doctor (Good) → sees exact role |
| E2E-061 | Aura Seer checks Gunner (Unknown) → sees "Unknown" |
| E2E-062 | Aura Seer checks Werewolf (Evil) → sees "Evil" |
| E2E-063 | Shaman curses Seer + Aura checks → sees "Evil" (overridden) |
| E2E-064 | Seer checks Alpha Wolf (Unknown) → sees "Unknown" |

---

## 2. Test Organization

```
tests/e2e/
├── auth/
├── lobby/
├── game/
│   ├── phases/
│   ├── village-roles/    ← doctor, gunner, seer, aura, medium, witch, avenger, beast-hunter, cursed
│   ├── werewolf-roles/   ← werewolf, shaman, alpha, w-seer
│   ├── solo-roles/       ← headhunter, fool, bomber
│   ├── seer-results/     ← Good/Evil/Unknown + Shaman curse tests
│   └── win-conditions/   ← village, werewolf, solo wins
├── chat/
├── i18n/
└── fixtures/
    ├── test-game.ts      ← Setup game with specific roles (any of 16)
    ├── test-room.ts
    └── multi-player.ts
```

---

## 3. Required data-testid Attributes

| Element | Attribute |
|---------|-----------|
| Play Now | `play-now` |
| Create Room | `create-room` |
| Room Code | `room-code` |
| Role Toggle | `role-toggle-{roleId}` (16 possible) |
| Role Count | `role-count-{roleId}` |
| Ready Button | `ready-button` |
| Start Game | `start-game` |
| Game View | `game-view` |
| Phase Indicator | `phase-indicator` |
| Timer | `timer` |
| Player Card | `player-{id}` |
| Night Action Confirm | `night-action-confirm` |
| Vote Button | `vote-{playerId}` |
| Gunner Shoot | `gunner-shoot` |
| Gunner Bullets | `gunner-bullets` |
| Shaman Curse | `shaman-curse` |
| Medium Resurrect | `medium-resurrect` |
| Witch Heal | `witch-heal` |
| Witch Kill | `witch-kill` |
| Seer Result | `seer-result` |
| Aura Result | `aura-result` |
| Bomb Place | `bomber-place` |
| Trap Place | `trap-place` |
| Role Card | `role-card` |
| Chat Input | `chat-input` |
| Language Toggle | `language-toggle` |
