import Image from 'next/image'
import Link from 'next/link'

interface AppHeaderProps {
  showBack?: boolean
  backHref?: string
  title?: string
  actions?: React.ReactNode
}

export default function AppHeader({ showBack, backHref = '/dashboard', title, actions }: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack ? (
            <Link href={backHref} className="text-gray-500 hover:text-gray-700">
              ← Back
            </Link>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Dingr"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span className="text-lg font-semibold font-display">Dingr</span>
            </Link>
          )}
          {title && (
            <>
              {!showBack && <span className="text-gray-300">|</span>}
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            </>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
