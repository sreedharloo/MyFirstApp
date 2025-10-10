// Personal Time Tracker (static MVP)

// 15-minute increments
const INCREMENT_MIN = 15;
const ROWS_PER_DAY = (24 * 60) / INCREMENT_MIN; // 96

// Default categories
const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Work', color: '#58c4ff' },
  { id: 'exercise', name: 'Exercise', color: '#60db95' },
  { id: 'break', name: 'Break', color: '#ffb86b' },
  { id: 'personal', name: 'Personal', color: '#d7a6ff' },
  { id: 'sleep', name: 'Sleep', color: '#8892ff' },
  { id: 'other', name: 'Other', color: '#ffd166' }
];

// --- DOM references ---
const datePicker = document.getElementById('datePicker');
const todayBtn = document.getElementById('todayBtn');
const legend = document.getElementById('legend');
const times = document.getElementById('times');
const grid = document.getElementById('grid');
const blocksLayer = document.getElementById('blocks');
const selection = document.getElementById('selection');
const dailySummaryEl = document.getElementById('dailySummary');
const monthSummaryEl = document.getElementById('monthSummary');
const dailyTotalEl = document.getElementById('dailyTotal');
const monthTotalEl = document.getElementById('monthTotal');

const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');

// Dialog elements
const entryDialog = document.getElementById('entryDialog');
const entryForm = document.getElementById('entryForm');
const dialogTitle = document.getElementById('dialogTitle');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const categorySelect = document.getElementById('categorySelect');
const noteInput = document.getElementById('noteInput');
const deleteBtn = document.getElementById('deleteBtn');

// --- State ---
let CATEGORIES = loadCategories();
let currentDate = toDateInputValue(new Date());
let dragging = null; // {startRow, endRow}
let editingEntryId = null;

