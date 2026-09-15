// Write GitHub Actions *secrets* (encrypted, not readable in the repo UI or
// logs) instead of variables. Secrets must be sealed with the repo's public
// key using libsodium's sealed box.
import sodium from "npm:libsodium-wrappers@0.7.15";

export async function setGitHubSecret(
  repoPath: string,
  name: string,
  value: string,
  headers: Record<string, string>,
): Promise<boolean> {
  try {
    const pkRes = await fetch(`https://api.github.com/repos/${repoPath}/actions/secrets/public-key`, { headers });
    if (!pkRes.ok) return false;
    const { key, key_id } = (await pkRes.json()) as { key: string; key_id: string };

    await sodium.ready;
    const sealed = sodium.crypto_box_seal(
      sodium.from_string(value),
      sodium.from_base64(key, sodium.base64_variants.ORIGINAL),
    );
    const encrypted_value = sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);

    const putRes = await fetch(`https://api.github.com/repos/${repoPath}/actions/secrets/${name}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ encrypted_value, key_id }),
    });
    return putRes.ok;
  } catch {
    return false;
  }
}
