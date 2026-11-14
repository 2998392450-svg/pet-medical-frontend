/**
 * 纯日期格式化：YYYY-MM-DD
 * 后端 DATE 列经 JSON 序列化后可能变成 UTC ISO 字符串（如 2026-11-19T16:00:00.000Z），
 * 直接截取前 10 位会得到前一天。这里统一按本地日期取值，纯日期字符串原样返回。
 */
export function formatDateOnly(value) {
  if (!value) return ''
  const str = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const d = new Date(str)
  if (isNaN(d.getTime())) return str.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
