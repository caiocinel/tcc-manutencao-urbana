import bcrypt
from django.contrib.auth.hashers import BasePasswordHasher


class BCryptPasswordHasher(BasePasswordHasher):
    algorithm = "bcrypt"
    library = ("bcrypt", "bcrypt")
    rounds = 10

    def salt(self):
        return bcrypt.gensalt(rounds=self.rounds)

    def encode(self, password, salt):
        data = bcrypt.hashpw(password.encode(), salt)
        return f"{self.algorithm}${data.decode()}"

    def verify(self, password, encoded):
        if encoded.startswith(f"{self.algorithm}$"):
            encoded = encoded[len(self.algorithm) + 1:]
        return bcrypt.checkpw(password.encode(), encoded.encode())

    def safe_summary(self, encoded):
        if encoded.startswith(f"{self.algorithm}$"):
            encoded = encoded[len(self.algorithm) + 1:]
        return {
            "algorithm": self.algorithm,
            "rounds": self.rounds,
            "version": encoded.split("$")[1] if encoded.count("$") >= 2 else "?",
        }

    def must_update(self, encoded):
        return False

    def harden_runtime(self, password, encoded):
        pass
