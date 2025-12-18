
export type GameState = 'START_SCREEN' | 'NAME_ENTRY' | 'PLAYING' | 'LANDED' | 'CRASHED' | 'LEVEL_WON' | 'GAME_OVER' | 'VICTORY' | 'HIGH_SCORES' | 'LEVEL_INTRO';

export interface Vector2 {
  x: number;
  y: number;
}

export interface GameObject {
  id: string;
  pos: Vector2;
  size: Vector2;
  color: string;
  type: 'PLATFORM' | 'OBSTACLE' | 'BIRD' | 'CHILD' | 'PROJECTILE' | 'COLLECTIBLE' | 'DOG';
  icon?: string;
  collected?: boolean;
}

export interface Bird extends GameObject {
  velocity: Vector2;
}

export interface Projectile extends GameObject {
  velocity: Vector2;
}

export interface Score {
  name: string;
  level: number;
  time: number;
  date: string;
}

export interface Player {
  name: string;
  lives: number;
  currentLevel: number;
  totalTime: number;
}
