import { Role, Team, SeerResult } from '../types/game.types';
export interface RoleDefinition {
    role: Role;
    team: Team;
    seerResult: SeerResult;
    nameKey: string;
    descKey: string;
    hasNightAction: boolean;
    hasDayAction: boolean;
    isUnique: boolean;
    priority: number;
}
export declare const ROLE_DEFINITIONS: Record<Role, RoleDefinition>;
export declare function getRoleTeam(role: Role): Team;
export declare function getRoleSeerResult(role: Role): SeerResult;
export declare function isWerewolfRole(role: Role): boolean;
export declare function isSoloRole(role: Role): boolean;
export declare function isVillageRole(role: Role): boolean;
