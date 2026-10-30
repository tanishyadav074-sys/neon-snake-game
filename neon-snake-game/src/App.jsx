import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gamepad2, Pause, Play, RotateCcw, Settings, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';

const START = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }
};
const same = (a, b) => a.x === b.x && a.y === b.y;
const randomFood = (snake, size) => {
  let p;
  do { p = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) }; }
  while (snake.some(s => same(s, p)));
  return p;
};

export default function App() {
  const [size, setSize] = useState(20);
  const [difficulty, setDifficulty] = useState('Medium');
  const [snake, setSnake] = useState(START);
  const [food, setFood] = useState({ x: 14, y: 5 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const directionRef = useRef(direction);
  const [status, setStatus] = useState('ready');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('neonSnakeHighScore') || 0));
  const [gamesPlayed, setGamesPlayed] = useState(() => Number(localStorage.getItem('neonSnakeGamesPlayed') || 0));
  const [bestLength, setBestLength] = useState(() => Number(localStorage.getItem('neonSnakeBestLength') || 3));
  const [sound, setSound] = useState(false);
  const [obstaclesEnabled, setObstaclesEnabled] = useState(false);
  const [obstacles, setObstacles] = useState([]);
  const [tab, setTab] = useState('Game');
  const [touchStart, setTouchStart] = useState(null);

  const speed = difficulty === 'Easy' ? 190 : difficulty === 'Hard' ? 75 : 125;

  const reset = useCallback((startNow = false) => {
    const fresh = [{ x: Math.floor(size / 2), y: Math.floor(size / 2) }, { x: Math.floor(size / 2) - 1, y: Math.floor(size / 2) }, { x: Math.floor(size / 2) - 2, y: Math.floor(size / 2) }];
    setSnake(fresh);
    setDirection({ x: 1, y: 0 });
    directionRef.current = { x: 1, y: 0 };
    setFood(randomFood(fresh, size));
    setScore(0);
    setObstacles(obstaclesEnabled ? [
      { x: 3, y: 4 }, { x: 3, y: 5 }, { x: size - 4, y: size - 5 }, { x: size - 4, y: size - 6 }
    ] : []);
    setStatus(startNow ? 'playing' : 'ready');
  }, [size, obstaclesEnabled]);

  useEffect(() => { reset(false); }, [size, obstaclesEnabled, reset]);

  const changeDirection = useCallback((key) => {
    const next = DIRECTIONS[key];
    if (!next) return;
    const current = directionRef.current;
    if (next.x === -current.x && next.y === -current.y) return;
    directionRef.current = next;
    setDirection(next);
    if (status === 'ready') setStatus('playing');
  }, [status]);

  useEffect(() => {
    const onKey = (event) => {
      if (DIRECTIONS[event.key]) { event.preventDefault(); changeDirection(event.key); }
      if (event.key === ' ' && status !== 'over') {
        event.preventDefault();
        setStatus(s => s === 'playing' ? 'paused' : 'playing');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeDirection, status]);

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = window.setInterval(() => {
      setSnake(currentSnake => {
        const dir = directionRef.current;
        const head = { x: currentSnake[0].x + dir.x, y: currentSnake[0].y + dir.y };
        const hitWall = head.x < 0 || head.y < 0 || head.x >= size || head.y >= size;
        const hitSelf = currentSnake.slice(0, -1).some(part => same(part, head));
        const hitObstacle = obstacles.some(part => same(part, head));
        if (hitWall || hitSelf || hitObstacle) {
          setStatus('over');
          setGamesPlayed(n => { const v = n + 1; localStorage.setItem('neonSnakeGamesPlayed', String(v)); return v; });
          return currentSnake;
        }
        const ate = same(head, food);
        const nextSnake = [head, ...currentSnake];
        if (!ate) nextSnake.pop();
        else {
          setScore(s => {
            const next = s + 10;
            setHighScore(h => {
              const value = Math.max(h, next);
              localStorage.setItem('neonSnakeHighScore', String(value));
              return value;
            });
            return next;
          });
          setFood(randomFood(nextSnake, size));
          setBestLength(b => {
            const value = Math.max(b, nextSnake.length);
            localStorage.setItem('neonSnakeBestLength', String(value));
            return value;
          });
        }
        return nextSnake;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [status, speed, size, food, obstacles]);

  const start = () => {
    if (status === 'over') reset(true);
    else setStatus('playing');
  };

  const handleTouchStart = e => setTouchStart({ x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY });
  const handleTouchEnd = e => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) changeDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
    setTouchStart(null);
  };

  const boardCells = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const isHead = same(snake[0], { x, y });
    const isBody = snake.slice(1).some(part => same(part, { x, y }));
    const isFood = same(food, { x, y });
    const isObstacle = obstacles.some(part => same(part, { x, y }));
    boardCells.push(<div key={`${x}-${y}`} className={`cell ${isHead ? 'snake-head' : isBody ? 'snake-body' : ''} ${isFood ? 'food' : ''} ${isObstacle ? 'obstacle' : ''}`} />);
  }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Zap size={29} strokeWidth={2.6}/></div><div><h1>NEON <span>SNAKE</span></h1><p>CLASSIC GAME. MODERN VIBES.</p></div></div>
      <nav className="nav-tabs" aria-label="Main navigation">
        {['Game', 'Leaderboard', 'How to Play', 'Settings'].map((item, i) => <button key={item} className={tab === item ? 'nav-tab active' : 'nav-tab'} onClick={() => setTab(item)}>{i === 0 ? <Gamepad2/> : i === 1 ? <Activity/> : i === 2 ? <span className="book-icon">ⓘ</span> : <Settings/>}{item}</button>)}
      </nav>
    </header>

    {tab !== 'Game' && <section className="info-panel">
      <h2>{tab === 'Leaderboard' ? 'Your Leaderboard' : tab === 'How to Play' ? 'How to Play' : 'Game Settings'}</h2>
      {tab === 'Leaderboard' ? <p>Your personal high score is <strong>{highScore}</strong>. Keep playing to beat it!</p> : tab === 'How to Play' ? <p>Use arrow keys or WASD to steer. On mobile, swipe on the board or use the direction pad. Eat the glowing pink food to earn 10 points. Avoid the walls, your tail, and obstacles. Press Space to pause.</p> : <p>Choose difficulty and grid size in the controls panel. Your high score and stats are saved in this browser.</p>}
      <button className="small-button" onClick={() => setTab('Game')}>Back to Game</button>
    </section>}

    <div className="layout">
      <section className="board-panel">
        <div className="board-topline"><div className="score-pill">Score <strong>{score}</strong></div><div className="score-pill high">High Score <strong>{highScore}</strong></div></div>
        <div className="game-board" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} role="img" aria-label={`Snake game board. Score ${score}.`}>
          {boardCells}
          {status !== 'playing' && <div className="board-overlay"><div className="overlay-card"><span className="overlay-kicker">{status === 'over' ? 'GAME OVER' : status === 'paused' ? 'TAKE A BREATHER' : 'READY PLAYER ONE'}</span><h2>{status === 'over' ? 'Nice run.' : status === 'paused' ? 'Paused' : 'Chase the glow.'}</h2><p>{status === 'over' ? `You scored ${score} points.` : status === 'paused' ? 'Your snake is waiting.' : 'Collect energy. Beat your best.'}</p><button className="primary-button overlay-start" onClick={start}><Play size={17} fill="currentColor"/>{status === 'over' ? 'Play Again' : status === 'paused' ? 'Resume' : 'Start Game'}</button></div></div>}
        </div>
        <div className="board-footer"><span><i className="legend-dot green"/> Snake</span><span><i className="legend-dot pink"/> Energy orb</span><span><i className="legend-dot purple"/> Obstacle</span><span className="live-status"><i/> {status === 'playing' ? 'LIVE' : status === 'paused' ? 'PAUSED' : status === 'over' ? 'GAME OVER' : 'STANDBY'}</span></div>
      </section>

      <aside className="sidebar">
        <section className="panel controls-panel">
          <div className="panel-heading"><Gamepad2/><h2>Game Controls</h2></div>
          <div className="dpad" aria-label="Direction controls">
            <button className="direction up" aria-label="Move up" onClick={() => changeDirection('ArrowUp')}><ArrowUp/></button>
            <button className="direction left" aria-label="Move left" onClick={() => changeDirection('ArrowLeft')}><ArrowLeft/></button>
            <button className="direction down" aria-label="Move down" onClick={() => changeDirection('ArrowDown')}><ArrowDown/></button>
            <button className="direction right" aria-label="Move right" onClick={() => changeDirection('ArrowRight')}><ArrowRight/></button>
          </div>
          <p className="control-hint">Use Arrow Keys or WASD<br/><small>(Also works on mobile)</small></p>
          <div className="action-row"><button className="primary-button" onClick={start}><Play size={17} fill="currentColor"/>{status === 'playing' ? 'Game Running' : status === 'paused' ? 'Resume Game' : status === 'over' ? 'Play Again' : 'Start Game'}</button><button className="secondary-button" onClick={() => reset(false)}><RotateCcw size={17}/>Reset</button></div>
          {status === 'playing' && <button className="pause-button" onClick={() => setStatus('paused')}><Pause size={15}/> Pause game (Space)</button>}
        </section>

        <section className="panel settings-panel">
          <div className="panel-heading"><Settings/><h2>Game Settings</h2></div>
          <div className="setting-row"><span>Difficulty</span><div className="segmented">{['Easy', 'Medium', 'Hard'].map(d => <button key={d} className={difficulty === d ? 'selected' : ''} onClick={() => { setDifficulty(d); if (status === 'playing') setStatus('paused'); }}>{d}</button>)}</div></div>
          <div className="setting-row"><span>Grid Size</span><div className="segmented">{[15, 20, 25].map(n => <button key={n} className={size === n ? 'selected' : ''} onClick={() => setSize(n)}>{n}×{n}</button>)}</div></div>
          <div className="toggle-row"><span>Show Obstacles</span><button role="switch" aria-checked={obstaclesEnabled} className={`toggle ${obstaclesEnabled ? 'on' : ''}`} onClick={() => setObstaclesEnabled(v => !v)}><i/></button></div>
          <div className="toggle-row"><span>Sound Effects</span><button role="switch" aria-checked={sound} className={`toggle ${sound ? 'on' : ''}`} onClick={() => setSound(v => !v)}>{sound ? <Volume2 size={15}/> : <VolumeX size={15}/>}<i/></button></div>
          {sound && <p className="sound-note">Sound setting saved for this session; audio cues can be added as a next enhancement.</p>}
        </section>

        <section className="panel stats-panel">
          <div className="panel-heading"><Activity/><h2>Stats</h2></div>
          <div className="stats-grid"><div className="stat-card gold"><Trophy/><span>High Score</span><strong>{highScore}</strong></div><div className="stat-card cyan"><Activity/><span>Games Played</span><strong>{gamesPlayed}</strong></div><div className="stat-card purple"><Zap/><span>Best Length</span><strong>{bestLength}</strong></div></div>
        </section>
        <p className="tip"><span>PRO TIP</span> <strong>Plan your turns ahead.</strong> Stay near the center while your snake is short.</p>
      </aside>
    </div>
    <footer className="footer"><span>NEON SNAKE <b>v1.0</b></span><span>Made for the next high score <i>✦</i></span><span>Built with React + JavaScript</span></footer>
  </main>;
}
