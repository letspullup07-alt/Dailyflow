/* ─── DayFlow App ─── */

const QUOTES = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "You don't have to be great to start, but you have to start to be great.",
  "Focus on being productive instead of busy. — Tim Ferriss",
  "Small steps every day lead to big results over time.",
  "Do something today that your future self will thank you for.",
  "It always seems impossible until it's done. — Nelson Mandela",
  "Discipline is choosing between what you want now and what you want most.",
  "Make each day your masterpiece. — John Wooden",
  "Energy and persistence conquer all things. — Benjamin Franklin",
  "Your future is created by what you do today, not tomorrow.",
  "Take care of the minutes and the hours will take care of themselves.",
  "Don't count the days, make the days count. — Muhammad Ali",
];

/* ── State ── */
let currentDate = new Date();
currentDate.setHours(0,0,0,0);

let store        = loadStore();
let focusRunning = false;
let focusSeconds = 0;
let focusInterval = null;
let activeFilter  = 'all';
let editingTaskId = null;
let selectedEventColor = '#7C83E0';
let viewMode = 'day'; /* 'day' | 'week' */
let weekOffset = 0;   /* weeks relative to today's week */

/* ── Storage helpers ── */
function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function loadStore() {
  try { return JSON.parse(localStorage.getItem('dayflow_v3') || '{}'); }
  catch { return {}; }
}
function saveStore() { localStorage.setItem('dayflow_v3', JSON.stringify(store)); }
function dayData(d) {
  const k = dayKey(d || currentDate);
  if (!store[k]) store[k] = { tasks:[], events:[], mood:'', notes:'', habits:[], water:0, focusSeconds:0 };
  return store[k];
}

