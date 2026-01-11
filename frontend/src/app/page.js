"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Wallet, Send, PlusCircle, LogOut, Download, CreditCard, User, History, PieChart, Loader2 
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const GATEWAY = "http://localhost:3000";

  // State
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0, account_number: "Loading..." });
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [activeTab, setActiveTab] = useState("mutasi");
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showTransfer, setShowTransfer] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  
  // Forms
  const [transferForm, setTransferForm] = useState({ toAccount: "", amount: "", pin: "", desc: "" });
  const [topupAmount, setTopupAmount] = useState("");
  
  // QR & Polling State
  const [qrData, setQrData] = useState(null);
  const pollingRef = useRef(null); 

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
        router.push("/login");
    } else {
        fetchInitialData(false);
        const intervalId = setInterval(() => {
            fetchInitialData(true); // true = silent refresh
        }, 3000);

        return () => {
            clearInterval(intervalId);
            clearInterval(pollingRef.current);
        };
    }
  }, []);

  const fetchInitialData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    const userId = localStorage.getItem("userId");
    try {
        const [resWallet, resTrx, resAna] = await Promise.all([
            fetch(`${GATEWAY}/wallets/${userId}`),
            fetch(`${GATEWAY}/transactions/history/${userId}`),
            fetch(`${GATEWAY}/analytics/dashboard/${userId}`)
        ]);

        if(resWallet.ok) setWallet(await resWallet.json());
        if(resTrx.ok) setTransactions(await resTrx.json());
        if(resAna.ok) setAnalytics(await resAna.json());
        
        if (!isBackground) {
            setUser({ name: localStorage.getItem("fullName"), id: userId });
        }
    } catch (error) {
        console.error("Fetch error", error);
    } finally {
        if (!isBackground) setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  // --- LOGIC TRANSFER ---
  const submitTransfer = async (e) => {
    e.preventDefault();
    if(!confirm("Konfirmasi Transfer?")) return;

    try {
        const res = await fetch(`${GATEWAY}/transactions/transfer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fromUserId: user.id,
                toAccountNumber: transferForm.toAccount,
                amount: parseInt(transferForm.amount),
                pin: transferForm.pin,
                description: transferForm.desc
            })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error || "Transfer Gagal");

        alert("Transfer Berhasil!");
        setShowTransfer(false);
        setTransferForm({ toAccount: "", amount: "", pin: "", desc: "" });
        fetchInitialData();
    } catch (err) {
        alert(err.message);
    }
  };

  // --- LOGIC TOP UP (QR & POLLING) ---
  const requestTopup = async (e) => {
    e.preventDefault();
    try {
        const res = await fetch(`${GATEWAY}/payments/topup/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id, amount: parseInt(topupAmount) })
        });
        const data = await res.json();
        
        if(!res.ok) throw new Error(data.error || "Gagal request");

        setQrData(data); 
        
        // Mulai Polling: Cek status setiap 2 detik
        pollingRef.current = setInterval(async () => {
            await checkPaymentStatus(data.paymentId);
        }, 2000);

    } catch (err) {
        alert(err.message);
    }
  };

  // Fungsi Cek Status (Otomatis jalan setiap 2 detik)
  const checkPaymentStatus = async (paymentId) => {
    try {
        const res = await fetch(`${GATEWAY}/payments/status/${paymentId}`);
        const data = await res.json();
        
        if (data.status === 'SUCCESS') {
            clearInterval(pollingRef.current); // Stop polling
            // alert("Pembayaran Diterima!");
            setShowTopup(false);
            setQrData(null);
            setTopupAmount("");
            fetchInitialData(); // Refresh saldo otomatis
        }
    } catch (error) {
        console.log("Polling error", error);
    }
  };

  if(isLoading && !user) return <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold">Loading E-Wallet Lite...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-10">
      
      {/* NAVBAR */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={40} height={40} />
            <h1 className="text-xl font-bold tracking-tight text-blue-900">E-Wallet <span className="text-blue-500 font-light">Lite</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block cursor-pointer" onClick={() => router.push('/profile')}>
              <p className="text-sm font-bold text-slate-700 hover:text-blue-600 transition">{user?.name} (Edit)</p>
              <p className="text-xs text-slate-400">ID: {user?.id}</p>
            </div>
            <button onClick={handleLogout} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition">
                <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        
        {/* WALLET CARD */}
        <section className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <CreditCard className="w-40 h-40" />
            </div>
            <div className="relative z-10">
                <p className="text-blue-100 text-sm font-medium mb-1">Total Saldo Aktif</p>
                <h2 className="text-4xl font-bold mb-4">Rp {parseInt(wallet.balance).toLocaleString("id-ID")}</h2>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-mono mb-6">
                    <User className="w-4 h-4" /> No. Rek: {wallet.account_number}
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setShowTopup(true)} className="flex items-center gap-2 bg-white text-blue-600 px-5 py-2 rounded-lg font-bold hover:bg-blue-50 transition shadow-sm">
                        <PlusCircle className="w-5 h-5" /> Top Up
                    </button>
                    <button onClick={() => setShowTransfer(true)} className="flex items-center gap-2 bg-blue-800 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-900 transition shadow-sm border border-blue-700">
                        <Send className="w-5 h-5" /> Transfer
                    </button>
                </div>
            </div>
        </section>

        {/* TABS CONTENT */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
            <div className="flex border-b">
                <button onClick={() => setActiveTab("mutasi")} className={`flex-1 py-4 text-sm font-bold flex justify-center items-center gap-2 transition ${activeTab === "mutasi" ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50" : "text-slate-500 hover:bg-slate-50"}`}>
                    <History className="w-4 h-4" /> Riwayat Mutasi
                </button>
                <button onClick={() => setActiveTab("grafik")} className={`flex-1 py-4 text-sm font-bold flex justify-center items-center gap-2 transition ${activeTab === "grafik" ? "border-b-2 border-blue-600 text-blue-600 bg-blue-50" : "text-slate-500 hover:bg-slate-50"}`}>
                    <PieChart className="w-4 h-4" /> Analitik & Grafik
                </button>
            </div>

            <div className="p-6">
                {activeTab === "mutasi" && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Mutasi Rekening</h3>
                            <a href={`${GATEWAY}/analytics/export/${user?.id}`} target="_blank" className="flex items-center gap-2 text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition">
                                <Download className="w-4 h-4" /> Download CSV
                            </a>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 border-b">
                                    <tr>
                                        <th className="p-3">Tanggal</th>
                                        <th className="p-3">Keterangan</th>
                                        <th className="p-3">Tipe</th>
                                        <th className="p-3 text-right">Mutasi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {transactions.map((trx) => (
                                        <tr key={trx.id} className="hover:bg-slate-50">
                                            <td className="p-3 text-slate-500 whitespace-nowrap">
                                                {new Date(trx.created_at).toLocaleDateString()} <br/>
                                                <span className="text-xs">{new Date(trx.created_at).toLocaleTimeString()}</span>
                                            </td>
                                            <td className="p-3">
                                                <p className="font-medium text-slate-700">{trx.description || "-"}</p>
                                                <p className="text-xs text-slate-400">ID: {trx.id}</p>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${trx.type.includes('IN') || trx.type === 'TOPUP' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {trx.type}
                                                </span>
                                            </td>
                                            <td className={`p-3 text-right font-bold ${trx.type.includes('IN') || trx.type === 'TOPUP' ? 'text-green-600' : 'text-red-600'}`}>
                                                {trx.type.includes('IN') || trx.type === 'TOPUP' ? '+' : '-'} Rp {parseInt(trx.amount).toLocaleString("id-ID")}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-400">Belum ada transaksi</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "grafik" && (
                    <div>
                        <h3 className="font-bold text-lg mb-4">Statistik Pengeluaran & Pemasukan</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                {analytics.map((item, idx) => {
                                    const amount = parseInt(item.total?.value || item.total || 0);
                                    const max = Math.max(...analytics.map(i => parseInt(i.total?.value || i.total || 0)));
                                    const percent = max > 0 ? (amount / max) * 100 : 0;
                                    
                                    return (
                                        <div key={idx}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-bold text-slate-700">{item.type}</span>
                                                <span className="text-slate-500">Rp {amount.toLocaleString("id-ID")}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-3">
                                                <div className={`h-3 rounded-full ${item.type.includes('OUT') ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {analytics.length === 0 && <p className="text-slate-400 italic">Belum ada data analitik.</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>

        {/* MODAL TRANSFER */}
        {showTransfer && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="bg-blue-600 p-4 text-white font-bold flex justify-between">
                        <span>Transfer Dana</span>
                        <button onClick={() => setShowTransfer(false)}>X</button>
                    </div>
                    <form onSubmit={submitTransfer} className="p-6 space-y-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700">No. Rekening Tujuan</label>
                            <input type="text" className="w-full border p-2 rounded mt-1" required 
                                value={transferForm.toAccount} onChange={e => setTransferForm({...transferForm, toAccount: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700">Nominal (Rp)</label>
                            <input type="number" className="w-full border p-2 rounded mt-1" required 
                                value={transferForm.amount} onChange={e => setTransferForm({...transferForm, amount: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700">PIN</label>
                            <input type="password" maxLength="6" className="w-full border p-2 rounded mt-1 text-center font-bold tracking-widest" required 
                                value={transferForm.pin} onChange={e => setTransferForm({...transferForm, pin: e.target.value})}
                            />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">KIRIM</button>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL TOPUP (AUTO POLLING) */}
        {showTopup && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="bg-green-600 p-4 text-white font-bold flex justify-between">
                        <span>Top Up Saldo</span>
                        <button onClick={() => { setShowTopup(false); setQrData(null); clearInterval(pollingRef.current); }}>X</button>
                    </div>
                    <div className="p-6 space-y-4">
                        {!qrData ? (
                            <form onSubmit={requestTopup} className="space-y-4">
                                <label className="text-sm font-bold text-slate-700">Nominal (Min. 10.000)</label>
                                <input type="number" min="10000" className="w-full border p-2 rounded" required 
                                    value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
                                    placeholder="10000"
                                />
                                <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">
                                    GENERATE QR
                                </button>
                            </form>
                        ) : (
                            <div className="text-center">
                                <p className="text-sm text-slate-600 mb-2">Scan QR ini dengan Kamera HP Anda</p>
                                <div className="border p-2 inline-block rounded mb-4 bg-white shadow-sm">
                                    <img src={qrData.qrUrl} alt="QR Code" width={220} height={220} />
                                </div>
                                <div className="flex flex-col items-center justify-center gap-2 text-sm text-slate-500 mb-2 animate-pulse">
                                    <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                                    <span className="font-bold text-green-600">Menunggu Scan dari HP...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}