from import_export import fields, resources, widgets

from products.models import Product


class NumberWidget(widgets.DecimalWidget):
    """Reports an unparseable number as a field error (`/rows/N/price`), not a row error."""

    def clean(self, value, row=None, **kwargs):
        try:
            return super().clean(value, row, **kwargs)
        except ArithmeticError as exc:
            raise ValueError("price must be a number") from exc


class ProductResource(resources.ModelResource):
    """Export, import and import-template columns; the import upserts by `id`."""

    price = fields.Field(attribute="price", column_name="price", widget=NumberWidget())

    class Meta:
        model = Product
        fields = ("id", "name", "category", "price", "active")
        export_order = fields
        import_id_fields = ("id",)
        skip_unchanged = True
        report_skipped = True

    def before_save_instance(self, instance, row, **kwargs):
        actor = getattr(kwargs.get("user"), "email", "") or "anonymous"
        instance.created_by = instance.created_by or actor
        instance.updated_by = actor