/* ── Default habits (first load) ── */
function ensureDefaultHabits() {
  const k = 'dayflow_habits_defaults';
  if (localStorage.getItem(k)) return;
  localStorage.setItem(k,'1');
  store._globalHabits = [
    { id: uid(), icon: '◈', name: 'Meditate' },
    { id: uid(), icon: '▣', name: 'Read 20 pages' },
    { id: uid(), icon: '▷', name: 'Exercise' },
    { id: uid(), icon: '◎', name: 'Drink 8 glasses' },
    { id: uid(), icon: '◔', name: 'Sleep 8 hours' },
  ];
  saveStore();
}
function globalHabits() {
  if (!store._globalHabits) store._globalHabits = [];
  return store._globalHabits;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

/* ─────────────────── RENDER ─────────────────── */
function render() {
  renderDateNav();
  renderStats();
  renderTasks();
  renderTimeline();
  renderMood();
  renderHabits();
  renderWater();
  renderNotes();
  if (viewMode === 'week') renderWeekView();
}

/* ── Date nav ── */
function renderDateNav() {
  const today = new Date(); today.setHours(0,0,0,0);
  const isToday = +currentDate === +today;
  const dayNames  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('dateLabel').textContent =
    isToday
      ? `Today — ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}`
      : `${dayNames[currentDate.getDay()]}, ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  const diff = Math.round((+currentDate - +today)/(1000*60*60*24));
  document.getElementById('dateSub').textContent =
    diff === 0  ? 'Let\'s make today count'
  : diff === 1  ? 'Tomorrow'
  : diff === -1 ? 'Yesterday'
  : diff > 1    ? `In ${diff} days`
  :               `${-diff} days ago`;
}

/* ── Stats ── */
function renderStats() {
  const d = dayData();
  const total = d.tasks.length;
  const done  = d.tasks.filter(t=>t.done).length;
  const pct   = total ? Math.round(done/total*100) : 0;
  document.getElementById('doneCount').textContent  = done;
  document.getElementById('totalCount').textContent = total;
  document.getElementById('ringPct').textContent    = pct+'%';
  const circ = 150.8;
  document.getElementById('ringFg').style.strokeDashoffset = circ - (circ * pct / 100);

  const habits = globalHabits();
  const dayH   = d.habits || [];
  const hDone  = habits.filter(h => dayH.includes(h.id)).length;
  document.getElementById('habitsDone').textContent = `${hDone}/${habits.length}`;

  const moodSymMap = { amazing:'✦', happy:'◕', neutral:'◑', tired:'◔', stressed:'◐', sad:'◒' };
  if (d.mood) {
    document.getElementById('moodEmoji').textContent = moodSymMap[d.mood] || '◑';
    document.getElementById('moodLabel').textContent = d.mood.charAt(0).toUpperCase()+d.mood.slice(1);
  } else {
    document.getElementById('moodEmoji').textContent = '◑';
    document.getElementById('moodLabel').textContent = 'Set Mood';
  }

  const fs = d.focusSeconds || 0;
  if (!focusRunning) document.getElementById('focusTimer').textContent =
    `${String(Math.floor(fs/60)).padStart(2,'0')}:${String(fs%60).padStart(2,'0')}`;
}

/* ── Tasks ── */
function renderTasks() {
  const d = dayData();
  const list  = document.getElementById('taskList');
  const empty = document.getElementById('taskEmpty');
  let tasks = d.tasks;
  if (activeFilter !== 'all') tasks = tasks.filter(t=>t.cat===activeFilter);
  list.innerHTML = '';
  if (!tasks.length) { list.appendChild(empty); empty.style.display=''; return; }
  empty.style.display='none';
  tasks.slice().sort((a,b)=>{ const po={high:0,medium:1,low:2}; return (po[a.priority]||2)-(po[b.priority]||2); })
    .forEach(t=>{
      const div = document.createElement('div');
      div.className = 'task-item'+(t.done?' done':'');
      div.dataset.cat = t.cat;
      div.innerHTML = `
        <input type="checkbox" class="task-check" ${t.done?'checked':''} data-id="${t.id}"/>
        <div class="task-body">
          <div class="task-title">${esc(t.title)}</div>
          <div class="task-meta">
            <span class="tag tag-${t.cat}">${catLabel(t.cat)}</span>
            <span class="tag tag-${t.priority}">${prioLabel(t.priority)}</span>
            ${t.time?`<span class="tag tag-time">◷ ${t.time}</span>`:''}
          </div>
        </div>
        <button class="task-del" data-id="${t.id}">✕</button>`;
      list.appendChild(div);
    });
}

/* ── Timeline ── */
function renderTimeline() {
  const d  = dayData();
  const tl = document.getElementById('timeline');
  const empty = document.getElementById('timelineEmpty');
  tl.innerHTML = '';
  const sorted = [...d.events].sort((a,b)=>a.start.localeCompare(b.start));
  if (!sorted.length) { tl.appendChild(empty); empty.style.display=''; return; }
  empty.style.display='none';
  sorted.forEach(e=>{
    const div = document.createElement('div');
    div.className='event-item';
    div.innerHTML=`
      <span class="event-dot" style="background:${e.color};color:${e.color}"></span>
      <span class="event-time">${fmt12(e.start)}${e.end?' – '+fmt12(e.end):''}</span>
      <span class="event-title">${esc(e.title)}</span>
      <button class="event-del" data-id="${e.id}">✕</button>`;
    tl.appendChild(div);
  });
}

/* ── Mood ── */
function renderMood() {
  const d = dayData();
  document.querySelectorAll('.mood-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.mood===d.mood);
  });
}

/* ── Habits ── */
function renderHabits() {
  const habits     = globalHabits();
  const d          = dayData();
  const checkedIds = d.habits || [];
  const container  = document.getElementById('habitList');
  container.innerHTML = '';
  if (!habits.length) {
    container.innerHTML = '<div class="empty-state">No habits yet — add one</div>';
    return;
  }
  habits.forEach(h=>{
    const done = checkedIds.includes(h.id);
    const row  = document.createElement('div');
    row.className = 'habit-row'+(done?' done-habit':'');
    row.innerHTML = `
      <input type="checkbox" class="habit-check" ${done?'checked':''} data-hid="${h.id}"/>
      <span class="habit-icon">${h.icon||'◆'}</span>
      <span class="habit-name">${esc(h.name)}</span>
      <button class="habit-del" data-hid="${h.id}">✕</button>`;
    container.appendChild(row);
  });
}

/* ── Water ── */
function renderWater() {
  const d    = dayData();
  const cups = document.getElementById('waterCups');
  cups.innerHTML = '';
  for(let i=0;i<8;i++){
    const c = document.createElement('div');
    c.className = 'cup'+(i<d.water?' filled':'');
    c.dataset.idx = i;
    c.innerHTML = '<span class="cup-sym">◎</span>';
    cups.appendChild(c);
  }
  document.getElementById('waterBadge').textContent = `${d.water} / 8 glasses`;
}

/* ── Notes ── */
function renderNotes() {
  document.getElementById('notesArea').value = dayData().notes||'';
}

/* ─────────────────────────────────────────────────────
   WEEK VIEW
───────────────────────────────────────────────────── */
function getWeekStart(offset) {
  const today = new Date(); today.setHours(0,0,0,0);
  /* Monday as week start */
  const dow   = today.getDay() === 0 ? 6 : today.getDay()-1;
  const mon   = new Date(today); mon.setDate(today.getDate() - dow + offset*7);
  return mon;
}

function renderWeekView() {
  const cols      = document.getElementById('weekCols');
  const label     = document.getElementById('weekNavLabel');
  const weekStart = getWeekStart(weekOffset);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);

  const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  label.textContent =
    weekStart.getMonth()===weekEnd.getMonth()
      ? `${mNames[weekStart.getMonth()]} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
      : `${mNames[weekStart.getMonth()]} ${weekStart.getDate()} – ${mNames[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  const today   = new Date(); today.setHours(0,0,0,0);
  const dayAbbr = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  cols.innerHTML = '';
  for (let i=0;i<7;i++) {
    const d   = new Date(weekStart); d.setDate(weekStart.getDate()+i);
    const key = dayKey(d);
    const dd  = store[key] || { tasks:[], events:[] };
    const total = dd.tasks.length;
    const done  = dd.tasks.filter(t=>t.done).length;

    const isToday   = +d === +today;
    const isCurrent = +d === +currentDate;
    const isPast    = +d < +today;

    const col = document.createElement('div');
    col.className = 'day-col' +
      (isToday   ? ' is-today'   : '') +
      (isCurrent ? ' is-current' : '') +
      (isPast    ? ' is-past'    : '');
    col.dataset.datekey = key;
    col.dataset.ts      = d.getTime();

    const pct = total ? Math.round(done/total*100) : 0;
    const pctBar = total
      ? `<div class="dc-pct-bar"><div class="dc-pct-fill" style="width:${pct}%"></div></div>`
      : '';

    col.innerHTML = `
      <div class="dc-head">
        <div class="dc-dayname">${dayAbbr[i]}</div>
        <div class="dc-datenum">${d.getDate()}</div>
        <div class="dc-month">${mNames[d.getMonth()]}</div>
        ${pctBar}
        <div class="dc-count">${total ? `${done}/${total}` : '—'}</div>
      </div>
      <div class="dc-body" id="dcbody-${key}"></div>
      <button class="dc-add-btn" data-ts="${d.getTime()}">+ Task</button>`;
    cols.appendChild(col);

    /* Populate tasks */
    const body = col.querySelector('.dc-body');
    if (!dd.tasks.length) {
      body.innerHTML = '<div class="dc-empty">No tasks</div>';
    } else {
      const sorted = [...dd.tasks].sort((a,b)=>{ const p={high:0,medium:1,low:2}; return (p[a.priority]||2)-(p[b.priority]||2); });
      sorted.forEach(t=>{
        const item = document.createElement('div');
        item.className = 'wk-task'+(t.done?' wk-done':'')+` wk-${t.cat}`;
        item.innerHTML = `
          <span class="wk-prio wk-prio-${t.priority}"></span>
          <span class="wk-title">${esc(t.title)}</span>
          ${t.time?`<span class="wk-time">◷ ${t.time}</span>`:''}`;
        body.appendChild(item);
      });
    }
  }
}

/* ─────────────────── EVENT BINDINGS ─────────────────── */

/* Date nav */
document.getElementById('prevDay').onclick = ()=>{ currentDate.setDate(currentDate.getDate()-1); syncFocusDay(); render(); };
document.getElementById('nextDay').onclick = ()=>{ currentDate.setDate(currentDate.getDate()+1); syncFocusDay(); render(); };
document.getElementById('todayBtn').onclick = ()=>{
  currentDate = new Date(); currentDate.setHours(0,0,0,0);
  weekOffset = 0; syncFocusDay(); render();
};

/* Week nav */
document.getElementById('prevWeek').onclick = ()=>{ weekOffset--; renderWeekView(); };
document.getElementById('nextWeek').onclick = ()=>{ weekOffset++; renderWeekView(); };

/* Week columns — click day to switch to it in day view; click "+ Task" to add */
document.getElementById('weekCols').addEventListener('click', e=>{
  const addBtn = e.target.closest('.dc-add-btn');
  if (addBtn) {
    const ts = parseInt(addBtn.dataset.ts);
    currentDate = new Date(ts); currentDate.setHours(0,0,0,0);
    switchView('day');
    syncFocusDay(); render();
    setTimeout(()=>document.getElementById('openTaskModal').click(),120);
    return;
  }
  const col = e.target.closest('.day-col');
  if (col && col.dataset.ts) {
    const ts = parseInt(col.dataset.ts);
    currentDate = new Date(ts); currentDate.setHours(0,0,0,0);
    switchView('day'); syncFocusDay(); render();
  }
});

/* View toggle */
document.getElementById('dayViewBtn').onclick  = ()=>{ switchView('day'); render(); };
document.getElementById('weekViewBtn').onclick = ()=>{ switchView('week'); renderWeekView(); };

function switchView(mode) {
  viewMode = mode;
  const dv = document.getElementById('dayView');
  const wv = document.getElementById('weekView');
  document.getElementById('dayViewBtn').classList.toggle('active', mode==='day');
  document.getElementById('weekViewBtn').classList.toggle('active', mode==='week');
  dv.classList.toggle('hidden', mode==='week');
  wv.classList.toggle('hidden', mode==='day');
}

/* Filter tabs */
document.querySelectorAll('.ftab').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('.ftab').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    activeFilter = b.dataset.filter;
    renderTasks();
  };
});

/* Task checkbox & delete */
document.getElementById('taskList').addEventListener('click', e=>{
  const id = e.target.dataset.id;
  if(!id) return;
  const d = dayData();
  if(e.target.classList.contains('task-check')){
    const t=d.tasks.find(x=>x.id===id);
    if(t){ t.done=e.target.checked; saveStore(); renderStats(); renderTasks(); }
  }
  if(e.target.classList.contains('task-del')){
    d.tasks=d.tasks.filter(x=>x.id!==id);
    saveStore(); render();
  }
});

/* Timeline delete */
document.getElementById('timeline').addEventListener('click',e=>{
  const id=e.target.dataset.id;
  if(!id||!e.target.classList.contains('event-del')) return;
  const d=dayData();
  d.events=d.events.filter(x=>x.id!==id);
  saveStore(); renderTimeline();
});

/* Mood */
document.getElementById('moodGrid').addEventListener('click',e=>{
  const b=e.target.closest('.mood-btn');
  if(!b)return;
  const d=dayData();
  d.mood=b.dataset.mood; saveStore(); renderMood(); renderStats();
});

/* Habits */
document.getElementById('habitList').addEventListener('click',e=>{
  if(e.target.classList.contains('habit-check')){
    const hid=e.target.dataset.hid;
    const d=dayData();
    if(!d.habits)d.habits=[];
    if(e.target.checked){ if(!d.habits.includes(hid))d.habits.push(hid); }
    else d.habits=d.habits.filter(x=>x!==hid);
    saveStore(); renderHabits(); renderStats();
  }
  if(e.target.classList.contains('habit-del')){
    const hid=e.target.dataset.hid;
    store._globalHabits=globalHabits().filter(h=>h.id!==hid);
    saveStore(); renderHabits(); renderStats();
  }
});

/* Water */
document.getElementById('waterCups').addEventListener('click',e=>{
  const c=e.target.closest('.cup');
  if(!c)return;
  const idx=parseInt(c.dataset.idx);
  const d=dayData();
  d.water=(d.water===idx+1)?idx:idx+1;
  saveStore(); renderWater(); renderStats();
});

/* Notes */
document.getElementById('notesArea').addEventListener('input',e=>{
  dayData().notes=e.target.value; saveStore();
});

/* Theme toggle */
document.getElementById('themeToggle').addEventListener('click',()=>{
  document.body.classList.toggle('light-mode');
  document.getElementById('themeToggle').textContent =
    document.body.classList.contains('light-mode') ? '◕' : '◑';
  localStorage.setItem('dayflow_theme', document.body.classList.contains('light-mode')?'light':'dark');
});

/* Export */
document.getElementById('exportBtn').addEventListener('click', exportDay);

/* ─────────────────── MODALS ─────────────────── */
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

/* Task modal */
document.getElementById('openTaskModal').onclick = ()=>{
  editingTaskId=null;
  document.getElementById('taskModalTitle').textContent='New Task';
  ['taskTitle','taskTime','taskNotes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('taskCat').value='work';
  document.getElementById('taskPriority').value='medium';
  openModal('taskModalOverlay');
  setTimeout(()=>document.getElementById('taskTitle').focus(),100);
};
document.getElementById('closeTaskModal').onclick  = ()=>closeModal('taskModalOverlay');
document.getElementById('cancelTaskModal').onclick = ()=>closeModal('taskModalOverlay');
document.getElementById('taskModalOverlay').onclick = e=>{
  if(e.target===document.getElementById('taskModalOverlay'))closeModal('taskModalOverlay');
};
document.getElementById('saveTask').onclick = ()=>{
  const title=document.getElementById('taskTitle').value.trim();
  if(!title){ shake('taskTitle'); return; }
  const d=dayData();
  if(editingTaskId){
    const t=d.tasks.find(x=>x.id===editingTaskId);
    if(t){
      t.title=title; t.cat=document.getElementById('taskCat').value;
      t.priority=document.getElementById('taskPriority').value;
      t.time=document.getElementById('taskTime').value;
      t.notes=document.getElementById('taskNotes').value;
    }
  } else {
    d.tasks.push({ id:uid(), title, done:false,
      cat:document.getElementById('taskCat').value,
      priority:document.getElementById('taskPriority').value,
      time:document.getElementById('taskTime').value,
      notes:document.getElementById('taskNotes').value });
  }
  saveStore(); render(); closeModal('taskModalOverlay');
  if(viewMode==='week') renderWeekView();
};

/* Event modal */
document.getElementById('openEventModal').onclick = ()=>{
  ['eventTitle','eventStart','eventEnd'].forEach(id=>document.getElementById(id).value='');
  selectedEventColor='#7C83E0';
  document.querySelectorAll('.cp-btn').forEach(b=>b.classList.toggle('active',b.dataset.color===selectedEventColor));
  openModal('eventModalOverlay');
  setTimeout(()=>document.getElementById('eventTitle').focus(),100);
};
document.getElementById('closeEventModal').onclick  = ()=>closeModal('eventModalOverlay');
document.getElementById('cancelEventModal').onclick = ()=>closeModal('eventModalOverlay');
document.getElementById('eventModalOverlay').onclick = e=>{
  if(e.target===document.getElementById('eventModalOverlay'))closeModal('eventModalOverlay');
};
document.getElementById('colorPicker').addEventListener('click',e=>{
  const b=e.target.closest('.cp-btn'); if(!b)return;
  selectedEventColor=b.dataset.color;
  document.querySelectorAll('.cp-btn').forEach(x=>x.classList.toggle('active',x===b));
});
document.getElementById('saveEvent').onclick = ()=>{
  const title=document.getElementById('eventTitle').value.trim();
  const start=document.getElementById('eventStart').value;
  if(!title||!start){ if(!title)shake('eventTitle'); if(!start)shake('eventStart'); return; }
  dayData().events.push({ id:uid(), title, start, end:document.getElementById('eventEnd').value, color:selectedEventColor });
  saveStore(); renderTimeline(); closeModal('eventModalOverlay');
};

/* Habit modal */
document.getElementById('addHabitBtn').onclick = ()=>{
  ['habitName','habitIcon'].forEach(id=>document.getElementById(id).value='');
  openModal('habitModalOverlay');
  setTimeout(()=>document.getElementById('habitName').focus(),100);
};
document.getElementById('closeHabitModal').onclick  = ()=>closeModal('habitModalOverlay');
document.getElementById('cancelHabitModal').onclick = ()=>closeModal('habitModalOverlay');
document.getElementById('habitModalOverlay').onclick = e=>{
  if(e.target===document.getElementById('habitModalOverlay'))closeModal('habitModalOverlay');
};
document.getElementById('saveHabit').onclick = ()=>{
  const name=document.getElementById('habitName').value.trim();
  if(!name){ shake('habitName'); return; }
  const icon=document.getElementById('habitIcon').value.trim()||'◆';
  globalHabits().push({id:uid(),icon,name});
  saveStore(); renderHabits(); renderStats(); closeModal('habitModalOverlay');
};

/* ─────────────────── FOCUS TIMER ─────────────────── */
function syncFocusDay(){
  if(focusRunning){
    clearInterval(focusInterval); focusRunning=false; focusSeconds=0;
    document.getElementById('focusToggle').textContent='Start';
    document.getElementById('focusToggle').classList.remove('running');
  }
  focusSeconds=dayData().focusSeconds||0;
  updateFocusDisplay();
}
document.getElementById('focusToggle').onclick = ()=>{
  if(!focusRunning){
    focusRunning=true;
    document.getElementById('focusToggle').textContent='Stop';
    document.getElementById('focusToggle').classList.add('running');
    focusInterval=setInterval(()=>{
      focusSeconds++;
      updateFocusDisplay();
      if(focusSeconds%10===0){ dayData().focusSeconds=focusSeconds; saveStore(); }
    },1000);
  } else {
    focusRunning=false; clearInterval(focusInterval);
    document.getElementById('focusToggle').textContent='Start';
    document.getElementById('focusToggle').classList.remove('running');
    dayData().focusSeconds=focusSeconds; saveStore();
  }
};
function updateFocusDisplay(){
  document.getElementById('focusTimer').textContent =
    `${String(Math.floor(focusSeconds/60)).padStart(2,'0')}:${String(focusSeconds%60).padStart(2,'0')}`;
}

/* ─────────────────── EXPORT ─────────────────── */
function exportDay(){
  const d=dayData(); const k=dayKey(currentDate);
  let txt=`DayFlow Export — ${k}\n${'─'.repeat(40)}\n\n`;
  txt+=`TASKS (${d.tasks.filter(t=>t.done).length}/${d.tasks.length} done)\n`;
  d.tasks.forEach(t=>{ txt+=`  [${t.done?'x':' '}] ${t.title}  [${t.cat}][${t.priority}]${t.time?' @'+t.time:''}\n`; });
  txt+=`\nSCHEDULE\n`;
  [...d.events].sort((a,b)=>a.start.localeCompare(b.start)).forEach(e=>{ txt+=`  ${e.start}${e.end?' - '+e.end:'      '} | ${e.title}\n`; });
  txt+=`\nHABITS\n`;
  const ch=d.habits||[];
  globalHabits().forEach(h=>{ txt+=`  [${ch.includes(h.id)?'x':' '}] ${h.icon} ${h.name}\n`; });
  txt+=`\nHYDRATION: ${d.water}/8 glasses\n`;
  txt+=`MOOD: ${d.mood||'not set'}\n`;
  txt+=`FOCUS TIME: ${Math.floor((d.focusSeconds||0)/60)} min\n`;
  if(d.notes) txt+=`\nNOTES\n${d.notes}\n`;
  const blob=new Blob([txt],{type:'text/plain'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=`dayflow-${k}.txt`; a.click();
}

/* ─────────────────── HELPERS ─────────────────── */
function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function catLabel(c){ return {work:'▪ Work',personal:'⌂ Personal',health:'▷ Health',learning:'▣ Learn',other:'◎ Other'}[c]||c; }
function prioLabel(p){ return {high:'▲ High',medium:'▶ Med',low:'▽ Low'}[p]||p; }
function fmt12(t){
  if(!t)return'';
  const [h,m]=t.split(':').map(Number);
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'pm':'am'}`;
}
function shake(id){
  const el=document.getElementById(id);
  el.style.borderColor='#e05555';
  setTimeout(()=>el.style.borderColor='',800);
}

/* SVG gradient */
function injectSVGDefs(){
  const svg=document.querySelector('#progressRing svg');
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML=`<linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#8B6914"/><stop offset="50%" stop-color="#FFD700"/><stop offset="100%" stop-color="#C0C0C0"/></linearGradient>`;
  svg.prepend(defs);
  document.getElementById('ringFg').setAttribute('stroke','url(#ringGrad)');
}

/* Keyboard shortcuts */
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){ e.preventDefault(); document.getElementById('openTaskModal').click(); }
  if(e.key==='Escape') ['taskModalOverlay','eventModalOverlay','habitModalOverlay'].forEach(closeModal);
  if(e.key==='ArrowLeft'  && !e.target.matches('input,textarea')) document.getElementById('prevDay').click();
  if(e.key==='ArrowRight' && !e.target.matches('input,textarea')) document.getElementById('nextDay').click();
});

/* ─────────────────── BOOT ─────────────────── */
function boot(){
  ensureDefaultHabits();
  store=loadStore();
  if(localStorage.getItem('dayflow_theme')==='light'){
    document.body.classList.add('light-mode');
    document.getElementById('themeToggle').textContent='◕';
  }
  const qi=currentDate.getDate()%QUOTES.length;
  document.getElementById('quoteStrip').textContent='"'+QUOTES[qi]+'"';
  injectSVGDefs();
  focusSeconds=dayData().focusSeconds||0;
  updateFocusDisplay();
  render();
}

boot();
