'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft, UserPlus, Trash2, Users, AlertTriangle } from 'lucide-react'

export default function MiembrosPage() {
  const [proyecto, setProyecto] = useState(null)
  const [miembros, setMiembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [proyectoId, setProyectoId] = useState(null)
  const [busquedaEmail, setBusquedaEmail] = useState('')
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null)
  const [rolSeleccionado, setRolSeleccionado] = useState('residente')
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [cambiandoRol, setCambiandoRol] = useState(null)
  const [errorRol, setErrorRol] = useState('')
  const [miRol, setMiRol] = useState(null)
  const [miId, setMiId] = useState(null)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
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
    setMiId(user?.id)

    const { data: proy } = await supabase
      .from('projects').select('*').eq('id', id).single()
    setProyecto(proy)

    const { data: mbs } = await supabase
      .from('project_members').select('*, profiles(nombre, email)')
      .eq('project_id', id)
    setMiembros(mbs || [])

    const miMembership = (mbs || []).find(m => m.user_id === user?.id)
    setMiRol(miMembership?.rol || null)

    setLoading(false)
  }

  const contarDirectores = () => miembros.filter(m => m.rol === 'director').length

  const buscarUsuario = async () => {
    if (!busquedaEmail) return
    setBuscando(true)
    setErrorBusqueda('')
    setUsuarioEncontrado(null)

    const { data: perfil } = await supabase
      .from('profiles').select('*').eq('email', busquedaEmail).single()

    if (!perfil) {
      setErrorBusqueda('No se encontró ningún usuario con ese correo. Debe estar registrado en Ingecora.')
    } else {
      const yaEsMiembro = miembros.find(m => m.user_id === perfil.id)
      if (yaEsMiembro) {
        setErrorBusqueda('Este usuario ya es miembro del proyecto.')
      } else {
        setUsuarioEncontrado(perfil)
      }
    }
    setBuscando(false)
  }

  const agregarMiembro = async () => {
    if (!usuarioEncontrado) return
    setAgregando(true)

    const { data, error } = await supabase
      .from('project_members')
      .insert({ project_id: proyectoId, user_id: usuarioEncontrado.id, rol: rolSeleccionado })
      .select('*, profiles(nombre, email)').single()

    if (!error && data) {
      setMiembros([...miembros, data])

      // Enviar correo de notificación
      try {
        const { error: fnError } = await supabase.functions.invoke('enviar-invitacion', {
          body: {
            nombreInvitado: usuarioEncontrado.nombre,
            emailInvitado: usuarioEncontrado.email,
            nombreProyecto: proyecto?.nombre,
            projectId: proyectoId
          }
        })
        if (fnError) console.error('Error enviando correo:', fnError)
      } catch (e) {
        console.error('Error llamando Edge Function:', e)
      }

      setUsuarioEncontrado(null)
      setBusquedaEmail('')
    }
    setAgregando(false)
  }

  const cambiarRol = async (miembro, nuevoRol) => {
    setErrorRol('')

    if (miembro.user_id === miId && nuevoRol !== 'director') {
      setErrorRol('No puedes cambiar tu propio rol de Director.')
      return
    }

    if (miembro.rol === 'director' && nuevoRol !== 'director') {
      if (contarDirectores() <= 1) {
        setErrorRol('Debe haber al menos un Director en el proyecto. Asigna otro Director antes de cambiar este rol.')
        return
      }
    }

    setCambiandoRol(miembro.id)
    await supabase.from('project_members').update({ rol: nuevoRol }).eq('id', miembro.id)
    setMiembros(miembros.map(m => m.id === miembro.id ? { ...m, rol: nuevoRol } : m))
    setCambiandoRol(null)
  }

  const solicitarEliminar = (miembro) => {
    setErrorRol('')

    if (miembro.user_id === miId && miembro.rol === 'director' && contarDirectores() <= 1) {
      setErrorRol('No puedes eliminarte porque eres el único Director. Asigna otro Director primero.')
      return
    }

    if (miembro.rol === 'director' && contarDirectores() <= 1) {
      setErrorRol('No puedes eliminar al único Director del proyecto.')
      return
    }

    setConfirmEliminar(miembro)
  }

  const confirmarEliminar = async () => {
    if (!confirmEliminar) return
    await supabase.from('project_members').delete().eq('id', confirmEliminar.id)
    setMiembros(miembros.filter(m => m.id !== confirmEliminar.id))
    setConfirmEliminar(null)
  }

  const rolColor = (rol) => {
    if (rol === 'director') return 'bg-purple-100 text-purple-700'
    if (rol === 'residente') return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-600'
  }

  const esDirector = miRol === 'director'

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {confirmEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="text-red-600" size={22} />
              </div>
              <h3 className="font-bold text-gray-800">Eliminar miembro</h3>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              Estás a punto de eliminar a{' '}
              <span className="font-semibold text-gray-800">{confirmEliminar.profiles?.nombre}</span>{' '}
              del proyecto.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
              <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                Este usuario perderá acceso inmediato al proyecto y no podrá ver bitácoras, fotos ni informes.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEliminar(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium">
                Cancelar
              </button>
              <button onClick={confirmarEliminar}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 transition font-medium">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-[0_2px_4px_rgba(0,0,0,0.08)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push(`/dashboard/proyectos/${proyectoId}`)} className="text-gray-500 hover:text-gray-800">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Miembros</h1>
            <p className="text-xs text-gray-500">{proyecto?.nombre}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {!esDirector && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-sm text-blue-700">Solo el Director puede gestionar miembros. Tienes acceso de solo lectura a esta sección.</p>
          </div>
        )}

        {esDirector && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus size={18} className="text-green-700" />
              <h2 className="font-bold text-gray-800">Agregar por correo</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">El usuario debe estar registrado en Ingecora.</p>
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={busquedaEmail}
                onChange={(e) => setBusquedaEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarUsuario()}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button onClick={buscarUsuario} disabled={buscando}
                className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-800 transition disabled:opacity-50">
                {buscando ? '...' : 'Buscar'}
              </button>
            </div>

            {errorBusqueda && <p className="text-red-500 text-sm mb-3">{errorBusqueda}</p>}

            {usuarioEncontrado && (
              <div className="border border-green-200 bg-green-50 rounded-lg p-3 mb-3">
                <p className="text-sm font-medium text-gray-800">{usuarioEncontrado.nombre}</p>
                <p className="text-xs text-gray-500 mb-3">{usuarioEncontrado.email}</p>
                <div className="flex gap-2 items-center">
                  <select
                    value={rolSeleccionado}
                    onChange={(e) => setRolSeleccionado(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="director">Director</option>
                    <option value="residente">Residente</option>
                    <option value="cliente">Cliente (solo lectura)</option>
                  </select>
                  <button onClick={agregarMiembro} disabled={agregando}
                    className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800 transition disabled:opacity-50">
                    {agregando ? '...' : 'Agregar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {errorRol && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errorRol}</p>
          </div>
        )}

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-green-700" />
            <h2 className="font-bold text-gray-800">Miembros del proyecto</h2>
          </div>
          {miembros.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No hay miembros agregados aún</p>
          ) : (
            <div className="space-y-2">
              {miembros.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.profiles?.nombre}</p>
                    <p className="text-xs text-gray-500 truncate">{m.profiles?.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {esDirector ? (
                      <select
                        value={m.rol}
                        onChange={(e) => cambiarRol(m, e.target.value)}
                        disabled={cambiandoRol === m.id}
                        className={`border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 ${rolColor(m.rol)}`}
                      >
                        <option value="director">Director</option>
                        <option value="residente">Residente</option>
                        <option value="cliente">Cliente</option>
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${rolColor(m.rol)}`}>
                        {m.rol.charAt(0).toUpperCase() + m.rol.slice(1)}
                      </span>
                    )}
                    {esDirector && (
                      <button onClick={() => solicitarEliminar(m)}
                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}