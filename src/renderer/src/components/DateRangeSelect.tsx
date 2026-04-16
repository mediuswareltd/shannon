import { DATE_RANGE_OPTIONS, type DateRangeId } from '../lib/dateRange'

type Props = {
  value: DateRangeId
  onChange: (v: DateRangeId) => void
}

export function DateRangeSelect({ value, onChange }: Props): JSX.Element {
  return (
    <label className="field inline">
      <span>Period</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value as DateRangeId)}>
        {DATE_RANGE_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
