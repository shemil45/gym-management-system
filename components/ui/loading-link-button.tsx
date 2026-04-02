'use client'

import { startTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'

type LoadingLinkButtonProps = Omit<ButtonProps, 'onClick'> & {
    href: string
    loadingText?: string
}

export default function LoadingLinkButton({
    children,
    className,
    disabled,
    href,
    loadingText,
    size,
    variant,
    ...props
}: LoadingLinkButtonProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleClick = () => {
        if (disabled || loading) {
            return
        }

        setLoading(true)
        router.prefetch(href)
        startTransition(() => {
            router.push(href)
        })
    }

    return (
        <Button
            className={className}
            disabled={disabled || loading}
            onClick={handleClick}
            size={size}
            variant={variant}
            {...props}
        >
            {loading ? <Loader2 className="animate-spin" /> : null}
            {loading && loadingText ? loadingText : children}
        </Button>
    )
}
