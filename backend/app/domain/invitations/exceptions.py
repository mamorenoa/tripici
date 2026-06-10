"""Domain exceptions for invitations.

``InvitationInvalid`` covers every failure case the View needs to know
about: unknown token, revoked, or expired. We collapse them into one
"not valid" exception to keep the surface small and avoid leaking
existence information at the boundary.
"""


class InvitationInvalid(Exception):
    """The invitation token does not exist, is revoked, or has expired."""

    def __init__(self, message: str = "Invitation is no longer valid") -> None:
        super().__init__(message)
