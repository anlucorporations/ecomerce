import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import fs from "fs/promises";
import path from "path";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const ECOMMERCE_ABI = [
  "function getCompany(uint256 companyId) view returns (tuple(uint256 companyId, address companyAddress, string name, string description, uint8 businessType, bool isActive, uint256 registrationDate))",
  "function isSystemsAdmin(address account) view returns (bool)"
];

/**
 * Autorización 100% Web3:
 * 1. La wallet debe firmar un mensaje (MetaMask) que el servidor verifica.
 * 2. On-chain: la wallet firmante debe ser el dueño de la empresa (companyId) o el admin de la plataforma.
 * Sin firma válida o sin propiedad on-chain => 401/403 (no hay tokens, sesiones ni contraseñas).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, filename, imageBase64, walletAddress, authMessage, signature } = body;

    if (!companyId || !imageBase64) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios: companyId o imageBase64." },
        { status: 400 }
      );
    }

    // ---- Autenticación Web3 obligatoria ----
    if (!walletAddress || !authMessage || !signature) {
      return NextResponse.json(
        { error: "Autorización Web3 requerida: firme con su wallet (MetaMask)." },
        { status: 401 }
      );
    }
    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json({ error: "Dirección de wallet inválida." }, { status: 401 });
    }

    // 1. Verificar la firma (el mensaje exacto que firmó el frontend)
    let recovered: string;
    try {
      recovered = ethers.verifyMessage(authMessage, signature);
    } catch {
      return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
    }
    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "La firma no corresponde a la wallet declarada." },
        { status: 401 }
      );
    }

    // 2. Verificar on-chain que la wallet es dueña de la empresa (o admin de la plataforma)
    const parsedCompanyId = Number(companyId);
    if (!Number.isInteger(parsedCompanyId) || parsedCompanyId <= 0) {
      return NextResponse.json(
        { error: "companyId debe ser un número entero positivo." },
        { status: 400 }
      );
    }

    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
      const ecommerceAddress = process.env.NEXT_PUBLIC_ECOMMERCE_MAIN_ADDRESS || "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(ecommerceAddress, ECOMMERCE_ABI, provider);

      const company = await contract.getCompany(parsedCompanyId);
      const companyOwner = (company?.companyAddress || "").toLowerCase();
      const isCompanyOwner = companyOwner === walletAddress.toLowerCase();

      let isAdmin = false;
      try {
        isAdmin = await contract.isSystemsAdmin(walletAddress);
      } catch {
        isAdmin = false;
      }

      if (!isCompanyOwner && !isAdmin) {
        return NextResponse.json(
          { error: "Solo la wallet dueña de la empresa (o el admin de la plataforma) puede subir imágenes." },
          { status: 403 }
        );
      }
    } catch (e) {
      console.error("[Upload] Fallo verificando propiedad on-chain:", e);
      return NextResponse.json(
        { error: "No se pudo verificar la autorización on-chain." },
        { status: 503 }
      );
    }

    // ---- Resto de validaciones y guardado ----
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "La imagen excede el tamaño máximo permitido (5 MB)." },
        { status: 413 }
      );
    }

    const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isGif = buffer.length > 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    const isWebp = buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";

    if (!isJpeg && !isPng && !isGif && !isWebp) {
      return NextResponse.json(
        { error: "Formato de archivo no válido. Solo se permiten imágenes (WebP, PNG, JPEG, GIF)." },
        { status: 400 }
      );
    }

    const folderName = `company_${parsedCompanyId}`;
    const originalBase = path.basename(filename || "product_image", path.extname(filename || ""));
    const cleanFilename = originalBase
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "_") + ".webp";

    const timestampedName = `${Date.now()}_${cleanFilename}`;

    const adminUploadsDir = path.join(process.cwd(), "public", "uploads", folderName);
    const customerUploadsDir = path.join(
      process.cwd(),
      "..",
      "web-customer",
      "public",
      "uploads",
      folderName
    );

    await fs.mkdir(adminUploadsDir, { recursive: true });
    try {
      await fs.mkdir(customerUploadsDir, { recursive: true });
    } catch (e) {
      console.warn("Could not create customer uploads dir directly, continuing:", e);
    }

    const adminFilePath = path.join(adminUploadsDir, timestampedName);
    await fs.writeFile(adminFilePath, buffer);

    try {
      const customerFilePath = path.join(customerUploadsDir, timestampedName);
      await fs.writeFile(customerFilePath, buffer);
    } catch (e) {
      console.warn("Could not copy file to customer public dir:", e);
    }

    const publicUrl = `/uploads/${folderName}/${timestampedName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: timestampedName,
      companyFolder: folderName,
      sizeBytes: buffer.length,
    });
  } catch (error: any) {
    console.error("Error saving product image:", error);
    return NextResponse.json(
      { error: "Error al guardar la imagen en el servidor." },
      { status: 500 }
    );
  }
}
