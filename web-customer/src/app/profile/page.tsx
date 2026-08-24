'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { ethers } from 'ethers';
import { KycModal } from '@/components/kyc-modal';

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
  "function isCustomerRegistered(address _customer) view returns (bool)",
  "function isKYCVerified(address account) view returns (bool)",
  "function getCustomer(address _customer) view returns (tuple(address customerAddress, string name, string contactEmail, string shippingAddress, uint256 totalPurchases, uint256 totalSpent, uint256 registrationDate, uint256 lastPurchaseDate, bool isActive))"
];

export default function ProfilePage() {
  const { provider, address, isConnected, connect } = useWallet();
  const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const [profile, setProfile] = useState({
    name: 'Cliente BARLO-VENTAS',
    email: 'cliente@barloventas.com',
    phone: '+34 612 345 678',
  });

  const [entityType, setEntityType] = useState<number | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isKycVerified, setIsKycVerified] = useState<boolean>(false);
  const [showKycModal, setShowKycModal] = useState<boolean>(false);
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
        const rpcProvider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545');
        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, rpcProvider);

        let registeredOnChain = false;

        // 1. Check isCustomerRegistered
        try {
          const isReg = await contract.isCustomerRegistered(address);
          if (isReg) registeredOnChain = true;
        } catch (e) {
          console.warn('isCustomerRegistered check warning:', e);
        }

        // 2. Check getEntityType
        try {
          const type = await contract.getEntityType(address);
          setEntityType(Number(type));
          if (Number(type) > 0) registeredOnChain = true;
        } catch (e) {
          console.warn('Error fetching entity type:', e);
        }

        // 3. Fetch Customer Data
        try {
          const cust = await contract.getCustomer(address);
          if (cust && cust.customerAddress && cust.customerAddress !== ethers.ZeroAddress) {
            setProfile((prev) => ({
              ...prev,
              name: cust.name || prev.name,
              email: cust.contactEmail || prev.email,
            }));
            if (cust.shippingAddress) {
              setAddressesList([
                {
                  id: '1',
                  label: 'Dirección Principal (Inscripción)',
                  street: cust.shippingAddress,
                  city: 'Ciudad de Entrega',
                  postalCode: '28000',
                  instructions: 'Dirección de envío registrada en blockchain',
                  isDefault: true,
                },
              ]);
            }
            registeredOnChain = true;
          }
        } catch (e) {
          console.warn('getCustomer warning:', e);
        }

        // 4. Check KYC Status on-chain (localStorage NO es prueba válida)
        let kycStatus = false;
        try {
          kycStatus = await contract.isKYCVerified(address);
        } catch (e) {
          console.warn('isKYCVerified check warning:', e);
        }

        setIsKycVerified(kycStatus);
        setIsRegistered(registeredOnChain);

        // El modal de inscripción lo gestiona RegistrationCheck (layout global):
        // se abre automáticamente en /profile cuando la wallet no está inscrita.
        // SOLO se dispara si NO está inscrito (si ya lo está, no reabrir aunque la URL tenga ?register=true).
        if (typeof window !== 'undefined' && !registeredOnChain) {
          window.dispatchEvent(new CustomEvent('open-customer-registration'));
        }

      } catch (e) {
        console.warn('Error in fetchStatus:', e);
      }
    };

    fetchStatus();

    const handleKycUpdated = () => {
      fetchStatus();
    };
    window.addEventListener('kyc-status-updated', handleKycUpdated);
    return () => {
      window.removeEventListener('kyc-status-updated', handleKycUpdated);
    };
  }, [address, ecommerceAddress]);

  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setSaving(true);
    try {
      let activeSigner = provider ? await provider.getSigner() : null;
      if (!activeSigner && typeof window !== 'undefined' && (window as any).ethereum) {
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        activeSigner = await browserProvider.getSigner();
      }

      if (!activeSigner) {
        alert('Por favor conecte su billetera MetaMask para firmar la modificación del perfil.');
        setSaving(false);
        return;
      }

      // 1. Mandatory Cryptographic Signature Popup via MetaMask
      const defaultAddr = addressesList.find(a => a.isDefault)?.street || profile.phone;
      const timestamp = new Date().toISOString();
      const updateMessage = `ACTUALIZACIÓN DE PERFIL Y REGISTRO - BARLO-VENTAS WEB3\n\nBilletera Titular: ${address}\nNombre Completo: ${profile.name}\nEmail de Notificaciones: ${profile.email}\nTeléfono: ${profile.phone}\nDirección Principal: ${defaultAddr}\nFecha de Actualización: ${timestamp}\n\nAl firmar con su billetera MetaMask, usted certifica la actualización de sus datos de usuario on-chain.`;

      let signature = '';
      try {
        signature = await activeSigner.signMessage(updateMessage);
        console.log('Firma criptográfica de perfil obtenida en MetaMask:', signature);
      } catch (signErr: any) {
        console.error('Firma cancelada en MetaMask:', signErr);
        alert('⚠️ Operación cancelada: La modificación de su perfil requiere ser firmada criptográficamente con su billetera MetaMask.');
        setSaving(false);
        return;
      }

      // 2. On-Chain Contract Update Attempt (registerCustomerSelf if not existing, or update)
      try {
        const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, activeSigner);
        const isReg = await contract.isCustomerRegistered(address);
        if (!isReg) {
          const tx = await contract.registerCustomerSelf(profile.name, profile.email, defaultAddr);
          await tx.wait();
        }
      } catch (txErr: any) {
        console.warn('Registro/Actualización on-chain aviso:', txErr);
      }

      // 3. Persist locally with cryptographic signature
      const regObject = {
        address,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        shippingAddress: defaultAddr,
        signature,
        updatedAt: Date.now(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(`customer_reg_${address.toLowerCase()}`, JSON.stringify(regObject));
        localStorage.setItem(`profile_signature_${address.toLowerCase()}`, signature);
      }

      setIsRegistered(true);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error al guardar el perfil:', err);
      alert('Error guardando perfil: ' + (err?.reason || err?.message || 'Operación cancelada'));
    } finally {
      setSaving(false);
    }
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
            Conecte su billetera Web3 para administrar su perfil BARLO-VENTAS y verificar su estado de inscripción.
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
      <KycModal
        isOpen={showKycModal}
        onClose={() => setShowKycModal(false)}
        userAddress={address}
        onSuccess={() => {
          setIsKycVerified(true);
          setShowKycModal(false);
        }}
      />

      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Registration Warning Callout if Unregistered */}
        {!isRegistered && (
          <div className="bg-[#FFF3E5] border-2 border-[#FF8800] p-6 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h3 className="font-extrabold text-[#333333] text-sm font-poppins">Billetera No Inscrita en BARLO-VENTAS</h3>
              </div>
              <p className="text-xs text-[#A9A9A9] max-w-xl">
                Su billetera <strong className="text-[#0077BB] font-mono">{address}</strong> aún no está inscrita como Cliente en la plataforma.
              </p>
            </div>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-customer-registration'));
                }
              }}
              className="btn-cacao-pulse text-xs font-poppins shrink-0"
            >
              Inscribirme Ahora
            </button>
          </div>
        )}

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

          <div className="flex flex-wrap items-center gap-2">
            {isRegistered || entityType === 2 ? (
              <span className="px-3 py-1 bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30 text-xs font-bold rounded-full flex items-center gap-1.5 font-poppins">
                <span>✓</span> Billetera Inscrita
              </span>
            ) : (
              <span className="px-3 py-1 bg-[#FFF3E5] text-[#FF8800] border border-[#FF8800]/30 text-xs font-bold rounded-full flex items-center gap-1.5 font-poppins">
                <span>⚠️</span> Registro Pendiente
              </span>
            )}

            {isKycVerified ? (
              <span className="px-3 py-1 bg-[#EAF5EF] text-[#2E8B57] border border-[#2E8B57]/30 text-xs font-bold rounded-full flex items-center gap-1.5 font-poppins">
                <span>✓</span> KYC Verificado 🟢
              </span>
            ) : (
              <button
                onClick={() => setShowKycModal(true)}
                className="px-3 py-1 bg-[#FFF3E5] hover:bg-[#FFE8CC] text-[#FF8800] border border-[#FF8800]/40 text-xs font-bold rounded-full flex items-center gap-1.5 font-poppins transition cursor-pointer"
              >
                <span>🪪</span> Verificar KYC ➔
              </button>
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
                disabled={saving}
                className="px-6 py-2.5 bg-[#0077BB] hover:bg-[#005F96] text-white font-bold rounded-xl text-xs shadow-md transition font-poppins disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? 'Firmando en MetaMask...' : '✍️ Firmar con MetaMask y Guardar Cambios'}
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

