"""Reads the current price of one ananas.rs product page.

Verified against the live site 2026-09-06: every product page carries a single
``<script type="application/ld+json">`` block of schema.org Product data with
the price in ``offers.price``. It is present in the raw HTML response, so this
needs no headless browser.

robots.txt disallows /en/, /sr/, /tmp/image-thumbnails/ and /assets/. Product
pages live under /proizvod/ and are allowed.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

import requests
from bs4 import BeautifulSoup

# A real browser UA. Their edge serves a different, JS-only page to obvious
# bot strings, which is exactly the situation this module avoids.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

REQUEST_TIMEOUT_SECONDS = 20


class ScrapeError(Exception):
    """Any reason one product could not be read. Callers skip and continue."""


class ProductGone(ScrapeError):
    """The page 404s — the listing is almost certainly withdrawn."""


@dataclass(frozen=True)
class ScrapedProduct:
    name: str
    price: Decimal
    currency: str
    in_stock: bool


def _product_node(payload: object) -> dict | None:
    """Find the schema.org Product inside one ld+json block."""
    candidates = payload if isinstance(payload, list) else [payload]
    for candidate in candidates:
        if isinstance(candidate, dict) and candidate.get("@type") == "Product":
            return candidate
    return None


def fetch_price(url: str, session: requests.Session | None = None) -> ScrapedProduct:
    """Fetch and parse one product page.

    Raises ProductGone on 404 and ScrapeError on anything else that stops a
    price from being read.
    """
    http = session or requests.Session()

    try:
        response = http.get(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "sr-RS,sr;q=0.9,en;q=0.8",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise ScrapeError(f"zahtev nije uspeo: {exc}") from exc

    if response.status_code == 404:
        raise ProductGone("stranica proizvoda vise ne postoji (404)")
    if response.status_code != 200:
        raise ScrapeError(f"HTTP {response.status_code}")

    soup = BeautifulSoup(response.text, "lxml")

    for block in soup.find_all("script", type="application/ld+json"):
        raw = block.string or block.get_text()
        if not raw:
            continue
        try:
            node = _product_node(json.loads(raw))
        except json.JSONDecodeError:
            continue
        if node is None:
            continue

        offers = node.get("offers") or {}
        if isinstance(offers, list):
            offers = offers[0] if offers else {}
        if not isinstance(offers, dict):
            continue

        raw_price = offers.get("price")
        if raw_price is None:
            continue

        try:
            price = Decimal(str(raw_price))
        except (InvalidOperation, ValueError) as exc:
            raise ScrapeError(f"neupotrebljiva cena {raw_price!r}") from exc

        if price <= 0:
            raise ScrapeError(f"besmislena cena {price}")

        availability = str(offers.get("availability") or "")

        return ScrapedProduct(
            name=str(node.get("name") or "").strip(),
            price=price,
            currency=str(offers.get("priceCurrency") or "RSD"),
            in_stock="InStock" in availability,
        )

    # Reaching here means the page loaded but carried no Product data — most
    # likely their markup changed, which is worth seeing in the logs.
    raise ScrapeError("nema schema.org Product bloka na stranici")
