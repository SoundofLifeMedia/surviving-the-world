/**
 * Enemy Coordinator Agent (ECA) - Enemy AI Stack Layer 4
 * Squad-level brain: role assignment, difficulty adaptation, flanking coordination
 * Feature: surviving-the-world, Property 12: Squad role assignment completeness
 * Feature: surviving-the-world, Property 13: Difficulty adaptation responsiveness
 * Feature: surviving-the-world, Property 14: Flanking route safety
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { Vector3 } from './PerceptionLayer';

export type SquadRole = 'pointman' | 'flanker' | 'suppressor' | 'medic' | 'sniper' | 'leader';

export interface SquadMember {
  id: string;
  role: SquadRole;
  position: Vector3;
  health: number;
  maxHealth: number;
  isAlive: boolean;
}

export interface SquadState {
  squadId: string;
  members: SquadMember[];
  roles: Map<string, SquadRole>;
  currentTactic: SquadTactic;
  playerSkillAssessment: number; // 0-1
  reinforcementsPending: boolean;
  formationCenter: Vector3;
}

export interface SquadTactic {
  type: 'assault' | 'flank' | 'surround' | 'ambush' | 'retreat' | 'hold';
  primaryTarget: Vector3;
  flankingRoutes: Vector3[][];
  suppressionTargets: Vector3[];
}

export interface PlayerAction {
  type: string;
  timestamp: number;
  success: boolean;
  position?: Vector3;
}

export interface PredictedBehavior {
  likelyAction: string;
  confidence: number;
  suggestedCounter: string;
}


export class EnemyCoordinatorAgent {
  private squads: Map<string, SquadState> = new Map();
  private playerHistory: PlayerAction[] = [];
  private difficultyMultiplier: number = 1.0;

  createSquad(squadId: string, memberIds: string[]): SquadState {
    const members: SquadMember[] = memberIds.map((id, index) => ({
      id,
      role: 'pointman' as SquadRole,
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      isAlive: true
    }));

    const state: SquadState = {
      squadId,
      members,
      roles: new Map(),
      currentTactic: {
        type: 'hold',
        primaryTarget: { x: 0, y: 0, z: 0 },
        flankingRoutes: [],
        suppressionTargets: []
      },
      playerSkillAssessment: 0.5,
      reinforcementsPending: false,
      formationCenter: { x: 0, y: 0, z: 0 }
    };

    this.assignRoles(state);
    this.squads.set(squadId, state);
    return state;
  }

  getSquad(squadId: string): SquadState | undefined {
    return this.squads.get(squadId);
  }

  assignRoles(squad: SquadState): void {
    const roles: SquadRole[] = ['leader', 'pointman', 'flanker', 'suppressor', 'medic', 'sniper'];
    const memberCount = squad.members.length;

    squad.members.forEach((member, index) => {
      let role: SquadRole;
      
      if (index === 0) {
        role = 'leader';
      } else if (memberCount >= 4 && index === 1) {
        role = 'flanker';
      } else if (memberCount >= 3 && index === memberCount - 1) {
        role = 'suppressor';
      } else if (memberCount >= 5 && index === 2) {
        role = 'medic';
      } else {
        role = 'pointman';
      }

      member.role = role;
      squad.roles.set(member.id, role);
    });
  }

  assessPlayerSkill(squad: SquadState, recentActions: PlayerAction[]): number {
    if (recentActions.length === 0) return 0.5;

    const successRate = recentActions.filter(a => a.success).length / recentActions.length;
    const actionVariety = new Set(recentActions.map(a => a.type)).size / Math.max(1, recentActions.length);
    const reactionSpeed = this.calculateReactionSpeed(recentActions);

    const skill = (successRate * 0.5) + (actionVariety * 0.3) + (reactionSpeed * 0.2);
    squad.playerSkillAssessment = Math.min(1, Math.max(0, skill));
    
    return squad.playerSkillAssessment;
  }

  private calculateReactionSpeed(actions: PlayerAction[]): number {
    if (actions.length < 2) return 0.5;
    
    let totalInterval = 0;
    for (let i = 1; i < actions.length; i++) {
      totalInterval += actions[i].timestamp - actions[i-1].timestamp;
    }
    const avgInterval = totalInterval / (actions.length - 1);
    
    // Faster reactions = higher skill (normalize to 0-1, assuming 500ms is fast, 2000ms is slow)
    return Math.max(0, Math.min(1, 1 - (avgInterval - 500) / 1500));
  }

  adaptDifficulty(squad: SquadState): void {
    const skill = squad.playerSkillAssessment;
    
    // Adjust difficulty multiplier based on player skill
    if (skill > 0.7) {
      this.difficultyMultiplier = 1.3; // Harder
    } else if (skill < 0.3) {
      this.difficultyMultiplier = 0.7; // Easier
    } else {
      this.difficultyMultiplier = 1.0;
    }

    // Adjust squad tactics based on skill
    if (skill > 0.6) {
      squad.currentTactic.type = 'flank'; // Use advanced tactics
    } else if (skill < 0.4) {
      squad.currentTactic.type = 'assault'; // Direct approach
    }
  }

  planSquadTactic(squad: SquadState, playerPosition: Vector3): SquadTactic {
    const aliveMembers = squad.members.filter(m => m.isAlive);
    
    if (aliveMembers.length === 0) {
      return { type: 'retreat', primaryTarget: playerPosition, flankingRoutes: [], suppressionTargets: [] };
    }

    if (aliveMembers.length <= 2) {
      return { type: 'retreat', primaryTarget: playerPosition, flankingRoutes: [], suppressionTargets: [] };
    }

    // Calculate flanking routes
    const flankingRoutes = this.calculateFlankingRoutes(squad.formationCenter, playerPosition, aliveMembers.length);
    
    // Determine tactic based on numbers and skill assessment
    let tacticType: SquadTactic['type'] = 'assault';
    
    if (aliveMembers.length >= 4 && squad.playerSkillAssessment < 0.6) {
      tacticType = 'surround';
    } else if (aliveMembers.length >= 3) {
      tacticType = 'flank';
    }

    squad.currentTactic = {
      type: tacticType,
      primaryTarget: playerPosition,
      flankingRoutes,
      suppressionTargets: [playerPosition]
    };

    return squad.currentTactic;
  }

  private calculateFlankingRoutes(from: Vector3, target: Vector3, numRoutes: number): Vector3[][] {
    const routes: Vector3[][] = [];
    const distance = Math.sqrt((target.x - from.x) ** 2 + (target.z - from.z) ** 2);
    const flankDistance = distance * 0.5;

    for (let i = 0; i < Math.min(numRoutes, 3); i++) {
      const angle = (i - 1) * (Math.PI / 3); // -60, 0, +60 degrees
      const midX = (from.x + target.x) / 2 + Math.cos(angle) * flankDistance;
      const midZ = (from.z + target.z) / 2 + Math.sin(angle) * flankDistance;
      
      routes.push([
        from,
        { x: midX, y: from.y, z: midZ },
        target
      ]);
    }

    return routes;
  }

  coordinateFlanking(squad: SquadState): Map<string, Vector3[]> {
    const assignments: Map<string, Vector3[]> = new Map();
    const flankers = squad.members.filter(m => m.role === 'flanker' && m.isAlive);
    const routes = squad.currentTactic.flankingRoutes;

    flankers.forEach((flanker, index) => {
      if (routes[index]) {
        assignments.set(flanker.id, routes[index]);
      }
    });

    return assignments;
  }

  callReinforcements(squad: SquadState, nearbySquadIds: string[]): string[] {
    if (squad.reinforcementsPending) return [];
    
    const aliveCount = squad.members.filter(m => m.isAlive).length;
    if (aliveCount > squad.members.length * 0.5) return []; // Don't need reinforcements

    squad.reinforcementsPending = true;
    
    // Return IDs of squads to call
    return nearbySquadIds.slice(0, 2);
  }

  avoidFriendlyFire(squad: SquadState, shooterPos: Vector3, targetPos: Vector3): boolean {
    const lineOfFire = this.getLineOfFire(shooterPos, targetPos);
    
    for (const member of squad.members) {
      if (!member.isAlive) continue;
      if (this.isInLineOfFire(member.position, lineOfFire, 2)) {
        return false; // Would hit friendly
      }
    }
    
    return true; // Safe to fire
  }

  private getLineOfFire(from: Vector3, to: Vector3): { start: Vector3; end: Vector3; direction: Vector3 } {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    return {
      start: from,
      end: to,
      direction: { x: dx / length, y: 0, z: dz / length }
    };
  }

  private isInLineOfFire(pos: Vector3, line: { start: Vector3; end: Vector3 }, tolerance: number): boolean {
    // Simple distance-to-line check
    const dx = line.end.x - line.start.x;
    const dz = line.end.z - line.start.z;
    const t = Math.max(0, Math.min(1, 
      ((pos.x - line.start.x) * dx + (pos.z - line.start.z) * dz) / (dx * dx + dz * dz)
    ));
    
    const closestX = line.start.x + t * dx;
    const closestZ = line.start.z + t * dz;
    const distance = Math.sqrt((pos.x - closestX) ** 2 + (pos.z - closestZ) ** 2);
    
    return distance < tolerance;
  }

  recordPlayerAction(action: PlayerAction): void {
    this.playerHistory.push(action);
    if (this.playerHistory.length > 50) {
      this.playerHistory.shift();
    }
  }

  predictPlayerBehavior(): PredictedBehavior {
    if (this.playerHistory.length < 5) {
      return { likelyAction: 'unknown', confidence: 0.2, suggestedCounter: 'hold' };
    }

    // Count action types
    const actionCounts: Map<string, number> = new Map();
    for (const action of this.playerHistory.slice(-20)) {
      actionCounts.set(action.type, (actionCounts.get(action.type) || 0) + 1);
    }

    // Find most common action
    let maxCount = 0;
    let likelyAction = 'unknown';
    for (const [action, count] of Array.from(actionCounts.entries())) {
      if (count > maxCount) {
        maxCount = count;
        likelyAction = action;
      }
    }

    const confidence = maxCount / Math.min(20, this.playerHistory.length);
    
    // Suggest counter
    const counters: Record<string, string> = {
      'stealth': 'spread_search',
      'aggressive': 'defensive_formation',
      'ranged': 'close_distance',
      'melee': 'maintain_distance',
      'flanking': 'watch_flanks'
    };

    return {
      likelyAction,
      confidence,
      suggestedCounter: counters[likelyAction] || 'hold'
    };
  }

  counterPlayerTactics(squad: SquadState): void {
    const prediction = this.predictPlayerBehavior();
    
    if (prediction.confidence < 0.4) return; // Not confident enough

    switch (prediction.suggestedCounter) {
      case 'spread_search':
        squad.currentTactic.type = 'surround';
        break;
      case 'defensive_formation':
        squad.currentTactic.type = 'hold';
        break;
      case 'close_distance':
        squad.currentTactic.type = 'assault';
        break;
      case 'maintain_distance':
        squad.currentTactic.type = 'flank';
        break;
      case 'watch_flanks':
        // Reassign roles to cover flanks
        const flankers = squad.members.filter(m => m.role === 'flanker');
        flankers.forEach(f => f.role = 'suppressor');
        break;
    }
  }

  updateMemberPosition(squadId: string, memberId: string, position: Vector3): void {
    const squad = this.squads.get(squadId);
    if (!squad) return;

    const member = squad.members.find(m => m.id === memberId);
    if (member) {
      member.position = position;
    }

    // Update formation center
    const aliveMembers = squad.members.filter(m => m.isAlive);
    if (aliveMembers.length > 0) {
      squad.formationCenter = {
        x: aliveMembers.reduce((sum, m) => sum + m.position.x, 0) / aliveMembers.length,
        y: aliveMembers.reduce((sum, m) => sum + m.position.y, 0) / aliveMembers.length,
        z: aliveMembers.reduce((sum, m) => sum + m.position.z, 0) / aliveMembers.length
      };
    }
  }

  reportCasualty(squadId: string, memberId: string): void {
    const squad = this.squads.get(squadId);
    if (!squad) return;

    const member = squad.members.find(m => m.id === memberId);
    if (member) {
      member.isAlive = false;
    }
  }

  disbandSquad(squadId: string): void {
    this.squads.delete(squadId);
  }

  getDifficultyMultiplier(): number {
    return this.difficultyMultiplier;
  }
}
