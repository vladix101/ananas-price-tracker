"""Re-scrape every tracked product and notify on price drops.

Run locally:   py -m pip install -r requirements.txt && py run.py --dry-run
In CI:         python run.py        (see .github/workflows/scrape.yml)

One bad product never stops the run: each is wrapped, logged and skipped.
"""

from __future__ import annotations

import argparse
import logging
import os
import random
import sys
import time
from decimal import Decimal

import requests
from dotenv import load_dotenv

from ananas import ProductGone, ScrapeError, fetch_price
from notifier import ConsoleNotifier, GmailNotifier, Message, Notifier, Recipient
from store import Store, TrackedProduct

log = logging.getLogger("scraper")

# Politeness: ananas.rs gets one request per product with a pause between them.
# Jittered so a fixed cron does not hammer the same rhythm every six hours.
DELAY_SECONDS = (1.5, 3.5)


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        sys.exit(f"Nedostaje promenljiva okruzenja {name}.")
    return value


def _format_rsd(value: Decimal) -> str:
    """69999 -> '69.999 RSD' — matches how the web app renders prices."""
    return f"{value:,.0f}".replace(",", ".") + " RSD"


def build_message(product: TrackedProduct, old: Decimal, new: Decimal) -> Message:
    saved = old - new
    hit_target = product.target_price is not None and new <= product.target_price

    lines = [
        product.product_name,
        "",
        f"Stara cena:  {_format_rsd(old)}",
        f"Nova cena:   {_format_rsd(new)}",
        f"Ustedelo:    {_format_rsd(saved)}",
    ]
    if hit_target:
        lines.append(f"Ciljna cena: {_format_rsd(product.target_price)} — dostignuta!")
    lines += ["", product.ananas_url]

    subject = (
        f"Cilj dostignut: {product.product_name[:60]}"
        if hit_target
        else f"Cena pala: {product.product_name[:60]}"
    )
    return Message(subject=subject, body="\n".join(lines))


def should_notify(product: TrackedProduct, new_price: Decimal) -> bool:
    """Notify only on an actual drop.

    Firing on "price is at or below target" instead would mail the user every
    six hours for as long as the price stayed there. A drop is an event; being
    cheap is a state.
    """
    if product.current_price is None:
        return False
    return new_price < product.current_price


def process(
    product: TrackedProduct,
    store: Store,
    notifier: Notifier,
    session: requests.Session,
) -> str:
    """Handle one product. Returns a short status for the run summary."""
    try:
        scraped = fetch_price(product.ananas_url, session=session)
    except ProductGone:
        log.warning("#%s %s — 404, gasim pracenje", product.id, product.product_name[:50])
        store.deactivate(product.id)
        return "gone"
    except ScrapeError as exc:
        log.warning("#%s %s — %s", product.id, product.product_name[:50], exc)
        return "failed"

    store.record_price(product.id, scraped.price)

    old = product.current_price
    notify = should_notify(product, scraped.price)

    if old != scraped.price:
        store.update_current_price(product.id, scraped.price)

    if not notify:
        log.info(
            "#%s %s — %s (bez promene navise/nadole)",
            product.id,
            product.product_name[:50],
            _format_rsd(scraped.price),
        )
        return "unchanged"

    assert old is not None  # should_notify guarantees it
    log.info(
        "#%s %s — pad %s -> %s",
        product.id,
        product.product_name[:50],
        _format_rsd(old),
        _format_rsd(scraped.price),
    )

    try:
        notifier.send(product.owner, build_message(product, old, scraped.price))
    except Exception:
        # The price is already recorded; a failed email must not lose that or
        # stop the remaining products.
        log.exception("#%s slanje obavestenja nije uspelo", product.id)
        return "notify-failed"

    return "notified"


def main() -> int:
    parser = argparse.ArgumentParser(description="Ananas.rs price scraper")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape and record prices, but print notifications instead of mailing them.",
    )
    args = parser.parse_args()

    # Product names and price messages carry Serbian diacritics. The Windows
    # console defaults to cp1252 and would mangle or crash on them; CI is
    # already UTF-8, so this is a no-op there.
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8", errors="replace")

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
    )
    load_dotenv()

    store = Store(_require_env("SUPABASE_URL"), _require_env("SUPABASE_SERVICE_ROLE_KEY"))

    notifier: Notifier = (
        ConsoleNotifier()
        if args.dry_run
        else GmailNotifier(_require_env("GMAIL_ADDRESS"), _require_env("GMAIL_APP_PASSWORD"))
    )

    products = store.active_products()
    log.info("aktivnih proizvoda: %s%s", len(products), " (dry-run)" if args.dry_run else "")

    session = requests.Session()
    tally: dict[str, int] = {}

    for index, product in enumerate(products):
        if index:
            time.sleep(random.uniform(*DELAY_SECONDS))
        try:
            status = process(product, store, notifier, session)
        except Exception:
            log.exception("#%s neocekivana greska", product.id)
            status = "error"
        tally[status] = tally.get(status, 0) + 1

    log.info("gotovo: %s", ", ".join(f"{k}={v}" for k, v in sorted(tally.items())) or "nista")

    # A run where every single product failed is a real problem (site redesign,
    # bad credentials) and should turn the Actions run red.
    if products and tally.get("failed", 0) + tally.get("error", 0) == len(products):
        log.error("svi proizvodi su pali — verovatno se promenio sajt ili kredencijali")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
