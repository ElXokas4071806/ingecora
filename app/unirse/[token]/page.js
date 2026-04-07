'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { HardHat, CheckCircle, XCircle } from 'lucide-react'

export default function UnirsePage() {
  const [estado, setEstado] = useState('cargando')
  const [mensaje, setMensaje] = useState('')
  const [proyecto, setProyecto] = useState(null)
  const router = useRouter()
  const { token } = useParams()
  const supabase = createClient()

  useEffect(() => { procesarInvitacion() }, [token])

  const procesarInvitacion = async () => {
    const { data: inv } = await supabase
      .from('project_invitations')
      .select('*')
      .eq('token', token)
      .eq('activo', true)
      .single()

    if (!inv) {
      setEstado('error')
      setMensaje('Este link de invitación no es válido o ya fue desactivado.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      localStorage.setItem('invitacion_token', token)
      router.push('/login')
      return
    }

    const { data: proy } = await supabase
      .from('projects').select('*').eq('id', inv.project_id).single()
    setProyecto(proy)

    const { data: miembro } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', inv.project_id)
      .eq('user_id', user.id)
      .single()

    if (miembro) { setEstado('ya_miembro'); return }

    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: inv.project_id, user_id: user.id, rol: inv.rol })

    if (error) {
      setEstado('error')
      setMensaje('Ocurrió un error al unirte al proyecto.')
      return
    }

    setEstado('unido')
  }

  const irAlProyecto = () => {
    if (proyecto) router.push(`/dashboard/proyectos/${proyecto.id}`)
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <HardHat className="text-green-700" size={28} />
          <span className="text-xl font-bold text-green-700">Ingecora</span>
        </div>

        {estado === 'cargando' && (
          <p className="text-gray-500">Procesando invitación...</p>
        )}

        {estado === 'unido' && (
          <>
            <CheckCircle className="text-green-600 mx-auto mb-3" size={48} />
            <h2 className="text-lg font-bold text-gray-800 mb-1">¡Te uniste al proyecto!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Ahora eres miembro de <span className="font-semibold">{proyecto?.nombre}</span>.
            </p>
            <button onClick={irAlProyecto}
              className="w-full bg-green-700 text-white py-2.5 rounded-xl hover:bg-green-800 transition font-medium">
              Ir al proyecto
            </button>
          </>
        )}

        {estado === 'ya_miembro' && (
          <>
            <CheckCircle className="text-blue-500 mx-auto mb-3" size={48} />
            <h2 className="text-lg font-bold text-gray-800 mb-1">Ya eres miembro</h2>
            <p className="text-sm text-gray-500 mb-6">
              Ya tienes acceso a <span className="font-semibold">{proyecto?.nombre}</span>.
            </p>
            <button onClick={irAlProyecto}
              className="w-full bg-green-700 text-white py-2.5 rounded-xl hover:bg-green-800 transition font-medium">
              Ir al proyecto
            </button>
          </>
        )}

        {estado === 'error' && (
          <>
            <XCircle className="text-red-500 mx-auto mb-3" size={48} />
            <h2 className="text-lg font-bold text-gray-800 mb-1">Link inválido</h2>
            <p className="text-sm text-gray-500 mb-6">{mensaje}</p>
            <button onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-300 transition font-medium">
              Ir al inicio
            </button>
          </>
        )}
      </div>
    </div>
  )
}