import { useState } from 'react';
import { View, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { usePendingItems, useActiveCampaigns } from '../../../lib/hooks/useData';
import type { Campaign } from '../../../lib/types';
import { approveItem, archiveItem } from '../../../lib/api';
import { itemThumb } from '../../../lib/format';
import {
  Screen,
  PPHeader,
  PPText,
  Card,
  PPButton,
  IconButton,
  Pill,
} from '../../../components/ui';
import type { Item } from '../../../lib/types';

function PendingCard({ item, campaigns, onDone }: { item: Item; campaigns: Campaign[]; onDone: () => void }) {
  const uri = itemThumb(item);
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const submitter = (item as any).expand?.created_by?.name as string | undefined;

  const doApprove = async (showcase: boolean, campaignId?: string) => {
    setBusy('approve');
    try {
      await approveItem(item.id, showcase, campaignId);
      onDone();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Konnte nicht freigeben.');
    } finally {
      setBusy(null);
    }
  };

  // Ask which running action this item counts toward (if any), then approve.
  const approve = async (showcase: boolean) => {
    if (!campaigns.length) return doApprove(showcase);
    Alert.alert(
      'Zählt zu einer Aktion?',
      'Wofür soll dieses Teil zählen?',
      [
        { text: 'Keine', onPress: () => doApprove(showcase) },
        ...campaigns.slice(0, 2).map((c) => ({ text: c.name, onPress: () => doApprove(showcase, c.id) })),
      ],
    );
  };

  const reject = async () => {
    setBusy('reject');
    try {
      await archiveItem(item.id);
      onDone();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Konnte nicht ablehnen.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card pad={14} style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View
          style={{
            width: 76,
            height: 92,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: 'rgba(39,176,146,0.10)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {uri ? (
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Icon name="shirt" size={28} color="rgba(39,176,146,0.5)" />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PPText weight="semibold" size={PP.fontSizes.md} color={PP.ink} numberOfLines={1}>
            {item.title}
          </PPText>
          <PPText size={PP.fontSizes.sm} color={PP.ink2} style={{ marginTop: 2 }}>
            {item.size ? `Größe ${item.size} · ` : ''}{item.sku}
          </PPText>
          {!!item.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Icon name="map-pin" size={12} color={PP.ink2} />
              <PPText size={PP.fontSizes.sm} color={PP.ink2}>{item.location}</PPText>
            </View>
          )}
          {item.stays_external && (
            <Pill icon="map-pin" color={PP.warn} bg="rgba(232,169,59,0.14)" size="s" style={{ marginTop: 6 }}>
              verbleibt extern
            </Pill>
          )}
          {!!submitter && (
            <PPText size={PP.fontSizes.xs} color={PP.ink3} style={{ marginTop: 6 }}>
              von {submitter}
            </PPText>
          )}
        </View>
        {/* QR preview for the printable label. */}
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ padding: 6, backgroundColor: '#fff', borderRadius: 8 }}>
            <QRCode value={item.qr_code || item.sku} size={56} color={PP.ink} backgroundColor="#fff" />
          </View>
          <PPText size={PP.fontSizes.xs} color={PP.ink3} style={{ marginTop: 4 }}>
            {item.qr_code || item.sku}
          </PPText>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <PPButton size="s" loading={busy === 'approve'} onPress={() => approve(false)}>
            Freigeben
          </PPButton>
        </View>
        <View style={{ flex: 1 }}>
          <PPButton size="s" variant="secondary" onPress={() => approve(true)}>
            + Schaufenster
          </PPButton>
        </View>
        <PPButton size="s" variant="ghost" fullWidth={false} loading={busy === 'reject'} onPress={reject}>
          Ablehnen
        </PPButton>
      </View>
    </Card>
  );
}

export default function ReviewItems() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: items, refetch } = usePendingItems();
  const { data: campaigns } = useActiveCampaigns();

  const onDone = async () => {
    await refetch();
    await qc.invalidateQueries({ queryKey: ['showcase'] });
  };

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Freigabe"
        title="Eingereichte Teile"
        leading={<IconButton icon="chevron-left" onPress={() => router.back()} />}
      />

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        {items?.length ? (
          items.map((it) => <PendingCard key={it.id} item={it} campaigns={campaigns ?? []} onDone={onDone} />)
        ) : (
          <Card pad={16}>
            <PPText size={PP.fontSizes.base} color={PP.ink2}>
              Nichts zu prüfen — alle Vorschläge sind bearbeitet.
            </PPText>
          </Card>
        )}
      </View>
    </Screen>
  );
}
