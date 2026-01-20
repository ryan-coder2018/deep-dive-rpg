
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  GameState, 
  ActiveFish, 
  RarityKey, 
  Biome, 
  ShopItem, 
  FishData, 
  UserStats,
  Challenge,
  SocialInteraction
} from './types';
import { 
  BIOMES, 
  RARITIES, 
  SHOP_ITEMS, 
  GENERATED_FISH_DATA, 
  BASE_FISH_SPEED, 
  GLOBAL_FISH_RADIUS, 
  BASE_XP_VALUE, 
  BASE_PLAYER_SPEED 
} from './constants';

declare const jsQR: any;

const createNewChallenge = (type: Challenge['targetType'], tier: number): Challenge => {
  const id = `ch_${type}_${tier}_${Math.random().toString(36).substr(2, 5)}`;
  let title = "";
  let desc = "";
  let targetValue = 0;
  let rewardCoins = 0;

  switch (type) {
    case 'catch_total':
      title = `Master Fisher ${tier}`;
      targetValue = tier * 50;
      desc = `Catch ${targetValue} fish total.`;
      rewardCoins = tier * 5000;
      break;
    case 'rank':
      title = `Deeper Diver ${tier}`;
      targetValue = tier * 10;
      desc = `Reach Rank ${targetValue}.`;
      rewardCoins = tier * 10000;
      break;
    case 'coins_total':
      title = `Wealthy Explorer ${tier}`;
      targetValue = tier * 250000;
      desc = `Accumulate $${targetValue.toLocaleString()} credits.`;
      rewardCoins = tier * 50000;
      break;
    case 'registry_total':
      title = `Ocean Historian ${tier}`;
      targetValue = tier * 20;
      desc = `Register ${targetValue} unique species.`;
      rewardCoins = tier * 15000;
      break;
  }

  return { id, tier, title, desc, targetType: type, targetValue, rewardCoins };
};

const INITIAL_CHALLENGES: Challenge[] = [
  createNewChallenge('catch_total', 1),
  createNewChallenge('rank', 1),
  createNewChallenge('coins_total', 1),
  createNewChallenge('registry_total', 1),
];

