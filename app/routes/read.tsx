import { IconDownload, IconFullscreen } from '@/components/icons'
import processFileParam from '@/lib/process-file-param.server'
import { unzipCbz } from '@/lib/unzip-cbz.server'
import { LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData, useSearchParams } from '@remix-run/react'
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
  const [searchParams] = useSearchParams()
  const fileParam = encodeURIComponent(searchParams.get('file') || '')

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
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isFullscreen])

  function goToNext() {
    if (index < files.length - 1) {
      setIndex(index + 1)
      // setShowControls(true)
    }
  }

  function goToPrevious() {
    if (index > 0) {
      setIndex(index - 1)
      // setShowControls(true)
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

  function handleDoubleClick(e: React.MouseEvent) {
    e.preventDefault()
    setShowControls((prev) => !prev)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === 'Space') {
      e.preventDefault()
      setShowControls((prev) => !prev)
    }
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Imagen principal */}
      <div
        className="w-full h-full flex items-center justify-center cursor-pointer"
        onClick={handleImageClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
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
        <div
          className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto"
          aria-label="Barra superior"
          role="button"
          tabIndex={0}
          onClick={() => setShowControls((prev) => !prev)}
          onKeyDown={handleKeyDown}
        >
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

            <div className="flex items-center gap-x-2">
              <Link
                to={`/download?file=${fileParam}`}
                className="text-white hover:text-gray-300 transition-colors p-2"
                aria-label="Descargar"
                title="Descargar"
              >
                <IconDownload />
              </Link>
              <button
                title="Pantalla completa"
                aria-label="Pantalla completa"
                onClick={toggleFullscreen}
                className="text-white hover:text-gray-300 transition-colors p-2"
              >
                <IconFullscreen />
              </button>
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto"
          aria-label="Barra inferior"
          role="button"
          tabIndex={0}
          onClick={() => setShowControls((prev) => !prev)}
          onKeyDown={handleKeyDown}
        >
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
      </div>

      {/* Indicador de progreso */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-pink-500/25">
        <div
          className="h-full bg-pink-500 transition-all duration-300"
          style={{ width: `${((index + 1) / files.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
