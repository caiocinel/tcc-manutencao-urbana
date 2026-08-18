from core.db_router import set_current_request, clear_current_request


class DemoModeMiddleware:
    """Armazena o request em thread-local para o DemoRouter acessar."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        set_current_request(request)
        try:
            response = self.get_response(request)
        finally:
            clear_current_request()
        return response
