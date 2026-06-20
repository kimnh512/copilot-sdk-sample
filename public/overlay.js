const XP_PER_TASK = 10;
const XP_PER_LEVEL = 50;

// Persisted state
let xp = parseInt(localStorage.getItem('overlay_xp') || '0', 10);

// Transient task state (set by main window via IPC)
let tasks = [];       // remaining tasks to do
let doneCount = 0;    // how many have been completed this session
let totalTasks = 0;   // original total for progress bar

// --- DOM helpers ---
const $ = id => document.getElementById(id);

function getLevel() { return Math.floor(xp / XP_PER_LEVEL) + 1; }
function getXpInLevel() { return xp % XP_PER_LEVEL; }

// --- Render ---
function render() {
  const lv = getLevel();
  const xpIn = getXpInLevel();
  const xpPct = (xpIn / XP_PER_LEVEL) * 100;

  $('levelMeta').textContent = `Lv.${lv} · ${xp} XP`;
  $('xpLabel').textContent = `Lv.${lv} · ${xpIn} / ${XP_PER_LEVEL} XP`;
  $('xpFill').style.width = xpPct + '%';

  if (!totalTasks) {
    $('currentTask').innerHTML = '<span class="idle-hint">메인 창에서 작업을 분석·수락하면 여기 표시됩니다.</span>';
    $('progressFill').style.width = '0%';
    $('progressText').textContent = '—';
    $('nextHint').style.opacity = '0.4';
    $('nextTaskName').textContent = '—';
    $('doneBtn').disabled = true;
    $('allDoneOverlay').classList.remove('show');
    return;
  }

  const pct = totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0;
  $('progressFill').style.width = pct + '%';
  $('progressText').textContent = `${doneCount}/${totalTasks}`;

  if (!tasks.length) {
    showAllDone();
    return;
  }

  $('allDoneOverlay').classList.remove('show');

  const current = tasks[0];
  const next = tasks[1];

  $('currentTask').textContent = current.name;
  $('doneBtn').disabled = false;

  if (next) {
    $('nextHint').style.opacity = '1';
    $('nextTaskName').textContent = next.name;
  } else {
    $('nextHint').style.opacity = '0.4';
    $('nextTaskName').textContent = '(마지막 작업)';
  }
}

function showAllDone() {
  const earned = doneCount * XP_PER_TASK;
  $('allDoneSub').textContent = `총 ${earned} XP 획득! 수고했어요 🎉`;
  $('allDoneOverlay').classList.add('show');
  $('doneBtn').disabled = true;
}

// --- XP animation ---
function animateXP(prevLevel) {
  const burst = $('xpBurst');
  burst.classList.remove('pop');
  void burst.offsetWidth; // force reflow to restart animation
  burst.classList.add('pop');

  const newLevel = getLevel();
  if (newLevel > prevLevel) {
    showLevelUp(newLevel);
  }
}

function showLevelUp(lv) {
  const banner = $('levelupBanner');
  banner.textContent = `🎉 레벨 업! → Lv.${lv}`;
  banner.style.display = 'block';
  setTimeout(() => { banner.style.display = 'none'; }, 2600);
}

// --- IPC ---
if (window.electronAPI) {
  window.electronAPI.onTasksUpdated(({ tasks: newTasks, doneCount: dc, totalTasks: total }) => {
    tasks = newTasks || [];
    doneCount = typeof dc === 'number' ? dc : 0;
    totalTasks = typeof total === 'number' ? total : tasks.length + doneCount;
    render();
  });
}

// --- Done button ---
$('doneBtn').addEventListener('click', () => {
  if (!tasks.length) return;

  const completed = tasks[0]; // current task
  const prevLevel = getLevel();

  // Award XP
  xp += XP_PER_TASK;
  localStorage.setItem('overlay_xp', xp);
  animateXP(prevLevel);

  // Notify main window to advance (main handles actual task execution)
  if (window.electronAPI) {
    window.electronAPI.sendTaskComplete({ task: completed });
  }

  // Optimistically advance local state
  tasks.shift();
  doneCount++;

  $('doneBtn').disabled = true; // disable until main confirms new state
  render();

  if (!tasks.length) {
    setTimeout(showAllDone, 500);
  }
});

// --- Close button ---
$('closeBtn').addEventListener('click', () => {
  window.close();
});

// --- Restart button ---
$('restartBtn').addEventListener('click', () => {
  tasks = [];
  doneCount = 0;
  totalTasks = 0;
  $('allDoneOverlay').classList.remove('show');
  render();
});

// Initial render
render();
