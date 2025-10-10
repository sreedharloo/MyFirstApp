import { supabase, supabaseEnabled } from './supabase'

// Types (JSDoc)
/** @typedef {{id:string,start:number,end:number,category:string,label?:string,date:string}} Entry */
/** @typedef {{id:string,name:string,color:string}} Category */

const STORAGE_KEY = 'tt.entries.v1'
const CAT_KEY = 'tt.categories.v1'

export async function loadCategories(){
  if(supabaseEnabled){
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if(error) throw error
    return data
  }
  try{ const s = localStorage.getItem(CAT_KEY); if(s){ return JSON.parse(s) } }catch{}
  return [
    { id: 'work', name: 'Work', color: '#58c4ff' },
    { id: 'exercise', name: 'Exercise', color: '#60db95' },
    { id: 'break', name: 'Break', color: '#ffb86b' },
    { id: 'personal', name: 'Personal', color: '#d7a6ff' },
    { id: 'sleep', name: 'Sleep', color: '#8892ff' },
    { id: 'other', name: 'Other', color: '#ffd166' }
  ]
}

export async function addCategory(cat){
  if(supabaseEnabled){
    const { data, error } = await supabase.from('categories').insert(cat).select()
    if(error) throw error
    return data[0]
  }
  const cats = await loadCategories()
  cats.push(cat)
  localStorage.setItem(CAT_KEY, JSON.stringify(cats))
  return cat
}

function loadAllLocal(){ try{ const s = localStorage.getItem(STORAGE_KEY); if(s){ return JSON.parse(s) } }catch{}; return {} }
function saveAllLocal(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }

export async function loadEntriesByDate(dateStr){
  if(supabaseEnabled){
    const { data, error } = await supabase.from('entries').select('*').eq('date', dateStr).order('start')
    if(error) throw error
    return data
  }
  const all = loadAllLocal(); return all[dateStr] || []
}

export async function loadEntriesInRange(fromStr, toStr){
  if(supabaseEnabled){
    const { data, error } = await supabase.from('entries').select('*').gte('date', fromStr).lte('date', toStr)
    if(error) throw error
    return data
  }
  const all = loadAllLocal()
  const days = Object.entries(all).filter(([d]) => d >= fromStr && d <= toStr).flatMap(([,list]) => list)
  return days
}

export async function upsertEntry(entry){
  if(supabaseEnabled){
    const { data, error } = await supabase.from('entries').upsert(entry).select()
    if(error) throw error
    return data[0]
  }
  const all = loadAllLocal();
  const list = all[entry.date] || []
  const idx = list.findIndex(e=>e.id===entry.id)
  if(idx>=0) list[idx]=entry; else list.push(entry)
  list.sort((a,b)=>a.start-b.start)
  all[entry.date]=list; saveAllLocal(all)
  return entry
}

export async function deleteEntry(entry){
  if(supabaseEnabled){
    const { error } = await supabase.from('entries').delete().eq('id', entry.id)
    if(error) throw error
    return true
  }
  const all = loadAllLocal();
  all[entry.date] = (all[entry.date]||[]).filter(e=>e.id!==entry.id)
  saveAllLocal(all)
  return true
}

export function toDateInputValue(d){
  const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`
}

