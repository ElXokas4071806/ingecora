'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Upload, Save, AlertTriangle, Pencil, Check, X } from 'lucide-react'

export default function GanttPage() {
  const [proyecto, setProyecto] = useState(null)
  const [actividades, setActividades] = useState([])
  const [loading, setLoading] = useState(true)
  const [proyectoId, setProyectoId] = useState(null)
  const [miRol, setMiRol] = useState(null)
  const [showNueva, setShowNueva] = useState(false)
  const [nueva, setNueva] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '', porcentaje_avance: 0, color: '#16a34a' })
  const [editandoId, setEditandoId] = useState(null)
  const [editData, setEditData] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [confirmBorrar, setConfirmBorrar] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const partes = pathname.split('/')
    const id = partes[partes.indexOf('proyectos') + 1]
    setProyectoId(id)
    loadData(id)
  }, [pathname])

  const loadData = async (id) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: proy } = await supabase.from('projects').select('*').eq('id', id).single()
    setProyecto(proy)
    const { data: mbs } = await supabase.from('project_members').select('rol').eq('project_id', id).eq('user_id', user.id).single()
    setMiRol(mbs?.rol || 'director')
    const { data: acts } = await supabase.from('gantt_actividades').select('*').eq('project_id', id).order('orden')
    setActividades(acts || [])
    setLoading(false)
  }

  const esDirector = miRol === 'director'

  const agregarActividad = async (e) => {
    e.preventDefault()
    if (!nueva.nombre || !nueva.fecha_inicio || !nueva.fecha_fin) return
    setGuardando(true)
    const { data, error } = await supabase.from('gantt_actividades')
      .insert({ ...nueva, project_id: proyectoId, porcentaje_avance: parseInt(nueva.porcentaje_avance) || 0, orden: actividades.length })
      .select().single()
    if (!error && data) {
      setActividades([...actividades, data])
      setNueva({ nombre: '', fecha_inicio: '', fecha_fin: '', porcentaje_avance: 0, color: '#16a34a' })
      setShowNueva(false)
    }
    setGuardando(false)
  }

  const iniciarEdicion = (a) => {
    setEditandoId(a.id)
    setEditData({ nombre: a.nombre, fecha_inicio: a.fecha_inicio, fecha_fin: a.fecha_fin, porcentaje_avance: a.porcentaje_avance, color: a.color })
  }

  const guardarEdicion = async (id) => {
    await supabase.from('gantt_actividades').update({ ...editData, porcentaje_avance: parseInt(editData.porcentaje_avance) || 0 }).eq('id', id)
    setActividades(actividades.map(a => a.id === id ? { ...a, ...editData } : a))
    setEditandoId(null)
  }

  const borrarActividad = async (id) => {
    await supabase.from('gantt_actividades').delete().eq('id', id)
    setActividades(actividades.filter(a => a.id !== id))
    setConfirmBorrar(null)
  }

  const importarExcel = async (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return
    setErrorMsg('')

    try {
      const XLSX = await import('xlsx')
      const buffer = await archivo.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const datos = XLSX.utils.sheet_to_json(ws, { defval: '' })

      if (datos.length === 0) { setErrorMsg('El archivo está vacío.'); return }

      const colores = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777']

      const nuevasActs = datos.map((fila, idx) => {
        const nombre = fila['Actividad'] || fila['actividad'] || fila['ACTIVIDAD'] || fila['Nombre'] || fila['nombre'] || ''
        const fechaIni = fila['Fecha inicio'] || fila['fecha_inicio'] || fila['Inicio'] || fila['inicio'] || ''
        const fechaFin = fila['Fecha fin'] || fila['fecha_fin'] || fila['Fin'] || fila['fin'] || ''
        const avance = parseInt(fila['% avance'] || fila['avance'] || fila['Avance'] || fila['porcentaje'] || 0)

        const parsearFecha = (f) => {
          if (!f) return ''
          if (f instanceof Date) return f.toISOString().split('T')[0]
          const str = String(f)
          if (str.includes('/')) {
            const partes = str.split('/')
            if (partes.length === 3) return `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`
          }
          return str
        }

        return {
          project_id: proyectoId,
          nombre: nombre || `Actividad ${idx + 1}`,
          fecha_inicio: parsearFecha(fechaIni),
          fecha_fin: parsearFecha(fechaFin),
          porcentaje_avance: Math.min(100, Math.max(0, avance)),
          orden: actividades.length + idx,
          color: colores[idx % colores.length]
        }
      }).filter(a => a.nombre && a.fecha_inicio && a.fecha_fin)

      if (nuevasActs.length === 0) {
        setErrorMsg('No se encontraron actividades válidas. Verifica que el Excel tenga columnas: Actividad, Fecha inicio, Fecha fin.')
        return
      }

      const { data, error } = await supabase.from('gantt_actividades').insert(nuevasActs).select()
      if (!error && data) {
        setActividades([...actividades, ...data])
      }
    } catch (err) {
      setErrorMsg('Error leyendo el archivo. Asegúrate de que sea un archivo Excel (.xlsx).')
    }
    e.target.value = ''
  }

  // Calcular rango de fechas para el Gantt
  const calcularRango = () => {
    if (actividades.length === 0) return { inicio: new Date(), fin: new Date(), dias: 30 }
    const fechas = actividades.flatMap(a => [new Date(a.fecha_inicio), new Date(a.fecha_fin)])
    const inicio = new Date(Math.min(...fechas))
    const fin = new Date(Math.max(...fechas))
    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1
    return { inicio, fin, dias }
  }

  const { inicio: rangoInicio, dias: rangoDias } = calcularRango()

  const posicionBarra = (fechaInicio, fechaFin) => {
    const ini = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const left = Math.max(0, Math.ceil((ini - rangoInicio) / (1000 * 60 * 60 * 24)))
    const width = Math.max(1, Math.ceil((fin - ini) / (1000 * 60 * 60 * 24)) + 1)
    return { left, width }
  }

  const avanceGeneral = actividades.length > 0
    ? Math.round(actividades.reduce((sum, a) => sum + a.porcentaje_avance, 0) / actividades.length)
    : 0

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Modal confirmar borrar */}
      {confirmBorrar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="text-red-600" size={22} />
              </div>
              <h3 className="font-bold text-gray-800">Borrar actividad</h3>
            </div>
            <p className="text-gray-600 text-sm mb-5">
              ¿Estás seguro de borrar <span className="font-semibold">"{confirmBorrar.nombre}"</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBorrar(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium">
                Cancelar
              </button>
              <button onClick={() => borrarActividad(confirmBorrar.id)}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 transition font-medium">
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push(`/dashboard/proyectos/${proyectoId}`)} className="text-gray-500 hover:text-gray-800">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Control de avance</h1>
            <p className="text-xs text-gray-500">{proyecto?.nombre}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Avance general */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">Avance general del proyecto</h2>
            <span className="text-2xl font-bold text-green-700">{avanceGeneral}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="h-4 rounded-full transition-all duration-500"
              style={{ width: `${avanceGeneral}%`, backgroundColor: '#16a34a' }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">{actividades.length} actividades registradas</p>
        </div>

        {/* Botones de acción */}
        {esDirector && (
          <div className="flex gap-3">
            <button onClick={() => setShowNueva(!showNueva)}
              className="flex items-center gap-2 bg-green-700 text-white px-4 py-2.5 rounded-xl hover:bg-green-800 transition text-sm font-medium">
              <Plus size={16} /> Nueva actividad
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm">
              <Upload size={16} /> Importar Excel
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={importarExcel} className="hidden" />
          </div>
        )}

        {/* Error importación */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* Formato esperado Excel */}
        {esDirector && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-700 font-medium mb-1">Formato esperado del Excel:</p>
            <p className="text-xs text-blue-600">Columnas: <span className="font-mono bg-blue-100 px-1 rounded">Actividad</span> | <span className="font-mono bg-blue-100 px-1 rounded">Fecha inicio</span> | <span className="font-mono bg-blue-100 px-1 rounded">Fecha fin</span> | <span className="font-mono bg-blue-100 px-1 rounded">% avance</span></p>
            <p className="text-xs text-blue-600 mt-1">Fechas en formato DD/MM/AAAA. El % avance es opcional (0-100).</p>
          </div>
        )}

        {/* Formulario nueva actividad */}
        {showNueva && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Nueva actividad</h3>
            <form onSubmit={agregarActividad} className="space-y-3">
              <input type="text" placeholder="Nombre de la actividad" required
                value={nueva.nombre}
                onChange={(e) => setNueva({...nueva, nombre: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fecha inicio</label>
                  <input type="date" required value={nueva.fecha_inicio}
                    onChange={(e) => setNueva({...nueva, fecha_inicio: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Fecha fin</label>
                  <input type="date" required value={nueva.fecha_fin}
                    onChange={(e) => setNueva({...nueva, fecha_fin: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">% Avance: {nueva.porcentaje_avance}%</label>
                  <input type="range" min="0" max="100" value={nueva.porcentaje_avance}
                    onChange={(e) => setNueva({...nueva, porcentaje_avance: e.target.value})}
                    className="w-full accent-green-700"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Color</label>
                  <div className="flex gap-2">
                    {['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0891b2','#db2777'].map(c => (
                      <button key={c} type="button"
                        onClick={() => setNueva({...nueva, color: c})}
                        className={`w-6 h-6 rounded-full border-2 ${nueva.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNueva(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando}
                  className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 disabled:opacity-50">
                  {guardando ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de actividades */}
        {actividades.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Actividades</h3>
            <div className="space-y-3">
              {actividades.map((a) => (
                <div key={a.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  {editandoId === a.id ? (
                    <div className="space-y-2">
                      <input type="text" value={editData.nombre}
                        onChange={(e) => setEditData({...editData, nombre: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Inicio</label>
                          <input type="date" value={editData.fecha_inicio}
                            onChange={(e) => setEditData({...editData, fecha_inicio: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Fin</label>
                          <input type="date" value={editData.fecha_fin}
                            onChange={(e) => setEditData({...editData, fecha_fin: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">% Avance: {editData.porcentaje_avance}%</label>
                        <input type="range" min="0" max="100" value={editData.porcentaje_avance}
                          onChange={(e) => setEditData({...editData, porcentaje_avance: e.target.value})}
                          className="w-full accent-green-700"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => guardarEdicion(a.id)}
                          className="flex items-center gap-1 bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-800">
                          <Check size={13} /> Guardar
                        </button>
                        <button onClick={() => setEditandoId(null)}
                          className="flex items-center gap-1 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50">
                          <X size={13} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                          <p className="text-sm font-medium text-gray-800">{a.nombre}</p>
                        </div>
                        {esDirector && (
                          <div className="flex gap-1">
                            <button onClick={() => iniciarEdicion(a)} className="text-gray-400 hover:text-blue-500 p-1">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setConfirmBorrar(a)} className="text-gray-400 hover:text-red-500 p-1">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                        <span>📅 {new Date(a.fecha_inicio + 'T12:00:00').toLocaleDateString('es-CO')}</span>
                        <span>→</span>
                        <span>{new Date(a.fecha_fin + 'T12:00:00').toLocaleDateString('es-CO')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all"
                            style={{ width: `${a.porcentaje_avance}%`, backgroundColor: a.color }} />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-8 text-right">{a.porcentaje_avance}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagrama de Gantt */}
        {actividades.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Diagrama de Gantt</h3>
            <div className="overflow-x-auto">
              <div style={{ minWidth: Math.max(600, rangoDias * 20 + 200) }}>
                {/* Encabezado de meses */}
                <div className="flex mb-1 ml-48">
                  {Array.from({ length: rangoDias }, (_, i) => {
                    const d = new Date(rangoInicio)
                    d.setDate(d.getDate() + i)
                    if (d.getDate() === 1 || i === 0) {
                      return (
                        <div key={i} className="text-xs text-gray-400 font-medium"
                          style={{ position: 'absolute', left: 192 + i * 20, whiteSpace: 'nowrap' }}>
                          {d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })}
                        </div>
                      )
                    }
                    return null
                  })}
                </div>

                <div className="relative" style={{ marginTop: 20 }}>
                  {actividades.map((a, idx) => {
                    const { left, width } = posicionBarra(a.fecha_inicio, a.fecha_fin)
                    return (
                      <div key={a.id} className="flex items-center mb-2" style={{ height: 32 }}>
                        <div className="w-48 pr-3 shrink-0">
                          <p className="text-xs text-gray-700 truncate">{a.nombre}</p>
                        </div>
                        <div className="relative flex-1" style={{ height: 24 }}>
                          {/* Fondo gris */}
                          <div className="absolute inset-0 bg-gray-100 rounded" />
                          {/* Barra total */}
                          <div className="absolute top-0 bottom-0 rounded opacity-30"
                            style={{ left: left * 20, width: width * 20, backgroundColor: a.color }} />
                          {/* Barra de avance */}
                          <div className="absolute top-0 bottom-0 rounded"
                            style={{ left: left * 20, width: (width * 20 * a.porcentaje_avance / 100), backgroundColor: a.color }} />
                          {/* Etiqueta % */}
                          <div className="absolute top-0 bottom-0 flex items-center"
                            style={{ left: left * 20 + 4 }}>
                            <span className="text-xs text-white font-bold drop-shadow">{a.porcentaje_avance}%</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {actividades.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No hay actividades aún</p>
            <p className="text-sm">Agrega actividades manualmente o importa un Excel</p>
          </div>
        )}
      </main>
    </div>
  )
}