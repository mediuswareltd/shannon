import type { ReactNode } from 'react'

type Props = {
  href: string | null
  className?: string
  children: ReactNode
}

export function ExternalLink({ href, className, children }: Props): JSX.Element {
  if (!href) {
    return <span className={className}>{children}</span>
  }
  return (
    <button
      type="button"
      className={className ?? 'link-btn'}
      onClick={() => void window.peApi.openExternal(href)}
    >
      {children}
    </button>
  )
}
