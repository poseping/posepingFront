import { NavLink } from 'react-router-dom'
import '../styles/bottom-nav.css'

const navItems = [
  { to: '/home',     label: '홈',      icon: '🏠' },
  { to: '/main',     label: '분석',    icon: '📷' },
  { to: '/history',  label: '기록',    icon: '📊' },
  { to: '/mypage',   label: '마이',    icon: '👤' },
  { to: '/settings', label: '설정',    icon: '⚙️' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, label, icon }) => (
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
