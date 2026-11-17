(() => {
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("start-btn");

  const GRID = 20;                       // cells per side
  const CELL = canvas.width / GRID;      // pixel size of a cell
  const START_SPEED = 130;               // ms per tick
  const MIN_SPEED = 60;
  const SPEED_STEP = 3;                  // ms faster per food eaten

  const DIRS = {
    up:    { x: 0,  y: -1 },
    down:  { x: 0,  y: 1 },
    left:  { x: -1, y: 0 },
    right: { x: 1,  y: 0 },
  };

  let snake, dir, dirQueue, food, score, speed, timer;
  let state = "ready"; // ready | running | paused | over

  let best = 0;
  try { best = Number(localStorage.getItem("snake-best")) || 0; } catch {}
  bestEl.textContent = best;

  function reset() {
    const mid = Math.floor(GRID / 2);
    snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    dir = DIRS.right;
    dirQueue = [];
    score = 0;
    speed = START_SPEED;
    scoreEl.textContent = score;
    placeFood();
  }

  function placeFood() {
    const free = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
      }
    }
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function queueDirection(name) {
    const next = DIRS[name];
    if (!next) return;
    // Compare against the last queued direction so quick double-taps work
    const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    if (next === last) return;
    if (next.x === -last.x && next.y === -last.y) return; // no reversing
    if (dirQueue.length < 3) dirQueue.push(next);
  }

  function tick() {
    if (dirQueue.length) dir = dirQueue.shift();

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const eating = food && head.x === food.x && head.y === food.y;

    // Tail moves out of the way this tick unless we're growing
    const body = eating ? snake : snake.slice(0, -1);
    const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
    const hitSelf = body.some(s => s.x === head.x && s.y === head.y);

    if (hitWall || hitSelf) return gameOver();

    snake.unshift(head);
    if (eating) {
      score++;
      scoreEl.textContent = score;
      speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
      placeFood();
      if (!food) return gameOver(true); // filled the board
    } else {
      snake.pop();
    }

    draw();
    timer = setTimeout(tick, speed);
  }

  function draw() {
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Checkerboard grid
    ctx.fillStyle = "#151e2e";
    for (let y = 0; y < GRID; y++) {
      for (let x = (y % 2); x < GRID; x += 2) {
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // Food
    if (food) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    // Snake (head brighter, body fades slightly toward tail)
    snake.forEach((s, i) => {
      const t = i / Math.max(1, snake.length - 1);
      ctx.fillStyle = i === 0 ? "#4ade80" : `hsl(142, 70%, ${45 - t * 15}%)`;
      roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 4);
    });

    // Eyes
    const h = snake[0];
    ctx.fillStyle = "#052e16";
    const cx = h.x * CELL + CELL / 2, cy = h.y * CELL + CELL / 2;
    const ox = dir.y !== 0 ? CELL * 0.2 : 0, oy = dir.x !== 0 ? CELL * 0.2 : 0;
    const fx = dir.x * CELL * 0.15, fy = dir.y * CELL * 0.15;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + fx + ox * sgn, cy + fy + oy * sgn, CELL * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.fill();
  }

  function showOverlay(title, text, btn) {
    overlayTitle.textContent = title;
    overlayText.innerHTML = text;
    startBtn.textContent = btn;
    overlay.classList.remove("hidden");
  }

  function start() {
    clearTimeout(timer);
    reset();
    state = "running";
    overlay.classList.add("hidden");
    draw();
    timer = setTimeout(tick, speed);
  }

  function togglePause() {
    if (state === "running") {
      clearTimeout(timer);
      state = "paused";
      showOverlay("Paused", "Press <kbd>Space</kbd> to resume", "Resume");
    } else if (state === "paused") {
      state = "running";
      overlay.classList.add("hidden");
      timer = setTimeout(tick, speed);
    }
  }

  function gameOver(won = false) {
    clearTimeout(timer);
    state = "over";
    draw();
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem("snake-best", best); } catch {}
    }
    showOverlay(won ? "You win!" : "Game over", `Score: ${score}`, "Play again");
  }

  function primaryAction() {
    if (state === "ready" || state === "over") start();
    else togglePause();
  }

  // Keyboard
  const KEYMAP = {
    ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down",
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
  };

  document.addEventListener("keydown", e => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      primaryAction();
      return;
    }
    const d = KEYMAP[e.code];
    if (d) {
      e.preventDefault();
      if (state === "running") queueDirection(d);
    }
  });

  startBtn.addEventListener("click", primaryAction);

  // On-screen buttons
  document.querySelectorAll(".controls button").forEach(btn => {
    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      if (state === "running") queueDirection(btn.dataset.dir);
    });
  });

  // Swipe on the board
  let touchStart = null;
  canvas.addEventListener("touchstart", e => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  canvas.addEventListener("touchend", e => {
    if (!touchStart || state !== "running") return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    queueDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });

  // Pause automatically when the tab is hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "running") togglePause();
  });

  reset();
  draw();
})();
