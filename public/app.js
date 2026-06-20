const analyzeBtn = document.getElementById('analyzeBtn');
const acceptBtn = document.getElementById('acceptBtn');
const tasksList = document.getElementById('tasksList');
const statusMessage = document.getElementById('statusMessage');
const taskPanel = document.getElementById('taskPanel');
const panelHeader = document.getElementById('panelHeader');
const panelToggle = document.getElementById('panelToggle');
const panelContent = document.getElementById('panelContent');
const currentTaskEl = document.getElementById('currentTask');
const nextTaskEl = document.getElementById('nextTask');
const nextBtn = document.getElementById('nextBtn');
// Copilot test UI removed
const panelPipBtn = document.getElementById('panelPipBtn');

let tasks = [];
let currentIndex = 0;
let panelOpen = false;
let firstLaunched = false;

analyzeBtn.addEventListener('click', analyzeTasks);
acceptBtn.addEventListener('click', acceptTasks);
nextBtn.addEventListener('click', goToNextTask);
panelHeader.addEventListener('click', togglePanel);
tasksList.addEventListener('input', handleTaskEdit);
// copilot test removed
if (panelPipBtn) panelPipBtn.addEventListener('click', togglePanelPip);

async function analyzeTasks() {
  const text = document.getElementById('taskText').value.trim();
  if (!text) return alert('작업을 입력하세요.');

  // 이전 분석 결과를 비우고 UI를 초기화
  tasks = [];
  currentIndex = 0;
  firstLaunched = false;
  renderTasks();
  updatePanel();

  statusMessage.textContent = 'AI가 작업을 분석 중입니다...';
  analyzeBtn.disabled = true;

  try {
    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      statusMessage.textContent = data.error || '분석 오류가 발생했습니다.';
      return;
    }

    tasks = Array.isArray(data.tasks) ? data.tasks.map(task => ({ ...task })) : [];
    if (!tasks.length) {
      statusMessage.textContent = 'AI가 작업을 찾지 못했습니다. 텍스트를 다시 입력해보세요.';
      renderTasks();
      updatePanel();
      return;
    }

    normalizePriorities();
    sortTasks();
    currentIndex = 0;
    firstLaunched = false;
    statusMessage.textContent = data.warning || 'AI가 작업을 정리했습니다. 수정 후 수락하세요.';
    renderTasks();
    updatePanel();
  } catch (err) {
    statusMessage.textContent = `요청 실패: ${err.message}`;
  } finally {
    analyzeBtn.disabled = false;
  }
}

async function acceptTasks() {
  if (!tasks.length) return alert('먼저 AI 분석을 실행하세요.');
  sortTasks();
  currentIndex = 0;
  await runAndMove(currentIndex);
  syncOverlay();
}

// Copilot test removed

async function goToNextTask() {
  if (!tasks.length) return alert('먼저 분석 후 수락하세요.');
  if (!firstLaunched) return alert('먼저 수락 버튼으로 첫 작업을 실행하세요.');
  if (currentIndex >= tasks.length - 1) {
    statusMessage.textContent = '모든 작업을 완료했습니다.';
    return;
  }

  const nextIndex = currentIndex + 1;
  await runAndMove(nextIndex);
  syncOverlay();
}

function togglePanel() {
  panelOpen = !panelOpen;
  taskPanel.classList.toggle('open', panelOpen);
  taskPanel.classList.toggle('collapsed', !panelOpen);
  panelContent.classList.toggle('show', panelOpen);
  panelToggle.textContent = panelOpen ? '닫기' : '열기';
}

// Picture-in-Picture (PiP) support: capture `panelContent` via html2canvas
let pipVideo = null;
let pipStream = null;
let pipInterval = null;
let pipActive = false;

