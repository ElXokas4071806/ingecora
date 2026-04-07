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

  // 🔥 MODIFICADO: ahora solo abre modal
  const eliminarMiembro = (miembro) => {
    setMiembroAEliminar(miembro)
    setMostrarModal(true)
  }

  // 🔥 NUEVO: confirmación real
  const confirmarEliminacion = async () => {
    const miembro = miembroAEliminar
    if (!miembro) return

    setErrorRol('')

    if (miembro.user_id === miId && miembro.rol === 'director' && contarDirectores() <= 1) {
      setErrorRol('No puedes eliminarte porque eres el único Director. Asigna otro Director primero.')
      return
    }

    if (miembro.rol === 'director' && contarDirectores() <= 1) {
      setErrorRol('No puedes eliminar al único Director del proyecto.')
      return
    }

    await supabase.from('project_members').delete().eq('id', miembro.id)
    setMiembros(miembros.filter(m => m.id !== miembro.id))

    setMostrarModal(false)
    setMiembroAEliminar(null)
  }

  const crearLinkInvitacion = async () => {
    const { data } = await supabase
      .from('project_invitations')
      .insert({ project_id: proyectoId, rol: 'cliente' })
      .select().single()
    if (data) setInvitaciones([...invitaciones, data])
  }

  const copiarLink = async (token) => {
    const link = `${window.location.origin}/unirse/${token}`
    await navigator.clipboard.writeText(link)
    setLinkCopiado(true)
    setTimeout(() => setLinkCopiado(false), 2000)
  }

  const desactivarLink = async (id) => {
    await supabase.from('project_invitations').update({ activo: false }).eq('id', id)
    setInvitaciones(invitaciones.filter(i => i.id !== id))
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
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

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

          <div className="space-y-2">
            {miembros.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-2">
                <div>
                  <p className="text-sm font-medium">{m.profiles?.nombre}</p>
                  <p className="text-xs text-gray-500">{m.profiles?.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  {esDirector && (
                    <button onClick={() => eliminarMiembro(m)}
                      className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

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
                  Esta acción es irreversible. Todos los datos, bitácoras, fotos y actividades se perderán para siempre.
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

      </main>
    </div>
  )
}