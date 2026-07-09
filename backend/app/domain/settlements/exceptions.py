"""Domain exceptions for settlements. ``app.main`` maps them to HTTP."""

from uuid import UUID


class SettlementPaymentInvalid(Exception):
    """Bad reimbursement: non-positive amount, same payer/payee, or a
    user that isn't a member of the trip."""


class SettlementPaymentNotFound(Exception):
    """The payment id does not exist (or doesn't belong to the trip)."""

    def __init__(self, payment_id: UUID) -> None:
        super().__init__(f"Settlement payment {payment_id} not found")
        self.payment_id = payment_id
