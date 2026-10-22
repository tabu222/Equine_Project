import { useState } from 'react'
import { useAction, useResource } from '../../components/common/useOperations.js'
import { DataState, Feedback, Field } from '../../components/common/OperationUI.jsx'
import { roleLabels } from './managerLabels.js'

export default function StaffPage({ currentUser, onIdentityChanged }) {
  const data = useResource('/users', true)
  const roles = useResource('/roles')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [group, setGroup] = useState('staff')
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const [secret, setSecret] = useState('')
  const action = useAction(result => {
    setSecret(result.TemporaryPassword || '')
    setCreating(false)
    data.reload()
  })
  const rows = (data.value || []).filter(u => (group === 'owners') === u.Roles.includes('HORSE_OWNER')
    && (!role || u.Roles.includes(role)) && (!search || [u.FullName, u.Email, u.Phone].some(v => v?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))))
  const roleOptions = (roles.value?.Roles || []).filter(r => r.RoleCode !== 'HORSE_OWNER').map(r => [r.RoleCode, roleLabels[r.RoleCode] || r.RoleName])
  async function create(event) {
    event.preventDefault()
    setSecret('')
    const values = Object.fromEntries(new FormData(event.currentTarget))
    await action.run('/users', values)
  }
  return <main className="page-content manager-workspace"><header className="page-heading"><div><p className="eyebrow">QUẢN LÝ CÂU LẠC BỘ</p><h1>Nhân sự và tài khoản</h1><p>Nhân sự nội bộ và chủ ngựa được quản lý riêng.</p></div><></></header>
    <section className="panel"><div className="vet-toolbar"><Field label="Tìm theo tên, email hoặc điện thoại" name="search" type="search" value={search} onChange={e => setSearch(e.target.value)} />
      <Field label="Nhóm tài khoản" name="group" value={group} onChange={e => { setGroup(e.target.value); setRole('') }} options={[["staff", 'Nhân sự nội bộ'], ['owners', 'Chủ ngựa']]} />
      <Field label="Vai trò" name="filter-role" value={role} onChange={e => setRole(e.target.value)} options={[["", 'Tất cả'], ...roleOptions]} />
      <button className="button" onClick={() => { setCreating(!creating); setSecret('') }}>Tạo tài khoản nhân sự</button></div>
      <Feedback action={action} />
      {secret && <div className="manager-secret" role="status"><p>Mật khẩu tạm chỉ hiển thị trong phiên này. Hãy bàn giao trực tiếp cho người dùng.</p><output>{secret}</output><button className="button button-secondary" onClick={() => setSecret('')}>Ẩn mật khẩu</button></div>}
      {creating && <DataState data={roles}><form onSubmit={create} className="vet-operation-form"><fieldset className="vet-form-fields" disabled={action.busy}>
        <Field label="Họ tên" name="FullName" action={action} required maxLength={150} />
        <Field label="Email" name="Email" action={action} type="email" required maxLength={100} />
        <Field label="Số điện thoại" name="Phone" action={action} required maxLength={20} />
        <Field label="Địa chỉ" name="Address" action={action} required maxLength={255} />
        <Field label="Vai trò ban đầu" name="RoleCode" action={action} required options={[["", 'Chọn vai trò'], ...roleOptions]} />
        <p>Hệ thống tạo mật khẩu tạm sau khi lưu tài khoản.</p><button className="button">{action.busy ? 'Đang tạo…' : 'Tạo tài khoản'}</button>
      </fieldset></form></DataState>}
      <DataState data={data}>{!rows.length ? <p>Không có tài khoản phù hợp.</p> : <div className="table-wrapper"><table className="horse-table"><thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>{rows.map(u => <tr key={u.UserID}><td>{u.FullName}</td><td>{u.Email}</td><td>{u.Roles.map(r => roleLabels[r] || 'Vai trò khác').join(', ')}</td><td>{u.Status === 'Active' ? 'Hoạt động' : 'Đã khóa'}</td><td><button className="button button-secondary" onClick={() => { setSelected(u.UserID); setSecret('') }}>Xem chi tiết</button></td></tr>)}</tbody></table></div>}</DataState>
    </section>
    {selected != null && <StaffDetails key={selected} id={selected} currentUser={currentUser} roles={roles} onClose={() => setSelected(null)} onChanged={() => { data.reload(); if (String(selected) === currentUser.id) onIdentityChanged?.() }} />}
  </main>
}

