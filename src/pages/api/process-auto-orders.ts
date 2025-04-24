// /pages/api/process-auto-orders.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { buyCrypto } from '@/lib/cryptoActions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Pobierz aktualne ceny z bazy danych
    const { data: prices, error: priceError } = await supabase
      .from('crypto_prices')
      .select('cryptocurrency_id, price')
      .order('fetched_at', { ascending: false });

    if (priceError || !prices) {
      console.error('❌ Błąd pobierania cen:', priceError);
      return res.status(500).json({ success: false, error: priceError });
    }

    // 2. Pobierz otwarte zlecenia
    const { data: orders, error: orderError } = await supabase
      .from('auto_orders')
      .select('*')
      .is('executed_at', null);

    if (orderError || !orders) {
      console.error('❌ Błąd pobierania zleceń:', orderError);
      return res.status(500).json({ success: false, error: orderError });
    }

    let executedCount = 0;

    for (const order of orders) {
      const current = prices.find(p => p.cryptocurrency_id === order.cryptocurrency_id)?.price;
      console.log(`🔎 Sprawdzam zlecenie ${order.id}: current=${current}, target=${order.target_price}`);

      if (!current || current > order.target_price) {
        console.log(`⏭️ Pomijam zlecenie ${order.id} – cena zbyt wysoka`);
        continue;
      }

      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('balance')
        .eq('user_id', order.user_id)
        .single();

      if (userError || !userProfile) {
        console.error(`❌ Błąd pobierania użytkownika ${order.user_id}:`, userError);
        continue;
      }

      const balance = userProfile.balance;

      await buyCrypto(
        { id: order.user_id },
        balance,
        () => {},
        order.cryptocurrency_id,
        order.amount
      );

      const { error: updateError } = await supabase
        .from('auto_orders')
        .update({ executed_at: new Date().toISOString() })
        .eq('id', order.id);

      if (updateError) {
        console.error(`❌ Błąd aktualizacji zlecenia ${order.id}:`, updateError);
        continue;
      }

      executedCount++;
      console.log(`✅ Wykonano zlecenie ${order.id}`);
    }

    return res.status(200).json({ success: true, executed: executedCount });
  } catch (err) {
    console.error('Błąd automatycznego zlecenia:', err);
    return res.status(500).json({ success: false, error: err });
  }
}