const SIMULATED_TAKEN_NAMES = ["NAUTILUS", "NEKTON", "ALVIN", "TRITON", "SHINKAI", "DEEPSEA", "PATHFINDER", "ORCA", "LEVIATHAN", "VOYAGER"];

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef({ x: 100, y: 300, r: 18, speed: BASE_PLAYER_SPEED });
  const fishRef = useRef<ActiveFish[]>([]);
  const inputRef = useRef<{ [key: string]: boolean }>({});
  const lastTimeRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);
  const catchAnimsRef = useRef<{ id: number; x: number; y: number; text: string; color: string; life: number }[]>([]);

  // Friends Scanner Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerCanvasRef = useRef<HTMLCanvasElement>(null);

  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('deep_dive_save');
    const defaultState = {
      lvl: 1,
      xp: 0,
      coins: 500,
      stats: {},
      biome: BIOMES[0],
      activeBuffs: {},
      activeChallenges: INITIAL_CHALLENGES,
      completedChallengeIds: [],
      claimedChallengeIds: [],
      challengeCooldowns: {},
      submarineName: "",
      friends: []
    };
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
  });

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedFish, setSelectedFish] = useState<FishData | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(!gameState.submarineName);
  const [tempName, setTempName] = useState("");
  const [nameError, setNameError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);

  // Interaction State
  const [interaction, setInteraction] = useState<SocialInteraction | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [tradeSelectedFishId, setTradeSelectedFishId] = useState<number | null>(null);
  
  // Mini-game specific refs for Battle and Maze
  const battleStateRef = useRef<{ 
    userClones: {x: number, y: number, r: number}[], 
    friendClones: {x: number, y: number, r: number}[] 
  } | null>(null);
  const mazeStateRef = useRef<{
    maze: number[][],
    userPos: {x: number, y: number},
    friendPos: {x: number, y: number},
    end: {x: number, y: number}
  } | null>(null);

  // Save game helper
  useEffect(() => {
    localStorage.setItem('deep_dive_save', JSON.stringify(gameState));
  }, [gameState]);

  const setInput = useCallback((key: string, value: boolean) => {
    inputRef.current[key] = value;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') setInput('up', true);
      if (e.key === 'ArrowDown') setInput('down', true);
      if (e.key === 'ArrowLeft') setInput('left', true);
      if (e.key === 'ArrowRight') setInput('right', true);
      if (e.key === 'Escape') {
        if (scannerActive) stopScanner();
        else if (interaction) setInteraction(null);
        else if (activeMenu) setActiveMenu(null);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') setInput('up', false);
      if (e.key === 'ArrowDown') setInput('down', false);
      if (e.key === 'ArrowLeft') setInput('left', false);
      if (e.key === 'ArrowRight') setInput('right', false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setInput, scannerActive, activeMenu, interaction]);

  const totalCatches = useMemo(() => 
    Object.values(gameState.stats).reduce((acc, curr) => acc + curr.count, 0)
  , [gameState.stats]);

  const registryCount = useMemo(() => Object.keys(gameState.stats).length, [gameState.stats]);

  // Social Interaction Logic
  const initiateInteraction = (type: SocialInteraction['type'], friend: string) => {
    setInteraction({ type, targetFriend: friend, status: 'requesting' });
    
    // Simulate friend response
    setTimeout(() => {
      const response = Math.random() > 0.2 ? 'accepted' : 'declined';
      setInteraction(prev => prev ? { ...prev, status: response } : null);
      
      if (response === 'accepted') {
        if (type === 'battle') startBattleMiniGame();
        if (type === 'maze') startMazeMiniGame();
      }
    }, 1500);
  };

  const startBattleMiniGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const clones = 25;
    const userClones = Array.from({ length: clones }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 10
    }));
    const friendClones = Array.from({ length: clones }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 10
    }));
    battleStateRef.current = { userClones, friendClones };
    setInteraction(prev => prev ? { ...prev, status: 'in_progress' } : null);
  };

  const startMazeMiniGame = () => {
    const maze = [
      [1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1,0,0,1],
      [1,0,1,1,1,0,1,0,1,1],
      [1,0,1,0,0,0,0,0,0,1],
      [1,0,1,0,1,1,1,1,0,1],
      [1,0,0,0,1,0,0,0,0,1],
      [1,1,1,0,1,0,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,1,0,1],
      [1,1,1,1,1,1,1,1,1,1]
    ];
    mazeStateRef.current = {
      maze,
      userPos: { x: 1, y: 1 },
      friendPos: { x: 1, y: 1 },
      end: { x: 8, y: 7 }
    };
    setInteraction(prev => prev ? { ...prev, status: 'in_progress' } : null);
  };

  const finishTrade = () => {
    if (tradeSelectedFishId !== null) {
      setGameState(prev => {
        const newStats = { ...prev.stats };
        delete newStats[tradeSelectedFishId];
        return { ...prev, stats: newStats };
      });
      setInteraction(prev => prev ? { ...prev, status: 'completed' } : null);
      setTradeSelectedFishId(null);
      setTimeout(() => setInteraction(null), 2000);
    }
  };

  const update = useCallback((dt: number, currentGameState: GameState) => {
    if (showOnboarding) return;

    // Handle Mini-games separately in update
    if (interaction?.status === 'in_progress') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (interaction.type === 'battle' && battleStateRef.current) {
        const { userClones, friendClones } = battleStateRef.current;
        
        // Move player sub normally
        let dx = 0, dy = 0;
        if (inputRef.current['up'] || inputRef.current['nw'] || inputRef.current['ne']) dy -= 1;
        if (inputRef.current['down'] || inputRef.current['sw'] || inputRef.current['se']) dy += 1;
        if (inputRef.current['left'] || inputRef.current['nw'] || inputRef.current['sw']) dx -= 1;
        if (inputRef.current['right'] || inputRef.current['ne'] || inputRef.current['se']) dx += 1;
        if (dx !== 0 || dy !== 0) {
          const mag = Math.hypot(dx, dy);
          playerRef.current.x += (dx / mag) * playerRef.current.speed;
          playerRef.current.y += (dy / mag) * playerRef.current.speed;
        }

        // Catch friend clones
        for(let i = friendClones.length - 1; i >= 0; i--) {
          const c = friendClones[i];
          const dist = Math.hypot(playerRef.current.x - c.x, playerRef.current.y - c.y);
          if (dist < playerRef.current.r + c.r) {
            friendClones.splice(i, 1);
          }
          // Simple drift
          c.x += Math.sin(Date.now() / 1000 + i) * 1;
          c.y += Math.cos(Date.now() / 1000 + i) * 1;
        }

        // Simulate Friend catching user clones
        const friendVirtX = (Math.sin(Date.now() / 500) * 0.4 + 0.5) * canvas.width;
        const friendVirtY = (Math.cos(Date.now() / 500) * 0.4 + 0.5) * canvas.height;
        for(let i = userClones.length - 1; i >= 0; i--) {
          const c = userClones[i];
          const dist = Math.hypot(friendVirtX - c.x, friendVirtY - c.y);
          if (dist < 30) {
            userClones.splice(i, 1);
          }
          c.x += Math.cos(Date.now() / 800 + i) * 1.5;
          c.y += Math.sin(Date.now() / 800 + i) * 1.5;
        }

        if (friendClones.length === 0 || userClones.length === 0) {
          setInteraction(prev => prev ? { ...prev, status: 'completed' } : null);
          setTimeout(() => setInteraction(null), 3000);
        }
      }

      if (interaction.type === 'maze' && mazeStateRef.current) {
        const { maze, userPos, friendPos, end } = mazeStateRef.current;
        // Move user on grid
        let mDx = 0, mDy = 0;
        if (inputRef.current['up']) mDy = -0.05;
        if (inputRef.current['down']) mDy = 0.05;
        if (inputRef.current['left']) mDx = -0.05;
        if (inputRef.current['right']) mDx = 0.05;

        const nextX = userPos.x + mDx;
        const nextY = userPos.y + mDy;
        if (maze[Math.floor(nextY)][Math.floor(nextX)] === 0) {
          userPos.x = nextX;
          userPos.y = nextY;
        }

        // Simulate Friend moving towards end
        friendPos.x += (end.x - friendPos.x) * 0.005;
        friendPos.y += (end.y - friendPos.y) * 0.005;

        if (Math.hypot(userPos.x - end.x, userPos.y - end.y) < 0.2 && Math.hypot(friendPos.x - end.x, friendPos.y - end.y) < 0.2) {
          setGameState(prev => ({ ...prev, lvl: prev.lvl + 1, xp: 0 }));
          setInteraction(prev => prev ? { ...prev, status: 'completed' } : null);
          setTimeout(() => setInteraction(null), 3000);
        }
      }
      return;
    }

    if (activeMenu) return;

    const { activeBuffs, biome, challengeCooldowns } = currentGameState;

    const pSpeedMult = activeBuffs['speed_pot'] ? 3 : 1;
    const fSpeedMult = activeBuffs['slow_pot'] ? 0.33 : 1;
    playerRef.current.speed = BASE_PLAYER_SPEED * pSpeedMult;

    let dx = 0, dy = 0;
    if (inputRef.current['up'] || inputRef.current['nw'] || inputRef.current['ne']) dy -= 1;
    if (inputRef.current['down'] || inputRef.current['sw'] || inputRef.current['se']) dy += 1;
    if (inputRef.current['left'] || inputRef.current['nw'] || inputRef.current['sw']) dx -= 1;
    if (inputRef.current['right'] || inputRef.current['ne'] || inputRef.current['se']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const mag = Math.hypot(dx, dy);
      playerRef.current.x += (dx / mag) * playerRef.current.speed;
      playerRef.current.y += (dy / mag) * playerRef.current.speed;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      playerRef.current.x = Math.max(30, Math.min(canvas.width - 30, playerRef.current.x));
      playerRef.current.y = Math.max(30, Math.min(canvas.height - 30, playerRef.current.y));
    }

    if (Math.random() < 0.14) {
      const availableFish = GENERATED_FISH_DATA.filter(f => f.habitats.includes(biome.id));
      if (availableFish.length > 0) {
        const fish = availableFish[Math.floor(Math.random() * availableFish.length)];
        const rInfo = RARITIES[fish.rarity];
        let spawnChance = 1 / rInfo.weight;
        if (activeBuffs['rare_pot'] && rInfo.weight > 3) spawnChance *= 10;
        if (Math.random() < spawnChance) {
          fishRef.current.push({
            x: (canvas?.width || 800) + 100, y: 50 + Math.random() * ((canvas?.height || 600) - 100),
            r: GLOBAL_FISH_RADIUS, data: fish, osc: Math.random() * 100,
            speed: BASE_FISH_SPEED * fSpeedMult
          });
        }
      }
    }

    let gainedXP = 0;
    let gainedCoins = 0;
    const caughtFishIds: number[] = [];
    for (let i = fishRef.current.length - 1; i >= 0; i--) {
      const f = fishRef.current[i];
      f.x -= f.speed; f.y += Math.sin(f.x / 60 + f.osc) * 1.5;
      const dist = Math.hypot(playerRef.current.x - f.x, playerRef.current.y - f.y);
      const catchRadius = activeBuffs['magnet'] ? 120 : playerRef.current.r + f.r;
      if (dist < catchRadius) {
        const xpVal = activeBuffs['power_pot'] ? 20 : BASE_XP_VALUE;
        const rInfo = RARITIES[f.data.rarity];
        gainedXP += xpVal; gainedCoins += (rInfo.weight * 15) * rInfo.multiplier;
        caughtFishIds.push(f.data.id);
        catchAnimsRef.current.push({ id: Math.random(), x: f.x, y: f.y, text: `+${xpVal} XP`, color: rInfo.color, life: 1.0 });
        fishRef.current.splice(i, 1);
      } else if (f.x < -150) { fishRef.current.splice(i, 1); }
    }

    const updatedBuffs = { ...activeBuffs };
    let timersChanged = false;
    Object.keys(updatedBuffs).forEach(id => {
      updatedBuffs[id] -= dt;
      if (updatedBuffs[id] <= 0) { delete updatedBuffs[id]; timersChanged = true; }
    });

    const updatedCooldowns = { ...challengeCooldowns };
    let cooldownsExpired: string[] = [];
    Object.keys(updatedCooldowns).forEach(id => {
      updatedCooldowns[id] -= dt;
      if (updatedCooldowns[id] <= 0) {
        delete updatedCooldowns[id];
        cooldownsExpired.push(id);
        timersChanged = true;
      }
    });

    catchAnimsRef.current.forEach(a => { a.life -= dt * 1.5; a.y -= 1.2; });
    catchAnimsRef.current = catchAnimsRef.current.filter(a => a.life > 0);

    if (gainedXP > 0 || gainedCoins > 0 || caughtFishIds.length > 0 || timersChanged || Math.random() < 0.05) {
      setGameState(prev => {
        const nextStats = { ...prev.stats };
        caughtFishIds.forEach(id => {
          if (!nextStats[id]) nextStats[id] = { count: 0 };
          nextStats[id].count++;
        });
        let newXP = prev.xp + gainedXP;
        let newLvl = prev.lvl;
        while (newXP >= 100) { newXP -= 100; newLvl++; }
        return {
          ...prev,
          coins: prev.coins + gainedCoins,
          xp: newXP, lvl: newLvl, stats: nextStats,
          activeBuffs: updatedBuffs,
          challengeCooldowns: updatedCooldowns,
          claimedChallengeIds: prev.claimedChallengeIds.filter(id => !cooldownsExpired.includes(id)),
          completedChallengeIds: prev.completedChallengeIds.filter(id => !cooldownsExpired.includes(id)),
        };
      });
    }
  }, [activeMenu, showOnboarding, interaction, inputRef]);

  const draw = useCallback((currentGameState: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { biome, activeBuffs } = currentGameState;

    // Handle Mini-game rendering
    if (interaction?.status === 'in_progress') {
      ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (interaction.type === 'battle' && battleStateRef.current) {
        const { userClones, friendClones } = battleStateRef.current;
        // Draw User Clones
        ctx.fillStyle = '#22d3ee';
        userClones.forEach(c => { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill(); });
        // Draw Friend Clones
        ctx.fillStyle = '#f43f5e';
        friendClones.forEach(c => { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill(); });
        // Draw User Main Sub
        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(playerRef.current.x, playerRef.current.y, playerRef.current.r, 0, Math.PI*2); ctx.fill();
        // UI overlay
        ctx.fillStyle = 'white'; ctx.font = 'bold 20px system-ui';
        ctx.fillText(`FRIEND CLONES: ${friendClones.length}`, 20, 40);
        ctx.fillText(`YOUR CLONES: ${userClones.length}`, 20, 70);
      }

      if (interaction.type === 'maze' && mazeStateRef.current) {
        const { maze, userPos, friendPos, end } = mazeStateRef.current;
        const cellSize = Math.min(canvas.width, canvas.height) / 10;
        maze.forEach((row, y) => {
          row.forEach((cell, x) => {
            ctx.fillStyle = cell === 1 ? '#1e293b' : '#020617';
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          });
        });
        // End
        ctx.fillStyle = '#4ade80'; ctx.fillRect(end.x * cellSize, end.y * cellSize, cellSize, cellSize);
        // User
        ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(userPos.x * cellSize + cellSize/2, userPos.y * cellSize + cellSize/2, cellSize/4, 0, Math.PI*2); ctx.fill();
        // Friend
        ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(friendPos.x * cellSize + cellSize/2, friendPos.y * cellSize + cellSize/2, cellSize/4, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = 'white'; ctx.font = 'bold 20px system-ui';
        ctx.fillText("REACH THE GREEN AREA TOGETHER", 20, 40);
      }
      return;
    }

    ctx.fillStyle = biome.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = biome.particle; ctx.globalAlpha = 0.15;
    const time = Date.now() / 2000;
    for (let i = 0; i < 20; i++) {
      const px = (Math.sin(i + time) * 100 + i * canvas.width / 10) % canvas.width;
      const py = (Math.cos(i + time) * 50 + i * canvas.height / 10) % canvas.height;
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (activeBuffs['magnet']) {
      ctx.strokeStyle = "rgba(74, 222, 128, 0.3)"; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(playerRef.current.x, playerRef.current.y, 120, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }

    ctx.save();
    ctx.translate(playerRef.current.x, playerRef.current.y);
    const r = playerRef.current.r; ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.roundRect(-r * 1.5, -r, r * 3, r * 2, r); ctx.fill();
    ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(r * 0.8, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#334155"; ctx.fillRect(-r * 1.7, -5, 2, 10);
    
    if (gameState.submarineName) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 8px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(gameState.submarineName.toUpperCase(), 0, -r - 5);
    }
    ctx.restore();

    fishRef.current.forEach(f => {
      ctx.save(); ctx.translate(f.x, f.y); ctx.fillStyle = f.data.color;
      ctx.beginPath(); ctx.ellipse(0, 0, f.r * 1.4, f.r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(f.r * 0.8, 0); ctx.lineTo(f.r * 1.8, -f.r * 0.8); ctx.lineTo(f.r * 1.8, f.r * 0.8); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.arc(-f.r * 0.7, -f.r * 0.2, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    catchAnimsRef.current.forEach(a => {
      ctx.save(); ctx.globalAlpha = a.life; ctx.fillStyle = a.color; ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center'; ctx.fillText(a.text, a.x, a.y); ctx.restore();
    });
  }, [gameState.submarineName, interaction]);

  useEffect(() => {
    const loop = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      update(dt, gameState); draw(gameState);
      frameIdRef.current = requestAnimationFrame(loop);
    };
    frameIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [gameState, update, draw]);

  useEffect(() => {
    const handleResize = () => { if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; } };
    handleResize(); window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Friends Scanner Logic ---
  const startScanner = async () => {
    try {
      setScannerActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestAnimationFrame(tickScanner);
      }
    } catch (err) {
      console.error("Scanner failed to start:", err);
      setScannerActive(false);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopScanner = useCallback(() => {
    setScannerActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const tickScanner = () => {
    if (!scannerActive || !videoRef.current || !scannerCanvasRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = scannerCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          const scannedName = code.data.trim().toUpperCase();
          if (scannedName && scannedName !== gameState.submarineName && !gameState.friends.includes(scannedName)) {
            setGameState(prev => ({
              ...prev,
              friends: [...prev.friends, scannedName]
            }));
            stopScanner();
            return;
          }
        }
      }
    }
    requestAnimationFrame(tickScanner);
  };

  const buyItem = (item: ShopItem) => {
    if (gameState.coins >= item.price) {
      setGameState(prev => ({
        ...prev, coins: prev.coins - item.price, activeBuffs: { ...prev.activeBuffs, [item.id]: (prev.activeBuffs[item.id] || 0) + item.duration }
      }));
    }
  };

  const claimReward = (challenge: Challenge) => {
    if (gameState.completedChallengeIds.includes(challenge.id) && !gameState.claimedChallengeIds.includes(challenge.id)) {
      setGameState(prev => ({
        ...prev,
        coins: prev.coins + challenge.rewardCoins,
        claimedChallengeIds: [...prev.claimedChallengeIds, challenge.id],
        challengeCooldowns: { ...prev.challengeCooldowns, [challenge.id]: 60 }
      }));
    }
  };

  const travelTo = (b: Biome) => {
    if (gameState.lvl >= b.minRank) { setGameState(prev => ({ ...prev, biome: b })); fishRef.current = []; setActiveMenu(null); }
  };

  const finishLogin = () => {
    const sanitized = tempName.trim().toUpperCase();
    if (!sanitized) return;
    setIsVerifying(true);
    setTimeout(() => {
      const storedNames = JSON.parse(localStorage.getItem('registered_vessels') || "[]");
      const isTaken = SIMULATED_TAKEN_NAMES.includes(sanitized) || (storedNames.includes(sanitized) && sanitized !== gameState.submarineName);
      if (isTaken) {
        setNameError(`Vessel "${sanitized}" is already registered in the deep-sea fleet.`);
        setIsVerifying(false);
      } else {
        localStorage.setItem('registered_vessels', JSON.stringify(Array.from(new Set([...storedNames, sanitized]))));
        setGameState(prev => ({ ...prev, submarineName: sanitized }));
        setShowOnboarding(false);
        setIsVerifying(false);
      }
    }, 800);
  };

  const myQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(gameState.submarineName)}`;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      <canvas ref={canvasRef} className="block" />

      {/* Social Interaction UI */}
      {interaction && (
        <div className="absolute inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-slate-700 p-8 rounded-[40px] w-full max-w-md text-center shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">{interaction.type} Mode</h2>
            <p className="text-slate-500 text-sm mb-8">Interaction with <span className="text-cyan-400 font-bold">{interaction.targetFriend}</span></p>

            {interaction.status === 'requesting' && (
              <div className="space-y-6">
                <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white font-black animate-pulse">SENDING REQUEST...</p>
              </div>
            )}

            {interaction.status === 'declined' && (
              <div className="space-y-6">
                <div className="text-5xl">❌</div>
                <p className="text-red-400 font-black uppercase">Your friend answered "No"</p>
                <button onClick={() => setInteraction(null)} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black">BACK</button>
              </div>
            )}

            {interaction.status === 'accepted' && interaction.type === 'trade' && (
              <div className="space-y-6">
                <p className="text-green-400 font-black">ACCEPTED! PICK A FISH TO TRADE</p>
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-2xl">
                  {Object.keys(gameState.stats).map(idStr => {
                    const fish = GENERATED_FISH_DATA.find(f => f.id === parseInt(idStr));
                    if (!fish) return null;
                    return (
                      <button 
                        key={fish.id} 
                        onClick={() => setTradeSelectedFishId(fish.id)}
                        className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all ${tradeSelectedFishId === fish.id ? 'border-yellow-400 bg-yellow-400/20' : 'border-slate-800 bg-slate-900 opacity-60'}`}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: fish.color }} />
                      </button>
                    );
                  })}
                </div>
                {tradeSelectedFishId && (
                  <button onClick={finishTrade} className="w-full py-4 bg-yellow-400 text-slate-950 rounded-2xl font-black shadow-lg shadow-yellow-400/20">CONFIRM TRADE</button>
                )}
              </div>
            )}

            {interaction.status === 'in_progress' && (
              <div className="absolute top-4 right-4 text-white text-[10px] font-black tracking-widest bg-cyan-500 px-3 py-1 rounded-full animate-pulse">
                ACTIVE
              </div>
            )}

            {interaction.status === 'completed' && (
              <div className="space-y-6 animate-in zoom-in duration-500">
                <div className="text-6xl">🏆</div>
                <h3 className="text-2xl font-black text-white uppercase">Completed!</h3>
                {interaction.type === 'trade' && <p className="text-yellow-400 font-black">FISH TRADED SUCCESSFULLY</p>}
                {interaction.type === 'maze' && <p className="text-cyan-400 font-black">RANK UP: LEVEL {gameState.lvl}</p>}
                {interaction.type === 'battle' && <p className="text-pink-400 font-black">COMBAT TRAINING LOGGED</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HUD Overlay */}
      <div className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-700 ${showOnboarding ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex justify-between p-4 pointer-events-auto">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-700/50 backdrop-blur-md min-w-[160px] shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <div className="text-white text-[10px] font-black uppercase tracking-widest truncate max-w-[100px]">{gameState.submarineName}</div>
            </div>
            <div className="text-cyan-400 text-[8px] font-black uppercase tracking-[0.2em]">{gameState.biome.name}</div>
            <div className="flex justify-between items-end mt-1">
              <div className="text-white text-xs font-black">RANK {gameState.lvl}</div>
              <div className="text-slate-500 text-[9px] font-mono">{Math.floor(gameState.xp)}/100</div>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${gameState.xp}%` }} />
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-700/50 text-center min-w-[120px] backdrop-blur-md shadow-2xl h-fit">
            <div className="text-yellow-400 font-black text-xl leading-none">${Math.floor(gameState.coins).toLocaleString()}</div>
            <div className="text-slate-500 text-[8px] uppercase tracking-[0.2em] mt-1 font-bold">Credits</div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-700/50 text-right backdrop-blur-md shadow-2xl h-fit">
            <div className="text-white text-xs font-black">{registryCount} / 1000</div>
            <div className="text-slate-500 text-[8px] uppercase tracking-[0.2em] mt-1 font-bold">Species</div>
          </div>
        </div>

        <div className="absolute top-28 left-4 flex flex-col gap-2">
          {Object.entries(gameState.activeBuffs).map(([id, time]) => {
            const item = SHOP_ITEMS.find(i => i.id === id);
            return (
              <div key={id} className="bg-slate-900/90 border border-slate-700 px-2 py-1.5 rounded-lg flex items-center justify-between gap-4 shadow-lg min-w-[130px]">
                <div className="text-[9px] font-black text-amber-400 uppercase">{item?.name}</div>
                <div className="text-[9px] font-mono text-slate-400">{Math.ceil(time as number)}s</div>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-8 left-8 grid grid-cols-3 grid-rows-3 gap-2 pointer-events-auto">
          <ControlButton icon="↖" onStart={() => setInput('nw', true)} onEnd={() => setInput('nw', false)} size="sm" opacity="opacity-40" />
          <ControlButton icon="▲" onStart={() => setInput('up', true)} onEnd={() => setInput('up', false)} />
          <ControlButton icon="↗" onStart={() => setInput('ne', true)} onEnd={() => setInput('ne', false)} size="sm" opacity="opacity-40" />
          <ControlButton icon="◀" onStart={() => setInput('left', true)} onEnd={() => setInput('left', false)} />
          <div className="w-12 h-12" />
          <ControlButton icon="▶" onStart={() => setInput('right', true)} onEnd={() => setInput('right', false)} />
          <ControlButton icon="↙" onStart={() => setInput('sw', true)} onEnd={() => setInput('sw', false)} size="sm" opacity="opacity-40" />
          <ControlButton icon="▼" onStart={() => setInput('down', true)} onEnd={() => setInput('down', false)} />
          <ControlButton icon="↘" onStart={() => setInput('se', true)} onEnd={() => setInput('se', false)} size="sm" opacity="opacity-40" />
        </div>
        <div className="absolute bottom-8 right-8 flex flex-col gap-3 pointer-events-auto">
          <ActionButton label="MAP" color="emerald" onClick={() => setActiveMenu('map')} />
          <ActionButton label="SHOP" color="yellow" onClick={() => setActiveMenu('shop')} />
          <ActionButton label="FRIENDS" color="indigo" onClick={() => setActiveMenu('friends')} />
          <ActionButton label="GOALS" color="orange" onClick={() => setActiveMenu('goals')} />
          <ActionButton label="LOG" color="cyan" onClick={() => setActiveMenu('log')} />
        </div>
      </div>

      {showOnboarding && (
        <div className="absolute inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8">
          <div className="w-full max-md text-center space-y-12 animate-in fade-in zoom-in duration-1000">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-[0.2em]">Deep Dive</h1>
              <p className="text-cyan-400 font-mono text-xs tracking-[0.4em] uppercase">Tactical Submarine Exploration</p>
            </div>
            <div className="bg-slate-900/50 p-8 rounded-[40px] border border-slate-800 backdrop-blur-md shadow-2xl">
              <h2 className="text-white font-black text-sm uppercase tracking-widest mb-2">Initialize Vessel Name</h2>
              <p className="text-slate-500 text-[10px] mb-6 font-bold">NAMES MUST BE UNIQUE IN THE REGISTRY</p>
              <div className="relative">
                <input 
                  type="text" maxLength={16} disabled={isVerifying} value={tempName}
                  onChange={(e) => { setTempName(e.target.value); setNameError(""); }}
                  onKeyDown={(e) => e.key === 'Enter' && tempName.trim() && finishLogin()}
                  placeholder="VESSEL NAME"
                  className={`w-full bg-slate-950 border-2 rounded-2xl py-5 px-6 text-xl text-center font-black text-cyan-400 placeholder:text-slate-700 outline-none transition-all ${nameError ? 'border-red-500/50 text-red-400' : 'border-slate-800 focus:border-cyan-500/50'}`}
                />
              </div>
              {nameError && <div className="mt-4 text-red-500 text-[10px] font-black uppercase tracking-wider animate-in fade-in">{nameError}</div>}
              <button 
                onClick={finishLogin} disabled={!tempName.trim() || isVerifying}
                className={`w-full mt-6 py-5 rounded-2xl font-black text-lg tracking-[0.1em] transition-all ${tempName.trim() && !isVerifying ? 'bg-cyan-500 text-slate-950 hover:scale-105 active:scale-95 shadow-lg shadow-cyan-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
              >
                {isVerifying ? 'SCANNING REGISTRY...' : 'START EXPEDITION'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeMenu && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
          <div className="w-full max-w-lg flex flex-col items-center py-10">
            {activeMenu === 'friends' && (
              <div className="w-full space-y-6">
                <MenuHeader title="Network" subtitle="Scan QR codes or interact with existing allies." />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`bg-slate-900 p-6 rounded-3xl border border-slate-800 text-center transition-opacity ${scannerActive ? 'opacity-30 pointer-events-none scale-95' : 'opacity-100'}`}>
                    <div className="text-white font-black text-[10px] uppercase tracking-widest mb-4">Your ID Card</div>
                    <div className="bg-white p-4 rounded-2xl w-40 h-40 mx-auto flex items-center justify-center">
                      <img src={myQrUrl} alt="My QR Code" className="w-full h-full" />
                    </div>
                    <div className="mt-4 text-cyan-400 font-black text-xs">{gameState.submarineName}</div>
                  </div>

                  <div className={`bg-slate-900 p-6 rounded-3xl border text-center flex flex-col transition-all min-h-[320px] ${scannerActive ? 'border-cyan-500/50 shadow-2xl shadow-cyan-500/10' : 'border-slate-800'}`}>
                    <div className="text-white font-black text-[10px] uppercase tracking-widest mb-4">QR Scanner</div>
                    <div className="flex-1 min-h-[200px] bg-slate-950 rounded-2xl border-2 border-slate-800 relative overflow-hidden group">
                      {scannerActive ? (
                        <>
                          <video ref={videoRef} className="qr-scanner-video" />
                          <canvas ref={scannerCanvasRef} className="hidden" />
                          <button onClick={stopScanner} className="absolute top-4 right-4 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center font-black text-xl shadow-lg active:scale-90 transition-all z-[60]">×</button>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 cursor-pointer" onClick={startScanner}>
                          <div className="text-2xl opacity-50">📷</div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-cyan-400 transition-colors">Start Scanner</div>
                        </div>
                      )}
                    </div>
                    {!scannerActive && (
                       <button onClick={startScanner} className="mt-4 w-full py-4 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 rounded-xl font-black text-[12px] uppercase hover:bg-cyan-500/30 active:scale-95 transition-all">ACTIVATE CAMERA</button>
                    )}
                  </div>
                </div>

                <div className={`bg-slate-900 p-6 rounded-3xl border border-slate-800 transition-opacity ${scannerActive ? 'opacity-30' : 'opacity-100'}`}>
                  <div className="text-white font-black text-[10px] uppercase tracking-widest mb-4">Known Allies ({gameState.friends.length})</div>
                  <div className="space-y-3">
                    {gameState.friends.length > 0 ? gameState.friends.map(friend => (
                      <div key={friend} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3 animate-in slide-in-from-left-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <div className="text-white font-black text-sm truncate">{friend}</div>
                          </div>
                          <button onClick={() => setSelectedFriend(selectedFriend === friend ? null : friend)} className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-tighter">OPTIONS {selectedFriend === friend ? '▼' : '▶'}</button>
                        </div>
                        
                        {selectedFriend === friend && (
                          <div className="grid grid-cols-3 gap-2 mt-2 animate-in slide-in-from-top-2">
                            <button onClick={() => initiateInteraction('trade', friend)} className="py-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-lg font-black text-[10px] uppercase hover:bg-yellow-500/30 transition-all">TRADE</button>
                            <button onClick={() => initiateInteraction('battle', friend)} className="py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-black text-[10px] uppercase hover:bg-red-500/30 transition-all">BATTLE</button>
                            <button onClick={() => initiateInteraction('maze', friend)} className="py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg font-black text-[10px] uppercase hover:bg-cyan-500/30 transition-all">MAZE</button>
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="text-center py-6 text-slate-600 text-[10px] font-bold uppercase italic">No registered allies found.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeMenu === 'shop' && (
              <div className="w-full">
                <MenuHeader title="Marketplace" subtitle="Upgrade your vessel equipment." />
                <div className="space-y-3 mt-6">
                  {SHOP_ITEMS.map(item => (
                    <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-colors">
                      <div className="flex-1">
                        <div className="text-white font-black uppercase text-sm">{item.name}</div>
                        <div className="text-slate-500 text-[10px] mt-0.5">{item.desc}</div>
                        <div className="text-amber-400 font-bold text-xs mt-2">${item.price.toLocaleString()}</div>
                      </div>
                      <button onClick={() => buyItem(item)} disabled={gameState.coins < item.price} className={`px-6 py-2 rounded-xl font-black text-xs transition-all ${gameState.coins >= item.price ? 'bg-amber-500 text-slate-950 hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>BUY</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeMenu === 'map' && (
              <div className="w-full">
                <MenuHeader title="Global Map" subtitle="Navigate to deeper exploration zones." />
                <div className="grid grid-cols-1 gap-3 mt-6">
                  {BIOMES.map(b => {
                    const locked = gameState.lvl < b.minRank;
                    return (
                      <button key={b.id} disabled={locked} onClick={() => travelTo(b)} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${locked ? 'bg-slate-950 border-slate-800 grayscale' : 'bg-slate-900 border-slate-700 hover:border-emerald-500/50'}`}>
                        <div className="text-left">
                          <div className={`font-black uppercase text-sm ${locked ? 'text-slate-600' : 'text-white'}`}>{b.name}</div>
                          <div className="text-slate-500 text-[10px] mt-0.5">REQ RANK {b.minRank}</div>
                        </div>
                        {locked && <div className="text-slate-700 text-lg">🔒</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {activeMenu === 'goals' && (
              <div className="w-full">
                <MenuHeader title="Missions" subtitle="High-tier missions unlock more credit rewards." />
                <div className="space-y-3 mt-6">
                  {gameState.activeChallenges.map(challenge => {
                    const isCompleted = gameState.completedChallengeIds.includes(challenge.id);
                    const isClaimed = gameState.claimedChallengeIds.includes(challenge.id);
                    let progressValue = 0;
                    switch (challenge.targetType) {
                      case 'catch_total': progressValue = totalCatches; break;
                      case 'rank': progressValue = gameState.lvl; break;
                      case 'coins_total': progressValue = gameState.coins; break;
                      case 'registry_total': progressValue = registryCount; break;
                    }
                    const progressPercent = Math.min(100, (progressValue / challenge.targetValue) * 100);
                    return (
                      <div key={challenge.id} className={`p-4 rounded-2xl border transition-all ${isClaimed ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-900 border-slate-800'}`}>
                        <div className="flex justify-between items-start">
                          <div><div className={`font-black uppercase text-sm ${isClaimed ? 'text-slate-600' : 'text-white'}`}>{challenge.title}</div><div className="text-slate-500 text-[10px] mt-0.5">{challenge.desc}</div></div>
                          <div className="text-right"><div className="text-amber-400 font-black text-xs">+${challenge.rewardCoins.toLocaleString()}</div></div>
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                           <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-orange-500' : 'bg-slate-600'}`} style={{ width: `${progressPercent}%` }} /></div>
                           <div className="text-[9px] font-mono text-slate-500 whitespace-nowrap">{Math.floor(progressValue)} / {challenge.targetValue}</div>
                        </div>
                        {isCompleted && !isClaimed && <button onClick={() => claimReward(challenge)} className="mt-3 w-full py-2 bg-orange-500 text-slate-950 rounded-xl font-black text-[10px] uppercase hover:scale-[1.02] active:scale-[0.98] transition-all">CLAIM REWARD</button>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {activeMenu === 'log' && (
              <div className="w-full">
                <MenuHeader title="Registry" subtitle={`${registryCount} discovered species.`} />
                <div className="mt-6 bg-slate-900/50 border border-slate-800 p-4 rounded-3xl">
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 p-2">
                    {GENERATED_FISH_DATA.map(f => {
                      const discovered = gameState.stats[f.id];
                      return (
                        <div key={f.id} onClick={() => discovered && setSelectedFish(f)} className={`aspect-square rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${discovered ? 'bg-slate-800 border-slate-600 hover:scale-110' : 'bg-slate-950 border-slate-900 opacity-30'}`} style={discovered ? { borderColor: `${RARITIES[f.rarity].color}55` } : {}}>
                          <div className={`w-3 h-3 rounded-full mb-1`} style={{ background: discovered ? f.color : '#334155' }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <button onClick={() => { setActiveMenu(null); stopScanner(); }} className="mt-12 mb-10 px-16 py-5 bg-slate-800 text-slate-400 rounded-2xl font-black text-xl hover:bg-slate-700 hover:text-white transition-all border border-slate-700">EXIT TO SUBMARINE</button>
          </div>
        </div>
      )}

      {selectedFish && (
        <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setSelectedFish(null)}>
          <div className="bg-slate-900 border-2 border-slate-700 p-8 rounded-[40px] w-full max-w-[320px] text-center animate-in zoom-in" onClick={e => e.stopPropagation()}>
            <div className="inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase mb-4" style={{ backgroundColor: RARITIES[selectedFish.rarity].color, color: '#000' }}>{RARITIES[selectedFish.rarity].name}</div>
            <h3 className="text-2xl font-black text-white my-2">{selectedFish.name}</h3>
            <div className="w-48 h-32 mx-auto rounded-3xl my-8 border-4 border-slate-800 bg-slate-950 flex items-center justify-center relative overflow-hidden">
               <div className="w-20 h-10 rounded-full animate-pulse shadow-2xl" style={{ backgroundColor: selectedFish.color }} />
            </div>
            <button className="bg-slate-800 text-white w-full py-4 rounded-2xl font-black text-lg hover:bg-slate-700" onClick={() => setSelectedFish(null)}>DISMISS</button>
          </div>
        </div>
      )}
    </div>
  );
};

const ControlButton: React.FC<{ icon: string; onStart: () => void; onEnd: () => void; size?: 'sm' | 'md'; opacity?: string }> = ({ icon, onStart, onEnd, size = 'md', opacity = '' }) => (
  <button onMouseDown={onStart} onMouseUp={onEnd} onMouseLeave={onEnd} onTouchStart={onStart} onTouchEnd={onEnd} className={`bg-slate-800/80 border border-slate-700 text-white rounded-2xl flex items-center justify-center font-bold active:bg-slate-600 active:scale-90 transition-all shadow-lg ${size === 'sm' ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-xl'} ${opacity}`}>
    {icon}
  </button>
);

const ActionButton: React.FC<{ label: string; color: string; onClick: () => void }> = ({ label, color, onClick }) => {
  const colors: Record<string, string> = {
    emerald: 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10',
    yellow: 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10',
    orange: 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10',
    cyan: 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10',
    indigo: 'border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10'
  };
  return (
    <button onClick={onClick} className={`h-14 w-28 border rounded-2xl font-black text-[10px] tracking-[0.2em] transition-all bg-slate-950/80 backdrop-blur-md shadow-2xl active:scale-95 ${colors[color]}`}>{label}</button>
  );
};

const MenuHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="text-center">
    <h2 className="text-white font-black uppercase tracking-[0.3em] text-3xl">{title}</h2>
    <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto">{subtitle}</p>
  </div>
);

export default App;
