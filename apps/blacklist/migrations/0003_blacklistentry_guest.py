from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0003_guest_mpis_passport'),
        ('blacklist', '0002_blacklistentry_description_optional'),
    ]

    operations = [
        migrations.AddField(
            model_name='blacklistentry',
            name='guest',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='violations',
                to='guests.guest',
                verbose_name='Гость',
            ),
        ),
    ]
