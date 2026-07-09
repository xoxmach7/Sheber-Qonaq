import type { InputHTMLAttributes } from 'react'

export default function DateField({ className = '', value, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const isEmpty = !value
  return (
    <input
      type="date"
      value={value}
      className={`${className} ${isEmpty ? 'date-empty' : ''}`}
      {...props}
    />
  )
}
