import QRCode from "qrcode";
import { generateSecret, generateURI, verify } from "otplib";

import { decryptSecret, encryptSecret } from "./crypto";

const issuer = process.env.MFA_ISSUER ?? "MGI ERP";

export async function createTotpEnrollment(username: string) {
  const secret = generateSecret();

  return {
    encryptedSecret: encryptSecret(secret),
    qrCodeDataUrl: await createTotpQrCode(username, secret),
  };
}

export async function createTotpQrCode(username: string, secret: string) {
  const uri = generateURI({ issuer, label: username, secret });
  return QRCode.toDataURL(uri);
}

export async function verifyTotp(encryptedSecret: string, token: string) {
  const result = await verify({ secret: decryptSecret(encryptedSecret), token });
  return result.valid;
}