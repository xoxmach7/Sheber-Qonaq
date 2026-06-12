from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='booking_mode',
            field=models.CharField(
                choices=[
                    ('hostel', 'Хостел / Отель (посуточно/помесячно)'),
                    ('cottage', 'Гостевой дом / Баня (посменно)'),
                ],
                default='hostel',
                help_text='hostel — обычный режим, cottage — посменная аренда',
                max_length=20,
                verbose_name='Режим бронирования',
            ),
        ),
    ]
