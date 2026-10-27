import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAccessToken } from '../../api/apiClient.ts'
import './LandingPage.css'

// Chữ của trang giới thiệu theo 2 ngôn ngữ. Lựa chọn được nhớ ở trình duyệt (equi.lang).
const TEXT = {
  vi: {
    nav: ['Giới thiệu', 'Quy trình', 'Vai trò', 'Liên hệ'],
    login: 'ĐĂNG NHẬP', register: 'ĐĂNG KÝ', enter: 'VÀO HỆ THỐNG', enterLower: 'Vào hệ thống', loginLower: 'Đăng nhập', registerOwner: 'Đăng ký chủ ngựa',
    menuOpen: 'Mở menu', menuClose: 'Đóng menu', language: 'Ngôn ngữ', scroll: 'CUỘN',
    aboutEyebrow: 'MỘT NỀN TẢNG · MỘT HỆ THỐNG',
    aboutTitle: ['Được thiết kế cho toàn bộ vòng đời', 'vận hành ngựa đua.'],
    aboutLead: 'Hồ sơ, sức khỏe và huấn luyện nằm trên cùng một nguồn dữ liệu. Mỗi vai trò thấy đúng phần việc của mình.',
    ringCaption: 'MỘT NGUỒN DỮ LIỆU', lifecycle: ['Tiếp nhận', 'Sức khỏe', 'Huấn luyện', 'Chăm sóc'],
    rolesEyebrow: 'VAI TRÒ', rolesTitle: ['5 vai trò chính.', 'Một hệ thống thống nhất.'],
    rolesLead: 'Mỗi vai trò có khu vực làm việc riêng, nhưng cùng chạy trên một nguồn dữ liệu.', rolesTasks: 'VIỆC CHÍNH',
    roles: [
      ['Quản lý câu lạc bộ', 'Điều hành toàn bộ hoạt động của câu lạc bộ.', ['Tiếp nhận và xác minh hồ sơ ngựa', 'Cấp tài khoản cho nhân viên', 'Quản lý kho vật tư và báo cáo']],
      ['Huấn luyện viên trưởng', 'Định hướng chương trình huấn luyện của cả đội.', ['Phân công huấn luyện viên cho từng ngựa', 'Duyệt giáo án huấn luyện', 'Lập khẩu phần ăn gửi bác sĩ thú y duyệt']],
      ['Bác sĩ thú y', 'Bảo đảm ngựa đủ sức khỏe để tập luyện.', ['Khám sức khỏe đầu vào', 'Điều trị và theo dõi sức khỏe', 'Khóa hoặc mở lại việc tập luyện']],
      ['Nhân viên chăm sóc', 'Chăm sóc ngựa mỗi ngày.', ['Thực hiện công việc chăm sóc hằng ngày', 'Cho ăn theo khẩu phần đã duyệt', 'Gửi yêu cầu vật tư']],
      ['Chủ ngựa', 'Theo dõi những chú ngựa của mình.', ['Gửi hồ sơ ngựa cho câu lạc bộ', 'Xem tình trạng sức khỏe và huấn luyện', 'Nhận thông báo kết quả']],
    ],
    syncEyebrow: 'QUY TRÌNH LIÊN THÔNG', syncTitle: ['Dữ liệu thay đổi.', 'Giao diện cập nhật.'],
    syncLead: 'Từ lúc ngựa được tiếp nhận, khám sức khỏe đến khi vào chương trình huấn luyện, trạng thái luôn được cập nhật giữa các vai trò.',
    syncSteps: ['Quản lý câu lạc bộ tiếp nhận và xác minh hồ sơ.', 'Bác sĩ thú y khám và cập nhật sức khỏe.', 'Kết quả được gửi đến Quản lý và Chủ ngựa.'],
    ctaEyebrow: 'SẴN SÀNG BẮT ĐẦU?', ctaTitle: ['Một nền tảng tốt hơn cho', 'những chiến mã tốt hơn.'],
    ctaText: 'Quản lý câu lạc bộ, hồ sơ ngựa và hoạt động chuyên môn trên một hệ thống.',
    ctaLogin: 'ĐĂNG NHẬP HỆ THỐNG', ctaRegister: 'ĐĂNG KÝ CHỦ NGỰA',
    foot: { explore: 'KHÁM PHÁ EQUITRACK', features: 'CHỨC NĂNG', account: 'TÀI KHOẢN', contact: 'LIÊN HỆ',
      featureLinks: ['Hồ sơ ngựa', 'Huấn luyện', 'Sức khỏe', 'Chăm sóc'],
      help: 'Cần cấp tài khoản nhân viên? Hãy liên hệ Quản lý câu lạc bộ của bạn.',
      copy: 'Bản quyền © 2026 EquiTrack. Bảo lưu mọi quyền.', top: 'LÊN ĐẦU TRANG' },
  },
  en: {
    nav: ['About', 'Workflow', 'Roles', 'Contact'],
    login: 'SIGN IN', register: 'SIGN UP', enter: 'OPEN EQUITRACK', enterLower: 'Open EquiTrack', loginLower: 'Sign in', registerOwner: 'Owner sign-up',
    menuOpen: 'Open menu', menuClose: 'Close menu', language: 'Language', scroll: 'SCROLL',
    aboutEyebrow: 'ONE PLATFORM · ONE SYSTEM',
    aboutTitle: ['Built for every stage of', 'racehorse operations.'],
    aboutLead: 'Records, health and training share one source of data. Every role sees exactly the work that is theirs.',
    ringCaption: 'ONE SOURCE OF DATA', lifecycle: ['Intake', 'Health', 'Training', 'Care'],
    rolesEyebrow: 'ROLES', rolesTitle: ['5 core roles.', 'One unified system.'],
    rolesLead: 'Every role has its own workspace, all running on one source of data.', rolesTasks: 'KEY TASKS',
    roles: [
      ['Club manager', 'Runs the day-to-day operations of the club.', ['Receives and verifies horse records', 'Creates staff accounts', 'Manages inventory and reports']],
      ['Head trainer', 'Sets the direction of the training programme.', ['Assigns trainers to each horse', 'Approves training plans', 'Prepares diet plans for veterinarian approval']],
      ['Veterinarian', 'Keeps every horse fit to train.', ['Performs intake health checks', 'Treats and monitors health', 'Locks or reopens training']],
      ['Groom', 'Looks after the horses every day.', ['Carries out daily care tasks', 'Feeds according to approved diets', 'Requests supplies']],
      ['Horse owner', 'Follows their own horses.', ['Submits horse records to the club', 'Views health and training status', 'Gets notified of results']],
    ],
    syncEyebrow: 'CONNECTED WORKFLOW', syncTitle: ['Data changes.', 'Every screen follows.'],
    syncLead: 'From intake and health checks to the training programme, a horse’s status stays in sync across every role.',
    syncSteps: ['The club manager receives and verifies the record.', 'The veterinarian examines the horse and updates its health.', 'The result reaches the manager and the owner.'],
    ctaEyebrow: 'READY TO START?', ctaTitle: ['A better platform for', 'better racehorses.'],
    ctaText: 'Club operations, horse records and specialist work on one system.',
    ctaLogin: 'SIGN IN', ctaRegister: 'OWNER SIGN-UP',
    foot: { explore: 'EXPLORE EQUITRACK', features: 'FEATURES', account: 'ACCOUNT', contact: 'CONTACT',
      featureLinks: ['Horse records', 'Training', 'Health', 'Care'],
      help: 'Need a staff account? Please contact your club manager.',
      copy: 'Copyright © 2026 EquiTrack. All rights reserved.', top: 'BACK TO TOP' },
  },
}
const LANGS = [['vi', 'VI', 'Tiếng Việt'], ['en', 'EN', 'English']]

