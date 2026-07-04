# Generated manually — переименование терминологии MPIS -> "Уведомление о прибытии"
# в verbose_name/help_text (только текст для админки, поле и choices не менялись).
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('stays', '0006_stay_overlap_exclusion'),
    ]

    operations = [
        migrations.AlterField(
            model_name='stay',
            name='mpis_status',
            field=models.CharField(
                choices=[
                    ('not_required', 'Не требуется'),
                    ('pending', 'Ожидает регистрации'),
                    ('submitted', 'Отправлено'),
                    ('confirmed', 'Подтверждено'),
                ],
                default='not_required',
                max_length=20,
                verbose_name='Статус уведомления о прибытии',
                help_text='Статус отправки уведомления о прибытии иностранного гостя в системе eQonaq',
            ),
        ),
    ]
