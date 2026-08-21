/** Shared so the mobile top bar and the desktop page heading never disagree. */
export function greetingFor(name: string, now = new Date()): string {
    const hour = now.getHours()
    if (hour < 12) return `Morning, ${name}`
    if (hour < 17) return `Afternoon, ${name}`
    return `Evening, ${name}`
}
