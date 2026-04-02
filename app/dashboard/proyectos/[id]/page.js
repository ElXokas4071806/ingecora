'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft, Plus, BookOpen, CheckCircle, Clock, Calendar, FileText } from 'lucide-react'

export default function ProyectoPage() {
  const [proyecto, setProyecto] = useState(null)
  const [bitacoras, setBitacoras] = useState([])
  const [loading, setLoading] = useState(true)
  const [proyectoId, setProyectoId] = useState(null)
  const [mostrarSelector, setMostrarSelector] = useState(false)
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
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
    const { data: proy } = await supabase
      .from('projects').select('*').eq('id', id).single()
    setProyecto(proy)

    const { data: logs } = await supabase
      .from('daily_logs').select('*').eq('project_id', id)
      .order('fecha', { ascending: false })
    setBitacoras(logs || [])
    setLoading(false)
  }

  const nuevaBitacora = (fecha) => {
    router.push(`/dashboard/proyectos/${proyectoId}/bitacora/${fecha}`)
  }

  const hoy = () => new Date().toISOString().split('T')[0]

  const estadoColor = (estado) => {
    if (estado === 'aprobada') return 'bg-green-100 text-green-700'
    if (estado === 'publicada') return 'bg-blue-100 text-blue-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  const estadoIcono = (estado) => {
    if (estado === 'aprobada') return <CheckCircle size={14} />
    if (estado === 'publicada') return <BookOpen size={14} />
    return <Clock size={14} />
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-800">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{proyecto?.nombre}</h1>
            {proyecto?.ubicacion && <p className="text-xs text-gray-500">📍 {proyecto.ubicacion}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-700">{bitacoras.length}</p>
            <p className="text-xs text-gray-500">Bitácoras</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">
              {bitacoras.filter(b => b.estado === 'aprobada').length}
            </p>
            <p className="text-xs text-gray-500">Aprobadas</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {bitacoras.filter(b => b.estado === 'borrador').length}
            </p>
            <p className="text-xs text-gray-500">Borradores</p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800">Bitácoras</h2>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/dashboard/proyectos/${proyectoId}/informe`)}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              <FileText size={16} /> Informe PDF
            </button>
            <button
              onClick={() => setMostrarSelector(!mostrarSelector)}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              <Calendar size={16} /> Otra fecha
            </button>
            <button
              onClick={() => nuevaBitacora(hoy())}
              className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition text-sm"
            >
              <Plus size={18} /> Bitácora de hoy
            </button>
          </div>
        </div>

        {/* Selector de fecha */}
        {mostrarSelector && (
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4 flex items-center gap-3">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={fechaSeleccionada}
              max={hoy()}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={() => {
                if (fechaSeleccionada) {
                  nuevaBitacora(fechaSeleccionada)
                  setMostrarSelector(false)
                }
              }}
              disabled={!fechaSeleccionada}
              className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition text-sm disabled:opacity-50"
            >
              Ir a esa fecha
            </button>
            <button onClick={() => setMostrarSelector(false)} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft size={16} />
            </button>
          </div>
        )}

        {/* Lista de bitácoras */}
        {bitacoras.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg">No hay bitácoras aún</p>
            <p className="text-sm">Registra el avance de hoy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bitacoras.map((b) => (
              <div key={b.id}
                onClick={() => router.push(`/dashboard/proyectos/${proyectoId}/bitacora/${b.fecha}`)}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">
                    {new Date(b.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                  {b.clima && <p className="text-sm text-gray-500 mt-1">🌤 {b.clima} · 👷 {b.personal_en_sitio} personas</p>}
                </div>
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${estadoColor(b.estado)}`}>
                  {estadoIcono(b.estado)}
                  <span className="capitalize">{b.estado}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}