"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function MfaSetupPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/mfa/setup")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setQrCode(result.qrCodeDataUrl);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/mfa/enable", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Unable to enable MFA");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set up Google Authenticator</CardTitle>
          <CardDescription>Scan this QR code, then enter the six-digit code from your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {qrCode ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qrCode} alt="Google Authenticator setup QR code" className="mx-auto size-56 rounded-lg" />
          ) : null}
          <form className="grid gap-4" onSubmit={submit}>
            <Input inputMode="numeric" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={code} onChange={(event) => setCode(event.target.value)} required />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading || !qrCode}>{loading ? "Enabling..." : "Enable MFA"}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}