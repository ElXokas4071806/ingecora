'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { HardHat, CheckCircle, XCircle, Loader } from 'lucide-react'

export default function UnirsePage({ params }) {
  const [estado, setEstado] = useState('cargando') // cargando | unido | error | ya_miembro
  const [proyecto, setProyecto] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    procesarInvitacion()
  }, [])

  const procesarInvitacion = async () => {
    const token = params.token

    // 1. Verificar que el link existe y está activo
    const { data: invitacion } = await supabase
      .from('project_invitations')
      .select('*, projects(nombre)')
      .eq('token', token)
      .eq('activo', true)
      .single()

    if (!invitacion) {
      setEstado('error')
      setMensaje('Este link de invitación no es válido o ya expiró.')
      return
    }

    setProyecto(invitacion.projects)

    // 2. Verificar si hay sesión activa
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Guardar token en sessionStorage y redirigir a login
      sessionStorage.setItem('invitacion_token', token)
      router.push(`/login?redirect=/unirse/${token}`)
      return
    }

    // 3. Verificar si ya es miembro
    const { data: yaEsMiembro } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', invitacion.project_id)
      .eq('user_id', user.id)
      .single()

    if (yaEsMiembro) {
      setEstado('ya_miembro')
      return
    }

    // 4. Agregar como miembro con el rol del link
    const { error } = await supabase
      .from('project_members')
      .insert({
        project_id: invitacion.project_id,
        user_id: user.id,
        rol: invitacion.rol || 'cliente'
      })

    if (error) {
      setEstado('error')
      setMensaje('Ocurrió un error al unirte al proyecto. Intenta de nuevo.')
      return
    }

    setEstado('unido')
  }

  const irAlProyecto = () => router.push('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-lg text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <HardHat className="text-green-700" size={28} />
          <span className="text-xl font-bold text-green-700">Ingecora</span>
        </div>

        {estado === 'cargando' && (
          <div className="space-y-3">
            <Loader className="mx-auto text-green-700 animate-spin" size={40} />
            <p className="text-gray-600">Verificando invitación...</p>
          </div>
        )}

        {estado === 'unido' && (
          <div className="space-y-4">
            <CheckCircle className="mx-auto text-green-600" size={48} />
            <h2 className="text-xl font-bold text-gray-800">¡Bienvenido!</h2>
            <p className="text-gray-500 text-sm">
              Te uniste exitosamente al proyecto{' '}
              <span className="font-semibold text-gray-800">{proyecto?.nombre}</span>.
            </p>
            <button onClick={irAlProyecto}
              className="w-full bg-green-700 text-white py-3 rounded-xl hover:bg-green-800 transition font-medium">
              Ir al proyecto
            </button>
          </div>
        )}

        {estado === 'ya_miembro' && (
          <div className="space-y-4">
            <CheckCircle className="mx-auto text-blue-500" size={48} />
            <h2 className="text-xl font-bold text-gray-800">Ya eres miembro</h2>
            <p className="text-gray-500 text-sm">
              Ya tienes acceso al proyecto{' '}
              <span className="font-semibold text-gray-800">{proyecto?.nombre}</span>.
            </p>
            <button onClick={irAlProyecto}
              className="w-full bg-green-700 text-white py-3 rounded-xl hover:bg-green-800 transition font-medium">
              Ir al proyecto
            </button>
          </div>
        )}

        {estado === 'error' && (
          <div className="space-y-4">
            <XCircle className="mx-auto text-red-500" size={48} />
            <h2 className="text-xl font-bold text-gray-800">Link inválido</h2>
            <p className="text-gray-500 text-sm">{mensaje}</p>
            <button onClick={() => router.push('/login')}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition font-medium">
              Ir al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}