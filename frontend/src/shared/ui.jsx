export function Card({ children, className = '' }) {
  return (
    <div
      className={
        'rounded-3xl bg-white/90 p-6 shadow-xl shadow-black/5 backdrop-blur sm:p-8 ' + className
      }
    >
      {children}
    </div>
  )
}

export function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  )
}

const inputBase =
  'w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] ' +
  'placeholder:text-[#B5AFA0] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25'

export function Input(props) {
  return <input {...props} className={inputBase + ' ' + (props.className ?? '')} />
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={
        'w-full rounded-full bg-gradient-to-r from-peach-500 to-peach-600 px-6 py-3 text-sm font-extrabold text-white ' +
        'shadow-lg shadow-peach-500/30 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 ' +
        className
      }
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={
        'rounded-full border border-[#E7D9C4] px-5 py-2.5 text-sm font-bold text-[#6A3A1C] transition hover:bg-[#FFF3DE] ' +
        className
      }
    >
      {children}
    </button>
  )
}

export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      ⚠️ {message}
    </div>
  )
}
