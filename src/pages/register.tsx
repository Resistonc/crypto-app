import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Button from '@/components/Button';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
    
        if (error) {
            setError(error.message);
            return;
        }
    
        const user = data.user;
    
        if (user) {
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert([{ user_id: user.id, balance: 500000 }]);
    
            if (profileError) {
                console.error('Błąd podczas dodawania profilu użytkownika:', profileError);
            }
        }
    
        alert('Rejestracja zakończona! Sprawdź e-mail.');
        router.push('/login');
    };
    

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-4">Rejestracja</h1>
            <form onSubmit={handleRegister} className="bg-white p-6 rounded-lg shadow-md w-80">
                <div className="mb-4">
                    <label className="block text-sm font-medium">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium">Hasło</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded"
                        required
                    />
                </div>
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded">Zarejestruj się</button>
            </form>
            <div className="absolute top-4 right-4">
             <Button type="default" onClick={() => router.push('/')}>Wróć do strony głównej</Button>
         </div>
        </div>
    );




};

export default Register;
