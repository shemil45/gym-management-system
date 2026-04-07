'use client'

import { createClient } from '@/lib/supabase/client'

const MAX_IMAGE_WIDTH = 800
const TARGET_IMAGE_BYTES = 300 * 1024
const DEFAULT_IMAGE_QUALITY = 0.7

export type UploadedAvatar = {
    publicUrl: string
    path: string
}

type UploadCompressedAvatarOptions = {
    onStatusChange?: (status: string) => void
}

export async function createImagePreviewUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read the selected image.'))
        reader.readAsDataURL(file)
    })
}

async function loadImage(file: File) {
    const objectUrl = URL.createObjectURL(file)

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const nextImage = new window.Image()
            nextImage.onload = () => resolve(nextImage)
            nextImage.onerror = () => reject(new Error('Failed to load the selected image.'))
            nextImage.src = objectUrl
        })

        return image
    } finally {
        URL.revokeObjectURL(objectUrl)
    }
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
    return await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, type, quality)
    })
}

export async function compressImageFile(file: File) {
    const image = await loadImage(file)
    const originalWidth = image.naturalWidth || image.width
    const originalHeight = image.naturalHeight || image.height

    if (!originalWidth || !originalHeight) {
        throw new Error('Failed to read the selected image.')
    }

    let currentWidth = Math.min(originalWidth, MAX_IMAGE_WIDTH)
    let currentHeight = Math.max(1, Math.round((originalHeight / originalWidth) * currentWidth))

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
        throw new Error('Image compression is not supported in this browser.')
    }

    let bestBlob: Blob | null = null
    let bestType = 'image/webp'
    const mimeTypeAttempts = ['image/webp', 'image/jpeg']
    const qualityAttempts = [DEFAULT_IMAGE_QUALITY, 0.65, 0.55, 0.45]

    for (let resizeStep = 0; resizeStep < 4; resizeStep += 1) {
        canvas.width = currentWidth
        canvas.height = currentHeight
        context.clearRect(0, 0, currentWidth, currentHeight)
        context.drawImage(image, 0, 0, currentWidth, currentHeight)

        for (const mimeType of mimeTypeAttempts) {
            for (const quality of qualityAttempts) {
                const blob = await canvasToBlob(canvas, mimeType, quality)

                if (!blob) {
                    continue
                }

                if (!bestBlob || blob.size < bestBlob.size) {
                    bestBlob = blob
                    bestType = mimeType
                }

                if (blob.size <= TARGET_IMAGE_BYTES) {
                    const extension = mimeType === 'image/webp' ? 'webp' : 'jpg'
                    const fileName = file.name.replace(/\.[^.]+$/, '') || 'profile-photo'

                    return new File([blob], `${fileName}.${extension}`, {
                        type: mimeType,
                        lastModified: Date.now(),
                    })
                }
            }
        }

        if (currentWidth <= 320) {
            break
        }

        currentWidth = Math.max(320, Math.round(currentWidth * 0.85))
        currentHeight = Math.max(1, Math.round((originalHeight / originalWidth) * currentWidth))
    }

    if (!bestBlob) {
        throw new Error('Failed to compress the selected image.')
    }

    if (bestBlob.size > TARGET_IMAGE_BYTES) {
        throw new Error('Unable to compress this image under 300KB. Please choose a smaller photo.')
    }

    const extension = bestType === 'image/webp' ? 'webp' : 'jpg'
    const fileName = file.name.replace(/\.[^.]+$/, '') || 'profile-photo'

    return new File([bestBlob], `${fileName}.${extension}`, {
        type: bestType,
        lastModified: Date.now(),
    })
}

export async function uploadCompressedAvatar(
    file: File,
    prefix: string,
    options?: UploadCompressedAvatarOptions
) {
    options?.onStatusChange?.('Compressing photo...')
    const compressedFile = await compressImageFile(file)
    const extension = compressedFile.type === 'image/webp' ? 'webp' : 'jpg'
    const uniqueId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const path = `${prefix}-${uniqueId}.${extension}`
    const supabase = createClient()

    options?.onStatusChange?.('Uploading photo...')
    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, compressedFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: compressedFile.type,
        })

    if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload the compressed photo.')
    }

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

    return {
        publicUrl,
        path,
    }
}

export async function removeUploadedAvatar(path: string) {
    if (!path) {
        return
    }

    const supabase = createClient()
    await supabase.storage.from('avatars').remove([path])
}
