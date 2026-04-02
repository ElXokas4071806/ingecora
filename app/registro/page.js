'use client'
import { useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegistroPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgNombre, setOrgNombre] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const handleRegistro = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 1. Crear organización
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ nombre: orgNombre, plan: 'free' })
      .select()
      .single()

    if (orgError) {
      setError('Error creando la organización. Intenta de nuevo.')
      setLoading(false)
      return
    }

    // 2. Crear usuario
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } }
    })

    if (authError) {
      await supabase.from('organizations').delete().eq('id', org.id)
      setError('Error al crear la cuenta. El correo puede estar en uso.')
      setLoading(false)
      return
    }

    // 3. Esperar que el trigger cree el perfil
    await esperar(1500)

    // 4. Actualizar perfil con org_id y nombre
    await supabase
      .from('profiles')
      .update({ org_id: org.id, nombre, rol: 'owner' })
      .eq('id', authData.user.id)

    // 5. Mostrar éxito y redirigir
    setExito(true)
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  if (exito) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-700 mb-2">¡Cuenta creada!</h2>
        <p className="text-gray-500">Redirigiendo a tu dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-700">Ingecora</h1>
          <p className="text-gray-500 mt-1">Crea tu cuenta gratis</p>
        </div>
        <form onSubmit={handleRegistro} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
              placeholder="Juan Pérez"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de tu empresa</label>
            <input
              type="text"
              value={orgNombre}
              onChange={(e) => setOrgNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
              placeholder="Constructora XYZ"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
              placeholder="tu@correo.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
              placeholder="mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white py-2 rounded-lg font-medium hover:bg-green-800 transition disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-green-700 font-medium hover:underline">Inicia sesión</a>
        </p>
      </div>
    </div>
  )
}