import { NavLink } from 'react-router-dom'
import '../styles/page-header.css'

const navItems = [
  { to: '/home',     label: '홈',         icon: '🏠' },
  { to: '/main',     label: '분석',       icon: '📷' },
  { to: '/history',  label: '기록',       icon: '📊' },
  { to: '/mypage',   label: '마이페이지',  icon: '👤' },
  { to: '/settings', label: '설정',       icon: '⚙️' },
]

interface PageHeaderProps {
  title: string
  description?: string
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__left">
        <h1 className="page-header__title">{title}</h1>
        {description && <p className="page-header__desc">{description}</p>}
      </div>

      {/* 데스크톱: 우측 nav */}
      <nav className="page-header__nav">
        {navItems.map(({ to, label, icon }) => (
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
