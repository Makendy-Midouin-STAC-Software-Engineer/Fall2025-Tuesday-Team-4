from django.test import TestCase, override_settings


class HealthTest(TestCase):
    def test_health_endpoint_ok(self):
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)


@override_settings(ROOT_URLCONF="ihike_backend.urls")
class DeprecatedEndpointsTest(TestCase):
    def test_collection_endpoints_return_gone(self):
        for endpoint in ("route", "ways", "trails", "paths"):
            response = self.client.get(f"/api/{endpoint}/")
            self.assertEqual(
                response.status_code,
                410,
                msg=f"Expected 410 for /api/{endpoint}/ but got {response.status_code}",
            )

    def test_detail_endpoints_return_gone(self):
        for endpoint in ("route", "ways", "trails", "paths"):
            response = self.client.get(f"/api/{endpoint}/sample-id/")
            self.assertEqual(
                response.status_code,
                410,
                msg=(
                    "Expected 410 for "
                    f"/api/{endpoint}/sample-id/ but got {response.status_code}"
                ),
            )
