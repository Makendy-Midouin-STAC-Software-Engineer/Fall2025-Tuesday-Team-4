from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("hiking", "0005_alter_length_to_decimal"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="Trail",
            new_name="Route",
        ),
        migrations.RenameModel(
            old_name="Path",
            new_name="Ways",
        ),
    ]
