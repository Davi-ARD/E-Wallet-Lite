"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, User, Lock, Key } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState({ fullName: "", username: "" });
  const [form, setForm] = useState({ fullName: "", password: "", pin: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const id = localStorage.getItem("userId");
      const res = await fetch(`http://localhost:3000/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setForm({ ...form, fullName: data.full_name });
      }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const id = localStorage.getItem("userId");

    try {
      const res = await fetch("http://localhost:3000/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userId: id,
            fullName: form.fullName,
            newPassword: form.password || undefined,
            newPin: form.pin || undefined
        })
      });
      
      if(res.ok) {
        alert("Profil Berhasil Diupdate!");
        localStorage.setItem("fullName", form.fullName); // Update session lokal
        setForm({ ...form, password: "", pin: "" });
        window.location.reload(); // Reset sensitive fields
      } else {
        const errData = await res.json();
        alert("Gagal update profil: " + (errData.error || "Server Error"));
      }
    } catch (err) {
        alert("Terjadi kesalahan");
    } finally {
        setLoading(false);
    }
  };


  const inputClass = "w-full border border-gray-300 p-2 rounded mt-1 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  return (
    <div className="min-h-screen bg-slate-50 p-4 flex justify-center">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6 h-fit">
        <button onClick={() => router.back()} className="flex items-center text-slate-500 mb-6 hover:text-blue-600 transition">
            <ArrowLeft className="w-5 h-5 mr-1" /> Kembali ke Dashboard
        </button>

        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center text-blue-600 font-bold text-2xl mb-3 uppercase">
                {user.fullName ? user.fullName.charAt(0) : "U"}
            </div>
            <h2 className="text-xl font-bold text-slate-800">{user.username}</h2>
            <p className="text-slate-400 text-sm">Edit Informasi Pribadi</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
            <div>
                <label className="flex items-center text-sm font-bold text-slate-700 mb-1">
                    <User className="w-4 h-4 mr-2" /> Nama Lengkap
                </label>
                <input 
                    type="text" 
                    className={inputClass} 
                    value={form.fullName || ""} 
                    onChange={e => setForm({...form, fullName: e.target.value})} 
                />
            </div>
            <div>
                <label className="flex items-center text-sm font-bold text-slate-700 mb-1">
                    <Lock className="w-4 h-4 mr-2" /> Ganti Password (Opsional)
                </label>
                <input 
                    type="password" 
                    className={inputClass} 
                    placeholder="Ketik password baru..."
                    value={form.password} 
                    onChange={e => setForm({...form, password: e.target.value})} 
                />
            </div>
            <div>
                <label className="flex items-center text-sm font-bold text-slate-700 mb-1">
                    <Key className="w-4 h-4 mr-2" /> Ganti PIN (Opsional)
                </label>
                <input 
                    type="text" 
                    maxLength="6" 
                    className={inputClass} 
                    placeholder="Ketik 6 angka PIN baru..."
                    value={form.pin} 
                    onChange={e => setForm({...form, pin: e.target.value})} 
                />
            </div>

            <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 flex justify-center items-center gap-2 mt-6 transition disabled:opacity-50">
                <Save className="w-5 h-5" /> {loading ? "Menyimpan..." : "SIMPAN PERUBAHAN"}
            </button>
        </form>
      </div>
    </div>
  );
}