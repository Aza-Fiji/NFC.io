// WebAuthn biometric authentication helpers

const CREDENTIAL_STORAGE_KEY = "nfc-vault-credential-id";

export function isBiometricSupported(): boolean {
  return !!window.PublicKeyCredential;
}

export async function registerBiometric(): Promise<string> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "NFC Crypto Vault" },
      user: {
        id: userId,
        name: "vault-user",
        displayName: "Vault User",
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential;

  const credentialId = btoa(
    String.fromCharCode(...new Uint8Array(credential.rawId))
  );
  localStorage.setItem(CREDENTIAL_STORAGE_KEY, credentialId);
  return credentialId;
}

export async function authenticateBiometric(): Promise<boolean> {
  const storedId = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60000,
    userVerification: "required",
    ...(storedId
      ? {
          allowCredentials: [
            {
              id: Uint8Array.from(atob(storedId), (c) => c.charCodeAt(0)),
              type: "public-key",
            },
          ],
        }
      : {}),
  };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: options,
    });
    return !!assertion;
  } catch {
    return false;
  }
}

export function hasBiometricRegistered(): boolean {
  return !!localStorage.getItem(CREDENTIAL_STORAGE_KEY);
}
