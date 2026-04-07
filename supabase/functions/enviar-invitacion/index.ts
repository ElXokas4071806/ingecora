import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts'

serve(async (req) => {
  const { nombreInvitado, emailInvitado, nombreProyecto, projectId } = await req.json()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Ingecora <notificaciones@tudominio.com>', // cambia por tu dominio verificado en Resend
      to: emailInvitado,
      subject: `Te han invitado a un proyecto en Ingecora`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px;">
          <h2 style="color: #15803d;">¡Hola, ${nombreInvitado}!</h2>
          <p>Has sido invitado a colaborar en el proyecto <strong>${nombreProyecto}</strong> en Ingecora.</p>
          <a href="${Deno.env.get('APP_URL')}/dashboard/proyectos/${projectId}"
            style="display:inline-block; margin-top:16px; background:#15803d; color:white;
            padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">
            Ver proyecto
          </a>
          <p style="margin-top:24px; color:#6b7280; font-size:13px;">
            Si no esperabas esta invitación puedes ignorar este correo.
          </p>
        </div>
      `
    })
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
})