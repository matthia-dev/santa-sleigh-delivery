
import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameContainer from './components/GameContainer';
import { GameState, Score, Player } from './types';
import { audio } from './services/audio';
import { translations, Language } from './services/translations';

const STORAGE_KEY = 'santa_sleigh_scores_v3';
const GAME_COUNT_KEY = 'santa_sleigh_game_count';

const SnowBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snowflakes = useRef<{ x: number; y: number; s: number; o: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    snowflakes.current = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() < 0.6 ? 1 + Math.random() : (Math.random() < 0.8 ? 2 + Math.random() * 2 : 4 + Math.random() * 2),
      o: 0.3 + Math.random() * 0.7
    }));

    let animationFrame: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      
      snowflakes.current.forEach(flake => {
        ctx.globalAlpha = flake.o;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.s / 2, 0, Math.PI * 2);
        ctx.fill();
        
        flake.y += flake.s * 0.5;
        flake.x += Math.sin(flake.y / 50) * 0.5;

        if (flake.y > canvas.height) {
          flake.y = -10;
          flake.x = Math.random() * canvas.width;
        }
      });
      
      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('START_SCREEN');
  const [lang, setLang] = useState<Language>('en');
  const [playerName, setPlayerName] = useState('');
  const [scores, setScores] = useState<Score[]>([]);
  const [playerInfo, setPlayerInfo] = useState<Player>({
    name: '',
    lives: 3,
    currentLevel: 1,
    totalTime: 0
  });
  const [elfCaughtMessage, setElfCaughtMessage] = useState<boolean>(false);
  const [grinchIntro, setGrinchIntro] = useState<boolean>(false);
  const [leaderboardFilter, setLeaderboardFilter] = useState<number>(1);

  const t = translations[lang];

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setScores(JSON.parse(saved));
    }
    audio.playTitleMusic();
  }, []);

  useEffect(() => {
    if (gameState === 'VICTORY' || gameState === 'GAME_OVER') {
      audio.playRankingMusic();
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (elfCaughtMessage) {
          setElfCaughtMessage(false);
        } else if (grinchIntro) {
          setGrinchIntro(false);
        } else if (gameState === 'LEVEL_WON') {
          handleNextLevel();
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [elfCaughtMessage, grinchIntro, gameState]);

  const saveScore = (level: number, time: number) => {
    const newScore: Score = {
      name: playerInfo.name || 'SANTA',
      level,
      time: Math.max(0, Math.floor(time / 60)),
      date: new Date().toLocaleDateString()
    };
    const updated = [...scores, newScore].sort((a, b) => a.time - b.time).slice(0, 100);
    setScores(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleStart = () => {
    const trimmedName = playerName.trim().toUpperCase();
    if (trimmedName) {
      let finalName = trimmedName;
      const existingNames = scores.map(s => s.name);
      
      if (existingNames.includes(finalName)) {
        let counter = 1;
        while (existingNames.includes(`${trimmedName}_${counter}`)) {
          counter++;
        }
        finalName = `${trimmedName}_${counter}`;
      }

      const count = parseInt(localStorage.getItem(GAME_COUNT_KEY) || '0', 10) + 1;
      localStorage.setItem(GAME_COUNT_KEY, count.toString());

      setPlayerInfo({
        name: finalName,
        lives: 3,
        currentLevel: 1,
        totalTime: 0
      });
      setGameState('PLAYING');
      audio.stopMusic();
    } else {
      setGameState('NAME_ENTRY');
    }
  };

  const handleLevelWin = (time: number) => {
    saveScore(playerInfo.currentLevel, time);
    if (playerInfo.currentLevel < 4) {
      setGameState('LEVEL_WON');
      audio.playJingleBells();
    } else {
      setGameState('VICTORY');
    }
  };

  const handleNextLevel = () => {
    const nextLevel = playerInfo.currentLevel + 1;
    setPlayerInfo(prev => ({
      ...prev,
      currentLevel: nextLevel
    }));
    audio.stopMusic();
    if (nextLevel === 4) {
      setGrinchIntro(true);
    }
    setGameState('PLAYING');
  };

  const handleGameOver = () => {
    setGameState('GAME_OVER');
  };

  const resetGame = () => {
    setPlayerName('');
    setPlayerInfo({
      name: '',
      lives: 3,
      currentLevel: 1,
      totalTime: 0
    });
    setGameState('START_SCREEN');
    audio.playTitleMusic();
  };

  const onElfCaught = () => {
    setPlayerInfo(prev => ({ ...prev, lives: prev.lives + 1 }));
    setElfCaughtMessage(true);
  };

  const filteredScores = scores
    .filter(s => s.level === leaderboardFilter)
    .sort((a, b) => a.time - b.time)
    .slice(0, 10);

  const GrinchFace = () => (
    <div className="inline-grid grid-cols-8 gap-1 w-24 h-24 mx-auto mb-4">
      {[
        0,0,1,1,1,1,0,0,
        0,1,1,1,1,1,1,0,
        1,1,1,1,1,1,1,1,
        1,0,1,1,1,1,0,1,
        1,1,1,1,1,1,1,1,
        0,1,0,0,0,0,1,0,
        0,0,1,1,1,1,0,0,
        0,0,0,1,1,0,0,0
      ].map((p, i) => (
        <div key={i} className={`w-full h-full ${p ? 'bg-green-500 shadow-[0_0_2px_#00ff00]' : 'bg-transparent'}`} />
      ))}
    </div>
  );

  return (
    <div className="w-screen h-screen flex items-center justify-center text-white overflow-hidden relative font-mono bg-[#0c0c1e]">
      {(gameState === 'START_SCREEN' || gameState === 'NAME_ENTRY') && <SnowBackground />}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,_#222244_0%,_#0c0c1e_100%)]"></div>
      
      {gameState === 'START_SCREEN' && (
        <>
          <div className="z-10 text-center px-4">
            <h1 className="text-4xl md:text-6xl mb-4 text-red-500 [text-shadow:4px_4px_#ffffff] animate-bounce">{t.title}</h1>
            <h2 className="text-2xl mb-12 text-blue-300 font-bold">{t.subtitle}</h2>
            <button 
              onClick={() => {
                audio.playTitleMusic();
                setGameState('NAME_ENTRY');
              }}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 border-4 border-white text-xl transition-all shadow-lg active:scale-95"
            >
              {t.start}
            </button>
            <div className="mt-8 text-sm text-gray-400" dangerouslySetInnerHTML={{ __html: t.controls_hint }}></div>
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 tracking-widest uppercase">
              {t.made_by} <span className="text-red-500 text-base font-normal"> 
                            <a 
                              href="https://x.com/Matthia570939" 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-inherit font-inherit hover:underline"
                            >
                              Matthia
                            </a>
                          </span> - Dec 2025 - v1.0
            </div>
          </div>
          <div className="absolute bottom-20 right-10 flex gap-4 z-20 bg-black/40 p-2 rounded-lg border border-white/20 backdrop-blur-sm">
            <button 
              onClick={() => setLang('en')} 
              className={`text-3xl hover:scale-125 transition-transform ${lang === 'en' ? 'brightness-110 grayscale-0 border-b-4 border-white' : 'opacity-40 grayscale'}`}
              title="English"
            >
              🇺🇸
            </button>
            <button 
              onClick={() => setLang('it')} 
              className={`text-3xl hover:scale-125 transition-transform ${lang === 'it' ? 'brightness-110 grayscale-0 border-b-4 border-white' : 'opacity-40 grayscale'}`}
              title="Italiano"
            >
              🇮🇹
            </button>
          </div>
        </>
      )}

      {gameState === 'NAME_ENTRY' && (
        <div className="z-10 text-center">
          <h2 className="text-2xl mb-8">{t.pilot_name}</h2>
          <input 
            type="text" 
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
            maxLength={10}
            className="bg-black border-4 border-white text-3xl p-4 mb-8 text-center w-64 text-yellow-400 outline-none focus:border-red-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          />
          <br/>
          <button 
            onClick={handleStart}
            className="px-8 py-4 bg-red-600 hover:bg-red-500 border-4 border-white text-xl active:scale-95"
          >
            {t.confirm}
          </button>
        </div>
      )}

      {gameState === 'PLAYING' && (
        <GameContainer 
          level={playerInfo.currentLevel} 
          lives={playerInfo.lives}
          playerName={playerInfo.name}
          onWin={handleLevelWin}
          onGameOver={handleGameOver}
          onElfCaught={onElfCaught}
          spawnElf={true}
          externalPaused={elfCaughtMessage || grinchIntro}
          t={t}
        />
      )}

      {gameState === 'LEVEL_WON' && (
        <div className="z-20 text-center bg-black/95 p-12 border-8 border-yellow-500 shadow-2xl">
          <h2 className="text-4xl text-yellow-400 mb-6">{t.well_done}</h2>
          <p className="text-xl mb-8 uppercase">{t.gifts_delivered}</p>
          <button 
            onClick={handleNextLevel}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 border-4 border-white text-xl animate-pulse"
          >
            {t.next_level}
          </button>
        </div>
      )}

      {(gameState === 'GAME_OVER' || gameState === 'VICTORY') && (
        <div className="z-20 text-center bg-black/95 p-12 border-8 border-red-500 shadow-2xl max-w-lg w-full">
          <h2 className={`text-4xl mb-6 ${gameState === 'VICTORY' ? 'text-green-400' : 'text-red-600'}`}>
            {gameState === 'VICTORY' ? t.merry_christmas : t.game_over}
          </h2>
          {gameState === 'VICTORY' && <p className="mb-4 text-yellow-300">{t.all_missions}</p>}
          <div className="mb-8">
            <h3 className="text-xl mb-4 underline text-blue-300">{t.hall_of_fame}</h3>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setLeaderboardFilter(lvl)}
                  className={`px-3 py-2 border-2 text-[10px] transition-colors ${leaderboardFilter === lvl ? 'bg-yellow-500 border-white text-black' : 'bg-transparent border-gray-600 text-gray-400'}`}
                >
                  {t.lvl} {lvl}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto max-h-48">
              <div className="space-y-2">
                {filteredScores.length > 0 ? filteredScores.map((s, i) => (
                  <div key={i} className="flex justify-between w-full px-4 text-[10px] border-b border-gray-800 pb-1">
                    <span>{i + 1}. {s.name}</span>
                    <span className="text-yellow-500">{s.time} {t.secs}</span>
                  </div>
                )) : <div className="text-gray-600 text-xs py-4 italic text-center">{t.no_records} {leaderboardFilter}</div>}
              </div>
            </div>
          </div>
          <button 
            onClick={resetGame}
            className="px-8 py-4 bg-red-600 hover:bg-red-500 border-4 border-white text-xl shadow-lg active:scale-95"
          >
            {t.main_menu}
          </button>
        </div>
      )}

      {elfCaughtMessage && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-blue-900 border-8 border-yellow-500 p-8 max-w-lg text-center shadow-[0_0_50px_rgba(234,179,8,0.5)]">
            <h3 className="text-2xl text-yellow-400 mb-6 font-bold">{t.elf_caught}</h3>
            <p className="mb-6 text-sm leading-relaxed">{t.elf_msg}</p>
            <p className="mb-8 text-xs text-blue-200">{t.lara_msg}</p>
            <div className="text-[10px] text-white/50 animate-pulse mb-4">{t.press_space_resume}</div>
            <button 
              onClick={() => setElfCaughtMessage(false)}
              className="px-12 py-4 bg-green-600 border-4 border-white text-xl hover:bg-green-500 transition-colors active:scale-95"
            >
              {t.resume}
            </button>
          </div>
        </div>
      )}

      {grinchIntro && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
          <div className="bg-red-900 border-8 border-green-500 p-10 max-w-lg text-center shadow-[0_0_100px_rgba(34,197,94,0.3)]">
            <GrinchFace />
            <h3 className="text-3xl text-green-400 mb-6 font-bold">{t.warning}</h3>
            <p className="mb-8 text-sm leading-loose">{t.grinch_msg}</p>
            <div className="text-[10px] text-white/50 animate-pulse mb-4 uppercase">{t.grinch_hint}</div>
            <button 
              onClick={() => setGrinchIntro(false)}
              className="px-12 py-4 bg-green-600 border-4 border-white text-xl hover:bg-green-500 active:scale-95"
            >
              {t.ready}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
