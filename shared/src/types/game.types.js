"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinCondition = exports.DeathCause = exports.SeerResult = exports.GamePhase = exports.Role = exports.Team = void 0;
var Team;
(function (Team) {
    Team["VILLAGE"] = "village";
    Team["WEREWOLF"] = "werewolf";
    Team["SOLO"] = "solo";
})(Team || (exports.Team = Team = {}));
var Role;
(function (Role) {
    Role["DOCTOR"] = "doctor";
    Role["GUNNER"] = "gunner";
    Role["SEER"] = "seer";
    Role["AURA_SEER"] = "aura_seer";
    Role["MEDIUM"] = "medium";
    Role["WITCH"] = "witch";
    Role["AVENGER"] = "avenger";
    Role["BEAST_HUNTER"] = "beast_hunter";
    Role["CURSED"] = "cursed";
    Role["WEREWOLF"] = "werewolf";
    Role["WEREWOLF_SHAMAN"] = "werewolf_shaman";
    Role["ALPHA_WEREWOLF"] = "alpha_werewolf";
    Role["WEREWOLF_SEER"] = "werewolf_seer";
    Role["HEADHUNTER"] = "headhunter";
    Role["FOOL"] = "fool";
    Role["BOMBER"] = "bomber";
    Role["VILLAGER"] = "villager";
})(Role || (exports.Role = Role = {}));
var GamePhase;
(function (GamePhase) {
    GamePhase["WAITING"] = "waiting";
    GamePhase["STARTING"] = "starting";
    GamePhase["NIGHT"] = "night";
    GamePhase["DAWN"] = "dawn";
    GamePhase["DAY"] = "day";
    GamePhase["VOTE"] = "vote";
    GamePhase["VOTE_RESULT"] = "vote_result";
    GamePhase["LAST_WORDS"] = "last_words";
    GamePhase["GAME_OVER"] = "game_over";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
var SeerResult;
(function (SeerResult) {
    SeerResult["GOOD"] = "good";
    SeerResult["EVIL"] = "evil";
    SeerResult["UNKNOWN"] = "unknown";
})(SeerResult || (exports.SeerResult = SeerResult = {}));
var DeathCause;
(function (DeathCause) {
    DeathCause["WEREWOLF_KILL"] = "werewolf_kill";
    DeathCause["VOTED"] = "voted";
    DeathCause["GUNNER_SHOT"] = "gunner_shot";
    DeathCause["WITCH_KILL"] = "witch_kill";
    DeathCause["AVENGER_REVENGE"] = "avenger_revenge";
    DeathCause["BOMBER_EXPLOSION"] = "bomber_explosion";
    DeathCause["TRAP"] = "trap";
})(DeathCause || (exports.DeathCause = DeathCause = {}));
var WinCondition;
(function (WinCondition) {
    WinCondition["ALL_WEREWOLVES_DEAD"] = "all_werewolves_dead";
    WinCondition["WEREWOLVES_MAJORITY"] = "werewolves_majority";
    WinCondition["FOOL_WINS"] = "fool_wins";
    WinCondition["HEADHUNTER_WINS"] = "headhunter_wins";
    WinCondition["BOMBER_WINS"] = "bomber_wins";
})(WinCondition || (exports.WinCondition = WinCondition = {}));
//# sourceMappingURL=game.types.js.map