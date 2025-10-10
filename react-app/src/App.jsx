import React, { useEffect, useMemo, useState } from 'react'
import Calendar from './components/Calendar.jsx'
import { PieChart, Last7Bars } from './components/Charts.jsx'
import { addCategory, loadCategories, loadEntriesByDate, loadEntriesInRange, toDateInputValue, upsertEntry, deleteEntry } from './lib/store.js'

function minutesToHHMM(min){ const h=Math.floor(min/60), m=min%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` }
function hhmmToMinutes(hhmm){ const [h,m]=hhmm.split(':').map(Number); return h*60+m }

function startOfWeek(d){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x }
function eachDate(from,to){ const out=[], x=new Date(from); while(x<=to){ out.push(new Date(x)); x.setDate(x.getDate()+1) } return out }

export default function App(){
  const [currentDate, setCurrentDate] = useState(toDateInputValue(new Date()))
  const [categories, setCategories] = useState([])
  const [entries, setEntries] = useState([])
  const [range, setRange] = useState('today')

  // dialog state
  const [modal, setModal] = useState(null) // {id?, start, end, category, label}

  useEffect(()=>{ (async()=>{ setCategories(await loadCategories()) })() },[])
  useEffect(()=>{ (async()=>{ setEntries(await loadEntriesByDate(currentDate)) })() },[currentDate])

  const catMap = useMemo(()=> new Map(categories.map(c=>[c.id,c])),[categories])
  const entriesDecorated = useMemo(()=> entries.map(e=> ({...e, _color: catMap.get(e.category)?.color, _categoryName: catMap.get(e.category)?.name})), [entries, catMap])

  // Range data for dashboard
  const rangeData = useMemo(()=>{
    let from = new Date(currentDate); from.setHours(0,0,0,0)
    let to = new Date(from)
    if(range==='today'){} else if(range==='last7'){ from.setDate(from.getDate()-6) } else if(range==='thisWeek'){ from = startOfWeek(from); to = new Date(from); to.setDate(from.getDate()+6) } else if(range==='thisMonth'){ from.setDate(1); to = new Date(from); to.setMonth(from.getMonth()+1); to.setDate(0) } else if(range==='thisYear'){ from = new Date(from.getFullYear(),0,1); to = new Date(from.getFullYear(),11,31) }
    return { from, to }
  }, [currentDate, range])

  const [rangeEntries, setRangeEntries] = useState([])
  useEffect(()=>{ (async()=>{
    const fromStr = toDateInputValue(rangeData.from)
    const toStr = toDateInputValue(rangeData.to)
    setRangeEntries(await loadEntriesInRange(fromStr, toStr))
  })() }, [rangeData])

  const byCat = useMemo(()=>{
    const m = new Map()
    for(const e of rangeEntries){ const dur=e.end-e.start; m.set(e.category,(m.get(e.category)||0)+dur) }
    return m
  },[rangeEntries])

  const pieData = useMemo(()=>{
    return [...byCat.entries()].map(([catId,mins])=>{
      const c = catMap.get(catId) || {name:catId,color:'#666'}
      return { label: c.name, value: mins, color: c.color }
    }).sort((a,b)=>b.value-a.value)
  },[byCat, catMap])

  const last7Bars = useMemo(()=>{
    const to = new Date(currentDate); to.setHours(0,0,0,0)
    const from = new Date(to); from.setDate(from.getDate()-6)
    const days = eachDate(from, to)
    return days.map(d=>{
      const key = toDateInputValue(d)
      const total = rangeEntries.filter(e=>e.date===key).reduce((s,e)=>s+(e.end-e.start),0)
      return { label: key.slice(5), value: total }
    })
  },[currentDate, rangeEntries])

  function openCreate(start, end){
    setModal({ start, end, category: categories[0]?.id || 'other', label: '' })
  }
  function openEdit(e){ setModal({ ...e }) }
  async function saveModal(){
    const e = { ...modal }
    e.id = e.id || Math.random().toString(36).slice(2,10)
    e.date = currentDate
    await upsertEntry(e)
    setModal(null)
    setEntries(await loadEntriesByDate(currentDate))
  }
  async function deleteModal(){ await deleteEntry(modal); setModal(null); setEntries(await loadEntriesByDate(currentDate)) }

  async function onAddCategory(){
    const name = prompt('New category name?'); if(!name) return
    let color = prompt('Color hex (e.g. #33cc88)? Leave blank for random.');
    if(!color || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)){
      const hue = Math.floor(Math.random()*360); color = `hsl(${hue} 70% 60%)`
    }
    const idBase = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'cat'
    let id = idBase, n=1; while(categories.some(c=>c.id===id)){ id = `${idBase}-${n++}` }
    await addCategory({ id, name, color })
    setCategories(await loadCategories())
  }

  return (
    <div>
      <header className="app-header">
        <h1>Time Tracker</h1>
        <div className="controls">
          <label>
            <span>Date</span>
            <input type="date" value={currentDate} onChange={e=>setCurrentDate(e.target.value)} />
          </label>
          <button onClick={()=>{ const t=toDateInputValue(new Date()); setCurrentDate(t) }}>Today</button>
          <button onClick={onAddCategory}>Add Category</button>
          <label>
            Time Range
            <select value={range} onChange={e=>setRange(e.target.value)}>
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="last7">Last 7 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="thisYear">This Year</option>
            </select>
          </label>
        </div>
      </header>

      <section className="legend">
        {categories.map(c=> (
          <div key={c.id} className="chip"><span className="dot" style={{background:c.color}}></span><span>{c.name}</span></div>
        ))}
      </section>

      <Calendar dateStr={currentDate} entries={entriesDecorated} onCreate={openCreate} onEdit={openEdit} />

      <section className="summary" style={{borderTop:'1px solid var(--border)'}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          <div>
            <h2>Category Breakdown</h2>
            <PieChart data={pieData} />
          </div>
          <div>
            <h2>Last 7 Days</h2>
            <Last7Bars points={last7Bars} />
          </div>
        </div>
      </section>

      {modal && (
        <dialog open>
          <form method="dialog" style={{padding:14, display:'flex', flexDirection:'column', gap:12}} onSubmit={e=>{e.preventDefault()}}>
            <h3>{modal.id ? 'Edit Entry' : 'Add Entry'}</h3>
            <div className="form-row">
              <label>Start<input type="time" step={900} required value={minutesToHHMM(modal.start)} onChange={e=>setModal(m=>({...m, start: hhmmToMinutes(e.target.value)}))} /></label>
              <label>End<input type="time" step={900} required value={minutesToHHMM(modal.end)} onChange={e=>setModal(m=>({...m, end: hhmmToMinutes(e.target.value)}))} /></label>
            </div>
            <div className="form-row">
              <label>Category<select value={modal.category} onChange={e=>setModal(m=>({...m, category:e.target.value}))}>{categories.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}</select></label>
            </div>
            <label>Activity Name<input type="text" maxLength={120} value={modal.label||''} onChange={e=>setModal(m=>({...m, label:e.target.value}))} /></label>
            <menu className="dialog-actions">
              {modal.id && <button type="button" className="danger" onClick={deleteModal}>Delete</button>}
              <button type="button" onClick={()=>setModal(null)}>Cancel</button>
              <button type="button" className="primary" onClick={saveModal}>Save</button>
            </menu>
          </form>
        </dialog>
      )}
    </div>
  )
}

