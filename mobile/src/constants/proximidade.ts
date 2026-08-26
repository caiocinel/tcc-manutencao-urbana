/**
 * Raios usados no modo de navegação do mapa.
 *
 * A confirmação de um chamado exige presença física (como capturar algo no
 * Pokémon Go): o usuário precisa estar dentro de `RAIO_CONFIRMACAO_M` do ponto
 * reportado. O GPS urbano erra na casa de 10–30 m, então 150 m dá folga sem
 * permitir confirmar do outro lado do bairro.
 */
export const RAIO_CONFIRMACAO_M = 150;

/** Opções de "pendências próximas" ao redor do usuário, em metros. */
export const RAIOS_BUSCA_M = [200, 500, 1000, 2000] as const;

export const RAIO_BUSCA_PADRAO_M = 500;

/**
 * Raio em que o backend recusa um chamado da mesma categoria já aberto
 * (`DUPLICATE_CATEGORY_RADIUS_M`). O app usa o mesmo valor para avisar antes.
 */
export const RAIO_DUPLICADO_M = 10;
