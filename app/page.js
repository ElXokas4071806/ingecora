import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black font-sans px-6">
      <main className="flex flex-col items-center max-w-2xl text-center gap-8">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Bienvenido a <span className="text-blue-600">INGECORA</span>
        </h1>
        
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Gestión de proyectos, bitácoras e informes en un solo lugar.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link 
            href="/login" 
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-lg"
          >
            Iniciar Sesión
          </Link>
          
          <Link 
            href="/registro" 
            className="px-8 py-3 bg-white text-zinc-900 border border-zinc-200 rounded-lg font-medium hover:bg-zinc-100 transition-all dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
          >
            Registrarse
          </Link>
        </div>
      </main>
    </div>
  );
}