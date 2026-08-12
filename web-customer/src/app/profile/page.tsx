'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useContract } from '@/hooks/useContract';
import { ethers } from 'ethers';
import Link from 'next/link';

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
  const { provider, signer, chainId, address, isConnected, connect } = useWallet();
  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const [profile, setProfile] = useState({
    name: 'Cliente Demo Web3',
    email: 'cliente@mastercodecrypto.com',
    phone: '+34 612 345 678',
  });

  const [entityType, setEntityType] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Shipping Addresses State
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

  // Fetch KYC / Entity Status
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-3xl">
            🔒
          </div>
          <h1 className="text-xl font-black text-slate-900">Acceso a Perfil Restringido</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Debe conectar su billetera Web3 desde el menú superior para configurar su perfil y direcciones.
          </p>
          <button
            onClick={() => connect()}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-600/30 transition"
          >
            Conectar Wallet Web3
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-rose-500/20">
              {address.slice(2, 4).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mi Perfil y Direcciones</h1>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Billetera: {address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {entityType === 2 ? (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full flex items-center gap-1.5">
                <span>✓</span> KYC Verificado (Comprador)
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full flex items-center gap-1.5">
                <span>⚠️</span> Registro Pendiente
              </span>
            )}
          </div>
        </div>

        {/* 1. INFORMACIÓN PERSONAL Y PERFIL */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Información Personal</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestione los datos de contacto asociados a su identidad Web3.
            </p>
          </div>

          {savedSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3.5 rounded-xl">
              ✓ Cambios guardados exitosamente.
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nombre Completo:</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email de Notificaciones:</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Teléfono de Contacto:</label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Identificador Blockchain:</label>
              <input
                type="text"
                value={address}
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-500 font-mono text-[11px]"
              />
            </div>

            <div className="sm:col-span-2 pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition"
              >
                Guardar Cambios de Perfil
              </button>
            </div>
          </form>
        </div>

        {/* 2. DIRECCIONES DE ENVÍO Y DESPACHO */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Direcciones de Envío Guardadas</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Seleccione la dirección de entrega predeterminada para sus pedidos con EuroToken.
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
            >
              {showAddForm ? '✕ Cancelar' : '+ Agregar Dirección'}
            </button>
          </div>

          {/* Form to Add New Address */}
          {showAddForm && (
            <form onSubmit={handleAddAddress} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 text-sm">Nueva Dirección de Entrega</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre / Etiqueta (ej. Oficina):</label>
                  <input
                    type="text"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    placeholder="Ej. Casa de la Playa"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ciudad / Provincia:</label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    placeholder="Ej. Madrid"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Calle y Número:</label>
                  <input
                    type="text"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                    placeholder="Calle Principal 123, Edificio A"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código Postal:</label>
                  <input
                    type="text"
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                    placeholder="28001"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Instrucciones de Entrega:</label>
                  <input
                    type="text"
                    value={newAddress.instructions}
                    onChange={(e) => setNewAddress({ ...newAddress, instructions: e.target.value })}
                    placeholder="Entregar al conserje..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs"
                >
                  Guardar Dirección
                </button>
              </div>
            </form>
          )}

          {/* List of Saved Addresses */}
          <div className="space-y-3">
            {addressesList.map((addr) => (
              <div
                key={addr.id}
                className={`p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  addr.isDefault
                    ? 'bg-rose-50/40 border-rose-200 shadow-sm'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                        ★ Predeterminada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    {addr.street}, {addr.city} ({addr.postalCode})
                  </p>
                  {addr.instructions && (
                    <p className="text-[11px] text-slate-400 font-mono">
                      Nota: {addr.instructions}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!addr.isDefault && (
                    <button
                      onClick={() => setDefaultAddress(addr.id)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200"
                    >
                      Hacer Predeterminada
                    </button>
                  )}
                  {addressesList.length > 1 && (
                    <button
                      onClick={() => removeAddress(addr.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 text-xs"
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
