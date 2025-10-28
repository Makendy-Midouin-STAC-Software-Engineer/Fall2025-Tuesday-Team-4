from django.test import TestCase


class RootHealthTest(TestCase):
    def test_root_health_ok(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
