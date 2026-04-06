'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft, UserPlus, Link, Trash2, Copy, Check, Users } from 'lucide-react'

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

    const { data: mbs } = await supabase
      .from('project_members').select('*, profiles(nombre, email)')
      .eq('project_id', id)
    setMiembros(mbs || [])

    const { data: invs } = await supabase
      .from('project_invitations').select('*')
      .eq('project_id', id).eq('activo', true)
    setInvitaciones(invs || [])

    setLoading(false)
  }

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

  const eliminarMiembro = async (id) => {
    await supabase.from('project_members').delete().eq('id', id)
    setMiembros(miembros.filter(m => m.id !== id))
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

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
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

        {/* Agregar por correo */}
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

          {errorBusqueda && (
            <p className="text-red-500 text-sm mb-3">{errorBusqueda}</p>
          )}

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
                  <option value="director">Director de obra</option>
                  <option value="residente">Residente de obra</option>
                  <option value="cliente">Cliente / Interventor (solo lectura)</option>
                </select>
                <button onClick={agregarMiembro} disabled={agregando}
                  className="bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-800 transition disabled:opacity-50">
                  {agregando ? '...' : 'Agregar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Link de invitación */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Link size={18} className="text-green-700" />
            <h2 className="font-bold text-gray-800">Link de invitación</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Genera un link para que clientes accedan en modo solo lectura sin necesidad de registro.</p>

          {invitaciones.length === 0 ? (
            <button onClick={crearLinkInvitacion}
              className="w-full border border-dashed border-gray-300 text-gray-600 py-3 rounded-xl hover:bg-gray-50 transition text-sm flex items-center justify-center gap-2">
              <Link size={16} /> Generar link de invitación
            </button>
          ) : (
            <div className="space-y-3">
              {invitaciones.map((inv) => (
                <div key={inv.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500 truncate flex-1">
                    {`${window.location.origin}/unirse/${inv.token}`}
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => copiarLink(inv.token)}
                      className="flex items-center gap-1 bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-800 transition">
                      {linkCopiado ? <Check size={13} /> : <Copy size={13} />}
                      {linkCopiado ? 'Copiado' : 'Copiar'}
                    </button>
                    <button onClick={() => desactivarLink(inv.id)}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 border border-red-200 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={crearLinkInvitacion}
                className="text-sm text-green-700 hover:underline">
                + Generar otro link
              </button>
            </div>
          )}
        </div>

        {/* Lista de miembros */}
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
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.profiles?.nombre}</p>
                    <p className="text-xs text-gray-500">{m.profiles?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${rolColor(m.rol)}`}>
                      {m.rol}
                    </span>
                    <button onClick={() => eliminarMiembro(m.id)}
                      className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition">
                      <Trash2 size={14} />
                    </button>
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