import { redirect } from 'next/navigation'

// Legacy shared login route. Admin and member logins now live on dedicated
// routes; keep this so old links/bookmarks still land somewhere sensible.
export default function LegacyLoginPage() {
    redirect('/admin/login')
}
