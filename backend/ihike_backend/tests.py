from django.test import TestCase
from django.test import override_settings
from ihike_backend.pagination import StandardResultsSetPagination


class RootHealthTest(TestCase):
    def test_root_health_ok(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)


class PaginationTest(TestCase):
    @override_settings()
    def test_pagination_defaults(self):
        paginator = StandardResultsSetPagination()
        self.assertEqual(paginator.page_size, 200)
        self.assertEqual(paginator.page_size_query_param, "page_size")
        self.assertEqual(paginator.max_page_size, 5040)
