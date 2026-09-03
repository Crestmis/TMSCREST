import { Lock } from 'lucide-react'

// Consistent "you can't do this" notice for Viewer / no-access users.
// tone: 'info' (amber, page-level redirect) | 'lock' (grey, in-page view-only)
export default function AccessBanner({ children, tone = 'lock' }) {
  return (
    <div className={tone === 'info' ? 'page-denied-banner' : 'notice-box access-banner'}>
      <Lock size={14} />
      <span>{children}</span>
    </div>
  )
}
