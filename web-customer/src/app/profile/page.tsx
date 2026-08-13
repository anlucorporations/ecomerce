'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';

interface AddressItem {
  id: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  instructions: string;
  isDefault: boolean;
}

const ECOMMERCE_ABI = [
  "function getEntityType(address account) view returns (uint8)",
  "function registerCustomerSelf(string _name, string _contactEmail, string _shippingAddress)"
];

export default function ProfilePage() {
  const router = useRouter();
  const { provider, address, isConnected, connect } = useWallet();

  useEffect(() => {
    if (!isConnected && !address && typeof window !== 'undefined') {
      router.push('/');
    }
  }, [isConnected, address, router]);
  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const [profile, setProfile] = useState({
    name: 'Cliente Demo BARLO-VENTAS',
    email: 'cliente@barloventas.com',
    phone: '+34 612 345 678',
  });

  const [entityType, setEntityType] = useState<number | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [addressesList, setAddressesList] = useState<AddressItem[]>([
    {
      id: '1',
      label: 'Casa / Principal',
      street: 'Av. Gran Vía #45, Piso 3B',
      city: 'Madrid',
      postalCode: '28013',
      instructions: 'Dejar en recepción si no responde el timbre',
      isDefault: true,
    },
  ]);

  const [newAddress, setNewAddress] = useState({
    label: '',
    street: '',
    city: '',
    postalCode: '',
    instructions: '',
  });

  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!address) return;
      try {
        const rpcProvider = provider || new ethers.JsonRpcProvider('http://localhost:8545');
        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);
        const type = await contract.getEntityType(address);
        setEntityType(Number(type));
      } catch (e) {
        console.warn('Error fetching entity type:', e);
      }
    };

    fetchStatus();
  }, [address, provider, ecommerceAddress]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.street || !newAddress.city) return;

    const created: AddressItem = {
      id: Date.now().toString(),
      label: newAddress.label || 'Dirección Secundaria',
      street: newAddress.street,
      city: newAddress.city,
      postalCode: newAddress.postalCode,
      instructions: newAddress.instructions,
      isDefault: addressesList.length === 0,
    };

    setAddressesList([...addressesList, created]);
    setNewAddress({ label: '', street: '', city: '', postalCode: '', instructions: '' });
    setShowAddForm(false);
  };

  const setDefaultAddress = (id: string) => {
    setAddressesList(
      addressesList.map((item) => ({
        ...item,
        isDefault: item.id === id,
      }))
    );
  };

  const removeAddress = (id: string) => {
    setAddressesList(addressesList.filter((item) => item.id !== id));
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-[#E6F4FA] text-[#0077BB] rounded-2xl flex items-center justify-center mx-auto text-3xl">
            🔒
          </div>
          <h1 className="text-xl font-black text-[#333333] font-poppins">Acceso Restringido</h1>
          <p className="text-xs text-[#A9A9A9] leading-relaxed">
            Conecte su billetera Web3 para administrar su perfil BARLO-VENTAS y direcciones de despacho.
          </p>
          <button
            onClick={() => connect()}
            className="btn-cacao-pulse w-full text-xs font-poppins"
          >
            Conectar Wallet Web3
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="glass-card p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0077BB] to-[#FF8800] flex items-center justify-center text-white font-black text-2xl shadow-md">
              {address.slice(2, 4).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#333333] tracking-tight font-poppins">Mi Perfil y Direcciones</h1>
              <p className="text-xs font-mono text-[#A9A9A9] mt-0.5">
                Billetera: {address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {entityType === 2 ? (
              <span className="px-3 py-1 bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30 text-xs font-bold rounded-full flex items-center gap-1.5 font-poppins">
                <span>✓</span> KYC Verificado (Comprador)
              </span>
            ) : (
              <span className="px-3 py-1 bg-[#FFF3E5] text-[#FF8800] border border-[#FF8800]/30 text-xs font-bold rounded-full flex items-center gap-1.5 font-poppins">
                <span>⚠️</span> Registro Pendiente
              </span>
            )}
          </div>
        </div>

        {/* 1. INFORMACIÓN PERSONAL */}
        <div className="glass-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-[#0077BB]/10 pb-4">
            <h2 className="text-lg font-bold text-[#333333] font-poppins">Información Personal BARLO-VENTAS</h2>
            <p className="text-xs text-[#A9A9A9] mt-0.5">
              Gestione sus datos de contacto asociados a su identidad Web3.
            </p>
          </div>

          {savedSuccess && (
            <div className="bg-[#EAF5EF] border border-[#2E8B57]/30 text-[#2E8B57] text-xs font-bold p-3.5 rounded-xl">
              ✓ Cambios guardados exitosamente en su cuenta.
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#333333] mb-1 font-poppins">Nombre Completo:</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#0077BB] focus:outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[#333333] mb-1 font-poppins">Email de Notificaciones:</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#0077BB] focus:outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[#333333] mb-1 font-poppins">Teléfono de Contacto:</label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3.5 py-2.5 text-[#333333] focus:border-[#0077BB] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-[#333333] mb-1 font-poppins">Dirección Ethereum:</label>
              <input
                type="text"
                value={address}
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[#A9A9A9] font-mono text-[11px]"
              />
            </div>

            <div className="sm:col-span-2 pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#0077BB] hover:bg-[#005F96] text-white font-bold rounded-xl text-xs shadow-md transition font-poppins"
              >
                Guardar Cambios de Perfil
              </button>
            </div>
          </form>
        </div>

        {/* 2. DIRECCIONES DE ENVÍO */}
        <div className="glass-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#0077BB]/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#333333] font-poppins">Direcciones de Envío Guardadas</h2>
              <p className="text-xs text-[#A9A9A9] mt-0.5">
                Seleccione la dirección de entrega predeterminada para sus compras en EURT.
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-[#0077BB] font-bold text-xs rounded-xl border border-[#0077BB]/20 transition font-poppins"
            >
              {showAddForm ? '✕ Cancelar' : '+ Agregar Dirección'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddAddress} className="bg-white/80 border border-[#0077BB]/20 rounded-2xl p-5 space-y-4 text-xs">
              <h3 className="font-bold text-[#333333] text-sm font-poppins">Nueva Dirección de Entrega</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#333333] mb-1 font-poppins">Nombre / Etiqueta:</label>
                  <input
                    type="text"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    placeholder="Ej. Casa de la Playa"
                    className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3 py-2 text-[#333333]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#333333] mb-1 font-poppins">Ciudad:</label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    placeholder="Ej. Madrid"
                    className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3 py-2 text-[#333333]"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#333333] mb-1 font-poppins">Calle y Número:</label>
                  <input
                    type="text"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                    placeholder="Calle Principal 123, Edificio A"
                    className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3 py-2 text-[#333333]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#333333] mb-1 font-poppins">Código Postal:</label>
                  <input
                    type="text"
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                    placeholder="28001"
                    className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3 py-2 text-[#333333]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#333333] mb-1 font-poppins">Instrucciones:</label>
                  <input
                    type="text"
                    value={newAddress.instructions}
                    onChange={(e) => setNewAddress({ ...newAddress, instructions: e.target.value })}
                    placeholder="Entregar en conserjería..."
                    className="w-full bg-white border border-[#0077BB]/20 rounded-xl px-3 py-2 text-[#333333]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF8800] hover:bg-[#E07700] text-white font-bold rounded-xl text-xs font-poppins"
                >
                  Guardar Dirección
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {addressesList.map((addr) => (
              <div
                key={addr.id}
                className={`p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  addr.isDefault
                    ? 'bg-[#FFF3E5] border-[#FF8800]/40 shadow-sm'
                    : 'bg-white/80 border-[#0077BB]/10 hover:bg-white'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#333333] font-poppins">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF8800] text-white font-poppins">
                        ★ Predeterminada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#333333]">
                    {addr.street}, {addr.city} ({addr.postalCode})
                  </p>
                  {addr.instructions && (
                    <p className="text-[11px] text-[#A9A9A9] font-mono">
                      Nota: {addr.instructions}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!addr.isDefault && (
                    <button
                      onClick={() => setDefaultAddress(addr.id)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#0077BB] font-bold text-xs rounded-xl border border-[#0077BB]/20 font-poppins"
                    >
                      Hacer Predeterminada
                    </button>
                  )}
                  {addressesList.length > 1 && (
                    <button
                      onClick={() => removeAddress(addr.id)}
                      className="p-1.5 text-[#A9A9A9] hover:text-[#CC2233] text-xs"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
