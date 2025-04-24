import { supabase } from '@/lib/supabaseClient';

const getCoinSymbol = async (coinId: number): Promise<string | null> => {
  const { data, error } = await supabase
    .from('cryptocurrencies')
    .select('symbol')
    .eq('id', coinId)
    .single();

  if (error) {
    console.error("Błąd pobierania symbolu kryptowaluty:", error);
    return null;
  }

  return data.symbol.toLowerCase();
};

const fetchCryptoPrice = async (coinId: number): Promise<number | null> => {
  const { data, error } = await supabase
    .from('crypto_prices')
    .select('price')
    .eq('cryptocurrency_id', coinId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error("Błąd pobierania ceny kryptowaluty z bazy:", error);
    return null;
  }

  return data.price;
};

export const buyCrypto = async (
  user: any,
  balance: number | null,
  setBalance: (balance: number) => void,
  coinId: number,
  amount: number
) => {
  if (!user || balance === null) return;

  console.log("🔹 START BUY:", { userId: user.id, coinId, amount });

  const symbol = await getCoinSymbol(coinId);
  if (!symbol) {
    console.error("❌ Symbol nie znaleziony");
    return;
  }

  const price = await fetchCryptoPrice(coinId);
  if (!price) {
    alert("Nie udało się pobrać ceny kryptowaluty.");
    return;
  }

  const totalCost = amount * price;
  if (balance < totalCost) {
    alert("Brak wystarczających środków!");
    return;
  }

  const newBalance = balance - totalCost;

  const { error: balanceError } = await supabase
    .from('user_profiles')
    .update({ balance: newBalance })
    .eq('user_id', user.id);

  if (balanceError) {
    console.error("❌ Błąd aktualizacji salda:", balanceError);
    return;
  }

  // ➕ Sprawdzenie czy rekord istnieje
  const { data: existingCoin, error: selectError } = await supabase
    .from('user_portfolio')
    .select('amount')
    .eq('user_id', user.id)
    .eq('cryptocurrency_id', coinId)
    .maybeSingle();

  console.log("🔍 Istniejący rekord:", existingCoin);

  if (selectError) {
    console.error("❌ Błąd select user_portfolio:", selectError);
    return;
  }

  if (existingCoin) {
    const { error: updateError } = await supabase
      .from('user_portfolio')
      .update({ amount: existingCoin.amount + amount })
      .eq('user_id', user.id)
      .eq('cryptocurrency_id', coinId);

    if (updateError) {
      console.error("❌ Błąd update user_portfolio:", updateError);
      return;
    }

    console.log("✅ Zaktualizowano istniejący rekord");
  } else {
    const { error: insertError } = await supabase
      .from('user_portfolio')
      .insert([{ user_id: user.id, cryptocurrency_id: coinId, amount }]);

    if (insertError) {
      console.error("❌ Błąd insert user_portfolio:", insertError);
      return;
    }

    console.log("✅ Dodano nowy rekord do user_portfolio");
  }

  const { error: transactionError } = await supabase
    .from('transactions')
    .insert([{ user_id: user.id, cryptocurrency_id: coinId, amount, price, type: 'buy' }]);

  if (transactionError) {
    console.error("❌ Błąd zapisu transakcji:", transactionError);
    return;
  }

  setBalance(newBalance);
  alert(`Kupiono ${amount} ${symbol} za $${totalCost.toFixed(2)}`);
};

  

export const sellCrypto = async (
  user: any,
  balance: number | null,
  setBalance: (balance: number) => void,
  portfolio: any[],
  coinId: number,
  amount: number
) => {
  if (!user || balance === null) return;

  const symbol = await getCoinSymbol(coinId);
  if (!symbol) return;

  const price = await fetchCryptoPrice(coinId);
  if (!price) {
    alert("Nie udało się pobrać ceny kryptowaluty.");
    return;
  }

  const userCoin = portfolio.find(c => c.cryptocurrency.id === coinId);
  if (!userCoin || userCoin.amount < amount) {
    alert("Brak wystarczającej ilości kryptowaluty!");
    return;
  }

  const totalGain = amount * price;

  await supabase
    .from('user_profiles')
    .update({ balance: balance + totalGain })
    .eq('user_id', user.id);

  if (userCoin.amount - amount > 0) {
    await supabase
      .from('user_portfolio')
      .update({ amount: userCoin.amount - amount })
      .eq('user_id', user.id)
      .eq('cryptocurrency_id', coinId);
  } else {
    await supabase
      .from('user_portfolio')
      .delete()
      .eq('user_id', user.id)
      .eq('cryptocurrency_id', coinId);
  }

  await supabase
    .from('transactions')
    .insert([{ user_id: user.id, cryptocurrency_id: coinId, amount, price, type: 'sell' }]);

  setBalance(balance + totalGain);
  alert(`Sprzedano ${amount} ${symbol} za $${totalGain.toFixed(2)}`);
};
