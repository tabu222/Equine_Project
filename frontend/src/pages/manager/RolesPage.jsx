import { useState } from 'react'
import { useAction, useResource } from '../../components/common/useOperations.js'
import { DataState, Feedback } from '../../components/common/OperationUI.jsx'
import { permissionLabels, roleLabels } from './managerLabels.js'

export default function RolesPage({ onIdentityChanged }) {
  const data = useResource('/roles')
  const reset = useAction(() => { data.reload(); onIdentityChanged?.() })
  return <main className="page-content manager-workspace"><header className="page-heading"><div><h1>Phân quyền vai trò</h1><p>Quyền của vai trò dùng chung cho mọi câu lạc bộ. Thay đổi có hiệu lực ngay sau khi lưu.</p></div><></></header><Feedback action={reset} /><button className="button button-secondary" disabled={data.loading || !!data.error || reset.busy} onClick={() => { if (window.confirm('Khôi phục quyền mặc định cho tất cả vai trò, áp dụng cho mọi câu lạc bộ?')) void reset.run('/roles/reset-defaults') }}>Khôi phục quyền mặc định</button><DataState data={data}>
    {data.value?.Roles.map(role => <RolePermissions key={`${role.RoleCode}:${role.Permissions.join(',')}`} role={role} matrix={data.value} onChanged={() => { data.reload(); onIdentityChanged?.() }} />)}
  </DataState></main>
}

function RolePermissions({ role, matrix, onChanged }) {
  const [selected, setSelected] = useState(role.Permissions)
  const [confirmed, setConfirmed] = useState(false)
  const action = useAction(onChanged)
  const dirty = [...selected].sort().join(',') !== [...role.Permissions].sort().join(',')
  return <section className="panel"><h2>{roleLabels[role.RoleCode] || role.RoleName} · {role.UserCount} tài khoản trong câu lạc bộ</h2><Feedback action={action} />
    <form onSubmit={e => { e.preventDefault(); if (dirty && confirmed) void action.run(`/roles/${encodeURIComponent(role.RoleCode)}/permissions`, { PermissionCodes: selected }, 'PUT') }}>
      <fieldset disabled={action.busy || role.IsLocked} className="manager-permissions"><legend>Chức năng được sử dụng</legend>{matrix.Permissions.map(p => {
        const locked = matrix.LockedCells.some(c => c.RoleCode === role.RoleCode && c.PermissionCode === p.PermissionCode)
        return <label className="manager-choice" key={p.PermissionCode}><input type="checkbox" checked={selected.includes(p.PermissionCode)} disabled={locked} onChange={e => setSelected(v => e.target.checked ? [...v, p.PermissionCode] : v.filter(code => code !== p.PermissionCode))} />{permissionLabels[p.PermissionCode] || p.PermissionName}{locked && <small> · Cố định</small>}</label>
      })}</fieldset>
      {!role.IsLocked && <><label className="manager-choice"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Tôi xác nhận thay đổi này áp dụng cho vai trò ở mọi câu lạc bộ.</label><button className="button" disabled={action.busy || !dirty || !confirmed}>Lưu quyền của vai trò</button></>}
    </form></section>
}
