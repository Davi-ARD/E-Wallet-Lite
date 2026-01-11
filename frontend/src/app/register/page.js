"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  const [form, setForm] = useState({ username: "", fullName: "", password: "", pin: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    if(form.pin.length !== 6) return setError("PIN harus 6 digit angka");

    try {
      const res = await fetch("http://localhost:3000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Register Gagal");

      alert("Registrasi Berhasil! Silakan Login.");
      router.push("/login");
    } catch (err) {
      setError(err.message);
    }
  };

  const inputClass = "w-full border border-gray-300 p-2 rounded mt-1 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="Logo" width={160} height={160} />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 text-slate-800">Daftar Akun Baru</h2>
        
        {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nama Lengkap</label>
            <input type="text" className={inputClass} onChange={(e) => setForm({...form, fullName: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Username</label>
            <input type="text" className={inputClass} onChange={(e) => setForm({...form, username: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input type="password" className={inputClass} onChange={(e) => setForm({...form, password: e.target.value})} required />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">PIN (6 Angka)</label>
                <input type="text" maxLength="6" className={inputClass} onChange={(e) => setForm({...form, pin: e.target.value})} required placeholder="123456" />
            </div>
          </div>
          
          <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold transition">
            BUAT AKUN
          </button>
        </form>
        <p className="text-center mt-4 text-sm text-slate-600">
          Sudah punya akun? <Link href="/login" className="text-blue-600 font-bold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}