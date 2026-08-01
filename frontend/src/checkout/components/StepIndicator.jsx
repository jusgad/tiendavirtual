export default function StepIndicator({ steps, current }) {
  return (
    <ol className="flex items-center justify-between gap-1">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'pending'
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold transition ' +
                  (state === 'done'
                    ? 'bg-[#25D366] text-white'
                    : state === 'active'
                      ? 'bg-peach-500 text-white shadow-lg shadow-peach-500/40'
                      : 'bg-white/70 text-[#B5AFA0]')
                }
              >
                {state === 'done' ? '✓' : i + 1}
              </div>
              <span
                className={
                  'text-center text-[11px] font-bold leading-tight ' +
                  (state === 'pending' ? 'text-[#B5AFA0]' : 'text-[#5A2E12]')
                }
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={
                  'mb-4 h-0.5 flex-1 rounded ' + (i < current ? 'bg-[#25D366]' : 'bg-white/70')
                }
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
