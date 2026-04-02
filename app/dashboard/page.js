'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { Plus, FolderOpen, LogOut, HardHat } from 'lucide-react'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProject, setNewProject] = useState({ nombre: '', ubicacion: '', descripcion: '', fecha_inicio: '', fecha_fin_estimada: '' })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase
      .from('profiles').select('*, organizations(*)').eq('id', user.id).single()

    if (!prof) {
      setLoading(false)
      return
    }

    setProfile(prof)

    const { data: projs } = await supabase
      .from('projects').select('*').eq('org_id', prof.org_id).order('created_at', { ascending: false })
    setProjects(projs || [])
    setLoading(false)
  }

  const crearProyecto = async (e) => {
    e.preventDefault()
    const { data: proj, error } = await supabase
      .from('projects')
      .insert({ ...newProject, org_id: profile.org_id })
      .select().single()
    if (!error) {
      setProjects([proj, ...projects])
      setShowNewProject(false)
      setNewProject({ nombre: '', ubicacion: '', descripcion: '', fecha_inicio: '', fecha_fin_estimada: '' })
    }
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardHat className="text-green-700" size={28} />
            <div>
              <h1 className="text-xl font-bold text-green-700">Ingecora</h1>
              <p className="text-xs text-gray-500">{profile?.organizations?.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Hola, {profile?.nombre}</span>
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

        {showNewProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Nuevo proyecto</h3>
              <form onSubmit={crearProyecto} className="space-y-3">
                <input
                  type="text" placeholder="Nombre del proyecto" required
                  value={newProject.nombre}
                  onChange={(e) => setNewProject({...newProject, nombre: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                />
                <input
                  type="text" placeholder="Ubicación"
                  value={newProject.ubicacion}
                  onChange={(e) => setNewProject({...newProject, ubicacion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                />
                <textarea
                  placeholder="Descripción"
                  value={newProject.descripcion}
                  onChange={(e) => setNewProject({...newProject, descripcion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Fecha inicio</label>
                    <input type="date"
                      value={newProject.fecha_inicio}
                      onChange={(e) => setNewProject({...newProject, fecha_inicio: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Fecha fin estimada</label>
                    <input type="date"
                      value={newProject.fecha_fin_estimada}
                      onChange={(e) => setNewProject({...newProject, fecha_fin_estimada: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
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

        {projects.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FolderOpen size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg">No tienes proyectos aún</p>
            <p className="text-sm">Crea tu primer proyecto para empezar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id}
                onClick={() => router.push(`/dashboard/proyectos/${p.id}`)}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition cursor-pointer border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-800">{p.nombre}</h3>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{p.estado}</span>
                </div>
                {p.ubicacion && <p className="text-sm text-gray-500 mb-1">📍 {p.ubicacion}</p>}
                {p.descripcion && <p className="text-sm text-gray-400 line-clamp-2">{p.descripcion}</p>}
                {p.fecha_inicio && (
                  <p className="text-xs text-gray-400 mt-3">
                    Inicio: {new Date(p.fecha_inicio).toLocaleDateString('es-CO')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}