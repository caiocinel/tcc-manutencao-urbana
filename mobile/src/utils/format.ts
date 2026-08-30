/** Formatação e validação compartilhadas pelas telas. */

import type { Defeito } from '@/types';
import { STATUS_FECHADOS } from '@/constants/status';

/** Anonimiza o autor do chamado, como no web: "João" -> "J***". */
export function maskName(nome?: string | null) {
  if (!nome) return 'Anônimo';
  return `${nome.charAt(0)}${'*'.repeat(Math.max(nome.length - 1, 2))}`;
}

export function formatarData(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function formatarDataHora(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR');
}

/** Minutos -> "45min" ou "2.5h", como nos KPIs do painel. */
export function formatarDuracao(minutos?: number | null) {
  if (minutos == null) return '—';
  return minutos < 60 ? `${minutos}min` : `${(minutos / 60).toFixed(1)}h`;
}

export function formatarCpf(valor: string) {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  if (nums.length > 9) return nums.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
  if (nums.length > 6) return nums.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3');
  if (nums.length > 3) return nums.replace(/^(\d{3})(\d{1,3})$/, '$1.$2');
  return nums;
}

/** Validação dos dígitos verificadores — mesma regra do Register do web. */
export function validarCpf(cpf: string) {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(nums)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(nums[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(nums[10], 10);
}

/** O backend expõe o total de apoios com dois nomes conforme o serializer. */
export function totalApoios(defeito: Defeito) {
  return defeito.total_apoios ?? defeito.apoios_total ?? 0;
}

/**
 * Frase curta com as sinalizações dos cidadãos ("2 dizem que já foi resolvido ·
 * 1 diz que não existe"), ou `null` quando não há nenhuma.
 */
export function descreverSinalizacoes(defeito: Defeito): string | null {
  const s = defeito.sinalizacoes;
  if (!s) return null;
  const partes: string[] = [];
  if (s.resolvido > 0) {
    partes.push(`${s.resolvido} ${s.resolvido === 1 ? 'diz' : 'dizem'} que já foi resolvido`);
  }
  if (s.nao_existe > 0) {
    partes.push(`${s.nao_existe} ${s.nao_existe === 1 ? 'diz' : 'dizem'} que não existe`);
  }
  return partes.length ? partes.join(' · ') : null;
}

/** Data em que o chamado foi concluído, usada para "envelhecer" a cor do status. */
export function concluidoEm(defeito: Defeito) {
  return defeito.atendido_em ?? defeito.atualizado_em ?? null;
}

export function estaFechado(defeito: Defeito) {
  return STATUS_FECHADOS.includes(defeito.status);
}

/** `imagens_extra` chega como JSON serializado em string. */
export function parseImagensExtra(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
