export function DataState({ data, children }) {
  if (data.loading) return <p role="status">Đang tải dữ liệu…</p>
  if (data.error) return <div role="alert"><p>{data.error}</p><button type="button" className="button button-secondary" onClick={data.reload}>Thử lại</button></div>
  return children
}

export function Feedback({ action }) {
  return <>{action.error && <p className="error-message" role="alert">{action.error}</p>}
    {action.fields?.non_field_errors?.map(text => <p className="error-message" role="alert" key={text}>{text}</p>)}
    {action.notice && <p className="success-message" role="status">{action.notice}</p>}</>
}

export function Field({ label, name, action, options, multiline = false, ...props }) {
  const errors = action?.fields?.[name]
  const control = { name, 'aria-label': label, 'aria-invalid': errors?.length ? true : undefined, ...props }
  return <label className="form-field"><span>{label}</span>{options
    ? <select {...control}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
    : multiline ? <textarea {...control} /> : <input {...control} />}
    {errors?.map(text => <small className="error-message" role="alert" key={text}>{text}</small>)}</label>
}
