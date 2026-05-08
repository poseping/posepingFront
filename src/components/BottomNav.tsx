import { NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faAddressBook,
  faCamera,
  faChartBar,
  faCircleUser,
  faClipboard,
  faHouse,
  faIdCard,
} from '@fortawesome/free-regular-svg-icons'
import { RootState } from '../store/store'

const navItems = [
  { to: '/home', label: '홈', icon: faHouse },
  { to: '/main', label: '분석', icon: faCamera },
  { to: '/photo', label: '사진', icon: faChartBar },
  { to: '/mypage', label: '마이', icon: faCircleUser },
]

const adminNavItem = { to: '/admin', label: '관리자', icon: faIdCard }

const adminNavItems = [
  { to: '/admin', label: '대시보드', icon: faClipboard },
  { to: '/admin/members', label: '회원', icon: faAddressBook },
  { to: '/home', label: '포즈PING', icon: faHouse },
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
          end={to === '/admin'}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
        >
          <span className="bottom-nav__icon"><FontAwesomeIcon icon={icon} /></span>
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
