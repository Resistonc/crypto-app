// lib/cryptoActions.ts
import { supabase } from '@/lib/supabaseClient';
import axios from 'axios';

const fetchCryptoPrice = async (symbol: string): Promise<number | null> => {
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
            params: {
                ids: symbol.toLowerCase(),
                vs_currencies: 'usd',
            },
        });

        return response.data[symbol.toLowerCase()]?.usd || null;
    } catch (error) {
        console.error(`Błąd pobierania ceny ${symbol}:`, error);
        return null;
    }
};

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

export const buyCrypto = async (
    user: any,
    balance: number | null,
    setBalance: (balance: number) => void,
    coinId: number,
    amount: number
) => {
    if (!user) return;

    const symbol = await getCoinSymbol(coinId);
    if (!symbol) return;

    const price = await fetchCryptoPrice(symbol);
    if (!price) {
        alert("Nie udało się pobrać ceny kryptowaluty.");
        return;
    }

    const totalCost = amount * price;

    if (balance !== null && balance < totalCost) {
        alert("Brak wystarczających środków!");
        return;
    }

    const updatedBalance = (balance ?? 0) - totalCost;

    const { error: balanceError } = await supabase
        .from('user_profiles')
        .update({ balance: updatedBalance })
        .eq('user_id', user.id);

    if (balanceError) {
        console.error("Błąd aktualizacji salda:", balanceError);
        return;
    }

    const { data: existingCoin, error } = await supabase
        .from('user_portfolio')
        .select('amount')
        .eq('user_id', user.id)
        .eq('cryptocurrency_id', coinId)
        .single();

    if (existingCoin) {
        await supabase
            .from('user_portfolio')
            .update({ amount: existingCoin.amount + amount })
            .eq('user_id', user.id)
            .eq('cryptocurrency_id', coinId);
    } else {
        await supabase
            .from('user_portfolio')
            .insert([{ user_id: user.id, cryptocurrency_id: coinId, amount }]);
    }

    await supabase
        .from('transactions')
        .insert([{ user_id: user.id, cryptocurrency_id: coinId, amount, price, type: 'buy' }]);

    setBalance(updatedBalance);
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
    if (!user) return;

    const symbol = await getCoinSymbol(coinId);
    if (!symbol) return;

    const price = await fetchCryptoPrice(symbol);
    if (!price) {
        alert("Nie udało się pobrać ceny kryptowaluty.");
        return;
    }

    const userCoin = portfolio.find(c => c.cryptocurrency_id === coinId);
    if (!userCoin || userCoin.amount < amount) {
        alert("Brak wystarczającej ilości kryptowaluty!");
        return;
    }

    const totalGain = amount * price;
    const updatedBalance = (balance ?? 0) + totalGain;

    const { error: balanceError } = await supabase
        .from('user_profiles')
        .update({ balance: updatedBalance })
        .eq('user_id', user.id);

    if (balanceError) {
        console.error("Błąd aktualizacji salda:", balanceError);
        return;
    }

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

    setBalance(updatedBalance);
    alert(`Sprzedano ${amount} ${symbol} za $${totalGain.toFixed(2)}`);
};