function readLang() {
  try { return localStorage.getItem('equi.lang') === 'en' ? 'en' : 'vi' } catch { return 'vi' }
}

const STEP_ICONS = ['intake', 'health', 'training', 'care']

// Biểu tượng nét mảnh cho 4 bước của vòng đời ngựa trong câu lạc bộ.
function StepIcon({ name }) {
  const paths = {
    intake: <><rect x="10" y="8" width="28" height="34" rx="2" /><path d="M18 8V5h12v3M16 20h16M16 27h16M16 34h10" /></>,
    health: <><circle cx="24" cy="24" r="18" /><path d="M10 25h8l3-7 5 14 3-7h9" /></>,
    training: <><circle cx="24" cy="27" r="16" /><path d="M24 27V18M20 5h8M24 5v6M36 13l3-3" /></>,
    care: <><path d="M12 40V24a12 12 0 0 1 24 0v16M8 40h8M32 40h8" /><circle cx="15" cy="30" r="1" /><circle cx="33" cy="30" r="1" /><circle cx="17" cy="20" r="1" /><circle cx="31" cy="20" r="1" /></>,
  }
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function LanguageSwitch({ lang, setLang, label }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!box.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  return <div className="lp-lang" ref={box}>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>
      {lang.toUpperCase()}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && <ul role="listbox" aria-label={label}>
      {LANGS.map(([code, short, name]) => <li key={code} role="option" aria-selected={lang === code}>
        <button type="button" onClick={() => { setLang(code); setOpen(false) }}><b>{short}</b>{name}</button>
      </li>)}
    </ul>}
  </div>
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const [role, setRole] = useState(0)
  const teamRef = useRef(null)
  const [teamIn, setTeamIn] = useState(false)
  const [teamPaused, setTeamPaused] = useState(false)

  // Phần Vai trò: hiện dần khi cuộn tới; chỉ tự chuyển vai trò khi phần này đang nằm trên màn hình.
  useEffect(() => {
    const node = teamRef.current
    if (!node || typeof IntersectionObserver === 'undefined') { setTeamIn(true); return undefined }
    const observer = new IntersectionObserver(([entry]) => setTeamIn(entry.isIntersecting), { threshold: 0.25 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const [menuOpen, setMenuOpen] = useState(false)
  const [lang, setLangState] = useState(readLang)
  const t = TEXT[lang]
  // Đã đăng nhập (còn phiên trong trình duyệt): thay Đăng nhập / Đăng ký bằng nút quay lại hệ thống.
  const [signedIn] = useState(() => { try { return Boolean(getAccessToken()) } catch { return false } })
  const dashRef = useRef(null)
  const [dashOn, setDashOn] = useState(false)

  // Cột biểu đồ trong khung minh họa mọc lên khi người xem cuộn tới.
  useEffect(() => {
    const node = dashRef.current
    if (!node || typeof IntersectionObserver === 'undefined') { setDashOn(true); return undefined }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setDashOn(true); observer.disconnect() } }, { threshold: 0.3 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function setLang(code) {
    setLangState(code)
    try { localStorage.setItem('equi.lang', code) } catch { /* trình duyệt chặn lưu: vẫn đổi ngay trên trang */ }
  }

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  useEffect(() => {
    // Thanh menu: cuộn xuống thì ẩn, cuộn lên thì hiện lại (luôn hiện khi ở đầu trang).
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 40)
      if (Math.abs(y - lastY) > 6) {
        setNavHidden(y > lastY && y > 160)
        lastY = y
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const anchors = ['#top', '#quy-trinh', '#vai-tro', '#lien-he']
  const links = <>{anchors.map((href, i) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{t.nav[i]}</a>)}</>

  return <div className="landing-page">
    <header className={`lp-nav${scrolled || menuOpen ? ' is-solid' : ''}${navHidden && !menuOpen ? ' is-hidden' : ''}`}>
      <Link className="lp-brand" to="/" aria-label="EquiTrack">
        <span className="lp-mark"><img src="/equitrack-mark.jpg" alt="" /></span>
        <span className="lp-brand-name">EQUITRACK</span>
      </Link>
      <nav className="lp-links" aria-label="Menu">{links}</nav>
      <div className="lp-nav-actions">
        {signedIn
          ? <Link className="lp-nav-login" to="/login">{t.enter}</Link>
          : <>
            <Link className="lp-nav-register" to="/login?mode=register">{t.register}</Link>
            <Link className="lp-nav-login" to="/login">{t.login}</Link>
          </>}
      </div>
      <LanguageSwitch lang={lang} setLang={setLang} label={t.language} />
      <button className="lp-burger" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? t.menuClose : t.menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
      {menuOpen && <nav className="lp-drawer" aria-label="Menu">{links}{signedIn ? <Link to="/login">{t.enterLower}</Link> : <><Link to="/login">{t.loginLower}</Link><Link to="/login?mode=register">{t.registerOwner}</Link></>}</nav>}
    </header>

    <section className="lp-hero" id="top">
      <video className="lp-video" autoPlay muted loop playsInline preload="auto" poster="/login-hero.jpg" aria-hidden="true" tabIndex={-1}>
        <source src="/login-hero.mp4" type="video/mp4" />
      </video>
      <div className="lp-hero-shade" aria-hidden="true" />
      <div className="lp-hero-content">
        <h1>EquiTrack</h1>
        <p className="lp-hero-sub">Racehorse Performance.</p>
      </div>
      <a className="lp-scroll" href="#quy-trinh"><i aria-hidden="true" /><span>{t.scroll}</span></a>
    </section>

    <section className="lp-about" id="quy-trinh">
      <div>
        <p className="lp-about-eyebrow">{t.aboutEyebrow}</p>
        <h2>{t.aboutTitle[0]} <span>{t.aboutTitle[1]}</span></h2>
        <p className="lp-about-lead">{t.aboutLead}</p>
      </div>
      <div className="lp-ring">
        <svg className="lp-ring-track" viewBox="0 0 100 100" aria-hidden="true">
          <circle className="outer" cx="50" cy="50" r="49.6" fill="none" stroke="rgba(80,86,69,.5)" strokeWidth=".25" strokeDasharray=".8 1.2" />
          <circle cx="50" cy="50" r="34" fill="#505645" />
        </svg>
        <div className="lp-ring-center" aria-hidden="true">
          <img src="/equitrack-mark.jpg" alt="" />
          <b>EquiTrack</b>
          <small>{t.ringCaption}</small>
        </div>
        <ol>
          {t.lifecycle.map((name, i) => <li key={STEP_ICONS[i]}>
            <i aria-hidden="true"><StepIcon name={STEP_ICONS[i]} /></i>
            <div><span>{String(i + 1).padStart(2, '0')}</span><strong>{name}</strong></div>
          </li>)}
        </ol>
      </div>
    </section>

    <section className={`lp-team${teamIn ? ' is-in' : ''}${teamPaused ? ' is-paused' : ''}`} id="vai-tro" ref={teamRef}>
      <div className="lp-team-head">
        <div>
          <p className="lp-kicker">{t.rolesEyebrow}</p>
          <h2>{t.rolesTitle[0]} <span>{t.rolesTitle[1]}</span></h2>
        </div>
        <p>{t.rolesLead}</p>
      </div>
      <div className="lp-team-body" onMouseEnter={() => setTeamPaused(true)} onMouseLeave={() => setTeamPaused(false)}
        onFocus={() => setTeamPaused(true)} onBlur={() => setTeamPaused(false)}>
        <div className="lp-team-list" role="tablist" aria-label={t.rolesEyebrow}>
          {t.roles.map(([name], i) => <button key={i} type="button" role="tab" id={`role-tab-${i}`} aria-selected={role === i} aria-controls="role-panel"
            tabIndex={role === i ? 0 : -1} className={role === i ? 'is-active' : ''} style={{ '--i': i }} onClick={() => setRole(i)} onMouseEnter={() => setRole(i)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
              event.preventDefault()
              const next = (i + (event.key === 'ArrowDown' ? 1 : t.roles.length - 1)) % t.roles.length
              setRole(next)
              document.getElementById(`role-tab-${next}`)?.focus()
            }}>
            <span>{String(i + 1).padStart(2, '0')}</span>{name}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            {role === i && <i className="lp-team-progress" aria-hidden="true" onAnimationEnd={() => setRole((role + 1) % t.roles.length)} />}
          </button>)}
        </div>
        <div className="lp-team-panel" role="tabpanel" id="role-panel" aria-labelledby={`role-tab-${role}`} key={`${lang}-${role}`}>
          <b className="lp-team-num" aria-hidden="true">{String(role + 1).padStart(2, '0')}</b>
          <h3>{t.roles[role][0]}</h3>
          <p>{t.roles[role][1]}</p>
          <small>{t.rolesTasks}</small>
          <ul>
            {t.roles[role][2].map((task, i) => <li key={task} style={{ '--i': i }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>{task}
            </li>)}
          </ul>
        </div>
      </div>
    </section>

    <section className="lp-sync">
      <div className="lp-sync-copy">
        <p className="lp-kicker">{t.syncEyebrow}</p>
        <h2>{t.syncTitle[0]} <span>{t.syncTitle[1]}</span></h2>
        <p className="lp-sync-lead">{t.syncLead}</p>
        <ol className="lp-sync-steps">
          {t.syncSteps.map((text, i) => <li key={i}><span>{String(i + 1).padStart(2, '0')}</span><p>{text}</p></li>)}
        </ol>
      </div>
      <div className="lp-dash-stage" ref={dashRef}>
        <div className={`lp-dash${dashOn ? ' is-on' : ''}`} aria-hidden="true">
          <div className="lp-dash-top"><i /><i /><i /></div>
          <div className="lp-dash-body">
            <aside>
              <span className="lp-dash-logo"><img src="/equitrack-mark.jpg" alt="" /></span>
              <b className="on" /><b /><b /><b className="short" />
            </aside>
            <div className="lp-dash-main">
              <span className="lp-dash-title" />
              <div className="lp-dash-stats">{[0, 1, 2].map((i) => <div key={i}><span /><strong /></div>)}</div>
              <div className="lp-dash-chart">
                {[34, 48, 42, 65, 57, 80, 71, 92].map((h, i) => <span key={i} style={{ height: `${h}%`, transitionDelay: `${i * 70}ms` }} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="lp-cta">
      <svg className="lp-cta-rings" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="49.5" fill="none" stroke="rgba(224,214,176,.35)" strokeWidth=".18" strokeDasharray=".7 1.1" />
        <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(244,241,234,.14)" strokeWidth=".18" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(244,241,234,.1)" strokeWidth=".18" />
      </svg>
      <div className="lp-cta-content">
        <p className="lp-kicker">{t.ctaEyebrow}</p>
        <h2>{t.ctaTitle[0]} <span>{t.ctaTitle[1]}</span></h2>
        <p>{t.ctaText}</p>
        <div className="lp-cta-actions">
          <Link className="lp-cta-primary" to="/login">{signedIn ? t.enter : t.ctaLogin}</Link>
          {!signedIn && <Link className="lp-cta-secondary" to="/login?mode=register">{t.ctaRegister}</Link>}
        </div>
      </div>
    </section>

    <footer className="lp-footer" id="lien-he">
      <div className="lp-footer-main">
        <Link className="lp-footer-logo" to="/" aria-label="EquiTrack"><img src="/equitrack-mark.jpg" alt="" /></Link>
        <nav aria-label={t.foot.explore}>
          <strong>{t.foot.explore}</strong>
          {anchors.slice(0, 3).map((href, i) => <a key={href} href={href}>{t.nav[i]}</a>)}
        </nav>
        <nav aria-label={t.foot.features}>
          <strong>{t.foot.features}</strong>
          {t.foot.featureLinks.map((name) => <a key={name} href="#quy-trinh">{name}</a>)}
        </nav>
        <nav aria-label={t.foot.account}>
          <strong>{t.foot.account}</strong>
          <Link to="/login">{t.loginLower}</Link>
          <Link to="/login?mode=register">{t.registerOwner}</Link>
        </nav>
        <div className="lp-footer-contact">
          <strong>{t.foot.contact}</strong>
          <p>EquiTrack · Racehorse Training &amp; Management System</p>
          <p>E: <a href="mailto:tranbaonguyen0209@gmail.com">tranbaonguyen0209@gmail.com</a></p>
          <p className="lp-footer-help">{t.foot.help}</p>
        </div>
      </div>
      <div className="lp-footer-bar">
        <p>{t.foot.copy}</p>
        <a className="lp-totop" href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          {t.foot.top}
          <span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 19V5M6 11l6-6 6 6" /></svg></span>
        </a>
      </div>
    </footer>
  </div>
}
