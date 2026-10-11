export const SignatureCalculator = () => {
  const SAMPLE = {
    secret: "srk_test_example_secret",
    timestamp: "1700000000",
    method: "POST",
    path: "/v1/payments/sale/ABC123",
    body: '{"merchant_transaction_id":"order-10042","amount":49.99,"currency":"USD"}',
    signature: "a3572da91fd748adefe19333fed189d3e1f228dcd76c0556ec3e038bd7c33e17",
  };
  const [secret, setSecret] = useState(SAMPLE.secret);
  const [timestamp, setTimestamp] = useState(SAMPLE.timestamp);
  const [method, setMethod] = useState(SAMPLE.method);
  const [path, setPath] = useState(SAMPLE.path);
  const [body, setBody] = useState(SAMPLE.body);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const isSample =
    secret === SAMPLE.secret &&
    timestamp === SAMPLE.timestamp &&
    method === SAMPLE.method &&
    path === SAMPLE.path &&
    body === SAMPLE.body;

  const stringToSign = `${timestamp}.${method.toUpperCase()}.${path}.${body}`;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!window.crypto || !window.crypto.subtle) {
          throw new Error("Web Crypto is not available in this browser.");
        }
        const enc = new TextEncoder();
        const key = await window.crypto.subtle.importKey(
          "raw",
          enc.encode(secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const mac = await window.crypto.subtle.sign("HMAC", key, enc.encode(stringToSign));
        const hex = Array.from(new Uint8Array(mac))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (!cancelled) {
          setSignature(hex);
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setSignature("");
          setError(e.message);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [secret, stringToSign]);

  const copy = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch (e) {}
  };

  const field =
    "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100";
  const label = "block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1";
  const out =
    "rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm font-mono break-all whitespace-pre-wrap text-zinc-900 dark:text-zinc-100";

  return (
    <div className="not-prose my-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="sig-secret">API Secret</label>
          <input id="sig-secret" className={field} value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" spellCheck={false} />
        </div>
        <div>
          <label className={label} htmlFor="sig-ts">Timestamp (Unix seconds)</label>
          <div className="flex gap-2">
            <input id="sig-ts" className={field} value={timestamp} onChange={(e) => setTimestamp(e.target.value)} inputMode="numeric" />
            <button type="button" className="shrink-0 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 text-sm text-zinc-900 dark:text-zinc-100" onClick={() => setTimestamp(String(Math.floor(Date.now() / 1000)))}>
              Now
            </button>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="sig-method">Method</label>
          <select id="sig-method" className={field} value={method} onChange={(e) => setMethod(e.target.value)}>
            {["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="sig-path">Path including query string</label>
          <input id="sig-path" className={field} value={path} onChange={(e) => setPath(e.target.value)} spellCheck={false} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="sig-body">Raw request body (leave empty for no body)</label>
        <textarea id="sig-body" className={field} rows={3} value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} />
      </div>
      <div>
        <div className={label}>String to sign</div>
        <div className={out}>{stringToSign}</div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <div className={label}>x-signature</div>
          {signature && (
            <button type="button" className="text-xs text-zinc-600 dark:text-zinc-400 underline" onClick={() => copy("sig", signature)}>
              {copied === "sig" ? "Copied" : "Copy"}
            </button>
          )}
        </div>
        <div className={out}>{error ? error : signature}</div>
        {isSample && signature === SAMPLE.signature && (
          <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
            ✓ Matches the expected test signature
          </div>
        )}
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        This calculator runs entirely in your browser and sends nothing. Use sandbox or sample secrets only, never a live secret.
      </p>
    </div>
  );
};
