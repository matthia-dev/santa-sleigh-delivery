
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Vector2, GameObject, Bird, Projectile } from '../types';
import { audio } from '../services/audio';

interface GameContainerProps {
  level: number;
  lives: number;
  playerName: string;
  onWin: (time: number) => void;
  onGameOver: () => void;
  onElfCaught: () => void;
  spawnElf: boolean;
  externalPaused?: boolean;
  t: any;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.08;
const THRUST = 0.25;
const MAX_VELOCITY = 6;
const SAFE_LANDING_VELOCITY = 1.7;
const TOTAL_PRESENTS = 10;

interface ElfTrailPoint {
  x: number;
  y: number;
  alpha: number;
  color: string;
}

const GameContainer: React.FC<GameContainerProps> = ({ 
  level, 
  lives: initialLives, 
  playerName, 
  onWin, 
  onGameOver, 
  onElfCaught, 
  spawnElf,
  externalPaused = false,
  t
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lives, setLives] = useState(initialLives);
  const [timerDisplay, setTimerDisplay] = useState(0);
  const [status, setStatus] = useState<'PLAYING' | 'LANDED' | 'CRASHED'>('PLAYING');
  const [collectedCount, setCollectedCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const sleighPos = useRef<Vector2>({ x: 50, y: 100 });
  const sleighVel = useRef<Vector2>({ x: 0, y: 0 });
  const keys = useRef<Record<string, boolean>>({});
  const gameTime = useRef(0);
  const obstacles = useRef<GameObject[]>([]);
  const birds = useRef<Bird[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const dogObstacles = useRef<GameObject[]>([]);
  const snowflakes = useRef<{x: number, y: number, s: number}[]>([]);
  const collectibles = useRef<GameObject[]>([]);
  const elf = useRef<{ pos: Vector2, vel: Vector2, active: boolean, caught: boolean, trail: ElfTrailPoint[] } | null>(null);
  const grinch = useRef<{ pos: Vector2, suctionActive: boolean } | null>(null);
  const santaAnim = useRef({ active: false, x: 0, progress: 0 });
  const frameId = useRef<number>(0);

  const initLevel = useCallback(() => {
    sleighPos.current = { x: 50, y: 100 };
    sleighVel.current = { x: 0, y: 0 };
    setStatus('PLAYING');
    setCollectedCount(0);
    setMessage(null);
    setIsPaused(false);
    gameTime.current = 0;
    santaAnim.current = { active: false, x: 0, progress: 0 };

    const objs: GameObject[] = [];
    const items: GameObject[] = [];

    let houseX = 600;
    let houseY = 440;
    let houseColor = '#8b4513';
    let houseWidth = 140;
    let houseHeight = 160;

    if (level === 2) {
      houseX = 580;
      houseColor = '#6d4c41'; 
      houseWidth = 180;
      houseHeight = 120;
    } else if (level === 3) {
      houseX = 550;
      houseColor = '#5d4037'; 
      houseWidth = 220;
      houseHeight = 160;
    } else if (level === 4) {
      houseX = 620;
      houseColor = '#4e342e'; 
      houseWidth = 160;
      houseHeight = 160;
      objs.push({
        id: 'grinch_mountain',
        type: 'OBSTACLE',
        pos: { x: 300, y: 350 },
        size: { x: 200, y: 250 },
        color: '#263238'
      });
      grinch.current = { pos: { x: 400, y: 340 }, suctionActive: true };
    }

    const platformWidth = houseWidth + 40;
    const platformX = houseX - 20;
    
    objs.push({ 
      id: 'platform', 
      type: 'PLATFORM', 
      pos: { x: platformX, y: houseY }, 
      size: { x: platformWidth, y: 14 }, 
      color: '#ffffff' 
    });
    
    objs.push({ id: 'house', type: 'OBSTACLE', pos: { x: houseX, y: houseY + 14 }, size: { x: houseWidth, y: houseHeight }, color: houseColor });
    objs.push({ id: 'chimney', type: 'OBSTACLE', pos: { x: houseX + houseWidth - 50, y: houseY - 20 }, size: { x: 30, y: 40 }, color: '#424242' });

    const treePositions = [
        { x: 200, y: 450, scale: 1 },
        { x: 400, y: 480, scale: 0.8 },
        { x: 30, y: 350, scale: 1.2 }
    ];

    treePositions.forEach((tp, idx) => {
        objs.push({
            id: `tree-${idx}`,
            type: 'OBSTACLE',
            pos: { x: tp.x, y: tp.y },
            size: { x: 60 * tp.scale, y: 150 * tp.scale },
            color: '#1b5e20'
        });
    });

    obstacles.current = objs;

    const icons = ['🎁', '📦', '🧧', '🎀'];
    for (let i = 0; i < TOTAL_PRESENTS; i++) {
       let valid = false;
       let x = 0, y = 0;
       let attempts = 0;
       while (!valid && attempts < 100) {
         attempts++;
         x = 50 + Math.random() * (CANVAS_WIDTH - 100);
         y = 50 + Math.random() * (CANVAS_HEIGHT - 250);
         
         const nearObstacle = objs.some(o => {
           return (x + 40 > o.pos.x - 50 && x < o.pos.x + o.size.x + 50 &&
                   y + 40 > o.pos.y - 50 && y < o.pos.y + o.size.y + 50);
         });

         const nearItem = items.some(it => {
           const dx = it.pos.x - x;
           const dy = it.pos.y - y;
           return Math.sqrt(dx*dx + dy*dy) < 120;
         });

         if (!nearObstacle && !nearItem) valid = true;
       }

       items.push({
         id: `item-${i}`,
         type: 'COLLECTIBLE',
         pos: { x, y },
         size: { x: 30, y: 30 },
         color: '#fff',
         icon: icons[i % icons.length],
         collected: false
       });
    }
    collectibles.current = items;

    if (spawnElf && level === 2) {
      elf.current = {
        pos: { x: Math.random() * CANVAS_WIDTH, y: 50 },
        vel: { x: 3, y: 2 },
        active: true,
        caught: false,
        trail: []
      };
      setMessage(t.elf_appeared);
      setTimeout(() => setMessage(null), 4000);
    } else {
      elf.current = null;
    }

    birds.current = [];
    if (level >= 2) {
      birds.current = [
        { id: 'bird1', type: 'BIRD', pos: { x: 400, y: 100 }, size: { x: 40, y: 25 }, color: '#000', velocity: { x: 2.5, y: 0 } },
        { id: 'bird2', type: 'BIRD', pos: { x: 200, y: 300 }, size: { x: 40, y: 25 }, color: '#000', velocity: { x: -3, y: 0 } }
      ];
    }
    
    projectiles.current = [];
    dogObstacles.current = [];
    snowflakes.current = Array.from({ length: 120 }).map(() => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      s: 0.5 + Math.random() * 2.5
    }));
  }, [level, spawnElf, t]);

  useEffect(() => {
    initLevel();
  }, [initLevel]);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      keys.current[e.key] = true;
      if (e.key.toLowerCase() === 'p') {
        setIsPaused(prev => !prev);
      }
    };
    const handleUp = (e: KeyboardEvent) => keys.current[e.key] = false;
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  const update = useCallback(() => {
    if (status !== 'PLAYING' || isPaused || externalPaused) return;

    gameTime.current += 1;
    setTimerDisplay(Math.floor(gameTime.current / 60));

    if (keys.current['ArrowUp'] || keys.current['w'] || keys.current['W']) {
      sleighVel.current.y -= THRUST;
      if (Math.random() > 0.6) audio.playThrust();
    }
    if (keys.current['ArrowDown'] || keys.current['s'] || keys.current['S']) sleighVel.current.y += THRUST;
    if (keys.current['ArrowLeft'] || keys.current['a'] || keys.current['A']) sleighVel.current.x -= THRUST;
    if (keys.current['ArrowRight'] || keys.current['d'] || keys.current['D']) sleighVel.current.x += THRUST;

    if (level === 4 && grinch.current) {
      const gPos = grinch.current.pos;
      const dx = gPos.x - sleighPos.current.x;
      const dy = gPos.y - sleighPos.current.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 450) {
        const strength = 0.09 * (1 - dist / 450);
        sleighVel.current.x += (dx / dist) * strength;
        sleighVel.current.y += (dy / dist) * strength;
      }
    }

    sleighVel.current.y += GRAVITY;
    sleighVel.current.x *= 0.985;
    sleighVel.current.y *= 0.985;

    sleighVel.current.x = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, sleighVel.current.x));
    sleighVel.current.y = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, sleighVel.current.y));

    sleighPos.current.x += sleighVel.current.x;
    sleighPos.current.y += sleighVel.current.y;

    if (sleighPos.current.x < -20 || sleighPos.current.x > CANVAS_WIDTH + 20 || 
        sleighPos.current.y < -20 || sleighPos.current.y > CANVAS_HEIGHT + 20) {
      handleCrash();
      return;
    }

    const rect = { x: sleighPos.current.x, y: sleighPos.current.y, w: 40, h: 30 };

    for (const obj of obstacles.current) {
      if (rect.x < obj.pos.x + obj.size.x && rect.x + rect.w > obj.pos.x &&
          rect.y < obj.pos.y + obj.size.y && rect.y + rect.h > obj.pos.y) {
        
        if (obj.type === 'PLATFORM') {
          if (collectedCount < TOTAL_PRESENTS) {
            handleCrash(t.presents_first);
            return;
          }
          const vSpeed = Math.abs(sleighVel.current.y);
          const hSpeed = Math.abs(sleighVel.current.x);
          if (vSpeed < SAFE_LANDING_VELOCITY && hSpeed < SAFE_LANDING_VELOCITY) {
            handleLanding(obj);
            return;
          } else {
            handleCrash();
            return;
          }
        } else {
          handleCrash();
          return;
        }
      }
    }

    collectibles.current.forEach(item => {
      if (!item.collected && 
          rect.x < item.pos.x + item.size.x && rect.x + rect.w > item.pos.x &&
          rect.y < item.pos.y + item.size.y && rect.y + rect.h > item.pos.y) {
        item.collected = true;
        audio.playPickup();
        setCollectedCount(prev => {
          const next = prev + 1;
          if (next === TOTAL_PRESENTS) {
            setMessage(t.can_land);
            setTimeout(() => setMessage(null), 3000);
          }
          return next;
        });
      }
    });

    if (elf.current && elf.current.active && !elf.current.caught) {
      const dx = elf.current.pos.x - sleighPos.current.x;
      const dy = elf.current.pos.y - sleighPos.current.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 220) {
        elf.current.vel.x += (dx / dist) * 0.45;
        elf.current.vel.y += (dy / dist) * 0.45;
      } else {
        elf.current.vel.x += (Math.random() - 0.5) * 0.25;
        elf.current.vel.y += (Math.random() - 0.5) * 0.25;
      }
      
      const maxElfSpeed = 5;
      elf.current.vel.x = Math.max(-maxElfSpeed, Math.min(maxElfSpeed, elf.current.vel.x));
      elf.current.vel.y = Math.max(-maxElfSpeed, Math.min(maxElfSpeed, elf.current.vel.y));

      elf.current.pos.x += elf.current.vel.x;
      elf.current.pos.y += elf.current.vel.y;
      elf.current.vel.x *= 0.99;
      elf.current.vel.y *= 0.99;

      if (elf.current.pos.x < 20 || elf.current.pos.x > CANVAS_WIDTH - 20) elf.current.vel.x *= -1;
      if (elf.current.pos.y < 20 || elf.current.pos.y > CANVAS_HEIGHT - 20) elf.current.vel.y *= -1;

      if (gameTime.current % 3 === 0) {
        elf.current.trail.push({
          x: elf.current.pos.x + 15,
          y: elf.current.pos.y + 15,
          alpha: 1.0,
          color: ['#ff00ff', '#00ffff', '#ffff00', '#00ff00'][Math.floor(Math.random()*4)]
        });
      }
      elf.current.trail.forEach(t => t.alpha -= 0.02);
      elf.current.trail = elf.current.trail.filter(t => t.alpha > 0);

      if (rect.x < elf.current.pos.x + 35 && rect.x + rect.w > elf.current.pos.x - 5 &&
          rect.y < elf.current.pos.y + 35 && rect.y + rect.h > elf.current.pos.y - 5) {
        elf.current.caught = true;
        elf.current.active = false;
        onElfCaught();
      }
    }

    birds.current.forEach(bird => {
      bird.pos.x += bird.velocity.x;
      if (bird.pos.x > CANVAS_WIDTH + 50) bird.pos.x = -bird.size.x - 50;
      if (bird.pos.x < -bird.size.x - 50) bird.pos.x = CANVAS_WIDTH + 50;
      if (rect.x < bird.pos.x + bird.size.x && rect.x + rect.w > bird.pos.x &&
          rect.y < bird.pos.y + bird.size.y && rect.y + rect.h > bird.pos.y) {
        handleCrash();
      }
    });

    if (level === 4 && gameTime.current > 600) {
      if (dogObstacles.current.length === 0) {
        dogObstacles.current.push({
          id: 'max_dog',
          type: 'DOG',
          pos: { x: 0, y: 100 },
          size: { x: 40, y: 30 },
          color: '#8b4513'
        });
      }
      dogObstacles.current.forEach(dog => {
        dog.pos.x += 4.5;
        dog.pos.y = 200 + Math.sin(gameTime.current / 20) * 160;
        if (dog.pos.x > CANVAS_WIDTH) dog.pos.x = -dog.size.x;
        if (rect.x < dog.pos.x + dog.size.x && rect.x + rect.w > dog.pos.x &&
            rect.y < dog.pos.y + dog.size.y && rect.y + rect.h > dog.pos.y) {
          handleCrash();
        }
      });
    }

    if ((level === 3 || level === 4) && gameTime.current % 90 === 0) {
      projectiles.current.push({
        id: `p-${Date.now()}`,
        type: 'PROJECTILE',
        pos: { x: 100 + Math.random() * 500, y: 580 },
        size: { x: 8, y: 8 },
        color: '#fff',
        velocity: { x: (sleighPos.current.x - 300) / 100, y: -6.5 }
      } as Projectile);
    }

    projectiles.current = projectiles.current.filter(p => {
      p.pos.x += p.velocity.x;
      p.pos.y += p.velocity.y;
      p.velocity.y += 0.07;
      if (rect.x < p.pos.x + p.size.x && rect.x + rect.w > p.pos.x &&
          rect.y < p.pos.y + p.size.y && rect.y + rect.h > p.pos.y) {
        handleCrash();
        return false;
      }
      return p.pos.y < CANVAS_HEIGHT && p.pos.y > 0;
    });

    snowflakes.current.forEach(s => {
      s.y += s.s;
      s.x += Math.sin(gameTime.current / 50) * 0.5;
      if (s.y > CANVAS_HEIGHT) s.y = 0;
      if (s.x > CANVAS_WIDTH) s.x = 0;
      if (s.x < 0) s.x = CANVAS_WIDTH;
    });

  }, [status, level, collectedCount, isPaused, externalPaused, onElfCaught, t]);

  const handleCrash = (customMessage?: string) => {
    setStatus('CRASHED');
    if (customMessage) setMessage(customMessage);
    audio.playCrash();
    setLives(prev => {
      if (prev <= 1) {
        setTimeout(onGameOver, 2000);
        return 0;
      }
      setTimeout(() => {
        initLevel();
      }, 2000);
      return prev - 1;
    });
  };

  const handleLanding = (platform: GameObject) => {
    setStatus('LANDED');
    sleighVel.current = { x: 0, y: 0 };
    sleighPos.current.y = platform.pos.y - 30;
    audio.playWin();
    audio.playChampionshipVoice();
    
    santaAnim.current = { active: true, x: sleighPos.current.x + 20, progress: 0 };
    const animId = setInterval(() => {
      santaAnim.current.progress += 0.02;
      santaAnim.current.x += 1.5;
      if (santaAnim.current.progress >= 1) {
        clearInterval(animId);
        onWin(gameTime.current);
      }
    }, 40);
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#020210');
    grad.addColorStop(1, '#0c0c2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = 'white';
    snowflakes.current.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.s/2, 0, Math.PI * 2);
      ctx.fill();
    });

    if (elf.current) {
      elf.current.trail.forEach(t => {
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      if (elf.current.active && !elf.current.caught) {
        const { x, y } = elf.current.pos;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ff00';
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(x + 5, y + 10, 20, 15);
        ctx.fillStyle = '#ffdbac';
        ctx.fillRect(x + 10, y + 5, 10, 10);
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 5);
        ctx.lineTo(x + 20, y + 5);
        ctx.lineTo(x + 15, y - 5);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    obstacles.current.forEach(obj => {
      if (obj.id === 'grinch_mountain') {
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.moveTo(obj.pos.x, obj.pos.y + obj.size.y);
        ctx.lineTo(obj.pos.x + obj.size.x / 2, obj.pos.y);
        ctx.lineTo(obj.pos.x + obj.size.x, obj.pos.y + obj.size.y);
        ctx.fill();
        if (grinch.current) {
          const gx = grinch.current.pos.x;
          const gy = grinch.current.pos.y;
          ctx.fillStyle = '#4caf50';
          ctx.fillRect(gx - 15, gy - 20, 30, 40);
          ctx.fillStyle = '#388e3c';
          ctx.fillRect(gx - 10, gy - 25, 20, 15);
          ctx.fillStyle = '#ffeb3b';
          ctx.fillRect(gx - 6, gy - 20, 3, 3);
          ctx.fillRect(gx + 3, gy - 20, 3, 3);
          ctx.fillStyle = '#c62828';
          ctx.beginPath();
          ctx.moveTo(gx - 10, gy - 25);
          ctx.lineTo(gx + 10, gy - 25);
          ctx.lineTo(gx, gy - 40);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#37474f';
          ctx.fillRect(gx + 15, gy - 5, 25, 15);
          ctx.fillStyle = '#b0bec5';
          ctx.fillRect(gx + 40, gy - 2, 5, 9);
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.moveTo(gx + 40, gy + 2);
          ctx.lineTo(sleighPos.current.x + 20, sleighPos.current.y + 15);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (obj.id === 'house') {
        ctx.fillStyle = obj.color;
        ctx.fillRect(obj.pos.x, obj.pos.y, obj.size.x, obj.size.y);
        ctx.fillStyle = '#fce570';
        ctx.fillRect(obj.pos.x + 25, obj.pos.y + 40, 20, 20);
        ctx.fillRect(obj.pos.x + obj.size.x - 45, obj.pos.y + 40, 20, 20);
        ctx.fillStyle = '#4a2511';
        ctx.fillRect(obj.pos.x + obj.size.x/2 - 10, obj.pos.y + obj.size.y - 35, 20, 35);
      } else if (obj.type === 'PLATFORM') {
        const isLocked = collectedCount < TOTAL_PRESENTS;
        ctx.strokeStyle = isLocked ? '#ff0000' : '#4caf50';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(obj.pos.x, obj.pos.y - 8);
        ctx.lineTo(obj.pos.x + obj.size.x, obj.pos.y - 8);
        ctx.stroke();
        ctx.fillStyle = isLocked ? '#b71c1c' : '#ffffff';
        ctx.fillRect(obj.pos.x, obj.pos.y, obj.size.x, obj.size.y);
      } else if (obj.type === 'OBSTACLE' && obj.id.startsWith('tree')) {
        const trunkX = obj.pos.x + obj.size.x/2;
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(trunkX - 6, obj.pos.y + obj.size.y - 30, 12, 30);
        ctx.fillStyle = obj.color;
        const segments = 4;
        for(let i=0; i<segments; i++) {
           const yOffset = i * 25;
           const width = obj.size.x - (i * 12);
           ctx.beginPath();
           ctx.moveTo(trunkX, obj.pos.y + yOffset);
           ctx.lineTo(trunkX - width/2, obj.pos.y + yOffset + 40);
           ctx.lineTo(trunkX + width/2, obj.pos.y + yOffset + 40);
           ctx.closePath();
           ctx.fill();
        }
      } else {
        ctx.fillStyle = obj.color;
        ctx.fillRect(obj.pos.x, obj.pos.y, obj.size.x, obj.size.y);
      }
    });

    collectibles.current.forEach(item => {
      if (!item.collected) {
        ctx.font = '28px Arial';
        ctx.fillText(item.icon || '🎁', item.pos.x, item.pos.y + 28);
      }
    });

    birds.current.forEach(bird => {
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.ellipse(bird.pos.x + bird.size.x/2, bird.pos.y + bird.size.y/2, bird.size.x/2, bird.size.y/4, 0, 0, Math.PI * 2);
      ctx.fill();
      const wingPos = Math.sin(gameTime.current / 8) * 12;
      ctx.strokeStyle = '#616161';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bird.pos.x + bird.size.x/2, bird.pos.y + bird.size.y/2);
      ctx.lineTo(bird.pos.x + bird.size.x/2 - 10, bird.pos.y + bird.size.y/2 - 5 - wingPos);
      ctx.moveTo(bird.pos.x + bird.size.x/2, bird.pos.y + bird.size.y/2);
      ctx.lineTo(bird.pos.x + bird.size.x/2 + 10, bird.pos.y + bird.size.y/2 - 5 - wingPos);
      ctx.stroke();
    });

    dogObstacles.current.forEach(dog => {
      ctx.font = '30px Arial';
      ctx.fillText('🐕', dog.pos.x, dog.pos.y + dog.size.y);
    });

    projectiles.current.forEach(p => {
       ctx.fillStyle = '#ffffff';
       ctx.beginPath();
       ctx.arc(p.pos.x, p.pos.y, 4, 0, Math.PI * 2);
       ctx.fill();
    });

    if (level >= 3) {
       ctx.fillStyle = '#ff9800';
       ctx.fillRect(300, 580, 15, 20);
       ctx.fillRect(450, 580, 15, 20);
    }

    if (santaAnim.current.active) {
       ctx.fillStyle = '#d32f2f';
       ctx.fillRect(santaAnim.current.x, sleighPos.current.y + 10, 14, 20);
       ctx.font = '10px "Press Start 2P"';
       ctx.fillStyle = 'white';
       ctx.fillText("OH OH OH", santaAnim.current.x - 20, sleighPos.current.y - 10);
    }

    if (status === 'CRASHED') {
      ctx.font = '16px "Press Start 2P"';
      ctx.fillStyle = '#ff1744';
      ctx.fillText(t.crash, sleighPos.current.x - 20, sleighPos.current.y);
    } else if (!santaAnim.current.active) {
      drawSleigh(ctx, sleighPos.current.x, sleighPos.current.y);
    }

    function drawSleigh(ctx: CanvasRenderingContext2D, x: number, y: number) {
      ctx.fillStyle = '#b71c1c';
      ctx.beginPath();
      ctx.roundRect(x, y + 12, 44, 18, 8);
      ctx.fill();
      ctx.fillStyle = '#8e0000';
      ctx.fillRect(x, y, 6, 15);
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(x + 6, y + 2, 12, 12);
      ctx.fillStyle = 'white';
      ctx.fillRect(x + 10, y + 2, 4, 4); 
      ctx.strokeStyle = '#fbc02d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 32);
      ctx.lineTo(x + 54, y + 32);
      ctx.stroke();
      if (keys.current['ArrowUp'] || keys.current['w'] || keys.current['W']) {
         ctx.fillStyle = '#ff9800';
         ctx.beginPath();
         ctx.moveTo(x + 8, y + 28);
         ctx.lineTo(x + 14, y + 42 + Math.random() * 12);
         ctx.lineTo(x + 20, y + 28);
         ctx.fill();
      }
    }

    if (message) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, CANVAS_HEIGHT / 2 - 40, CANVAS_WIDTH, 80);
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 5);
      ctx.textAlign = 'left';
    }

    if ((isPaused || externalPaused) && status === 'PLAYING' && !message) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.font = '24px "Press Start 2P"';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(t.paused, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = '12px "Press Start 2P"';
      ctx.fillText(t.resume_hint, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
      ctx.textAlign = 'left';
    }

  }, [status, level, collectedCount, message, isPaused, externalPaused, t]);

  useEffect(() => {
    const loop = () => {
      update();
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) draw(ctx);
      }
      frameId.current = requestAnimationFrame(loop);
    };
    frameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId.current);
  }, [update, draw]);

  return (
    <div className="flex flex-col items-center select-none">
      <div className="flex justify-between w-full max-w-[800px] mb-2 p-3 bg-red-800/60 border-4 border-white text-[10px] backdrop-blur-md font-mono font-bold tracking-tighter">
        <div>{t.pilot_label} <span className="text-yellow-400">{playerName}</span></div>
        <div>{t.lvl}: <span className="text-yellow-400">{level}</span></div>
        <div>{t.lives_label} <span className="text-red-400">{'♥'.repeat(lives)}</span></div>
        <div>{t.gifts_label} <span className={collectedCount === TOTAL_PRESENTS ? 'text-green-400' : 'text-yellow-200'}>{collectedCount}/{TOTAL_PRESENTS}</span></div>
        <div>{t.sec_label} <span className="text-yellow-400">{timerDisplay}</span></div>
      </div>
      <div className="relative">
        <canvas 
          ref={canvasRef} 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT} 
          className="border-8 border-white shadow-2xl bg-black"
        />
      </div>
      <div className="mt-4 text-[10px] text-gray-400 uppercase font-bold text-center leading-relaxed">
        {t.footer_controls}<br/>
        <span className="text-red-500">{t.footer_hint}</span>
      </div>
    </div>
  );
};

export default GameContainer;
