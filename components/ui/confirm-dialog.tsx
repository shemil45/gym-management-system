'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { Button } from '@/components/ui/button'

type ConfirmDialogOptions = {
    title?: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    tone?: 'danger' | 'default'
}

type ConfirmDialogState = ConfirmDialogOptions & {
    open: boolean
}

const initialState: ConfirmDialogState = {
    cancelLabel: 'Cancel',
    confirmLabel: 'Confirm',
    description: '',
    open: false,
    title: 'Please confirm',
    tone: 'default',
}

export function useConfirmDialog() {
    const { isDark } = useAdminTheme()
    const resolverRef = useRef<((value: boolean) => void) | null>(null)
    const [dialog, setDialog] = useState<ConfirmDialogState>(initialState)

    const close = useCallback((result: boolean) => {
        resolverRef.current?.(result)
        resolverRef.current = null
        setDialog(initialState)
    }, [])

    const confirm = useCallback((options: ConfirmDialogOptions) => {
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve
            setDialog({
                cancelLabel: options.cancelLabel ?? 'Cancel',
                confirmLabel: options.confirmLabel ?? 'Confirm',
                description: options.description,
                open: true,
                title: options.title ?? 'Please confirm',
                tone: options.tone ?? 'default',
            })
        })
    }, [])

    const dialogElement = useMemo(() => {
        if (!dialog.open) {
            return null
        }

        const isDanger = dialog.tone === 'danger'

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <button
                    type="button"
                    aria-label="Close confirmation dialog"
                    className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
                    onClick={() => close(false)}
                />
                <div
                    aria-describedby="confirm-dialog-description"
                    aria-modal="true"
                    aria-labelledby="confirm-dialog-title"
                    className={`relative w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl ${
                        isDark
                            ? 'border border-[#2a2a2a] bg-[#1c1c1c]'
                            : 'border border-slate-200 bg-white'
                    }`}
                    role="dialog"
                >
                    <div className="flex items-start gap-4 p-5">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isDanger ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 id="confirm-dialog-title" className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                                {dialog.title}
                            </h2>
                            <p id="confirm-dialog-description" className={`mt-1 text-sm leading-6 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                {dialog.description}
                            </p>
                        </div>
                    </div>
                    <div className={`flex items-center justify-end gap-3 px-5 py-4 ${
                        isDark ? 'border-t border-[#2a2a2a]' : 'border-t border-slate-100'
                    }`}>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => close(false)}
                            className={isDark ? 'border-[#2a2a2a] bg-[#161616] text-gray-200 hover:bg-[#222222] hover:text-white' : ''}
                        >
                            {dialog.cancelLabel}
                        </Button>
                        <Button
                            type="button"
                            variant={isDanger ? 'destructive' : 'default'}
                            onClick={() => close(true)}
                        >
                            {dialog.confirmLabel}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }, [close, dialog, isDark])

    return {
        confirm,
        dialog: dialogElement,
    }
}
