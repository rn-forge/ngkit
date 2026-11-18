"""Settings for the ng-demo-api fixture: a throwaway backend for ng-demo's e2e suite."""

import os
import tempfile
from pathlib import Path

from rn_forge.django.auth.csrf import CSRF_MIDDLEWARE, CSRF_SETTINGS
from rn_forge.django.auth.sessions import SESSION_SETTINGS

BASE_DIR = Path(__file__).resolve().parent.parent

# Test fixture only: never deployed, holds no secrets.
SECRET_KEY = "ng-demo-api-fixture-not-a-secret"  # NOSONAR
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "rest_framework",
    "rn_forge.django.auth",
    "products",
]

# The fixture uses the library's session and CSRF settings, including its
# secure, host-only cookies.
MIDDLEWARE = [
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    CSRF_MIDDLEWARE,
]
globals().update(SESSION_SETTINGS)
globals().update(CSRF_SETTINGS)
CSRF_TRUSTED_ORIGINS = ["http://localhost:4200"]
APPEND_SLASH = False

ROOT_URLCONF = "ng_demo_api.urls"
USE_TZ = True
TIME_ZONE = "UTC"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# A temporary file, deleted and recreated by `serve_fixture` on every start.
DATABASE_PATH = Path(
    os.environ.get(
        "NG_DEMO_API_DB", Path(tempfile.gettempdir()) / "ng-demo-api.sqlite3"
    )
)
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": DATABASE_PATH}}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "ng_demo_api.auth.FixtureSessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "EXCEPTION_HANDLER": "rn_forge.django.drf.exceptions.problem_details_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "rn_forge.django.drf.pagination.CursorPagination",
    "DEFAULT_RENDERER_CLASSES": ["rn_forge.django.drf.casing.CamelCaseJSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rn_forge.django.drf.casing.CamelCaseJSONParser"],
}

RN_FORGE_DJANGO = {
    "AUTH": {"PROBLEM_TYPE_BASE": "https://ng-demo.invalid/problems/"},
}
