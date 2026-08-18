import threading

_thread_local = threading.local()


def get_current_request():
    return getattr(_thread_local, 'request', None)


def set_current_request(request):
    _thread_local.request = request


def clear_current_request():
    _thread_local.request = None


class DemoRouter:
    """Roteia requests para o banco demo quando o header X-Demo-Mode está presente."""

    def db_for_read(self, model, **hints):
        request = get_current_request()
        if request and request.headers.get('X-Demo-Mode') == 'true':
            return 'demo'
        return 'default'

    def db_for_write(self, model, **hints):
        request = get_current_request()
        if request and request.headers.get('X-Demo-Mode') == 'true':
            return 'demo'
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if db == 'demo':
            return False
        return True
