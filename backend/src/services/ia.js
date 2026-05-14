const axios = require('axios');
const logger = require('./logger');

const IA_URL = process.env.IA_URL || 'http://localhost:8000';
const TIMEOUT = 3000;

const circuitBreaker = {
  failures: 0,
  lastFailure: 0,
  cooldownMs: 60_000,
  maxFailures: 3,
  isOpen() {
    if (this.failures < this.maxFailures) return false;
    if (Date.now() - this.lastFailure > this.cooldownMs) {
      this.failures = 0;
      return false;
    }
    return true;
  },
  recordFailure() { this.failures += 1; this.lastFailure = Date.now(); },
  recordSuccess() { this.failures = 0; },
};

async function callIa(endpoint, payload) {
  if (circuitBreaker.isOpen()) return null;
  try {
    const resp = await axios.post(`${IA_URL}${endpoint}`, payload, { timeout: TIMEOUT });
    circuitBreaker.recordSuccess();
    return resp.data;
  } catch (err) {
    circuitBreaker.recordFailure();
    logger.error({ err: err.message, endpoint }, 'Erro ao chamar IA');
    return null;
  }
}

async function classify(text) {
  return callIa('/classify', { text });
}

async function classifyFull(text) {
  return callIa('/classify-full', { text });
}

async function classifyPriority(text) {
  return callIa('/priority', { text });
}

async function textSimilarity(text1, text2) {
  return callIa('/text-similarity', { text1, text2 });
}

async function checkSpam(text) {
  return callIa('/check-spam', { text });
}

const SECRETARIAS = {
  Buraco: 'Secretaria de Obras e Infraestrutura',
  Iluminacao: 'Secretaria de Iluminação Pública',
  Semafaro: 'Secretaria de Trânsito e Mobilidade',
  'Arvore Caida': 'Secretaria de Meio Ambiente',
  Entulho: 'Secretaria de Limpeza Urbana',
  'Calcada Danificada': 'Secretaria de Obras e Infraestrutura',
  Outro: 'Secretaria de Serviços Urbanos',
};

const PRAZOS = {
  Buraco: 7,
  Iluminacao: 5,
  Semafaro: 2,
  'Arvore Caida': 2,
  Entulho: 15,
  'Calcada Danificada': 7,
  Outro: 15,
};

function routing(categoria) {
  return {
    secretaria: SECRETARIAS[categoria] || SECRETARIAS.Outro,
    prazo_sla_dias: PRAZOS[categoria] || PRAZOS.Outro,
  };
}

module.exports = {
  classify,
  classifyFull,
  classifyPriority,
  textSimilarity,
  checkSpam,
  routing,
  circuitBreaker,
};