async function startPanelPip() {
  if (!window.html2canvas) return alert('html2canvas 로드 실패');
  if (pipActive) return;
  const canvas = document.createElement('canvas');
  canvas.style.display = 'none';
  document.body.appendChild(canvas);
  // initial render to size canvas
  const rect = panelContent.getBoundingClientRect();
  canvas.width = Math.max(200, Math.floor(rect.width));
  canvas.height = Math.max(120, Math.floor(rect.height));

  pipStream = canvas.captureStream(15); // 15fps
  pipVideo = document.createElement('video');
  pipVideo.autoplay = true;
  pipVideo.muted = true;
  pipVideo.srcObject = pipStream;

  // update canvas regularly using html2canvas
  pipInterval = setInterval(async () => {
    try {
      const img = await html2canvas(panelContent, { backgroundColor: null, scale: 1 });
      const ctx = canvas.getContext('2d');
      // resize canvas if needed
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width; canvas.height = img.height;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    } catch (e) {
      console.error('PiP capture error', e);
    }
  }, 700);

  try {
    await pipVideo.play();
    // user gesture required for requestPictureInPicture
    await pipVideo.requestPictureInPicture();
    pipActive = true;
    panelPipBtn.textContent = '팝아웃 닫기';
  } catch (err) {
    console.error('PiP start failed', err);
    stopPanelPip();
    alert('팝아웃을 시작하지 못했습니다. 브라우저가 PiP를 지원하는지 확인하세요.');
  }
}

function stopPanelPip() {
  if (!pipActive) return;
  pipActive = false;
  panelPipBtn.textContent = '팝아웃';
  if (pipInterval) { clearInterval(pipInterval); pipInterval = null; }
  if (pipVideo && document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(()=>{});
  }
  if (pipVideo) { pipVideo.pause(); pipVideo.srcObject = null; pipVideo.remove(); pipVideo = null; }
  if (pipStream) {
    pipStream.getTracks().forEach(t => t.stop());
    pipStream = null;
  }
  const canvases = document.querySelectorAll('body > canvas');
  canvases.forEach(c => { if (c && c.parentNode) c.parentNode.removeChild(c); });
}

function togglePanelPip() {
  if (pipActive) stopPanelPip(); else startPanelPip();
}

function renderTasks() {
  tasksList.innerHTML = '';
  tasks.forEach((task, index) => {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.dataset.index = index;
    item.setAttribute('draggable', 'true');
    item.innerHTML = `
      <div class="task-meta">
        <div class="task-meta-header">
          <div class="task-order">${task.order || index + 1}</div>
          <div class="priority-badge">${task.priority || ''}</div>
        </div>

        <div class="task-row">
          <label>작업 이름</label>
          <div class="task-name"><svg class="icon" aria-hidden><use href="#icon-hand"></use></svg><input data-field="name" data-index="${index}" value="${escapeHtml(task.name)}" /></div>
        </div>

        <div class="task-row">
          <label>종류</label>
          <select data-field="type" data-index="${index}">
            <option value="browser" ${task.type === 'browser' ? 'selected' : ''}>browser</option>
            <option value="app" ${task.type === 'app' ? 'selected' : ''}>app</option>
          </select>
        </div>

        <div class="task-row">
          <label>명령</label>
          <input data-field="command" data-index="${index}" value="${escapeHtml(task.command)}" />
        </div>

        <div class="task-row">
          <label>우선순위</label>
          <select data-field="priority" data-index="${index}">
            <option value="1" ${task.priority === 1 ? 'selected' : ''}>1</option>
            <option value="2" ${task.priority === 2 ? 'selected' : ''}>2</option>
            <option value="3" ${task.priority === 3 ? 'selected' : ''}>3</option>
            <option value="4" ${task.priority === 4 ? 'selected' : ''}>4</option>
            <option value="5" ${task.priority === 5 ? 'selected' : ''}>5</option>
          </select>
        </div>

        <div class="task-row">
          <label>설명</label>
          <input data-field="description" data-index="${index}" value="${escapeHtml(task.description)}" />
        </div>
      </div>
      <div style="margin-top:10px;">
        <button data-action="run" data-index="${index}" class="primary" style="padding:8px 12px; font-size:0.9rem;">실행 및 지금으로</button>
      </div>
    `;
    tasksList.appendChild(item);
  });
}

