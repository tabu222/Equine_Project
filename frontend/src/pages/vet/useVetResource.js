import { useCallback, useEffect, useState } from 'react'
import { getVetResource } from '../../api/vetApi.ts'
import { vetError } from './vetDomain.js'

export function useVetResource(path) {
  const [state, setState] = useState({ path: '', loading: true, rows: [], error: '' })
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: '' }))
    setVersion(v => v + 1)
  }, [])
  useEffect(() => {
    if (!path) return undefined
    let active = true
    getVetResource(path).then(rows => {
      if (active) setState({ path, loading: false, rows, error: '' })
    }).catch(error => {
      if (active) setState({ path, loading: false, rows: [], error: vetError(error) })
    })
    return () => { active = false }
  }, [path, version])
  return { ...(state.path === path ? state : { loading: true, rows: [], error: '' }), reload }
}
