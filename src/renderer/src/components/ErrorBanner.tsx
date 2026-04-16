type Props = { message: string | null; onDismiss: () => void }

export function ErrorBanner({ message, onDismiss }: Props): JSX.Element | null {
  if (!message) return null
  return (
    <div className="banner error">
      <span>{message}</span>
      <button type="button" className="btn ghost" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  )
}
