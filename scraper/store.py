"""Supabase access for the scraper.

Uses the service_role key, which bypasses RLS — that is the point: this process
works across every user's rows. It therefore never runs anywhere a browser can
reach it.

PostgREST over ``requests`` rather than the Supabase Python SDK: three endpoints
are needed, and this keeps the scraper's dependency list to what it already has.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal

import requests

from notifier import Recipient

log = logging.getLogger(__name__)

REQUEST_TIMEOUT_SECONDS = 30


@dataclass(frozen=True)
class TrackedProduct:
    id: int
    product_name: str
    ananas_url: str
    current_price: Decimal | None
    target_price: Decimal | None
    owner: Recipient


def _decimal(value: object) -> Decimal | None:
    return None if value is None else Decimal(str(value))


class Store:
    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        self._rest = f"{supabase_url.rstrip('/')}/rest/v1"
        self._session = requests.Session()
        self._session.headers.update(
            {
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
            }
        )

    def active_products(self) -> list[TrackedProduct]:
        """Every active tracked product, with the owner embedded.

        One request rather than N+1: PostgREST resolves users(...) through the
        user_id foreign key.
        """
        response = self._session.get(
            f"{self._rest}/tracked_products",
            params={
                "is_active": "eq.true",
                "select": (
                    "id,product_name,ananas_url,current_price,target_price,"
                    "users(id,email,notify_email)"
                ),
                "order": "id.asc",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()

        products: list[TrackedProduct] = []
        for row in response.json():
            owner = row.get("users")
            if not owner:
                # Should be impossible: user_id is NOT NULL with an FK. Skip
                # rather than crash the run if it ever happens.
                log.warning("proizvod %s nema vlasnika, preskacem", row.get("id"))
                continue

            products.append(
                TrackedProduct(
                    id=row["id"],
                    product_name=row["product_name"],
                    ananas_url=row["ananas_url"],
                    current_price=_decimal(row.get("current_price")),
                    target_price=_decimal(row.get("target_price")),
                    owner=Recipient(
                        user_id=owner["id"],
                        email=owner["email"],
                        notify_email=bool(owner.get("notify_email", True)),
                    ),
                )
            )
        return products

    def record_price(self, tracked_product_id: int, price: Decimal) -> None:
        response = self._session.post(
            f"{self._rest}/price_history",
            json={"tracked_product_id": tracked_product_id, "price": str(price)},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()

    def update_current_price(self, tracked_product_id: int, price: Decimal) -> None:
        response = self._session.patch(
            f"{self._rest}/tracked_products",
            params={"id": f"eq.{tracked_product_id}"},
            json={"current_price": str(price)},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()

    def deactivate(self, tracked_product_id: int) -> None:
        """Used when a product page is permanently gone (404)."""
        response = self._session.patch(
            f"{self._rest}/tracked_products",
            params={"id": f"eq.{tracked_product_id}"},
            json={"is_active": False},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
