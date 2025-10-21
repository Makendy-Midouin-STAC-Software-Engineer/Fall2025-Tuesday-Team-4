from rest_framework.pagination import PageNumberPagination
import os


class StandardResultsSetPagination(PageNumberPagination):
    page_size = int(os.getenv('API_PAGE_SIZE', '200'))
    page_size_query_param = 'page_size'
    max_page_size = int(os.getenv('API_MAX_PAGE_SIZE', '5040'))


