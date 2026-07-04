from django.db import migrations, models


def encrypt_existing_documents(apps, schema_editor):
    """
    Переносим существующие открытые document_number / migration_card_number
    в новые зашифрованные колонки. Используем ту же функцию шифрования,
    что и для ИИН (apps.core.encryption.encrypt_value) — она не зависит
    от моделей, поэтому её безопасно импортировать прямо в data-миграции.
    """
    from apps.core.encryption import encrypt_value

    Guest = apps.get_model('guests', 'Guest')

    for guest in Guest.objects.all().iterator():
        changed = False
        if guest.document_number:
            guest._document_number_encrypted = encrypt_value(guest.document_number.strip())
            changed = True
        if guest.migration_card_number:
            guest._migration_card_number_encrypted = encrypt_value(guest.migration_card_number.strip())
            changed = True
        if changed:
            guest.save(update_fields=['_document_number_encrypted', '_migration_card_number_encrypted'])


def noop_reverse(apps, schema_editor):
    # Обратная миграция намеренно не расшифровывает данные обратно в открытые
    # колонки (они удаляются этой же миграцией и не пересоздаются при откате
    # автоматически). Откат схемы полей делает Django через RemoveField/AddField
    # reverse ниже; здесь просто ничего не делаем с данными.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('guests', '0004_is_foreigner_help_text_rename'),
    ]

    operations = [
        # 1. Добавляем новые зашифрованные колонки, старые пока не трогаем.
        migrations.AddField(
            model_name='guest',
            name='_document_number_encrypted',
            field=models.CharField(
                blank=True, db_column='document_number_encrypted', max_length=500,
                verbose_name='Номер документа (зашифрован)', default='',
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='guest',
            name='_migration_card_number_encrypted',
            field=models.CharField(
                blank=True, db_column='migration_card_number_encrypted', max_length=500,
                verbose_name='Номер миграционной карты (зашифрован)', default='',
            ),
            preserve_default=False,
        ),
        # 2. Переносим существующие данные в зашифрованном виде.
        migrations.RunPython(encrypt_existing_documents, noop_reverse),
        # 3. Удаляем старые открытые колонки.
        migrations.RemoveField(
            model_name='guest',
            name='document_number',
        ),
        migrations.RemoveField(
            model_name='guest',
            name='migration_card_number',
        ),
    ]
