"""Notification channels.

Everything downstream talks to :class:`Notifier`, so adding a Telegram bot later
means writing one more subclass and changing which one ``run.py`` constructs —
no call site moves.
"""

from __future__ import annotations

import logging
import smtplib
import ssl
from abc import ABC, abstractmethod
from dataclasses import dataclass
from email.message import EmailMessage

log = logging.getLogger(__name__)

GMAIL_HOST = "smtp.gmail.com"
GMAIL_SSL_PORT = 465


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


class Notifier(ABC):
    @abstractmethod
    def send(self, user: Recipient, message: Message) -> None:
        """Deliver one message. Raises on failure; callers decide what that costs."""


class GmailNotifier(Notifier):
    """Gmail SMTP over implicit TLS, authenticated with an App Password.

    One connection per message. At the volume this cron produces (a handful of
    price drops per run) pooling would add failure modes for no gain.
    """

    def __init__(self, address: str, app_password: str) -> None:
        self._address = address
        self._app_password = app_password

    def send(self, user: Recipient, message: Message) -> None:
        if not user.notify_email:
            log.info("preskacem %s — iskljucio je mejl obavestenja", user.email)
            return

        email = EmailMessage()
        email["From"] = f"Ananas Price Tracker <{self._address}>"
        email["To"] = user.email
        email["Subject"] = message.subject
        email.set_content(message.body)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(GMAIL_HOST, GMAIL_SSL_PORT, context=context, timeout=30) as smtp:
            smtp.login(self._address, self._app_password)
            smtp.send_message(email)

        log.info("poslat mejl na %s", user.email)


class ConsoleNotifier(Notifier):
    """Prints instead of sending. Used by --dry-run so a first Actions run can
    be inspected without mailing anyone."""

    def send(self, user: Recipient, message: Message) -> None:
        log.info("[dry-run] -> %s | %s | %s", user.email, message.subject, message.body)