// click handler for run buttons
function handleTaskClick(event) {
  const btn = event.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const index = Number(btn.dataset.index);
  if (action === 'run') runAndMove(index);
}
tasksList.addEventListener('click', handleTaskClick);

async function runAndMove(index) {
  if (!tasks[index]) return alert('잘못된 작업입니다.');

  try {
    await launchTask(tasks[index]);
    // 실행 성공 시 해당 항목을 맨 앞으로 이동
    const [item] = tasks.splice(index, 1);
    tasks.unshift(item);
    // 업데이트: 순서 재부여
    tasks.forEach((t, i) => t.order = i + 1);
    currentIndex = 0;
    firstLaunched = true;
    statusMessage.textContent = `실행 및 이동: ${item.name}`;
    renderTasks();
    updatePanel();
    syncOverlay();
    // highlight moved item visually
    const first = tasksList.querySelector('.task-item');
    if (first) {
      first.classList.add('moved');
      setTimeout(() => first.classList.remove('moved'), 900);
    }
  } catch (err) {
    statusMessage.textContent = `⚠️ ${err.message}`;
  }
}

function moveToTop(index) {
  if (!tasks[index]) return;
  const [item] = tasks.splice(index, 1);
  tasks.unshift(item);
  tasks.forEach((t, i) => t.order = i + 1);
  currentIndex = 0;
  renderTasks();
  updatePanel();
  const first = tasksList.querySelector('.task-item');
  if (first) {
    first.classList.add('moved');
    setTimeout(() => first.classList.remove('moved'), 900);
  }
}

function handleTaskEdit(event) {
  const target = event.target;
  const field = target.dataset.field;
  const index = Number(target.dataset.index);
  if (!field || Number.isNaN(index) || !tasks[index]) return;

  if (field === 'priority' || field === 'order') {
    tasks[index][field] = Number(target.value);
  } else {
    tasks[index][field] = target.value;
  }

  // 자동 우선순위 인식: 사용자가 '중요', '긴급' 등을 입력하면 우선순위 1로 설정하고 맨 앞으로 이동
  if ((field === 'name' || field === 'description') && /중요|긴급|우선(순위)?|우선해|important|priority/i.test(String(target.value))) {
    tasks[index].priority = 1;
    moveToTop(index);
    return;
  }

  if (field === 'priority' && Number(target.value) === 1) {
    moveToTop(index);
    normalizePriorities();
    renderTasks();
    updatePanel();
    return;
  }

  if (field === 'priority') {
    normalizePriorities();
  }

  if (field === 'order') {
    sortTasks();
  }

  renderTasks();
  updatePanel();
}

tasksList.addEventListener('input', handleTaskEdit);

// Drag & Drop handlers for reordering tasks
let dragSrcIndex = null;
function onDragStart(e) {
  const el = e.target.closest('.task-item');
  if (!el) return;
  dragSrcIndex = Number(el.dataset.index);
  e.dataTransfer.effectAllowed = 'move';
  try { e.dataTransfer.setData('text/plain', String(dragSrcIndex)); } catch (err) {}
  el.classList.add('dragging');
}

function onDragOver(e) {
  e.preventDefault();
  const over = e.target.closest('.task-item');
  document.querySelectorAll('.task-item.drag-over').forEach(node => node.classList.remove('drag-over'));
  if (over && !over.classList.contains('dragging')) {
    over.classList.add('drag-over');
  }
}

