from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hiking', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='trail',
            name='sac_scale',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='path',
            name='sac_scale',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='trail',
            name='osm_id',
            field=models.BigIntegerField(blank=True, db_index=True, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name='path',
            name='osm_id',
            field=models.BigIntegerField(blank=True, db_index=True, null=True, unique=True),
        ),
    ]


