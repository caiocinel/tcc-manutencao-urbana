function validarDigitos(cpf) {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11 || /^(\d)\1{10}$/.test(nums)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let dig1 = 11 - (soma % 11);
  if (dig1 >= 10) dig1 = 0;
  if (parseInt(nums[9]) !== dig1) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  let dig2 = 11 - (soma % 11);
  if (dig2 >= 10) dig2 = 0;
  if (parseInt(nums[10]) !== dig2) return false;

  return true;
}

async function consultarBrasilAPI(cpf) {
  const res = await fetch(`https://brasilapi.com.br/api/cpf/v1/${cpf.replace(/\D/g, '')}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Erro ao consultar CPF na BrasilAPI');
  }
  return res.json();
}

module.exports = { validarDigitos, consultarBrasilAPI };
