# Werewolf Game (Ma Soi) — Business Document

> Last updated: 2026-03-09

---

## 1. Executive Summary

**Product:** A free-to-play, real-time multiplayer Werewolf (Ma Soi) game with super cute 3D chibi characters, targeting both English and Vietnamese-speaking audiences.

**Vision:** Become the #1 online Werewolf game in Southeast Asia and a top-3 social deduction game globally, known for its adorable 3D characters, smooth real-time gameplay, and vibrant community.

**Unique Value Proposition:**
- First Werewolf game with high-quality 3D chibi characters (not flat 2D cards)
- Bilingual (EN/VI) from day one — huge untapped Vietnamese market
- Web-based — no download required, instant play on any device
- Real-time multiplayer with voice/text chat, not turn-based card flipping
- Free to play with cosmetic-only monetization (no pay-to-win)

---

## 2. Market Analysis

### 2.1 Target Market

| Segment | Description | Size |
|---------|-------------|------|
| **Primary** | Vietnamese gamers (18-35) who play Ma Soi offline/on Zalo | ~15M potential |
| **Secondary** | English-speaking social gamers (Werewolf Online, Town of Salem fans) | ~50M potential |
| **Tertiary** | Board game communities, party game enthusiasts globally | ~20M potential |

### 2.2 Market Opportunity

- **Vietnam:** Ma Soi (Werewolf) is one of the most popular party games. Millions play it offline at gatherings, cafes, and events. There is no dominant digital version with quality 3D graphics.
- **Global:** Social deduction games (Among Us, Town of Salem, Werewolf Online) have proven massive demand. Among Us peaked at 500M+ downloads.
- **Web-based advantage:** No App Store gatekeeping, instant access, cross-platform by default.

### 2.3 Competitive Landscape

| Competitor | Platform | Graphics | Languages | Monetization | Weaknesses |
|-----------|----------|----------|-----------|-------------|------------|
| Werewolf Online | Mobile | 2D flat | EN only | Ads + IAP | Dated UI, no 3D |
| Town of Salem | PC/Mobile | 2D cartoon | EN only | Premium + cosmetics | Complex for new players |
| Wolvesville | Mobile | 2D illustrated | Multi | Cosmetics + premium | No 3D, cluttered UI |
| Ma Soi (offline apps) | Mobile | Static cards | VI only | Ads | No multiplayer, just role assignment |
| **Our Game** | **Web (all devices)** | **3D chibi** | **EN + VI** | **Cosmetics** | **New entrant** |

### 2.4 Our Competitive Advantages

1. **3D Cute Characters** — Emotional connection through adorable, expressive chibi models
2. **Vietnamese-first** — Native Vietnamese language with cultural references
3. **Web-based** — Zero friction, play instantly in browser
4. **Real-time 3D scenes** — Immersive village with day/night cycle, weather
5. **No pay-to-win** — Fair gameplay, monetize through cosmetics only

---

## 3. Product Strategy

### 3.1 Core Game Modes

| Mode | Players | Description | Priority |
|------|---------|-------------|----------|
| **Classic** | 6-16 | Standard Werewolf with configurable roles | P0 (MVP) |
| **Quick** | 6-8 | Fast rounds, simplified roles (Werewolf + Seer + Villager only) | P1 |
| **Ranked** | 8-12 | Competitive with ELO rating, seasonal rewards | P2 |
| **Custom** | 6-16 | Host creates custom role sets, house rules | P1 |
| **Practice** | 1 + bots | Play with AI bots to learn roles | P2 |

### 3.2 Feature Roadmap

#### Phase 1 — MVP (Months 1-3)
- Core game engine (16 roles across 3 teams, full night/day cycle)
  - Village Team (9): Doctor, Gunner, Seer, Aura Seer, Medium, Witch, Avenger, Beast Hunter, Cursed
  - Werewolf Team (4): Werewolf, Werewolf Shaman, Alpha Werewolf, Werewolf Seer
  - Solo Team (3): Headhunter, Fool, Bomber
- Seer Result system (Good/Evil/Unknown + Shaman curse mechanic)
- Day-phase actions (Gunner shoot, Werewolf Shaman curse)
- Special mechanics (Beast Hunter trap, Bomber bomb, Cursed conversion, Medium resurrect, Avenger revenge)
- Room creation, joining, matchmaking
- 3D village scene with day/night transitions
- 3D chibi character models (base model + 16 role costumes)
- Text chat (day chat, werewolf-only chat, dead chat, medium-dead chat)
- Guest play (no account required)
- English + Vietnamese localization
- Basic player profiles (name, avatar, game count)

#### Phase 2 — Growth (Months 4-6)
- Account system (email, Google, Facebook login)
- Ranked mode with ELO matchmaking
- Cosmetic shop (skins, hats, emotes, death animations)
- Voice chat integration (WebRTC)
- Friend list & party system
- Game replay/spectator mode
- Achievement system (50+ achievements)
- Daily/weekly quests for free currency

