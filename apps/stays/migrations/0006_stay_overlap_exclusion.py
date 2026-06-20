"""
DB-level защита от пересечения броней на одном юните (PostgreSQL).
Exclusion-констрейнт через GiST: для обычных проживаний (shift_type IS NULL)
в блокирующих статусах диапазоны дат не могут пересекаться на одном unit.
Полуоткрытый интервал '[)' — заезд в день выезда разрешён.

Только PostgreSQL. На SQLite (тесты) пропускается — там полагаемся на
app-level overlap-проверку в StaySerializer.
"""
from django.db import migrations


ADD_CONSTRAINT = """
ALTER TABLE stays_stay ADD CONSTRAINT no_overlap_per_unit
EXCLUDE USING gist (
    unit_id WITH =,
    daterange(check_in_date, expected_check_out_date, '[)') WITH &&
) WHERE (shift_type IS NULL AND status IN ('reserved', 'confirmed', 'active'));
"""

DROP_CONSTRAINT = "ALTER TABLE stays_stay DROP CONSTRAINT IF EXISTS no_overlap_per_unit;"


def add_exclusion(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    schema_editor.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")
    schema_editor.execute(ADD_CONSTRAINT)


def drop_exclusion(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    schema_editor.execute(DROP_CONSTRAINT)


class Migration(migrations.Migration):

    dependencies = [
        ('stays', '0005_stay_status_lifecycle'),
    ]

    operations = [
        migrations.RunPython(add_exclusion, drop_exclusion),
    ]
