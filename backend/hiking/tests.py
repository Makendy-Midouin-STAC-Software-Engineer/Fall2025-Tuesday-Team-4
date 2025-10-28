from django.test import TestCase


class HealthTest(TestCase):
    def test_health_endpoint_ok(self):
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)
