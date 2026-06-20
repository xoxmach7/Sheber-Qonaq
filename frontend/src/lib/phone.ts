// Единая маска телефона Казахстана: +7 777 777-77-77
export function formatPhoneKZ(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  // 8XXXXXXXXXX -> 7XXXXXXXXXX, гарантируем ведущую 7
  if (digits[0] === '8') digits = '7' + digits.slice(1)
  if (digits[0] !== '7') digits = '7' + digits
  digits = digits.slice(0, 11) // 7 + 10 цифр
  const d = digits.slice(1)    // 10 цифр после кода страны
  let out = '+7'
  if (d.length > 0) out += ' ' + d.slice(0, 3)
  if (d.length > 3) out += ' ' + d.slice(3, 6)
  if (d.length > 6) out += '-' + d.slice(6, 8)
  if (d.length > 8) out += '-' + d.slice(8, 10)
  return out
}

export const PHONE_PLACEHOLDER = '+7 777 777-77-77'
