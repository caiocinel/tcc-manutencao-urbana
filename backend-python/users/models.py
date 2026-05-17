import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, nome, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        if not nome:
            raise ValueError('Nome is required')
        email = self.normalize_email(email)
        user = self.model(email=email, nome=nome, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nome, password=None, **extra_fields):
        extra_fields.setdefault('admin', 1)
        extra_fields.setdefault('email_verified', 1)
        return self.create_user(email, nome, password, **extra_fields)


class User(AbstractBaseUser):
    last_login = None

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=255, unique=True)
    nome = models.CharField(max_length=255)
    password = models.CharField(max_length=128, db_column='senha')
    admin = models.IntegerField(default=0)
    municipio_id = models.CharField(max_length=255, blank=True, null=True, db_column='municipio_id')
    cpf = models.CharField(max_length=512, blank=True, default='')
    cpf_hash = models.CharField(max_length=512, blank=True, null=True, unique=True, db_column='cpf_hash')
    email_verified = models.SmallIntegerField(default=0, db_column='email_verificado')
    codigo_2fa = models.CharField(max_length=10, blank=True, null=True, db_column='codigo_2fa')
    codigo_2fa_expira = models.CharField(max_length=50, blank=True, null=True, db_column='codigo_2fa_expira')
    requestsResetAt = models.CharField(max_length=50, blank=True, null=True, db_column='requestsresetat')
    requestsCount = models.IntegerField(default=0, db_column='requestscount')
    criado_em = models.DateTimeField(auto_now_add=True, db_column='criado_em')
    atualizado_em = models.DateTimeField(auto_now=True, db_column='atualizado_em')

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome']

    @property
    def is_staff(self):
        return bool(self.admin)

    @property
    def is_superuser(self):
        return bool(self.admin)

    @property
    def is_active(self):
        return True

    def has_perm(self, perm, obj=None):
        return bool(self.admin)

    def has_module_perms(self, app_label):
        return bool(self.admin)

    class Meta:
        db_table = 'users'
        managed = False
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'

    def __str__(self):
        return f'{self.nome} ({self.email})'


class PushSubscription(models.Model):
    id = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='push_subscriptions', db_column='usuario_id',
    )
    endpoint = models.TextField()
    p256dh = models.TextField()
    auth = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True, db_column='criado_em')

    class Meta:
        db_table = 'push_subscriptions'
        managed = False
        verbose_name = 'Push Subscription'
        verbose_name_plural = 'Push Subscriptions'
