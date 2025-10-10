import React from 'react'

export function PieChart({ data, size=160 }){
  // data: [{label, value, color}]
  const total = data.reduce((s,d)=>s+d.value,0)
  const r = size/2 - 6
  const cx = size/2, cy = size/2
  let acc = 0
  const arcs = data.map((d,i)=>{
    const start = (acc/total) * 2*Math.PI; acc += d.value
    const end = (acc/total) * 2*Math.PI
    const large = (end-start) > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end)
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    return <path key={i} d={path} fill={d.color} stroke="rgba(0,0,0,.2)" />
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {total>0 ? arcs : <circle cx={cx} cy={cy} r={r} fill="#0b0e1d" stroke="#2a2f45"/>}
    </svg>
  )
}

export function Last7Bars({ points }){
  // points: [{label, value}]
  const max = Math.max(1, ...points.map(p=>p.value))
  return (
    <div>
      <div className="spark-bars">
        {points.map((p,idx)=>{
          const h = Math.max(2, Math.round((p.value/max)*80))
          return <div key={idx} className="b" style={{height:h}} title={`${p.label}: ${p.value} min`}></div>
        })}
      </div>
      <div style={{display:'flex',gap:6,justifyContent:'space-between'}}>
        {points.map((p,idx)=> <div key={idx} className="x" style={{width:20, textAlign:'center'}}>{p.label}</div>)}
      </div>
    </div>
  )
}

