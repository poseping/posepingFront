import { NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import '../styles/bottom-nav.css'

const navItems = [
  { to: '/home', label: '홈', icon: '🏠' },
  { to: '/main', label: '분석', icon: '📷' },
  { to: '/history', label: '기록', icon: '📊' },
  { to: '/mypage', label: '마이', icon: '👤' },
  { to: '/settings', label: '설정', icon: '⚙️' },
]

const adminNavItem = { to: '/admin', label: '관리자', icon: '🛡️' }

const adminNavItems = [
  { to: '/admin', label: '대시보드', icon: '📋' },
  { to: '/admin/members', label: '회원', icon: '👥' },
  { to: '/home', label: '척추PING', icon: '🏠' },
]

export default function BottomNav() {
  const user = useSelector((state: RootState) => state.auth.user)
  const location = useLocation()
  const isAdmin = user?.role?.toLowerCase() === 'admin'
  const isAdminArea = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  const visibleNavItems = isAdminArea ? adminNavItems : isAdmin ? [...navItems, adminNavItem] : navItems

  return (
    <nav className="bottom-nav">
      {visibleNavItems.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
        >
          <span className="bottom-nav__icon">{icon}</span>
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
