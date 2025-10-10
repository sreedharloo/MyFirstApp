import React, { useEffect, useMemo, useRef, useState } from 'react'

const INCREMENT_MIN = 15
const ROWS_PER_DAY = (24*60)/INCREMENT_MIN

function minutesToHHMM(min){ const h=Math.floor(min/60), m=min%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` }
function rowToMinutes(row){ return row * INCREMENT_MIN }
function minutesToRow(min){ return Math.round(min / INCREMENT_MIN) }

export default function Calendar({ dateStr, entries, onCreate, onEdit }){
  const times = useMemo(()=>Array.from({length:ROWS_PER_DAY},(_,row)=>rowToMinutes(row)),[])
  const gridRef = useRef(null)
  const [drag, setDrag] = useState(null) // {startRow,endRow}

  const onMouseDown = (ev)=>{
    const row = clientYToRow(ev.clientY)
    if(row==null) return
    setDrag({startRow:row, endRow:row})
  }
  const onMouseMove = (ev)=>{
    if(!drag) return
    const row = clientYToRow(ev.clientY)
    if(row==null) return
    setDrag(d => ({...d, endRow: Math.max(0, Math.min(ROWS_PER_DAY-1, row))}))
  }
  const onMouseUp = ()=>{
    if(!drag) return
    const a = Math.min(drag.startRow, drag.endRow)
    const b = Math.max(drag.startRow, drag.endRow) + 1
    setDrag(null)
    if(b-a<1) return
    onCreate(rowToMinutes(a), rowToMinutes(b))
  }

  // Ensure drag end is captured even if cursor leaves the grid
  useEffect(()=>{
    if(!drag) return
    const onMove = (ev)=>{
      const grid = gridRef.current; if(!grid) return
      const rect = grid.getBoundingClientRect()
      const clampedY = Math.min(Math.max(ev.clientY, rect.top), rect.bottom)
      const y = clampedY - rect.top + grid.scrollTop
      const row = Math.floor(y/20)
      setDrag(d => d ? ({...d, endRow: Math.max(0, Math.min(ROWS_PER_DAY-1, row))}) : d)
    }
    const onUp = ()=>{
      const d = drag
      setDrag(null)
      if(!d) return
      const a = Math.min(d.startRow, d.endRow)
      const b = Math.max(d.startRow, d.endRow) + 1
      if(b-a>=1) onCreate(rowToMinutes(a), rowToMinutes(b))
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return ()=>{
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [drag])
  const clientYToRow = (clientY)=>{
    const grid = gridRef.current
    if(!grid) return null
    const rect = grid.getBoundingClientRect()
    if(clientY < rect.top || clientY > rect.bottom) return null
    const y = clientY - rect.top + grid.scrollTop
    const row = Math.floor(y/20)
    return Math.max(0, Math.min(ROWS_PER_DAY-1, row))
  }

  const rowHeight = 20
  return (
    <div className="calendar">
      <aside className="times">
        {times.map((m,idx)=>{
          const showLabel = m % 60 === 0
          return <div key={idx} className={"time-row" + (showLabel?" label":"")} style={{height:20}}>{showLabel? minutesToHHMM(m): ''}</div>
        })}
      </aside>
      <section className="grid" ref={gridRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
        <div className="blocks" style={{height: ROWS_PER_DAY*20}}>
          {entries.map(e=>{
            const top = minutesToRow(e.start)*rowHeight+2
            const height = Math.max(18, minutesToRow(e.end)*rowHeight - minutesToRow(e.start)*rowHeight - 2)
            return (
              <div key={e.id} className="block" style={{top, height, background: e._color||'#888', borderColor:'rgba(0,0,0,.2)'}} onClick={()=>onEdit(e)}>
                <span className="label">{e.label || e._categoryName || 'Entry'}</span>
                <span className="time">{minutesToHHMM(e.start)}–{minutesToHHMM(e.end)}</span>
              </div>
            )
          })}
        </div>
        {drag && (
          <div className="selection" style={{top: Math.min(drag.startRow,drag.endRow)*rowHeight+2, height: (Math.abs(drag.endRow-drag.startRow)+1)*rowHeight -4}} />
        )}
      </section>
      <aside className="summary">
        {/* Placeholder for right panel provided by parent */}
      </aside>
    </div>
  )
}