// --- Utilities ---
function toDateInputValue(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function minutesToHHMM(min){
  const h = Math.floor(min/60);
  const m = min%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function hhmmToMinutes(hhmm){
  const [h,m] = hhmm.split(':').map(Number);
  return h*60 + m;
}
function rowToMinutes(row){ return row * INCREMENT_MIN; }
function minutesToRow(min){ return Math.round(min / INCREMENT_MIN); }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function uid(){ return Math.random().toString(36).slice(2,10); }

// --- Storage ---
const STORAGE_KEY = 'tt.entries.v1';
const CAT_KEY = 'tt.categories.v1';

function loadCategories(){
  try{ const s = localStorage.getItem(CAT_KEY); if(s){ return JSON.parse(s); } }catch{}
  return DEFAULT_CATEGORIES;
}
function saveCategories(){ localStorage.setItem(CAT_KEY, JSON.stringify(CATEGORIES)); }

function loadAll(){
  try{ const s = localStorage.getItem(STORAGE_KEY); if(s){ return JSON.parse(s); } }catch{}
  return {}; // { 'YYYY-MM-DD': [entries] }
}
function saveAll(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function loadDay(dateStr){ const all = loadAll(); return all[dateStr] || []; }
function saveDay(dateStr, entries){ const all = loadAll(); all[dateStr] = entries; saveAll(all); }

// --- Rendering ---
function renderLegend(){
  legend.innerHTML = '';
  for(const c of CATEGORIES){
    const el = document.createElement('div');
    el.className = 'chip';
    el.innerHTML = `<span class="dot" style="background:${c.color}"></span><span>${c.name}</span>`;
    legend.appendChild(el);
  }
}

function renderTimes(){
  times.innerHTML = '';
  for(let row=0; row<ROWS_PER_DAY; row++){
    const minutes = rowToMinutes(row);
    const isHour = minutes % 60 === 0;
    const showLabel = minutes % 60 === 0; // hourly labels
    const el = document.createElement('div');
    el.className = 'time-row' + (showLabel ? ' label' : '');
    el.style.height = '20px';
    el.textContent = showLabel ? minutesToHHMM(minutes) : '';
    times.appendChild(el);
  }
}

function renderGridSlots(){
  // Ensure the blocks layer height matches grid's total height
  const totalPx = ROWS_PER_DAY * 20; // 20px per row
  blocksLayer.style.height = totalPx + 'px';
}

function renderBlocks(){
  const entries = loadDay(currentDate);
  blocksLayer.innerHTML = '';
  const rowHeight = 20;
  for(const e of entries){
    const top = minutesToRow(e.start) * rowHeight;
    const bottom = minutesToRow(e.end) * rowHeight;
    const height = Math.max(18, bottom - top - 2);
    const cat = CATEGORIES.find(c=>c.id===e.category) || {color:'#888', name:e.category};
    const div = document.createElement('div');
    div.className = 'block';
    div.style.top = (top+2) + 'px';
    div.style.height = height + 'px';
    div.style.background = cat.color;
    div.style.borderColor = 'rgba(0,0,0,0.2)';
    div.dataset.id = e.id;
    const label = e.label || cat.name;
    div.innerHTML = `<span class="label">${label}</span><span class="time">${minutesToHHMM(e.start)}–${minutesToHHMM(e.end)}</span>`;
    div.addEventListener('click', () => openEditDialog(e));
    blocksLayer.appendChild(div);
  }
}

function updateSummaries(){
  const entries = loadDay(currentDate);
  const byCat = new Map();
  let dayTotal = 0;
  for(const e of entries){
    const dur = e.end - e.start;
    dayTotal += dur;
    byCat.set(e.category, (byCat.get(e.category)||0) + dur);
  }
  dailySummaryEl.innerHTML = '';
  for(const [catId, mins] of byCat.entries()){
    const cat = CATEGORIES.find(c=>c.id===catId) || {name:catId, color:'#666'};
    const li = document.createElement('li');
    li.innerHTML = `<span><span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cat.color};margin-right:8px"></span>${cat.name}</span><span>${mins} min</span>`;
    dailySummaryEl.appendChild(li);
  }
  dailyTotalEl.textContent = `Total: ${dayTotal} min`;

  // Month summary across all stored days
  const all = loadAll();
  const monthKey = currentDate.slice(0,7); // YYYY-MM
  const agg = new Map();
  let monthTotal = 0;
  for(const [date, dayEntries] of Object.entries(all)){
    if(!date.startsWith(monthKey)) continue;
    for(const e of dayEntries){
      const dur = e.end - e.start;
      monthTotal += dur;
      agg.set(e.category, (agg.get(e.category)||0) + dur);
    }
  }
  monthSummaryEl.innerHTML = '';
  for(const [catId, mins] of agg.entries()){
    const cat = CATEGORIES.find(c=>c.id===catId) || {name:catId, color:'#666'};
    const li = document.createElement('li');
    li.innerHTML = `<span><span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cat.color};margin-right:8px"></span>${cat.name}</span><span>${mins} min</span>`;
    monthSummaryEl.appendChild(li);
  }
  monthTotalEl.textContent = `Total: ${monthTotal} min`;
}

// --- Interaction: drag selection ---
function setupGridInteraction(){
  grid.addEventListener('mousedown', (ev)=>{
    const row = clientYToRow(ev.clientY);
    if(row == null) return;
    dragging = { startRow: row, endRow: row };
    updateSelection();
  });
  window.addEventListener('mousemove', (ev)=>{
    if(!dragging) return;
    const row = clientYToRow(ev.clientY);
    if(row == null) return;
    dragging.endRow = clamp(row, 0, ROWS_PER_DAY);
    updateSelection();
  });
  window.addEventListener('mouseup', ()=>{
    if(!dragging) return;
    const {startRow, endRow} = dragging;
    const a = Math.min(startRow, endRow);
    const b = Math.max(startRow, endRow+1); // include last row
    dragging = null;
    selection.hidden = true;
    if(b - a < 1) return;
    const startMin = rowToMinutes(a);
    const endMin = rowToMinutes(b);
    openCreateDialog(startMin, endMin);
  });
}

function clientYToRow(clientY){
  const rect = grid.getBoundingClientRect();
  if(clientY < rect.top || clientY > rect.bottom) return null;
  const y = clientY - rect.top + grid.scrollTop;
  const row = Math.floor(y / 20); // 20px per row
  return clamp(row, 0, ROWS_PER_DAY-1);
}

function updateSelection(){
  if(!dragging){ selection.hidden = true; return; }
  const rowHeight = 20;
  const a = Math.min(dragging.startRow, dragging.endRow);
  const b = Math.max(dragging.startRow, dragging.endRow) + 1; // include end
  selection.hidden = false;
  selection.style.top = (a * rowHeight + 2) + 'px';
  selection.style.height = ((b - a) * rowHeight - 4) + 'px';
}

// --- Dialogs ---
function populateCategorySelect(){
  categorySelect.innerHTML = '';
  for(const c of CATEGORIES){
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name; categorySelect.appendChild(opt);
  }
}

function openCreateDialog(startMin, endMin){
  editingEntryId = null;
  dialogTitle.textContent = 'Add Entry';
  startTimeInput.value = minutesToHHMM(startMin);
  endTimeInput.value = minutesToHHMM(endMin);
  categorySelect.value = CATEGORIES[0].id;
  noteInput.value = '';
  deleteBtn.hidden = true;
  entryDialog.showModal();
}

function openEditDialog(entry){
  editingEntryId = entry.id;
  dialogTitle.textContent = 'Edit Entry';
  startTimeInput.value = minutesToHHMM(entry.start);
  endTimeInput.value = minutesToHHMM(entry.end);
  categorySelect.value = entry.category;
  noteInput.value = entry.label || '';
  deleteBtn.hidden = false;
  entryDialog.showModal();
}

entryForm.addEventListener('close', ()=>{
  // no-op
});

entryForm.addEventListener('submit', (e)=>{
  e.preventDefault();
});

entryDialog.addEventListener('close', ()=>{
  // dialog returns 'save' | 'cancel' | 'delete' through clicked button value
});

document.getElementById('saveBtn').addEventListener('click', ()=>{
  const start = hhmmToMinutes(startTimeInput.value);
  const end = hhmmToMinutes(endTimeInput.value);
  if(!(start < end)) { alert('End must be after start'); return; }
  const category = categorySelect.value;
  const label = noteInput.value.trim();

  const entries = loadDay(currentDate);
  if(editingEntryId){
    const idx = entries.findIndex(e=>e.id===editingEntryId);
    if(idx>=0) entries[idx] = {...entries[idx], start, end, category, label};
  }else{
    entries.push({ id: uid(), start, end, category, label });
  }
  // optional: naive overlap allowed; could add check here
  saveDay(currentDate, entries.sort((a,b)=>a.start-b.start));
  entryDialog.close('save');
  renderBlocks();
  updateSummaries();
});

document.getElementById('cancelBtn').addEventListener('click', ()=>{
  entryDialog.close('cancel');
});

deleteBtn.addEventListener('click', ()=>{
  if(!editingEntryId){ entryDialog.close('cancel'); return; }
  const entries = loadDay(currentDate).filter(e=>e.id!==editingEntryId);
  saveDay(currentDate, entries);
  entryDialog.close('delete');
  renderBlocks();
  updateSummaries();
});

// --- Export / Import ---
exportBtn.addEventListener('click', ()=>{
  const payload = {
    version: 1,
    categories: CATEGORIES,
    entries: loadAll(),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'time-tracker-export.json'; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

importInput.addEventListener('change', async (ev)=>{
  const file = ev.target.files?.[0];
  if(!file) return;
  const text = await file.text();
  try{
    const data = JSON.parse(text);
    if(data.categories && Array.isArray(data.categories)) { CATEGORIES = data.categories; saveCategories(); populateCategorySelect(); renderLegend(); }
    if(data.entries && typeof data.entries === 'object') { saveAll(data.entries); }
    renderBlocks(); updateSummaries();
    alert('Import successful');
  }catch(err){ alert('Failed to import: ' + err.message); }
  importInput.value = '';
});

// --- Initialization ---
function init(){
  datePicker.value = currentDate;
  renderLegend();
  renderTimes();
  renderGridSlots();
  populateCategorySelect();
  setupGridInteraction();
  renderBlocks();
  updateSummaries();
}

datePicker.addEventListener('change', ()=>{
  currentDate = datePicker.value;
  renderBlocks();
  updateSummaries();
});

todayBtn.addEventListener('click', ()=>{
  currentDate = toDateInputValue(new Date());
  datePicker.value = currentDate;
  renderBlocks();
  updateSummaries();
});

// Kick off
init();

