import { PlatformThemeProvider } from '@/components/platform/PlatformTheme'
import './platform.css'

export const metadata = {
    title: {
        default: 'Platform console',
        template: '%s | GMS Cloud Platform',
    },
}

/**
 * Owns the `.platform-portal` token scope for every route under /platform,
 * including the login screen, so the two never diverge visually.
 */
export default function PlatformRootLayout({ children }: { children: React.ReactNode }) {
    return <PlatformThemeProvider>{children}</PlatformThemeProvider>
}
