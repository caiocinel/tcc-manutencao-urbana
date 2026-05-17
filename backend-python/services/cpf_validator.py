import httpx


def validar_digitos(cpf: str) -> bool:
    nums = ''.join(c for c in cpf if c.isdigit())
    if len(nums) != 11:
        return False
    if nums == nums[0] * 11:
        return False

    soma = sum(int(nums[i]) * (10 - i) for i in range(9))
    dig1 = 11 - (soma % 11)
    if dig1 >= 10:
        dig1 = 0
    if int(nums[9]) != dig1:
        return False

    soma = sum(int(nums[i]) * (11 - i) for i in range(10))
    dig2 = 11 - (soma % 11)
    if dig2 >= 10:
        dig2 = 0
    if int(nums[10]) != dig2:
        return False

    return True


def consultar_brasil_api(cpf: str) -> dict | None:
    nums = ''.join(c for c in cpf if c.isdigit())
    try:
        resp = httpx.get(
            f'https://brasilapi.com.br/api/cpf/v1/{nums}',
            timeout=10.0,
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError:
        return None
