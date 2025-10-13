from django.db import migrations, models
from django.core.validators import MinValueValidator


class Migration(migrations.Migration):

    dependencies = [
        ('hiking', '0004_add_gist_indexes'),
    ]

    operations = [
        migrations.AlterField(
            model_name='trail',
            name='length',
            field=models.DecimalField(decimal_places=3, db_index=True, max_digits=9, validators=[MinValueValidator(0)]),
        ),
        migrations.AlterField(
            model_name='path',
            name='length',
            field=models.DecimalField(decimal_places=3, db_index=True, max_digits=9, validators=[MinValueValidator(0)]),
        ),
    ]


