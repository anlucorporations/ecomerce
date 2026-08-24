import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const ECOMMERCE_ABI = [
  'function updateKYCStatus(address account, bool status) external',
  'function isKYCVerified(address account) view returns (bool)'
];

// El mensaje firmado debe coincidir EXACTAMENTE con el que construye el frontend (kyc-modal.tsx)
function buildKycDeclaration(opts: {
  address: string;
  phone: string;
  birthDate: string;
  country: string;
  idImageHash: string;
  selfieHash: string;
  timestamp: string;
}): string {
  return [
    'ATESTACIÓN DE VERIFICACIÓN KYC - PLATAFORMA WEB3 BARLO-VENTAS',
    '',
    `Billetera Titular: ${opts.address}`,
    `Teléfono: ${opts.phone}`,
    `Fecha de Nacimiento: ${opts.birthDate}`,
    `País de Residencia: ${opts.country}`,
    `Hash DNI/Cédula (SHA-256): ${opts.idImageHash}`,
    `Hash Selfie (SHA-256): ${opts.selfieHash}`,
    `Fecha de Emisión: ${opts.timestamp}`,
    '',
    'Al firmar con su billetera MetaMask, usted certifica la veracidad de estos datos on-chain. Únicamente los hashes criptográficos de sus imágenes son almacenados preservando su privacidad.'
  ].join('\n');
}

function getAdminPrivateKey(): string {
  const key = process.env.ADMIN_PRIVATE_KEY || process.env.OWNER_PRIVATE_KEY;
  if (!key) {
    throw new Error('ADMIN_PRIVATE_KEY/OWNER_PRIVATE_KEY no configurada en el servidor');
  }
  return key;
}

function isValidPhone(phone: string): boolean {
  // Acepta formatos con espacios/guiones/paréntesis (ej. "+34 612 345 678"),
  // validando el total de dígitos (6-15) en vez de dígitos consecutivos.
  if (!/^[+()\-\s\d]{6,25}$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15;
}

function isValidBirthDate(birthDate: string): boolean {
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 18 && age < 120;
}

function isValidImageHash(hash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, phone, birthDate, country, idImageHash, selfieHash, signature, timestamp } = body;

    // ---- Validación de datos KYC (obligatoria, ya no se descartan) ----
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Dirección Ethereum inválida' }, { status: 400 });
    }
    if (!phone || !isValidPhone(String(phone))) {
      return NextResponse.json({ error: 'Teléfono de contacto inválido o faltante' }, { status: 400 });
    }
    if (!birthDate || !isValidBirthDate(String(birthDate))) {
      return NextResponse.json({ error: 'Fecha de nacimiento inválida (debe ser mayor de 18 años)' }, { status: 400 });
    }
    if (!country || String(country).trim().length < 2) {
      return NextResponse.json({ error: 'País de residencia inválido o faltante' }, { status: 400 });
    }
    if (!idImageHash || !isValidImageHash(String(idImageHash))) {
      return NextResponse.json({ error: 'Hash SHA-256 de la imagen de identidad inválido' }, { status: 400 });
    }
    if (!selfieHash || !isValidImageHash(String(selfieHash))) {
      return NextResponse.json({ error: 'Hash SHA-256 de la selfie inválido' }, { status: 400 });
    }
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Firma y timestamp obligatorios para verificar KYC' }, { status: 400 });
    }

    // ---- Anti-replay: el timestamp firmado no puede ser demasiado antiguo ----
    const signedAt = new Date(timestamp).getTime();
    if (isNaN(signedAt)) {
      return NextResponse.json({ error: 'Timestamp de la declaración inválido' }, { status: 400 });
    }
    const ageMs = Date.now() - signedAt;
    if (ageMs < -5 * 60 * 1000 || ageMs > 15 * 60 * 1000) {
      return NextResponse.json({ error: 'La declaración KYC ha expirado, vuelva a firmar' }, { status: 401 });
    }

    // ---- Verificación de firma: solo el titular de la wallet puede pedir su KYC ----
    const declaration = buildKycDeclaration({
      address,
      phone: String(phone),
      birthDate: String(birthDate),
      country: String(country),
      idImageHash: String(idImageHash),
      selfieHash: String(selfieHash),
      timestamp: String(timestamp)
    });

    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(declaration, signature);
    } catch {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'La firma no corresponde a la billetera solicitante' }, { status: 401 });
    }

    // ---- Ejecución on-chain con clave del owner (sin fallback hardcodeado) ----
    const adminPrivateKey = getAdminPrivateKey();
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
    const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, adminWallet);

    // 1. Check if already verified on-chain
    try {
      const alreadyVerified = await contract.isKYCVerified(address);
      if (alreadyVerified) {
        return NextResponse.json({
          success: true,
          isKYCVerified: true,
          message: 'La billetera ya se encuentra verificada on-chain.'
        });
      }
    } catch {
      console.warn('[API KYC] Error consultando estado KYC on-chain');
    }

    // 2. Execute on-chain updateKYCStatus(address, true)
    const tx = await contract.updateKYCStatus(address, true);
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      isKYCVerified: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: 'Verificación KYC aprobada exitosamente on-chain.'
    });

  } catch {
    console.error('[API KYC Error]');
    return NextResponse.json(
      { error: 'Error interno al procesar la verificación KYC. Verifique la configuración del servidor.' },
      { status: 500 }
    );
  }
}
