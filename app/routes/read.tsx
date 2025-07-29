import processFileParam from '@/lib/process-file-param.server'
import { unzipCbz } from '@/lib/unzip-cbz.server'
import { LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { useState, useEffect } from 'react'

export async function loader({ request }: LoaderFunctionArgs) {
  const filepath = await processFileParam(request, 'file')
  const files = await unzipCbz(filepath)
  return { files }
}

export default function Read() {
  const { files } = useLoaderData<typeof loader>()
  const [index, setIndex] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const file = files[index]

  // Ocultar controles automáticamente después de 3 segundos
  useEffect(() => {
    if (!showControls) return

    const timer = setTimeout(() => {
      setShowControls(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [showControls, index])

  // Navegación con teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          goToPrevious()
          break
        case 'ArrowRight':
        case 'd':
          goToNext()
          break
        case 'f':
          toggleFullscreen()
          break
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen()
          }
          break
        case ' ':
          e.preventDefault()
          setShowControls((prev) => !prev)
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [index, isFullscreen])

  function goToNext() {
    if (index < files.length - 1) {
      setIndex(index + 1)
      setShowControls(true)
    }
  }

  function goToPrevious() {
    if (index > 0) {
      setIndex(index - 1)
      setShowControls(true)
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  function exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  function handleImageClick(e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width

    if (x < width * 0.3) {
      goToPrevious()
    } else if (x > width * 0.7) {
      goToNext()
    } else {
      setShowControls((prev) => !prev)
    }
  }

  function handleTouchStart() {
    setShowControls(true)
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Imagen principal */}
      <div
        className="w-full h-full flex items-center justify-center cursor-pointer"
        onClick={handleImageClick}
        onTouchStart={handleTouchStart}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setShowControls((prev) => !prev)
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Navegar por la imagen"
      >
        <img
          src={`data:image/jpeg;base64,${file.base64}`}
          alt={file.name}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />
      </div>

      {/* Overlay de controles */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Barra superior */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="text-white hover:text-gray-300 transition-colors"
              >
                ← Volver
              </button>
              <span className="text-white text-sm">
                {index + 1} / {files.length}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-gray-300 transition-colors p-2"
              >
                {isFullscreen ? '⛶' : '⛶'}
              </button>
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
          <div className="flex items-center justify-between px-4 py-2">
            <button
              onClick={goToPrevious}
              disabled={index === 0}
              className={`text-white hover:text-gray-300 transition-colors p-2 ${
                index === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              ← Anterior
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-white text-sm">{file.name}</span>
            </div>

            <button
              onClick={goToNext}
              disabled={index === files.length - 1}
              className={`text-white hover:text-gray-300 transition-colors p-2 ${
                index === files.length - 1
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              Siguiente →
            </button>
          </div>
        </div>

        {/* Indicadores de navegación lateral */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-16 h-32 pointer-events-auto">
          <div className="w-full h-full flex items-center justify-start md:justify-center">
            {index > 0 && (
              <div className="bg-black/50 rounded-r-lg p-2">
                <span className="text-white text-xs">←</span>
              </div>
            )}
          </div>
        </div>

        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-16 h-32 pointer-events-auto">
          <div className="w-full h-full flex items-center justify-end md:justify-center">
            {index < files.length - 1 && (
              <div className="bg-black/50 rounded-l-lg p-2">
                <span className="text-white text-xs">→</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Indicador de progreso */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((index + 1) / files.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
