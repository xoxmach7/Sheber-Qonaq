from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('stays', '0003_stay_unique_active_constraint'),
    ]

    operations = [
        # Убираем DB constraint — логика переехала в StaySerializer.validate()
        migrations.RemoveConstraint(
            model_name='stay',
            name='unique_active_stay_per_unit',
        ),
        # Добавляем поле типа смены (null = обычное хостельное проживание)
        migrations.AddField(
            model_name='stay',
            name='shift_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('day',   'Дневная смена (13:00–19:00)'),
                    ('night', 'Ночная смена (20:00–11:00)'),
                    ('full',  'Сутки (13:00–11:00)'),
                ],
                help_text='Только для cottage-режима. null = обычное проживание.',
                max_length=10,
                null=True,
                verbose_name='Тип смены',
            ),
        ),
    ]
