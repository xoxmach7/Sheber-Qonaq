from django.db import migrations, models
import apps.properties.models


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0003_property_shift_rates'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='base_rates',
            field=models.JSONField(
                blank=True,
                default=apps.properties.models.default_base_rates,
                help_text='{"bed": {"daily": ₸, "weekly": ₸, "monthly": ₸}, ...}',
                verbose_name='Базовые тарифы по типу юнита',
            ),
        ),
    ]
