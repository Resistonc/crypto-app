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
      .eq('executed', false); // Filtruj tylko te, które nie zostały wykonane

    if (orderError || !orders) {
      console.error('❌ Błąd pobierania zleceń:', orderError);
      return res.status(500).json({ success: false, error: orderError });
    }

    let executedCount = 0;

    for (const order of orders) {
      const current = prices.find(p => p.cryptocurrency_id === order.cryptocurrency_id)?.price;
      console.log(`➡️ Sprawdzam zlecenie ${order.id}: cena docelowa $${order.target_price}, aktualna $${current}`);

      if (!current || current > order.target_price) {
        console.log(`⏩ Pomijam zlecenie ${order.id} (cena za wysoka)`);
        continue;
      }

      // 3. Pobierz dane użytkownika
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('balance')
        .eq('user_id', order.user_id)
        .single();

      if (userError || !userProfile) {
        console.error(`❌ Nie znaleziono profilu użytkownika ${order.user_id}`, userError);
        continue;
      }

      const balance = userProfile.balance;

      // 4. Przeprowadź zakup
      try {
        await buyCrypto(
          { id: order.user_id },
          balance,
          () => {}, // setBalance – pomijamy
          order.cryptocurrency_id,
          order.amount
        );
      } catch (e) {
        console.error(`❌ Błąd wykonania zakupu dla zlecenia ${order.id}:`, e);
        continue;
      }

      // 5. Zaktualizuj zlecenie jako wykonane
      const { data: updatedOrder, error: updateError } = await supabase
        .from('auto_orders')
        .update({ executed: true })
        .eq('id', order.id)
        .single(); // Dodajemy .single(), by zwrócić tylko jeden rekord

      if (updateError) {
        console.error(`❌ Błąd aktualizacji zlecenia ${order.id}:`, updateError);
        continue;
      } else {
        executedCount++;
        console.log(`✅ Zlecenie ${order.id} zostało wykonane`);

        // Sprawdź, czy zaktualizowany rekord ma executed = true
        console.log(`Updated Order:`, updatedOrder);

        // Usuwamy zlecenie z bazy
        await supabase
          .from('auto_orders')
          .delete()
          .eq('id', order.id);

        console.log(`❌ Zlecenie ${order.id} zostało usunięte`);
      }
    }

    return res.status(200).json({ success: true, executed: executedCount });
  } catch (err) {
    console.error('❌ Błąd główny:', err);
    return res.status(500).json({ success: false, error: err });
  }
}
