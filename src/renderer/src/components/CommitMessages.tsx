type Props = {
  messages?: string[]
}

export function CommitMessages({ messages }: Props): JSX.Element {
  if (!messages?.length) {
    return <span className="muted">—</span>
  }
  const shown = messages.slice(0, 8)
  const rest = messages.length - shown.length
  return (
    <div className="commit-msgs">
      {shown.map((m, i) => (
        <div key={i} className="commit-line" title={m}>
          {m}
        </div>
      ))}
      {rest > 0 ? <div className="muted small">+{rest} more in this push</div> : null}
    </div>
  )
}
