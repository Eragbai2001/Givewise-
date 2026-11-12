"use client";

import { useState } from "react";

export type TestLogin = { email: string; password: string };

/** Sandbox only: the fake PayPal login testers can use on PayPal's page. */
export default function TestLoginNote({ login }: { login: TestLogin | null | undefined }) {
  const [copied, setCopied] = useState("");
  if (!login) return null;

  function copy(label: string, value: string) {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(label);
        setTimeout(() => setCopied(""), 1500);
      },
      () => {},
    );
  }

  return (
    <div className="testlogin" role="note">
      <p className="testlogin-t">
        <b>Trying GiveWise?</b> This is PayPal’s test mode, so no real money moves. PayPal opens in a new tab, so this login stays
        here. On PayPal’s page, enter this email, click <b>Next</b>, then the password. Skip the card form.
      </p>
      <dl>
        <div>
          <dt>Email</dt>
          <dd>
            <code>{login.email}</code>
            <button type="button" onClick={() => copy("email", login.email)}>{copied === "email" ? "Copied" : "Copy"}</button>
          </dd>
        </div>
        <div>
          <dt>Password</dt>
          <dd>
            <code>{login.password}</code>
            <button type="button" onClick={() => copy("password", login.password)}>{copied === "password" ? "Copied" : "Copy"}</button>
          </dd>
        </div>
      </dl>
    </div>
  );
}
