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

    if (priceError || !prices) throw priceError;

    // 2. Pobierz otwarte zlecenia
    const { data: orders, error: orderError } = await supabase
      .from('auto_orders')
      .select('*')
      .is('executed_at', null);

    if (orderError || !orders) throw orderError;

    for (const order of orders) {
      const current = prices.find(p => p.cryptocurrency_id === order.cryptocurrency_id)?.price;

      if (!current || current > order.target_price) continue; // tylko równa lub mniejsza

      // 3. Pobierz dane użytkownika (potrzebne do buyCrypto)
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('balance')
        .eq('user_id', order.user_id)
        .single();

      if (userError || !userProfile) continue;

      const balance = userProfile.balance;

      // 4. Przeprowadź zakup
      await buyCrypto(
        { id: order.user_id },
        balance,
        () => {},
        order.cryptocurrency_id,
        order.amount
      );

      // 5. Zaktualizuj zlecenie jako wykonane
      await supabase
        .from('auto_orders')
        .update({ executed_at: new Date().toISOString() })
        .eq('id', order.id);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Błąd automatycznego zlecenia:', err);
    return res.status(500).json({ success: false, error: err });
  }
}
