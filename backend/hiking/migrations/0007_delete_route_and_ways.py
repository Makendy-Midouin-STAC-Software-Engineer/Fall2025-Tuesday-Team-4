from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("hiking", "0006_rename_models_to_osm_names"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Route",
        ),
        migrations.DeleteModel(
            name="Ways",
        ),
    ]
