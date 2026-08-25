/**
 * Novo chamado — porte do bottom sheet de criação do MapPage do web.
 *
 * Recebe a coordenada escolhida no mapa por parâmetro de rota, preenche
 * rua/bairro por geocodificação reversa (via expo-location, no lugar da
 * chamada ao Nominatim que o web faz) e envia o FormData para a API.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useColors } from '@/context/theme-context';
import { useToast } from '@/context/toast-context';
import { api } from '@/services/api';
import type { Categoria, PickedImage } from '@/types';
import { escolherDaGaleria, ImagemMuitoGrandeError, tirarFoto } from '@/utils/image';

const DESCRICAO_MINIMA = 20;

export default function NovoChamadoScreen() {
  const colors = useColors();
  const addToast = useToast();
  const { lat, lng } = useLocalSearchParams<{ lat?: string; lng?: string }>();

  const latitude = Number(lat);
  const longitude = Number(lng);
  const coordenadaValida = Number.isFinite(latitude) && Number.isFinite(longitude);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoria, setCategoria] = useState('Buraco');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [rua, setRua] = useState('');
  const [bairro, setBairro] = useState('');
  const [imagem, setImagem] = useState<PickedImage | null>(null);
  const [geocodificando, setGeocodificando] = useState(coordenadaValida);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.listCategorias().then(setCategorias).catch(() => {});
  }, []);

  // Geocodificação reversa para sugerir rua e bairro.
  useEffect(() => {
    if (!coordenadaValida) return;
    let cancelado = false;
    Location.reverseGeocodeAsync({ latitude, longitude })
      .then(([endereco]) => {
        if (cancelado || !endereco) return;
        setRua(endereco.street ?? endereco.name ?? '');
        setBairro(endereco.district ?? endereco.subregion ?? '');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setGeocodificando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [coordenadaValida, latitude, longitude]);

  const opcoesCategoria = useMemo(
    () =>
      categorias.map((c) => ({
        value: c.nome,
        label: c.icone ? `${c.icone} ${c.nome}` : c.nome,
      })),
    [categorias],
  );

  const descricaoOk = descricao.length >= DESCRICAO_MINIMA;
  const progresso = Math.min(100, (descricao.length / DESCRICAO_MINIMA) * 100);

  async function selecionarImagem(origem: 'camera' | 'galeria') {
    try {
      const escolhida = origem === 'camera' ? await tirarFoto() : await escolherDaGaleria();
      if (escolhida) setImagem(escolhida);
    } catch (err) {
      if (err instanceof ImagemMuitoGrandeError) addToast(err.message, 'error');
      else addToast('Não foi possível selecionar a imagem.', 'error');
    }
  }

  async function handleSubmit() {
    if (!titulo || !descricaoOk) {
      addToast('Título obrigatório e descrição mínima de 20 caracteres.', 'error');
      return;
    }
    if (!coordenadaValida) {
      addToast('Selecione uma localização no mapa.', 'error');
      return;
    }
    if (!categoria) {
      addToast('Selecione uma categoria.', 'error');
      return;
    }

    setEnviando(true);
    try {
      const resultado = await api.createDefeito({
        titulo,
        descricao,
        categoria,
        rua,
        bairro,
        latitude,
        longitude,
        imagem,
      });
      if ('offline' in resultado) addToast(resultado.message, 'info');
      else addToast('Chamado criado com sucesso!');
      router.back();
    } catch (err) {
      addToast('Erro: ' + (err instanceof Error ? err.message : 'Erro ao criar chamado'), 'error');
    } finally {
      setEnviando(false);
    }
  }

  if (!coordenadaValida) {
    return (
      <View style={[styles.container, styles.centro, { backgroundColor: colors.bgPrimary }]}>
        <Text style={[styles.aviso, { color: colors.textMuted }]}>
          Escolha um ponto no mapa para abrir um chamado.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TextField label="Título" value={titulo} onChangeText={setTitulo} placeholder="Título" />

        <View style={styles.descricaoBloco}>
          <TextField
            label="Descrição"
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Descrição (mín. 20 caracteres)"
            multiline
          />
          <View style={styles.progressoLinha}>
            <View style={[styles.progressoTrilho, { backgroundColor: colors.bgHover }]}>
              <View
                style={{
                  width: `${progresso}%`,
                  height: '100%',
                  backgroundColor: descricaoOk ? colors.success : colors.error,
                }}
              />
            </View>
            <Text style={[styles.contador, { color: descricaoOk ? colors.success : colors.error }]}>
              {descricao.length}/{DESCRICAO_MINIMA}
            </Text>
          </View>
        </View>

        <Select
          label="Categoria"
          title="Categoria do chamado"
          options={opcoesCategoria}
          value={categoria}
          onChange={setCategoria}
          placeholder="Selecione uma categoria"
        />

        <TextField label="Rua" value={rua} onChangeText={setRua} placeholder="Rua" />
        <TextField label="Bairro" value={bairro} onChangeText={setBairro} placeholder="Bairro" />

        {geocodificando ? (
          <View style={styles.geocodificando}>
            <ActivityIndicator size="small" color={colors.textMuted} />
            <Text style={[styles.aviso, { color: colors.textMuted }]}>Buscando endereço...</Text>
          </View>
        ) : null}

        <View style={styles.foto}>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => selecionarImagem('camera')}
            icon={<Ionicons name="camera" size={14} color={colors.textPrimary} />}>
            Câmera
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => selecionarImagem('galeria')}
            icon={<Ionicons name="images" size={14} color={colors.textPrimary} />}>
            Galeria
          </Button>
          {imagem ? (
            <Pressable
              onPress={() => setImagem(null)}
              accessibilityRole="button"
              accessibilityLabel="Remover foto">
              <Image source={{ uri: imagem.uri }} style={styles.miniatura} contentFit="cover" />
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.coordenada, { color: colors.textSecondary }]}>
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </Text>

        <Text style={[styles.aviso, { color: colors.textMuted }]}>
          Ao enviar, você autoriza o uso da imagem para fins de serviço público.
        </Text>

        <View style={styles.acoes}>
          <Button variant="ghost" onPress={() => router.back()}>
            Cancelar
          </Button>
          <Button onPress={handleSubmit} loading={enviando} disabled={!descricaoOk}>
            Enviar
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  scroll: {
    padding: Spacing[5],
    gap: Spacing[4],
  },
  descricaoBloco: {
    gap: Spacing[2],
  },
  progressoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  progressoTrilho: {
    flex: 1,
    height: 6,
    overflow: 'hidden',
    borderRadius: Radius.full,
  },
  contador: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  geocodificando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  foto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  miniatura: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
  },
  coordenada: {
    fontSize: FontSize.xs,
  },
  aviso: {
    fontSize: FontSize.xs,
  },
  acoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing[2],
    marginTop: Spacing[2],
  },
});