#### Phase 3 — Expansion (Months 7-12)
- Additional roles beyond the initial 16
- Custom game mode builder
- Clan/guild system
- Seasonal events (Tet/Lunar New Year, Halloween, Christmas)
- Battle pass (seasonal cosmetic progression)
- Tournament system
- Mobile app wrapper (PWA or React Native)
- Additional languages (Thai, Indonesian, Japanese, Korean)

#### Phase 4 — Scale (Year 2)
- AI-powered game narrator (text-to-speech in EN/VI)
- Custom 3D avatar creator (mix & match body parts)
- User-created content (custom roles, maps)
- Streaming integrations (Twitch, YouTube extensions)
- API for third-party integrations
- Regional servers (SEA, NA, EU)

### 3.3 Success Metrics (KPIs)

| Metric | MVP Target (Month 3) | Growth Target (Month 6) | Scale Target (Month 12) |
|--------|----------------------|------------------------|------------------------|
| DAU (Daily Active Users) | 1,000 | 10,000 | 50,000 |
| MAU (Monthly Active Users) | 5,000 | 50,000 | 200,000 |
| Avg. Session Duration | 20 min | 30 min | 35 min |
| Games Played / Day | 500 | 5,000 | 25,000 |
| D1 Retention | 30% | 40% | 45% |
| D7 Retention | 15% | 22% | 28% |
| D30 Retention | 5% | 12% | 18% |
| Revenue / MAU | $0 | $0.15 | $0.50 |

---

## 4. Monetization Strategy

### 4.1 Core Principle: **Cosmetic-Only, No Pay-to-Win**

All gameplay is free. No role advantage, no extra votes, no information advantage from purchases. This builds trust and community goodwill.

### 4.2 Revenue Streams

| Stream | Description | Expected % Revenue |
|--------|-------------|-------------------|
| **Cosmetic Shop** | Character skins, hats, accessories, emotes, death animations, chat effects | 45% |
| **Battle Pass** | Seasonal progression with free + premium track (cosmetics) | 25% |
| **Premium Currency** | "Moon Gems" purchased with real money, used in shop | Included above |
| **Name Colors / Badges** | Special display names, profile badges, borders | 10% |
| **Room Customization** | Custom village themes, weather effects, ambient music | 10% |
| **Ads (Optional)** | Rewarded video ads for free currency (never forced) | 10% |

### 4.3 Currency System

| Currency | How to Get | What to Buy |
|----------|-----------|-------------|
| **Gold Coins** (free) | Play games, complete quests, achievements, watch ads | Basic cosmetics, some shop items |
| **Moon Gems** (premium) | Real money purchase, rare quest rewards, battle pass | Premium cosmetics, battle pass, exclusive items |

### 4.4 Pricing Structure

| Item Category | Price Range (Moon Gems) | Real Money Equivalent |
|--------------|------------------------|----------------------|
| Character Skin | 200-800 gems | $2-8 |
| Hat / Accessory | 50-300 gems | $0.50-3 |
| Emote Pack (5) | 150 gems | $1.50 |
| Death Animation | 300-500 gems | $3-5 |
| Chat Effect | 100-200 gems | $1-2 |
| Village Theme | 500-1000 gems | $5-10 |
| Battle Pass (Season) | 500 gems | $5 |

### 4.5 Moon Gem Packages

| Package | Gems | Price (USD) | Bonus |
|---------|------|------------|-------|
| Pouch | 100 | $0.99 | — |
| Sack | 500 | $4.99 | +10% |
| Chest | 1,200 | $9.99 | +20% |
| Treasury | 3,000 | $24.99 | +30% |
| Vault | 6,500 | $49.99 | +40% |

---

## 5. Go-to-Market Strategy

### 5.1 Launch Strategy

**Soft Launch (Month 2):**
- Closed beta with 500 players (Vietnamese gaming communities)
- Collect feedback, fix bugs, balance roles
- Build initial community on Discord + Facebook groups

**Open Beta (Month 3):**
- Public launch, free access
- Target Vietnamese gaming Facebook groups, TikTok, YouTube
- Partner with Vietnamese gaming influencers (5-10 mid-tier)
- Reddit posts in r/boardgames, r/socialdeduction, r/webgames

**Official Launch (Month 4):**
- All MVP features stable
- PR push to gaming media
- App listing on itch.io, game aggregator sites
- Google Ads + Facebook Ads (Vietnam-focused)

### 5.2 Marketing Channels

| Channel | Strategy | Budget |
|---------|----------|--------|
| **TikTok / YouTube Shorts** | Cute 3D character clips, funny game moments, role reveals | $500/mo |
| **Facebook Groups** | Vietnamese board game communities, Ma Soi groups | $300/mo |
| **Discord** | Community server, game events, feedback, beta testing | Free |
| **Influencer Partners** | Vietnamese gaming YouTubers & streamers play the game | $1,000/mo |
| **Reddit** | Organic posts in gaming subreddits | Free |
| **SEO** | "Play Werewolf online", "Ma Soi online", "free werewolf game" | Free |
| **Cross-promotion** | Partner with other indie game developers | Free |

