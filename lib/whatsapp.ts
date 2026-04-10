import twilio from 'twilio'

type SendWhatsAppMessageResult =
    | {
        success: true
        sid: string
        to: string
        from: string
        body: string
    }
    | {
        success: false
        error: string
        to: string
        from?: string
        body: string
    }

function normalizePhoneNumber(value: string) {
    const trimmed = value.trim()

    if (!trimmed) {
        throw new Error('Recipient phone number is required.')
    }

    if (trimmed.startsWith('+')) {
        return trimmed
    }

    const digits = trimmed.replace(/\D/g, '')
    if (!digits) {
        throw new Error('Recipient phone number is invalid.')
    }

    const defaultCountryCode = process.env.TWILIO_WHATSAPP_DEFAULT_COUNTRY_CODE?.trim() || '+91'
    return digits.length === 10 ? `${defaultCountryCode}${digits}` : `+${digits}`
}

function toWhatsAppAddress(value: string) {
    const trimmed = value.trim()
    return trimmed.startsWith('whatsapp:') ? trimmed : `whatsapp:${normalizePhoneNumber(trimmed)}`
}

function getTwilioClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
        throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.')
    }

    return twilio(accountSid, authToken)
}

function getWhatsAppFromAddress() {
    const from = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER

    if (!from) {
        throw new Error('Twilio WhatsApp sender is not configured. Set TWILIO_WHATSAPP_FROM or TWILIO_WHATSAPP_NUMBER.')
    }

    return toWhatsAppAddress(from)
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<SendWhatsAppMessageResult> {
    let formattedTo = to
    let fromAddress: string | undefined

    try {
        const client = getTwilioClient()
        formattedTo = toWhatsAppAddress(to)
        fromAddress = getWhatsAppFromAddress()

        console.info('[whatsapp] Sending WhatsApp message', {
            to: formattedTo,
            from: fromAddress,
        })

        const response = await client.messages.create({
            body: message,
            from: fromAddress,
            to: formattedTo,
        })

        console.info('[whatsapp] WhatsApp message sent', {
            sid: response.sid,
            status: response.status,
            to: formattedTo,
        })

        return {
            success: true,
            sid: response.sid,
            to: formattedTo,
            from: fromAddress,
            body: message,
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown WhatsApp delivery error'

        console.error('[whatsapp] Failed to send WhatsApp message', {
            error: errorMessage,
            to: formattedTo,
            from: fromAddress,
        })

        return {
            success: false,
            error: errorMessage,
            to: formattedTo,
            from: fromAddress,
            body: message,
        }
    }
}
