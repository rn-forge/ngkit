from django.conf import settings
from django.core.management import BaseCommand, call_command

from products.seed import reset_products


class Command(BaseCommand):
    help = "Recreate the temporary SQLite database, seed it and serve on the given address."

    def add_arguments(self, parser):
        parser.add_argument("addrport", nargs="?", default="localhost:8100")

    def handle(self, *args, **options):
        settings.DATABASE_PATH.unlink(missing_ok=True)
        call_command("migrate", verbosity=0)
        reset_products()
        # Idempotency keys live in process memory, so no autoreload (it forks).
        call_command("runserver", options["addrport"], use_reloader=False)
