'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, FolderOpen, LogOut, HardHat, Trash2, AlertTriangle, X, Pencil, Check } from 'lucide-react'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProject, setNewProject] = useState({ nombre: '', ubicacion: '', descripcion: '', fecha_inicio: '', fecha_fin_estimada: '' })
  const [loading, setLoading] = useState(true)
  const [confirmBorrar, setConfirmBorrar] = useState(null)
  const [editando, setEditando] = useState(null)
  const [editData, setEditData] = useState({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: prof } = await supabase
      .from('profiles').select('*, organizations(*)').eq('id', user.id).single()
    if (!prof) { setLoading(false); return }
    setProfile(prof)
    const { data: projs } = await supabase
      .from('projects').select('*').eq('org_id', prof.org_id).order('created_at', { ascending: false })
    setProjects(projs || [])
    setLoading(false)
  }

  const crearProyecto = async (e) => {
    e.preventDefault()
    const payload = { nombre: newProject.nombre, org_id: profile.org_id, estado: 'activo' }
    if (newProject.ubicacion) payload.ubicacion = newProject.ubicacion
    if (newProject.descripcion) payload.descripcion = newProject.descripcion
    if (newProject.fecha_inicio) payload.fecha_inicio = newProject.fecha_inicio
    if (newProject.fecha_fin_estimada) payload.fecha_fin_estimada = newProject.fecha_fin_estimada
    const { data: proj, error } = await supabase.from('projects').insert(payload).select().single()
    if (!error && proj) {
      setProjects([proj, ...projects])
      setShowNewProject(false)
      setNewProject({ nombre: '', ubicacion: '', descripcion: '', fecha_inicio: '', fecha_fin_estimada: '' })
    }
  }

  const iniciarEdicion = (p) => {
    setEditando(p.id)
    setEditData({
      nombre: p.nombre || '',
      estado: p.estado || 'activo',
      ubicacion: p.ubicacion || '',
      descripcion: p.descripcion || '',
      fecha_inicio: p.fecha_inicio || '',
      fecha_fin_estimada: p.fecha_fin_estimada || ''
    })
  }

  const guardarEdicion = async (id) => {
    const payload = {
      nombre: editData.nombre,
      estado: editData.estado || 'activo',
    }
    payload.ubicacion = editData.ubicacion || null
    payload.descripcion = editData.descripcion || null
    payload.fecha_inicio = editData.fecha_inicio || null
    payload.fecha_fin_estimada = editData.fecha_fin_estimada || null

    const { error } = await supabase.from('projects').update(payload).eq('id', id)
    if (!error) {
      setProjects(projects.map(p => p.id === id ? { ...p, ...payload } : p))
    }
    setEditando(null)
  }

  const borrarProyecto = async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) setProjects(prev => prev.filter(p => p.id !== id))
    setConfirmBorrar(null)
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const estadoBadge = (estado) => {
    switch(estado) {
      case 'en pausa': return 'bg-yellow-100 text-yellow-700'
      case 'terminado': return 'bg-blue-100 text-blue-700'
      case 'cancelado': return 'bg-red-100 text-red-700'
      default: return 'bg-green-100 text-green-700'
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">No se encontró tu perfil.</p>
        <button onClick={cerrarSesion} className="text-red-500 underline">Cerrar sesión</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Modal confirmación borrar proyecto */}
      {confirmBorrar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="text-red-600" size={22} />
              </div>
              <h3 className="font-bold text-gray-800">Borrar proyecto</h3>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              Estas a punto de borrar <span className="font-semibold text-gray-800">"{confirmBorrar.nombre}"</span>.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
              <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                <AlertTriangle size={14} />
                Esta acción es irreversible. Todos los datos, bitácoras, fotos y actividades se perderán para siempre y no podrán recuperarse.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmBorrar(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium">
                Cancelar
              </button>
              <button onClick={() => borrarProyecto(confirmBorrar.id)}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 transition font-medium">
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar proyecto */}
      {editando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar proyecto</h3>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
                <input type="text" required
                  value={editData.nombre}
                  onChange={(e) => setEditData({...editData, nombre: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Estado del proyecto</label>
                <select
                  value={editData.estado || 'activo'}
                  onChange={(e) => setEditData({...editData, estado: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="activo">Activo</option>
                  <option value="en pausa">En pausa</option>
                  <option value="terminado">Terminado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ubicacion</label>
                <input type="text" placeholder="Opcional"
                  value={editData.ubicacion}
                  onChange={(e) => setEditData({...editData, ubicacion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descripcion</label>
                <textarea placeholder="Opcional"
                  value={editData.descripcion}
                  onChange={(e) => setEditData({...editData, descripcion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={2}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">Fecha inicio</label>
                  {editData.fecha_inicio && (
                    <button onClick={() => setEditData({...editData, fecha_inicio: ''})}
                      className="text-xs text-red-400 hover:text-red-600">
                      Borrar fecha
                    </button>
                  )}
                </div>
                <input type="date"
                  value={editData.fecha_inicio}
                  onChange={(e) => setEditData({...editData, fecha_inicio: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">Fecha fin estimada</label>
                  {editData.fecha_fin_estimada && (
                    <button onClick={() => setEditData({...editData, fecha_fin_estimada: ''})}
                      className="text-xs text-red-400 hover:text-red-600">
                      Borrar fecha
                    </button>
                  )}
                </div>
                <input type="date"
                  value={editData.fecha_fin_estimada}
                  onChange={(e) => setEditData({...editData, fecha_fin_estimada: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditando(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={() => guardarEdicion(editando)}
                  className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 flex items-center justify-center gap-2">
                  <Check size={16} /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardHat className="text-green-700" size={28} />
            <div>
              <h1 className="text-xl font-bold text-green-700">Ingecora</h1>
              <p className="text-xs text-gray-500">{profile?.organizations?.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">Hola, {profile?.nombre}</span>
            <button onClick={cerrarSesion} className="flex items-center gap-1 text-gray-500 hover:text-red-500 text-sm">
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Mis proyectos</h2>
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition"
          >
            <Plus size={18} /> Nuevo proyecto
          </button>
        </div>

        {/* Modal nuevo proyecto */}
        {showNewProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Nuevo proyecto</h3>
                <button onClick={() => setShowNewProject(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={crearProyecto} className="space-y-3">
                <input type="text" placeholder="Nombre del proyecto" required
                  value={newProject.nombre}
                  onChange={(e) => setNewProject({...newProject, nombre: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input type="text" placeholder="Ubicacion (opcional)"
                  value={newProject.ubicacion}
                  onChange={(e) => setNewProject({...newProject, ubicacion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <textarea placeholder="Descripcion (opcional)"
                  value={newProject.descripcion}
                  onChange={(e) => setNewProject({...newProject, descripcion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={2}
                />
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Fecha inicio (opcional)</label>
                    <input type="date"
                      value={newProject.fecha_inicio}
                      onChange={(e) => setNewProject({...newProject, fecha_inicio: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-2 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Fecha fin estimada (opcional)</label>
                    <input type="date"
                      value={newProject.fecha_fin_estimada}
                      onChange={(e) => setNewProject({...newProject, fecha_fin_estimada: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-2 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowNewProject(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button type="submit"
                    className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800">
                    Crear
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de proyectos */}
        {projects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FolderOpen size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg">No tienes proyectos aún</p>
            <p className="text-sm">Crea tu primer proyecto para empezar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-5 pb-14 shadow-sm border border-gray-100 relative">
                <div onClick={() => router.push(`/dashboard/proyectos/${p.id}`)} className="cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-800 pr-4">{p.nombre}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 font-medium capitalize ${estadoBadge(p.estado)}`}>
                      {p.estado}
                    </span>
                  </div>
                  {p.ubicacion && <p className="text-sm text-gray-500 mb-1">📍 {p.ubicacion}</p>}
                  {p.descripcion && <p className="text-sm text-gray-400 line-clamp-2">{p.descripcion}</p>}
                  {p.fecha_inicio && (
                    <p className="text-xs text-gray-400 mt-3">
                      Inicio: {new Date(p.fecha_inicio).toLocaleDateString('es-CO')}
                    </p>
                  )}
                </div>
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); iniciarEdicion(p) }}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-600 transition px-2 py-1 rounded-lg hover:bg-blue-50 border border-blue-200 hover:border-blue-400 text-xs"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmBorrar(p) }}
                    className="flex items-center gap-1 text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50 border border-red-200 hover:border-red-400 text-xs"
                  >
                    <Trash2 size={13} /> Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}