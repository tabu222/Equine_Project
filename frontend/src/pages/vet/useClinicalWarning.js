import { useEffect, useId } from 'react'
import { useBlocker } from 'react-router-dom'

// A single router blocker coordinates clinical editors; no medical contents enter browser storage.
const dirtyEditors = new Map()
export function hasUnsavedClinicalChanges() { return [...dirtyEditors.values()].some(Boolean) }
export function ClinicalNavigationGuard() {
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    [...dirtyEditors.values()].some(Boolean) &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Nội dung y tế chưa được lưu. Bạn có muốn rời trang và bỏ thay đổi?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])
  useEffect(() => {
    const warn = event => {
      if ([...dirtyEditors.values()].some(Boolean)) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])
  return null
}
export default function useClinicalWarning(dirty) {
  const id = useId()
  useEffect(() => {
    dirtyEditors.set(id, dirty)
    return () => { dirtyEditors.delete(id) }
  }, [id, dirty])
  return () => { dirtyEditors.delete(id) }
}
