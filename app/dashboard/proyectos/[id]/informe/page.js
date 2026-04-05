'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft, FileText, Download } from 'lucide-react'

export default function InformePage() {
  const [proyecto, setProyecto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generando, setGenerando] = useState(false)
  const [proyectoId, setProyectoId] = useState(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [progreso, setProgreso] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const partes = pathname.split('/')
    const id = partes[partes.indexOf('proyectos') + 1]
    setProyectoId(id)
    loadData(id)
    const hoy = new Date().toISOString().split('T')[0]
    const hace7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setFechaInicio(hace7)
    setFechaFin(hoy)
  }, [pathname])

  const loadData = async (id) => {
    const { data: proy } = await supabase
      .from('projects').select('*').eq('id', id).single()
    setProyecto(proy)
    setLoading(false)
  }

  const imagenABase64 = (url) => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 800
        const maxH = 600
        let w = img.width
        let h = img.height
        if (w > maxW) { h = h * maxW / w; w = maxW }
        if (h > maxH) { w = w * maxH / h; h = maxH }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve({ base64: canvas.toDataURL('image/jpeg', 0.7), w, h })
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
  }

  const generarPDF = async () => {
    setGenerando(true)
    setProgreso('Cargando bitácoras...')

    const { data: logs } = await supabase
      .from('daily_logs').select('*')
      .eq('project_id', proyectoId)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('fecha', { ascending: true })

    const logsConDetalle = await Promise.all((logs || []).map(async (log) => {
      const { data: acts } = await supabase
        .from('log_actividades').select('*').eq('log_id', log.id).order('orden')
      const { data: fotos } = await supabase
        .from('log_fotos').select('*').eq('log_id', log.id)
      return { ...log, actividades: acts || [], fotos: fotos || [] }
    }))

    setProgreso('Cargando fotos...')

    // Convertir todas las fotos a base64
    for (const log of logsConDetalle) {
      const fotosConBase64 = await Promise.all(log.fotos.map(async (foto) => {
        const resultado = await imagenABase64(foto.url)
        return { ...foto, base64: resultado }
      }))
      log.fotos = fotosConBase64
    }

    setProgreso('Generando PDF...')

    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const verde = [22, 101, 52]
    const gris = [107, 114, 128]
    const grisClaros = [243, 244, 246]

    // Encabezado
    doc.setFillColor(...verde)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('INGECORA', 14, 15)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Bitacora Digital de Obra', 14, 23)
    doc.setFontSize(10)
    doc.text('Informe de Avance', 14, 30)

    // Info del proyecto
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(proyecto?.nombre || '', 14, 48)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gris)
    if (proyecto?.ubicacion) doc.text(`Ubicacion: ${proyecto.ubicacion}`, 14, 55)

    const fi = new Date(fechaInicio + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    const ff = new Date(fechaFin + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    doc.text(`Periodo: ${fi} - ${ff}`, 14, 62)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 68)
    doc.text(`Total bitacoras: ${logsConDetalle.length}`, 14, 74)

    doc.setDrawColor(...verde)
    doc.setLineWidth(0.5)
    doc.line(14, 78, 196, 78)

    let y = 85

    if (logsConDetalle.length === 0) {
      doc.setTextColor(...gris)
      doc.setFontSize(11)
      doc.text('No hay bitacoras en el periodo seleccionado.', 14, y)
    }

    for (const log of logsConDetalle) {
      if (y > 240) { doc.addPage(); y = 20 }

      const fechaDia = new Date(log.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })

      doc.setFillColor(...grisClaros)
      doc.rect(14, y - 4, 182, 10, 'F')
      doc.setTextColor(...verde)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(fechaDia.charAt(0).toUpperCase() + fechaDia.slice(1), 16, y + 3)
      doc.setFontSize(8)
      doc.setTextColor(...gris)
      doc.text(`Estado: ${log.estado}`, 160, y + 3)
      y += 12

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      const condiciones = []
      if (log.clima) condiciones.push(`Clima: ${log.clima}`)
      if (log.personal_en_sitio) condiciones.push(`Personal: ${log.personal_en_sitio} personas`)
      if (condiciones.length > 0) {
        doc.setTextColor(...gris)
        doc.text(condiciones.join('   |   '), 14, y)
        y += 6
      }

      if (log.actividades.length > 0) {
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text('Actividades realizadas:', 14, y)
        y += 4

        autoTable(doc, {
          startY: y,
          head: [['Capitulo', 'Partida', 'Descripcion']],
          body: log.actividades.map(a => [a.capitulo || '-', a.partida || '-', a.descripcion]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: verde, textColor: 255, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 35 }, 2: { cellWidth: 112 } },
          margin: { left: 14, right: 14 },
        })
        y = doc.lastAutoTable.finalY + 4
      }

      if (log.observaciones) {
        if (y > 250) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.text('Observaciones:', 14, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...gris)
        const lines = doc.splitTextToSize(log.observaciones, 178)
        doc.text(lines, 14, y)
        y += lines.length * 4 + 2
      }

      // Fotos
      if (log.fotos.length > 0) {
        if (y > 230) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
        doc.text(`Fotos del dia (${log.fotos.length}):`, 14, y)
        y += 5

        const fotosValidas = log.fotos.filter(f => f.base64)
        const fotosPorFila = 3
        const anchoFoto = 56
        const altoFoto = 42

        for (let i = 0; i < fotosValidas.length; i += fotosPorFila) {
          if (y + altoFoto > 270) { doc.addPage(); y = 20 }
          const fila = fotosValidas.slice(i, i + fotosPorFila)
          fila.forEach((foto, idx) => {
            const x = 14 + idx * (anchoFoto + 4)
            try {
              doc.addImage(foto.base64.base64, 'JPEG', x, y, anchoFoto, altoFoto)
            } catch (e) {}
          })
          y += altoFoto + 4
        }
      }

      y += 6
    }

    // Pie de página
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFillColor(...verde)
      doc.rect(0, 285, 210, 12, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      doc.text('Ingecora - Bitacora Digital de Obra', 14, 292)
      doc.text(`Pagina ${i} de ${totalPages}`, 180, 292)
    }

    const nombreArchivo = `Informe_${proyecto?.nombre?.replace(/ /g, '_')}_${fechaInicio}_${fechaFin}.pdf`
    doc.save(nombreArchivo)
    setGenerando(false)
    setProgreso('')
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push(`/dashboard/proyectos/${proyectoId}`)} className="text-gray-500 hover:text-gray-800">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Generar informe</h1>
            <p className="text-xs text-gray-500">{proyecto?.nombre}</p>
          </div>
        </div>
      </header>

      <main className="max-w-sm mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-5 shadow-sm max-w-sm mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-green-700" size={24} />
            <div>
              <h2 className="font-bold text-gray-800">Informe de avance PDF</h2>
              <p className="text-sm text-gray-500">Selecciona el rango de fechas para el informe</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
              <input type="date" value={fechaInicio}
  onChange={(e) => setFechaInicio(e.target.value)}
  className="w-full min-w-0 border border-gray-300 rounded-lg px-2 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 box-border"
/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
              <input type="date" value={fechaFin}
  onChange={(e) => setFechaFin(e.target.value)}
  className="w-full min-w-0 border border-gray-300 rounded-lg px-2 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 box-border"
/>
            </div>
          </div>

          {progreso && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              {progreso}
            </div>
          )}

          <button
            onClick={generarPDF}
            disabled={generando || !fechaInicio || !fechaFin}
            className="w-full flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-xl hover:bg-green-800 transition disabled:opacity-50 font-medium"
          >
            <Download size={20} />
            {generando ? progreso || 'Generando...' : 'Descargar informe PDF'}
          </button>
        </div>
      </main>
    </div>
  )
}