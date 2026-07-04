# Generated manually — переименование терминологии MPIS -> "Уведомление о прибытии"
# в help_text (только текст для админки, поле не менялось).
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0003_guest_mpis_passport'),
    ]

    operations = [
        migrations.AlterField(
            model_name='guest',
            name='is_foreigner',
            field=models.BooleanField(
                default=False,
                verbose_name='Иностранец',
                help_text='Требуется уведомление о прибытии в eQonaq',
            ),
        ),
    ]
