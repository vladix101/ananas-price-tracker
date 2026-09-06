import { IconBell, IconSearch, IconTrendDown } from '@/components/icons'

const STEPS = [
  {
    Icon: IconSearch,
    title: 'Nađi i zaprati',
    body: 'Pretraži ananas.rs i klikni „Prati cenu”. Možeš zadati i cenu na koju čekaš.',
  },
  {
    Icon: IconTrendDown,
    title: 'Mi gledamo umesto tebe',
    body: 'Cena se ponovo proverava svakih šest sati i beleži se u istoriju.',
  },
  {
    Icon: IconBell,
    title: 'Stigne ti mejl',
    body: 'Čim cena padne ili dostigne tvoj cilj. Ne šaljemo ništa drugo.',
  },
] as const

/**
 * Shown to signed-out visitors only. Someone who is already tracking products
 * knows how it works, and repeating it would just push their results down.
 */
export function HowItWorks() {
  return (
    <section aria-labelledby="kako-radi" className="border-t border-line pt-6 sm:pt-8">
      <h2 id="kako-radi" className="sr-only">
        Kako radi
      </h2>

      <ol className="grid gap-4 sm:grid-cols-3 sm:gap-6">
        {STEPS.map(({ Icon, title, body }, i) => (
          <li key={title} className="flex gap-3 sm:flex-col sm:gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-fg-muted"
            >
              <Icon />
            </span>
            <div>
              <p className="text-sm font-semibold">
                <span className="mr-1.5 tabular-nums text-fg-subtle">{i + 1}</span>
                {title}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
