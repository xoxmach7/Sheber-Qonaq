from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0002_mpis_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='guest',
            name='sex',
            field=models.CharField(blank=True, choices=[('M', 'Мужской'), ('F', 'Женский')], max_length=1, verbose_name='Пол'),
        ),
        migrations.AddField(
            model_name='guest',
            name='document_issue_date',
            field=models.DateField(blank=True, null=True, verbose_name='Дата выдачи документа'),
        ),
        migrations.AddField(
            model_name='guest',
            name='document_expiry_date',
            field=models.DateField(blank=True, null=True, verbose_name='Срок действия документа'),
        ),
        migrations.AddField(
            model_name='guest',
            name='entry_date',
            field=models.DateField(blank=True, null=True, verbose_name='Дата въезда в РК'),
        ),
        migrations.AddField(
            model_name='guest',
            name='migration_card_number',
            field=models.CharField(blank=True, max_length=50, verbose_name='Номер миграционной карты'),
        ),
    ]