### 5.3 Community Building

- **Discord server** with channels: announcements, feedback, bug-reports, fan-art, vietnamese, english, looking-for-game
- **Weekly events:** Community game nights, tournaments with cosmetic prizes
- **Content creator program:** Free premium currency for streamers who play the game
- **Fan art contests:** Best character art wins exclusive in-game items
- **Feedback-driven development:** Public roadmap, community votes on next features

---

## 6. Technical Infrastructure & Costs

### 6.1 Infrastructure

| Service | Provider | Monthly Cost (MVP) | Monthly Cost (Scale) |
|---------|----------|-------------------|---------------------|
| Web hosting (client) | Vercel | Free (hobby) | $20 |
| Game server | AWS EC2 / DigitalOcean | $40 | $200 |
| Database (PostgreSQL) | Supabase / RDS | Free tier | $50 |
| Redis | Upstash / ElastiCache | Free tier | $30 |
| CDN (3D assets) | CloudFront / Cloudflare | $5 | $50 |
| Domain + SSL | Cloudflare | $12/year | $12/year |
| **Total** | | **~$50/mo** | **~$350/mo** |

### 6.2 3D Asset Production

| Asset | Quantity | Cost Estimate |
|-------|----------|--------------|
| Base chibi character model | 1 (rigged, animated) | $500-1,500 |
| Role costume variants | 9 roles | $200-500 each |
| Village environment | 1 scene (day + night) | $500-1,000 |
| Additional skins (shop) | 20+ over time | $100-300 each |
| Sound effects pack | 1 set | $50-200 |
| **Total initial** | | **$3,000-8,000** |

*Alternative: Use AI-generated base models (Meshy, Tripo3D) + manual cleanup to reduce costs by 60-70%.*

---

## 7. Team & Roles

### MVP Team (Minimum)

| Role | Responsibility | Count |
|------|---------------|-------|
| **Full-stack Developer** | Next.js frontend, NestJS backend, Socket.io, game engine | 1-2 |
| **3D Artist** | Character models, village scene, animations (can be freelance) | 1 |
| **Game Designer** | Role balance, game flow, UX, playtesting | 1 (can overlap with dev) |

### Growth Team (Post-MVP)

| Role | Responsibility | Count |
|------|---------------|-------|
| Frontend Developer | UI polish, 3D optimization, new features | 1 |
| Backend Developer | Scaling, ranked system, anti-cheat | 1 |
| 3D Artist | New skins, environments, animations | 1 |
| Community Manager | Discord, social media, events | 1 |
| Marketing | Ads, influencer partnerships, content | 1 |

---

## 8. Risk Analysis

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low initial player count (can't fill rooms) | High | Medium | AI bots to fill rooms, quick-match across regions |
| 3D performance issues on low-end devices | High | Medium | LOD system, quality settings, 2D fallback mode |
| Toxic player behavior | Medium | High | Report system, chat filter, temporary bans, karma system |
| Cheating / hacking | High | Low | Server-authoritative logic, no client-side secrets |
| Competitors copy 3D approach | Medium | Low | First-mover advantage, strong community, faster iteration |
| Vietnamese market different from global | Medium | Medium | Separate content strategies, cultural adaptation |
| Burnout (small team) | High | Medium | Phased roadmap, MVPfirst, avoid feature creep |

---

## 9. Legal & Compliance

- **Werewolf/Mafia game rules:** Public domain, no IP issues
- **COPPA compliance:** Require 13+ age, no data collection from minors
- **GDPR/PDPA:** Privacy policy, data deletion requests, cookie consent
- **Vietnam cybersecurity law:** Data storage compliance for Vietnamese users
- **Terms of Service:** Account bans, virtual currency non-refundable
- **EULA:** Standard game license, no real-money trading of virtual items

---

## 10. Financial Projections (12-Month)

| Month | MAU | Revenue | Costs | Net |
|-------|-----|---------|-------|-----|
| 1-2 | 500 | $0 | $500 | -$500 |
| 3 | 5,000 | $0 | $500 | -$500 |
| 4 | 10,000 | $500 | $800 | -$300 |
| 5 | 20,000 | $1,500 | $1,000 | $500 |
| 6 | 50,000 | $5,000 | $1,500 | $3,500 |
| 7-8 | 80,000 | $10,000 | $2,000 | $8,000 |
| 9-10 | 120,000 | $18,000 | $3,000 | $15,000 |
| 11-12 | 200,000 | $30,000 | $5,000 | $25,000 |
| **Year 1 Total** | **200K peak** | **~$95,000** | **~$20,000** | **~$75,000** |

*Projections assume 2% conversion rate for cosmetics, $5 avg. spend per paying user.*

---

*This is a living document. Update as market conditions change and product evolves.*
