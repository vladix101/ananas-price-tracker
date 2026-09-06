export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1.5 px-4 py-7 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Ananas Tracker · lični projekat, nije povezan sa{' '}
          <a
            href="https://ananas.rs"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-2 hover:text-fg-muted"
          >
            ananas.rs
          </a>
        </p>
        <p>Cene se osvežavaju svakih 6 sati.</p>
      </div>
    </footer>
  )
}
