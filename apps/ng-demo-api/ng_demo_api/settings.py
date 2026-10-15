"""Settings for the ng-demo-api fixture: a throwaway backend for ng-demo's e2e suite."""

import os
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Test fixture only: never deployed, holds no secrets.
SECRET_KEY = "ng-demo-api-fixture-not-a-secret"  # NOSONAR
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "rest_framework",
    "products",
]

# No auth: the demo's mock Bearer token is ignored and no CSRF applies.
MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]
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
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "EXCEPTION_HANDLER": "rn_forge.django.drf.exceptions.problem_details_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "rn_forge.django.drf.pagination.CursorPagination",
    "DEFAULT_RENDERER_CLASSES": ["rn_forge.django.drf.casing.CamelCaseJSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rn_forge.django.drf.casing.CamelCaseJSONParser"],
}
