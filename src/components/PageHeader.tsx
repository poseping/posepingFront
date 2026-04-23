import { NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import '../styles/page-header.css'

const navItems = [
  { to: '/home', label: '홈', icon: '🏠' },
  { to: '/main', label: '분석', icon: '📷' },
  { to: '/history', label: '기록', icon: '📊' },
  { to: '/mypage', label: '마이페이지', icon: '👤' },
  { to: '/settings', label: '설정', icon: '⚙️' },
]

const adminNavItem = { to: '/admin', label: '관리자', icon: '🛡️' }

const adminNavItems = [
  { to: '/admin', label: '대시보드', icon: '📋' },
  { to: '/admin/members', label: '회원', icon: '👥' },
  { to: '/home', label: '척추PING', icon: '🏠' },
]

interface PageHeaderProps {
  title: string
  description?: string
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  const user = useSelector((state: RootState) => state.auth.user)
  const location = useLocation()
  const isAdmin = user?.role?.toLowerCase() === 'admin'
  const isAdminArea = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  const visibleNavItems = isAdminArea ? adminNavItems : isAdmin ? [...navItems, adminNavItem] : navItems

  return (
    <header className="page-header">
      <div className="page-header__left">
        <h1 className="page-header__title">{title}</h1>
        {description && <p className="page-header__desc">{description}</p>}
      </div>

      <nav className="page-header__nav">
        {visibleNavItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `page-header__nav-item${isActive ? ' page-header__nav-item--active' : ''}`
            }
          >
            <span className="page-header__nav-icon">{icon}</span>
            <span className="page-header__nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
