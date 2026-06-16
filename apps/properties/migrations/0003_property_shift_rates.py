from django.db import migrations, models
import apps.properties.models


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0002_property_booking_mode'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='shift_rates',
            field=models.JSONField(
                blank=True,
                default=apps.properties.models.default_shift_rates,
                help_text='Цены посменной аренды: {"day": ₸, "night": ₸, "full": ₸}',
                verbose_name='Тарифы смен (cottage)',
            ),
        ),
    ]