function onDrop(e) {
  e.preventDefault();
  const targetEl = e.target.closest('.task-item');
  document.querySelectorAll('.task-item.drag-over').forEach(node => node.classList.remove('drag-over'));
  const data = e.dataTransfer.getData('text/plain');
  const src = data ? Number(data) : dragSrcIndex;
  const dest = targetEl ? Number(targetEl.dataset.index) : tasks.length - 1;
  if (Number.isNaN(src) || Number.isNaN(dest)) return;
  if (src === dest) return;
  const [moved] = tasks.splice(src, 1);
  // adjust insertion index if needed
  const insertAt = src < dest ? dest : dest;
  tasks.splice(insertAt, 0, moved);
  tasks.forEach((t, i) => t.order = i + 1);
  renderTasks();
  updatePanel();
}

function onDragEnd(e) {
  document.querySelectorAll('.task-item.dragging').forEach(n => n.classList.remove('dragging'));
  document.querySelectorAll('.task-item.drag-over').forEach(n => n.classList.remove('drag-over'));
  dragSrcIndex = null;
}

tasksList.addEventListener('dragstart', onDragStart);
tasksList.addEventListener('dragover', onDragOver);
tasksList.addEventListener('drop', onDrop);
tasksList.addEventListener('dragend', onDragEnd);

function normalizePriorities() {
  if (!tasks.length) return;
  tasks.sort((a, b) => a.priority - b.priority || a.order - b.order);
  tasks.forEach((task, i) => { task.priority = i + 1; });
}

function sortTasks() {
  tasks.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  tasks.forEach((task, index) => {
    task.order = Number(task.order) || index + 1;
  });
}

function updatePanel() {
  if (!tasks.length) {
    currentTaskEl.textContent = '작업을 분석하거나 수락하면 현재 작업이 표시됩니다.';
    nextTaskEl.textContent = '다음 작업이 여기 표시됩니다.';
    nextBtn.disabled = true;
    return;
  }

  const current = tasks[currentIndex];
  const next = tasks[currentIndex + 1];
  currentTaskEl.textContent = `${current.order}. ${current.name}`;
  nextTaskEl.textContent = next ? `${next.order}. ${next.name}` : '모든 작업이 완료되었습니다.';
  nextBtn.disabled = currentIndex >= tasks.length - 1 || !firstLaunched;
  nextBtn.textContent = currentIndex >= tasks.length - 1 ? '완료' : '다음';
}

async function launchTask(item) {
  // Electron: use native shell via IPC (no local_launcher needed)
  if (window.electronAPI) {
    const result = await window.electronAPI.launchCommand(item);
    if (!result.ok) throw new Error(result.error || '앱 실행 실패');
    return;
  }

  // browser 타입은 로컬 실행기 없이 직접 브라우저에서 열기
  if (item.type === 'browser') {
    const url = /^https?:\/\//i.test(item.command)
      ? item.command
      : `https://www.google.com/search?q=${encodeURIComponent(item.command)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  // app 타입은 로컬 실행기(localhost:4321) 시도
  try {
    const response = await fetch('http://localhost:4321/launch-one', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || '로컬 실행기 응답 실패');
    }
  } catch (err) {
    if (err.name === 'TypeError' || err.message.includes('fetch')) {
      throw new Error(
        `앱 실행을 위해 로컬 실행기가 필요합니다.\n` +
        `터미널에서 "node local_launcher.js" 를 실행한 후 다시 시도하세요.`
      );
    }
    throw err;
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Electron overlay sync ---
function syncOverlay() {
  if (!window.electronAPI) return;
  const remaining = tasks.slice(currentIndex);
  const doneCount = currentIndex;
  const totalTasks = tasks.length; // remaining + done
  window.electronAPI.sendTasksUpdated({ tasks: remaining, doneCount, totalTasks: doneCount + remaining.length });
}

// Listen for task-complete events from the overlay panel
if (window.electronAPI) {
  window.electronAPI.onTaskComplete(() => {
    if (!firstLaunched || !tasks.length) return;
    if (currentIndex < tasks.length - 1) {
      runAndMove(currentIndex + 1);
    } else {
      statusMessage.textContent = '모든 작업을 완료했습니다. 🎉';
    }
  });
}
