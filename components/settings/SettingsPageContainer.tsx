interface SettingsPageContainerProps {
    children: React.ReactNode
    className?: string
}

export default function SettingsPageContainer({ children, className = 'space-y-6' }: SettingsPageContainerProps) {
    return <div className={`w-full max-w-none ${className}`}>{children}</div>
}
