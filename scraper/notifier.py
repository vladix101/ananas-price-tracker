"""Notification channels.

Everything downstream talks to :class:`Notifier`, so adding a channel means
writing one more subclass and changing which one ``run.py`` constructs — no
call site moves. That is what this file exists for.
"""

from __future__ import annotations

import logging
import smtplib
import ssl
from abc import ABC, abstractmethod
from dataclasses import dataclass
from email.message import EmailMessage

import requests

log = logging.getLogger(__name__)

GMAIL_HOST = "smtp.gmail.com"
GMAIL_SSL_PORT = 465

RESEND_ENDPOINT = "https://api.resend.com/emails"
RESEND_TIMEOUT_SECONDS = 20


@dataclass(frozen=True)
class Recipient:
    """Who to notify. Kept channel-neutral on purpose — a Telegram notifier
    would read a chat id off this same object."""

    user_id: str
    email: str
    notify_email: bool


@dataclass(frozen=True)
class Message:
    subject: str
    body: str
    """Optional HTML alternative. Plain text stays the source of truth: it is
    what every client can render and what a text-only reader gets."""
    html: str | None = None


class Notifier(ABC):
    @abstractmethod
    def send(self, user: Recipient, message: Message) -> None:
        """Deliver one message. Raises on failure; callers decide what that costs."""

    @staticmethod
    def _skip(user: Recipient) -> bool:
        if not user.notify_email:
            log.info("preskacem %s — iskljucio je mejl obavestenja", user.email)
            return True
        return False


class ResendNotifier(Notifier):
    """Resend's HTTP API.

    Preferred over Gmail because the sender is a domain you control: SPF, DKIM
    and DMARC all align, which is the actual reason Gmail-relayed mail from a
    personal address lands in spam. The API is used rather than Resend's SMTP
    so the scraper needs nothing beyond `requests`.
    """

    def __init__(self, api_key: str, sender: str) -> None:
        self._api_key = api_key
        self._sender = sender
        self._session = requests.Session()
        self._session.headers.update(
            {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        )

    def send(self, user: Recipient, message: Message) -> None:
        if self._skip(user):
            return

        payload: dict[str, object] = {
            "from": self._sender,
            "to": [user.email],
            "subject": message.subject,
            "text": message.body,
        }
        if message.html:
            payload["html"] = message.html

        response = self._session.post(
            RESEND_ENDPOINT, json=payload, timeout=RESEND_TIMEOUT_SECONDS
        )

        if response.status_code >= 400:
            # Resend returns a JSON error body; surfacing it turns "send failed"
            # into something actionable (unverified domain, bad key, blocked
            # recipient on the free tier).
            raise RuntimeError(f"Resend {response.status_code}: {response.text[:300]}")

        log.info("poslat mejl na %s (resend)", user.email)


class GmailNotifier(Notifier):
    """Gmail SMTP over implicit TLS, authenticated with an App Password.

    Kept as the fallback: it needs no domain, which makes it the only option
    before one is set up. Deliverability is its weakness — the sender is a
    personal address and the links point elsewhere, which reads as phishing to
    most filters.
    """

    def __init__(self, address: str, app_password: str) -> None:
        self._address = address
        self._app_password = app_password

    def send(self, user: Recipient, message: Message) -> None:
        if self._skip(user):
            return

        email = EmailMessage()
        email["From"] = f"Ananas Price Tracker <{self._address}>"
        email["To"] = user.email
        email["Subject"] = message.subject
        email.set_content(message.body)
        if message.html:
            email.add_alternative(message.html, subtype="html")

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(GMAIL_HOST, GMAIL_SSL_PORT, context=context, timeout=30) as smtp:
            smtp.login(self._address, self._app_password)
            smtp.send_message(email)

        log.info("poslat mejl na %s (gmail)", user.email)


class ConsoleNotifier(Notifier):
    """Prints instead of sending. Used by --dry-run so a first Actions run can
    be inspected without mailing anyone."""

    def send(self, user: Recipient, message: Message) -> None:
        log.info("[dry-run] -> %s | %s | %s", user.email, message.subject, message.body)
