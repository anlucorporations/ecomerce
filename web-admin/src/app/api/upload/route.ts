import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, filename, imageBase64 } = body;

    if (!companyId || !imageBase64) {
      return NextResponse.json(
        { error: "Faltan parámetros obligatorios: companyId o imageBase64." },
        { status: 400 }
      );
    }

    // Clean base64 header (e.g. data:image/webp;base64,...)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Validate magic numbers to ensure file is a real image (JPEG, PNG, GIF, WEBP)
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

    // Company folder name
    const folderName = `company_${companyId}`;
    const cleanFilename = (filename || "product_image")
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "_")
      .replace(/\.[^/.]+$/, "") + ".webp";

    const timestampedName = `${Date.now()}_${cleanFilename}`;

    // Target directories in web-admin and web-customer
    const adminUploadsDir = path.join(process.cwd(), "public", "uploads", folderName);
    const customerUploadsDir = path.join(
      process.cwd(),
      "..",
      "web-customer",
      "public",
      "uploads",
      folderName
    );

    // Create directories if they do not exist
    if (!fs.existsSync(adminUploadsDir)) {
      fs.mkdirSync(adminUploadsDir, { recursive: true });
    }
    try {
      if (!fs.existsSync(customerUploadsDir)) {
        fs.mkdirSync(customerUploadsDir, { recursive: true });
      }
    } catch (e) {
      console.warn("Could not create customer uploads dir directly, continuing:", e);
    }

    // Save compressed file to web-admin
    const adminFilePath = path.join(adminUploadsDir, timestampedName);
    fs.writeFileSync(adminFilePath, buffer);

    // Save copy to web-customer if directory exists
    try {
      const customerFilePath = path.join(customerUploadsDir, timestampedName);
      fs.writeFileSync(customerFilePath, buffer);
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
