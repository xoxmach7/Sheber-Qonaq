from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('stays', '0004_stay_shift_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='stay',
            name='status',
            field=models.CharField(
                choices=[
                    ('reserved', 'Бронь (резерв)'),
                    ('confirmed', 'Подтверждено (предоплата)'),
                    ('active', 'Активно (заселён)'),
                    ('checked_out', 'Выселен'),
                    ('cancelled', 'Отменено'),
                    ('no_show', 'Не явился'),
                    ('expired', 'Резерв истёк'),
                ],
                default='active',
                max_length=20,
                verbose_name='Статус',
            ),
        ),
    ]
