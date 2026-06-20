from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='organization',
            name='deposit_percent',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0.50'),
                help_text='Минимальная доля от суммы брони для подтверждения (0.50 = 50%)',
                max_digits=4,
                verbose_name='Доля предоплаты',
            ),
        ),
    ]
