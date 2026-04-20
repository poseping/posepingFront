import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function AppLayout() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '64px' }}>
      <Outlet />
      <BottomNav />
    </div>
  )
}
