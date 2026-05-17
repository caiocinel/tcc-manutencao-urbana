from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'nome', 'admin', 'email_verified', 'criado_em')
    list_filter = ('admin', 'email_verified')
    search_fields = ('email', 'nome')
    ordering = ('-criado_em',)
    readonly_fields = ('id', 'criado_em', 'atualizado_em')
    fieldsets = (
        (None, {'fields': ('id', 'email', 'nome', 'password')}),
        ('Permissions', {'fields': ('admin', 'email_verified')}),
        ('Personal', {'fields': ('cpf', 'cpf_hash', 'municipio_id')}),
        ('2FA', {'fields': ('codigo_2fa', 'codigo_2fa_expira')}),
        ('Rate Limit', {'fields': ('requestsResetAt', 'requestsCount')}),
        ('Dates', {'fields': ('criado_em', 'atualizado_em')}),
    )
