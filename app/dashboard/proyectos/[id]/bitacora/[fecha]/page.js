'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Save, Send, Pencil, Check, X, Camera, Image } from 'lucide-react'

function TooltipActividades() {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setVisible(!visible)}
        className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold"
      >
        ?
      </button>
      {visible && (
        <div className="fixed inset-0 z-20" onClick={() => setVisible(false)}>
          <div className="absolute bg-gray-800 text-white text-xs rounded-lg px-3 py-2 z-30 shadow-lg w-56"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={e => e.stopPropagation()}>
            Digite la información relacionada a la actividad y de clic en "Agregar actividad"
            <button onClick={() => setVisible(false)} className="block mt-2 text-gray-400 hover:text-white">Cerrar ✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BitacoraPage() {
  const [log, setLog] = useState(null)
  const [actividades, setActividades] = useState([])
  const [fotos, setFotos] = useState([])
  const [nuevaActividad, setNuevaActividad] = useState({ capitulo: '', partida: '', descripcion: '' })
  const [editandoId, setEditandoId] = useState(null)
  const [editandoData, setEditandoData] = useState({})
  const [clima, setClima] = useState('')
  const [personal, setPersonal] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [proyectoId, setProyectoId] = useState(null)
  const [fecha, setFecha] = useState(null)
  const [confirmBorrar, setConfirmBorrar] = useState(false)
  const [fotoSeleccionada, setFotoSeleccionada] = useState(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const partes = pathname.split('/')
    const id = partes[partes.indexOf('proyectos') + 1]
    const f = partes[partes.indexOf('bitacora') + 1]
    setProyectoId(id)
    setFecha(f)
    loadData(id, f)
  }, [pathname])

  const loadData = async (id, f) => {
    const { data: existingLog } = await supabase
      .from('daily_logs').select('*')
      .eq('project_id', id).eq('fecha', f).maybeSingle()

    if (existingLog) {
      setLog(existingLog)
      setClima(existingLog.clima || '')
      setPersonal(existingLog.personal_en_sitio ?? '')
      setObservaciones(existingLog.observaciones || '')
      const { data: acts } = await supabase
        .from('log_actividades').select('*')
        .eq('log_id', existingLog.id).order('orden')
      setActividades(acts || [])
      const { data: fts } = await supabase
        .from('log_fotos').select('*')
        .eq('log_id', existingLog.id).order('created_at')
      setFotos(fts || [])
    }
    setLoading(false)
  }

  const obtenerOCrearLog = async (id, f) => {
    if (log) return log
    const { data: { user } } = await supabase.auth.getUser()
    const { data: newLog, error } = await supabase
      .from('daily_logs')
      .insert({ project_id: id, fecha: f, clima, personal_en_sitio: parseInt(personal) || 0, observaciones, estado: 'borrador', responsable_id: user.id })
      .select().single()
    if (error?.code === '23505') {
      const { data: existing } = await supabase.from('daily_logs').select('*').eq('project_id', id).eq('fecha', f).maybeSingle()
      if (existing) { setLog(existing); return existing }
    }
    if (error || !newLog) return null
    setLog(newLog)
    return newLog
  }

  const guardarBitacora = async (estado = 'borrador') => {
    setGuardando(true)
    const logActual = await obtenerOCrearLog(proyectoId, fecha)
    if (!logActual) { setGuardando(false); return }
    await supabase.from('daily_logs')
      .update({ clima, personal_en_sitio: parseInt(personal) || 0, observaciones, estado })
      .eq('id', logActual.id)
    setLog({ ...logActual, estado })
    setGuardando(false)
    if (estado === 'publicada') router.push(`/dashboard/proyectos/${proyectoId}`)
  }

  const agregarActividad = async () => {
    if (!nuevaActividad.descripcion) return
    const logActual = await obtenerOCrearLog(proyectoId, fecha)
    if (!logActual) return
    const { data: act } = await supabase
      .from('log_actividades')
      .insert({ ...nuevaActividad, log_id: logActual.id, orden: actividades.length })
      .select().single()
    if (act) {
      setActividades([...actividades, act])
      setNuevaActividad({ capitulo: '', partida: '', descripcion: '' })
    }
  }

  const eliminarActividad = async (id) => {
    await supabase.from('log_actividades').delete().eq('id', id)
    setActividades(actividades.filter(a => a.id !== id))
  }

  const iniciarEdicion = (a) => {
    setEditandoId(a.id)
    setEditandoData({ capitulo: a.capitulo || '', partida: a.partida || '', descripcion: a.descripcion || '' })
  }

  const guardarEdicion = async (id) => {
    await supabase.from('log_actividades').update(editandoData).eq('id', id)
    setActividades(actividades.map(a => a.id === id ? { ...a, ...editandoData } : a))
    setEditandoId(null)
  }

  const cancelarEdicion = () => setEditandoId(null)

  const borrarBitacora = async () => {
    await supabase.from('daily_logs').delete().eq('id', log.id)
    router.push(`/dashboard/proyectos/${proyectoId}`)
  }

  const subirFoto = async (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return
    setSubiendoFoto(true)
    const logActual = await obtenerOCrearLog(proyectoId, fecha)
    if (!logActual) { setSubiendoFoto(false); return }
    const extension = archivo.name.split('.').pop()
    const nombreArchivo = `${logActual.id}/${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('fotos-bitacora').upload(nombreArchivo, archivo)
    if (uploadError) { setSubiendoFoto(false); return }
    const { data: urlData } = supabase.storage
      .from('fotos-bitacora').getPublicUrl(nombreArchivo)
    const { data: foto } = await supabase
      .from('log_fotos')
      .insert({ log_id: logActual.id, url: urlData.publicUrl })
      .select().single()
    if (foto) setFotos([...fotos, foto])
    setSubiendoFoto(false)
  }

  const eliminarFoto = async (foto) => {
    const path = foto.url.split('/fotos-bitacora/')[1]
    await supabase.storage.from('fotos-bitacora').remove([path])
    await supabase.from('log_fotos').delete().eq('id', foto.id)
    setFotos(fotos.filter(f => f.id !== foto.id))
    if (fotoSeleccionada?.id === foto.id) setFotoSeleccionada(null)
  }

  const fechaFormateada = () => {
    if (!fecha) return ''
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal foto */}
      {fotoSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setFotoSeleccionada(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img src={fotoSeleccionada.url} alt="Foto" className="w-full rounded-xl max-h-[80vh] object-contain" />
            <button onClick={() => setFotoSeleccionada(null)}
              className="absolute top-2 right-2 bg-white rounded-full p-1 text-gray-800 hover:bg-gray-100">
              <X size={20} />
            </button>
            <button onClick={() => eliminarFoto(fotoSeleccionada)}
              className="absolute bottom-2 right-2 bg-red-500 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-red-600 flex items-center gap-1">
              <Trash2 size={14} /> Eliminar foto
            </button>
          </div>
        </div>
      )}

      <header className="bg-white shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/dashboard/proyectos/${proyectoId}`)} className="text-gray-500 hover:text-gray-800">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800 capitalize">{fechaFormateada()}</h1>
              <p className="text-xs text-gray-500">Bitácora de obra</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {log && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                log.estado === 'aprobada' ? 'bg-green-100 text-green-700' :
                log.estado === 'publicada' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{log.estado}</span>
            )}
            {log && !confirmBorrar && (
              <button onClick={() => setConfirmBorrar(true)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-red-200 hover:border-red-400 transition">
                Borrar
              </button>
            )}
            {confirmBorrar && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">¿Confirmar?</span>
                <button onClick={borrarBitacora} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">Sí</button>
                <button onClick={() => setConfirmBorrar(false)} className="text-xs text-gray-500 px-2 py-1 rounded border hover:bg-gray-50">No</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Condiciones */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4">Condiciones del día</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Clima</label>
              <select value={clima} onChange={(e) => setClima(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Seleccionar</option>
                <option value="Soleado">☀️ Soleado</option>
                <option value="Nublado">⛅ Nublado</option>
                <option value="Lluvioso">🌧 Lluvioso</option>
                <option value="Parcialmente nublado">🌤 Parcialmente nublado</option>
                <option value="Tormenta">⛈ Tormenta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Personal en sitio</label>
              <input type="number" value={personal} onChange={(e) => setPersonal(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                min={0} placeholder="0" />
            </div>
          </div>
        </div>

        {/* Actividades */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-bold text-gray-800">Actividades realizadas</h2>
            <TooltipActividades />
          </div>
          {actividades.length > 0 && (
            <div className="space-y-3 mb-4">
              {actividades.map((a) => (
                <div key={a.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  {editandoId === a.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input type="text" placeholder="Capítulo"
                          value={editandoData.capitulo}
                          onChange={(e) => setEditandoData({...editandoData, capitulo: e.target.value})}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <input type="text" placeholder="Partida"
                          value={editandoData.partida}
                          onChange={(e) => setEditandoData({...editandoData, partida: e.target.value})}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <textarea value={editandoData.descripcion}
                        onChange={(e) => setEditandoData({...editandoData, descripcion: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => guardarEdicion(a.id)}
                          className="flex items-center gap-1 bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-800">
                          <Check size={13} /> Guardar
                        </button>
                        <button onClick={cancelarEdicion}
                          className="flex items-center gap-1 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50">
                          <X size={13} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {(a.capitulo || a.partida) && (
                          <div className="flex gap-2 mb-1">
                            {a.capitulo && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{a.capitulo}</span>}
                            {a.partida && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{a.partida}</span>}
                          </div>
                        )}
                        <p className="text-sm text-gray-800">{a.descripcion}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => iniciarEdicion(a)} className="text-gray-400 hover:text-blue-500">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => eliminarActividad(a.id)} className="text-gray-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" placeholder="Capítulo (ej: Estructura)"
                value={nuevaActividad.capitulo}
                onChange={(e) => setNuevaActividad({...nuevaActividad, capitulo: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input type="text" placeholder="Partida (ej: Columnas)"
                value={nuevaActividad.partida}
                onChange={(e) => setNuevaActividad({...nuevaActividad, partida: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <textarea placeholder="Descripción de la actividad realizada..."
              value={nuevaActividad.descripcion}
              onChange={(e) => setNuevaActividad({...nuevaActividad, descripcion: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={3}
            />
            <button onClick={agregarActividad}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition">
              <Plus size={16} /> Agregar actividad
            </button>
          </div>
        </div>

        {/* Fotos */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Fotos del día</h2>
            <label className={`flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm cursor-pointer hover:bg-green-800 transition ${subiendoFoto ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Camera size={16} />
              {subiendoFoto ? 'Subiendo...' : 'Agregar foto'}
              <input type="file" accept="image/*" onChange={subirFoto} className="hidden" disabled={subiendoFoto} />
            </label>
          </div>
          {fotos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Image size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay fotos aún</p>
              <p className="text-xs">Agrega fotos desde tu celular o computador</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f) => (
                <div key={f.id} onClick={() => setFotoSeleccionada(f)}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition">
                  <img src={f.url} alt="Foto obra" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Observaciones */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4">Observaciones e incidentes</h2>
          <textarea
            placeholder="Anota cualquier observación importante, incidente o novedad del día..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={4}
          />
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button onClick={() => guardarBitacora('borrador')} disabled={guardando}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition disabled:opacity-50">
            <Save size={18} /> Guardar borrador
          </button>
          <button onClick={() => guardarBitacora('publicada')} disabled={guardando}
            className="flex-1 flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl hover:bg-green-800 transition disabled:opacity-50">
            <Send size={18} /> Publicar bitácora
          </button>
        </div>
      </main>
    </div>
  )
}