-- Credentials are now encrypted and written only by the save-credential edge function
-- (service role). Clients may read their own rows (ciphertext, for status) and delete
-- their own, but may NOT insert/update directly.
DROP POLICY IF EXISTS "Users can manage own credentials" ON user_credentials;

CREATE POLICY "read own credentials"
  ON user_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "delete own credentials"
  ON user_credentials FOR DELETE
  USING (auth.uid() = user_id);
-- INSERT/UPDATE intentionally omitted: only the service role writes credentials.
