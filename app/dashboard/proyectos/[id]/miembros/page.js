'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft, UserPlus, Link, Trash2, Copy, Check, Users, AlertTriangle } from 'lucide-react'

export default function MiembrosPage() {
  const [proyecto, setProyecto] = useState(null)
  const [miembros, setMiembros] = useState([])
  const [invitaciones, setInvitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [proyectoId, setProyectoId] = useState(null)
  const [busquedaEmail, setBusquedaEmail] = useState('')
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null)
  const [rolSeleccionado, setRolSeleccionado] = useState('residente')
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [cambiandoRol, setCambiandoRol] = useState(null)
  const [errorRol, setErrorRol] = useState('')
  const [miRol, setMiRol] = useState(null)
  const [miId, setMiId] = useState(null)

  // 🔥 NUEVO (modal)
  const [miembroAEliminar, setMiembroAEliminar] = useState(null)
  const [mostrarModal, setMostrarModal] = useState(false)

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

    const { data: invs } = await supabase
      .from('project_invitations').select('*')
      .eq('project_id', id).eq('activo', true)
    setInvitaciones(invs || [])

    setLoading(false)
  }

  const contarDirectores = () => miembros.filter(m => m.rol === 'director').length

  const cambiarRol = async (miembro, nuevoRol) => {
    setErrorRol('')

    if (miembro.user_id === miId && nuevoRol !== 'director') {
      setErrorRol('No puedes cambiar tu propio rol de Director.')
      return
    }

    if (miembro.rol === 'director' && nuevoRol !== 'director') {
      if (contarDirectores() <= 1) {
        setErrorRol('Debe haber al menos un Director.')
        return
      }
    }

    setCambiandoRol(miembro.id)
    await supabase.from('project_members').update({ rol: nuevoRol }).eq('id', miembro.id)
    setMiembros(miembros.map(m => m.id === miembro.id ? { ...m, rol: nuevoRol } : m))
    setCambiandoRol(null)
  }

  // 🔥 NUEVO: confirmar eliminación
  const confirmarEliminacion = async () => {
    const miembro = miembroAEliminar
    if (!miembro) return

    if (miembro.user_id === miId && miembro.rol === 'director' && contarDirectores() <= 1) {
      setErrorRol('No puedes eliminarte porque eres el único Director.')
      return
    }

    if (miembro.rol === 'director' && contarDirectores() <= 1) {
      setErrorRol('No puedes eliminar al único Director.')
      return
    }

    await supabase.from('project_members').delete().eq('id', miembro.id)
    setMiembros(miembros.filter(m => m.id !== miembro.id))

    setMostrarModal(false)
    setMiembroAEliminar(null)
  }

  const rolColor = (rol) => {
    if (rol === 'director') return 'bg-purple-100 text-purple-700'
    if (rol === 'residente') return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-600'
  }

  const esDirector = miRol === 'director'

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="max-w-3xl mx-auto p-6">

        {errorRol && <p className="text-red-500 mb-4">{errorRol}</p>}

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-bold mb-4">Miembros</h2>

          {miembros.map((m) => (
            <div key={m.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2">
              <div>
                <p className="text-sm font-medium">{m.profiles?.nombre}</p>
                <p className="text-xs text-gray-500">{m.profiles?.email}</p>
              </div>

              <div className="flex items-center gap-2">
                {esDirector ? (
                  <select
                    value={m.rol}
                    onChange={(e) => cambiarRol(m, e.target.value)}
                    className={`text-xs px-2 py-1 rounded ${rolColor(m.rol)}`}
                  >
                    <option value="director">Director</option>
                    <option value="residente">Residente</option>
                    <option value="cliente">Cliente</option>
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded ${rolColor(m.rol)}`}>
                    {m.rol}
                  </span>
                )}

                {esDirector && (
                  <button
                    onClick={() => {
                      setMiembroAEliminar(m)
                      setMostrarModal(true)
                    }}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 🔥 MODAL */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">

            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 text-red-600 p-2 rounded-full">
                <AlertTriangle size={20} />
              </div>
              <h2 className="text-lg font-bold text-gray-800">
                Borrar miembro
              </h2>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              Estás a punto de eliminar a{" "}
              <span className="font-semibold">
                "{miembroAEliminar?.profiles?.nombre}"
              </span>.
            </p>

            <div className="border border-red-200 bg-red-50 rounded-xl p-3 mb-6">
              <p className="text-sm text-red-600">
                Esta acción es irreversible. Este usuario perderá acceso al proyecto y a toda su información.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                onClick={confirmarEliminacion}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Sí, borrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
