import Link from 'next/link'
import type { ReactNode } from 'react'

const POINTS = [
  ['Zaprati proizvod', 'Nađi ga pretragom i klikni „Prati ovo”.'],
  ['Mi proveravamo', 'Cena se ponovo čita svakih šest sati.'],
  ['Stigne ti mejl', 'Čim padne ili dostigne tvoju ciljnu cenu.'],
] as const

/**
 * Two columns on desktop: the form, and why anyone would fill it in. A signup
 * screen that is only a form asks for trust without offering a reason.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="pb-safe mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center px-4 py-8 sm:px-5 sm:py-12">
      <Link
        href="/"
        className="mb-6 inline-flex sm:mb-8 items-center gap-2 self-start font-semibold tracking-tight"
      >
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-lg bg-fg text-[13px] font-bold text-bg"
        >
          A
        </span>
        <span>Ananas Tracker</span>
      </Link>

      <div className="grid items-start gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 lg:order-1">
          <h2 className="balance text-xl font-semibold leading-tight tracking-tight sm:text-3xl">
            Kupi kad pojeftini, ne kad se setiš.
          </h2>

          <ol className="mt-5 flex flex-col gap-4 sm:mt-7 sm:gap-5">
            {POINTS.map(([title, body], i) => (
              <li key={title} className="flex gap-3.5">
                <span
                  aria-hidden="true"
                  className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface text-xs font-semibold tabular-nums text-fg-muted"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-0.5 text-sm text-fg-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-6 text-sm text-fg-subtle sm:mt-7">
            Tri proizvoda besplatno. Bez kartice.
          </p>
        </div>

        <div className="order-1 lg:order-2">{children}</div>
      </div>
    </main>
  )
}
