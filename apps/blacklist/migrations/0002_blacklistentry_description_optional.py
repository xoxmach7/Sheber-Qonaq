from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('blacklist', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='blacklistentry',
            name='description',
            field=models.TextField(blank=True, default='', verbose_name='Описание инцидента'),
        ),
    ]
