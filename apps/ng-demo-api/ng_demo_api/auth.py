"""Hand-written fixture session authentication for DRF."""

from rest_framework.authentication import BaseAuthentication

from ng_demo_api.accounts import config


class FixtureSessionAuthentication(BaseAuthentication):
    """Bind library authentication after DRF has resolved its settings."""

    def __init__(self):
        # The library's DRF package imports views, which resolve this class.
        from rn_forge.django.auth.drf import PrincipalSessionAuthentication, sessions_for

        self.authentication = PrincipalSessionAuthentication()
        self.authentication.sessions = sessions_for(config)

    def authenticate(self, request):
        return self.authentication.authenticate(request)

    def authenticate_header(self, request):
        return self.authentication.authenticate_header(request)
