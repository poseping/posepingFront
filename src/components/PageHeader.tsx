import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCamera,
  faClipboard,
  faHouse,
  faIdCard,
  faAddressBook,
  faCircleUser,
  faObjectGroup,
} from '@fortawesome/free-regular-svg-icons'
import { RootState } from '../store/store'
import '../styles/layout/page-header.scss'

const navItems = [
  { to: '/home', label: '홈', icon: faHouse },
  { to: '/webcam', label: '웹캠', icon: faObjectGroup },
  { to: '/photo', label: '사진', icon: faCamera },
  { to: '/mypage', label: '마이페이지', icon: faCircleUser },
]

const adminNavItem = { to: '/admin', label: '관리자', icon: faIdCard }

const adminNavItems = [
  { to: '/admin', label: '대시보드', icon: faClipboard },
  { to: '/admin/members', label: '회원', icon: faAddressBook },
  { to: '/home', label: '포즈PING', icon: faHouse },
]

export default function PageHeader() {
  const user = useSelector((state: RootState) => state.auth.user)
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const isAdmin = user?.role?.toLowerCase() === 'admin'
  const isAdminArea = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  const isHome = location.pathname === '/home'
  const isFirstLogin = location.pathname === '/first-login'
  const visibleNavItems = isAdminArea ? adminNavItems : isAdmin ? [...navItems, adminNavItem] : navItems

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(false)
      return
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHome])

  if (isFirstLogin) {
    return null
  }

  return (
    <header className={`page-header${isHome ? ' home-header' : ''}${isHome && isScrolled ? ' home-header--scrolled' : ''}`}>
      <nav className="page-header__nav">
        {visibleNavItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              `page-header__nav-item${isActive ? ' page-header__nav-item--active' : ''}`
            }
          >
            <span className="page-header__nav-icon"><FontAwesomeIcon icon={icon} /></span>
            <span className="page-header__nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