function StaffDetails({ id, currentUser, roles, onClose, onChanged }) {
  const data = useResource(`/users/${id}`)
  const [secret, setSecret] = useState('')
  const action = useAction(result => { setSecret(result.TemporaryPassword || ''); data.reload(); onChanged() })
  const u = data.value
  const self = String(id) === currentUser.id
  return <section className="panel"><div className="vet-toolbar"><h2>Chi tiết tài khoản</h2><button className="button button-secondary" onClick={onClose} disabled={action.busy}>Đóng</button></div><Feedback action={action} />
    {secret && <div className="manager-secret" role="status"><p>Mật khẩu tạm · bàn giao trực tiếp:</p><output>{secret}</output><button onClick={() => setSecret('')}>Ẩn mật khẩu</button></div>}
    <DataState data={data}>{u && <><p>{u.Email} · {u.Status === 'Active' ? 'Hoạt động' : 'Đã khóa'}</p><form key={`${u.FullName}-${u.Phone}-${u.Address}`} className="vet-operation-form" onSubmit={e => { e.preventDefault(); void action.run(`/users/${id}`, Object.fromEntries(new FormData(e.currentTarget)), 'PATCH') }}><fieldset className="vet-form-fields" disabled={action.busy}>
      <Field label="Họ tên" name="FullName" action={action} required maxLength={150} defaultValue={u.FullName} />
      <Field label="Số điện thoại" name="Phone" action={action} required maxLength={20} defaultValue={u.Phone || ''} />
      <Field label="Địa chỉ" name="Address" action={action} required maxLength={255} defaultValue={u.Address || ''} /><button className="button">Lưu thông tin</button>
    </fieldset></form>
    <DataState data={roles}><form className="vet-operation-form" key={u.Roles.join(',')} onSubmit={e => { e.preventDefault(); const RoleCodes = new FormData(e.currentTarget).getAll('RoleCodes'); void action.run(`/users/${id}/roles`, { RoleCodes }, 'PUT') }}><fieldset disabled={action.busy || u.Roles.includes('HORSE_OWNER')}><legend>Gán vai trò cho tài khoản</legend>
      {roles.value?.Roles.filter(r => r.RoleCode !== 'HORSE_OWNER' || u.Roles.includes('HORSE_OWNER')).map(r => <label className="manager-choice" key={r.RoleCode}><input type="checkbox" name="RoleCodes" value={r.RoleCode} defaultChecked={u.Roles.includes(r.RoleCode)} disabled={self && r.RoleCode === 'CLUB_MANAGER'} />{roleLabels[r.RoleCode] || r.RoleName}{self && r.RoleCode === 'CLUB_MANAGER' && <input type="hidden" name="RoleCodes" value={r.RoleCode} />}</label>)}
      <button className="button">Lưu vai trò</button></fieldset>{u.Roles.includes('HORSE_OWNER') && <p>Chủ ngựa sử dụng tài khoản riêng với nhân sự nội bộ.</p>}</form></DataState>
    {!self && <><form className="vet-operation-form" onSubmit={e => { e.preventDefault(); void action.run(`/users/${id}/${u.Status === 'Active' ? 'lock' : 'unlock'}`, Object.fromEntries(new FormData(e.currentTarget))) }}><fieldset className="vet-form-fields" disabled={action.busy}>{u.Status === 'Active' && <Field label="Lý do khóa tài khoản" name="Reason" action={action} required maxLength={500} />}<button className="button button-secondary">{u.Status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</button></fieldset></form>
      <button className="button button-secondary" disabled={action.busy} onClick={() => { if (window.confirm('Đặt lại mật khẩu sẽ kết thúc các phiên đăng nhập hiện tại của tài khoản này. Tiếp tục?')) void action.run(`/users/${id}/reset-password`) }}>Đặt lại mật khẩu</button></>}
    </>}</DataState>
  </section>
}
